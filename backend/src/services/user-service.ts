import userRepository from '../repositories/user-repository';
import redisClient, { RedisClient } from '../config/redis';
import { PasswordUtils } from '../utils/password';
import { JwtUtils } from '../utils/jwt';
import { 
  CreateUserDto, 
  LoginDto, 
  User, 
  UserResponse, 
  AuthResponse, 
  transformUserToResponse 
} from '../models/user';
import { ApiError } from '../models/api-response';
import logger from '../utils/logger';

const USER_CACHE_TTL = 3600; // 1 hour

export class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Promise<AuthResponse> - User and tokens
   */
  public async register(userData: CreateUserDto): Promise<AuthResponse> {
    try {
      // Check if email already exists
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ApiError('Email already registered', 409);
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        throw new ApiError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400
        );
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hash(userData.password);

      // Create user
      const user = await userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      // Generate tokens
      const tokenPayload = { userId: user._id!.toHexString(), email: user.email };
      const accessToken = JwtUtils.generateAccessToken(tokenPayload);
      const refreshToken = JwtUtils.generateRefreshToken(tokenPayload);

      // Cache user data
      const userResponse = transformUserToResponse(user);
      await this.cacheUser(userResponse);

      logger.info(`User registered successfully: ${user.email}`);

      return {
        user: userResponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error during user registration:', error);
      throw new ApiError('Registration failed', 500);
    }
  }

  /**
   * Login user
   * @param loginData - User login data
   * @returns Promise<AuthResponse> - User and tokens
   */
  public async login(loginData: LoginDto): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await userRepository.findByEmail(loginData.email);
      if (!user) {
        throw new ApiError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        throw new ApiError('Invalid credentials', 401);
      }

      // Generate tokens
      const tokenPayload = { userId: user._id!.toHexString(), email: user.email };
      const accessToken = JwtUtils.generateAccessToken(tokenPayload);
      const refreshToken = JwtUtils.generateRefreshToken(tokenPayload);

      // Update last login (don't await as it's not critical)
      userRepository.updateLastLogin(user._id!.toHexString()).catch(err => {
        logger.warn('Failed to update last login:', err);
      });

      // Cache user data
      const userResponse = transformUserToResponse(user);
      await this.cacheUser(userResponse);

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        user: userResponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error during user login:', error);
      throw new ApiError('Login failed', 500);
    }
  }

  /**
   * Refresh access token
   * @param refreshToken - Refresh token
   * @returns Promise<{accessToken: string, refreshToken: string}> - New tokens
   */
  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = JwtUtils.verifyRefreshToken(refreshToken);

      // Check if user still exists
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      // Generate new tokens
      const tokenPayload = { userId: user._id!.toHexString(), email: user.email };
      const newAccessToken = JwtUtils.generateAccessToken(tokenPayload);
      const newRefreshToken = JwtUtils.generateRefreshToken(tokenPayload);

      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error refreshing token:', error);
      throw new ApiError('Token refresh failed', 500);
    }
  }

  /**
   * Get user profile
   * @param userId - User ID
   * @returns Promise<UserResponse> - User profile
   */
  public async getProfile(userId: string): Promise<UserResponse> {
    try {
      // Try cache first
      const cachedUser = await this.getCachedUser(userId);
      if (cachedUser) {
        return cachedUser;
      }

      // Get from database
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      const userResponse = transformUserToResponse(user);
      
      // Cache the user
      await this.cacheUser(userResponse);

      return userResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error getting user profile ${userId}:`, error);
      throw new ApiError('Failed to get user profile', 500);
    }
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updates - Profile updates
   * @returns Promise<UserResponse> - Updated user profile
   */
  public async updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'firstName' | 'lastName'>>
  ): Promise<UserResponse> {
    try {
      const updatedUser = await userRepository.updateById(userId, updates);
      if (!updatedUser) {
        throw new ApiError('User not found', 404);
      }

      const userResponse = transformUserToResponse(updatedUser);
      
      // Update cache
      await this.cacheUser(userResponse);

      logger.info(`User profile updated: ${userId}`);
      return userResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error updating user profile ${userId}:`, error);
      throw new ApiError('Failed to update user profile', 500);
    }
  }

  /**
   * Change user password
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Promise<void>
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Get current user
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new ApiError('Current password is incorrect', 400);
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new ApiError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400
        );
      }

      // Hash new password
      const hashedNewPassword = await PasswordUtils.hash(newPassword);

      // Update password
      await userRepository.updateById(userId, { password: hashedNewPassword });

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error changing password for user ${userId}:`, error);
      throw new ApiError('Failed to change password', 500);
    }
  }

  /**
   * Delete user account
   * @param userId - User ID
   * @returns Promise<void>
   */
  public async deleteAccount(userId: string): Promise<void> {
    try {
      const deleted = await userRepository.deleteById(userId);
      if (!deleted) {
        throw new ApiError('User not found', 404);
      }

      // Remove from cache
      await this.removeCachedUser(userId);

      logger.info(`User account deleted: ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error deleting user account ${userId}:`, error);
      throw new ApiError('Failed to delete account', 500);
    }
  }

  /**
   * Cache user data
   * @param user - User response data
   */
  private async cacheUser(user: UserResponse): Promise<void> {
    try {
      const cacheKey = RedisClient.getUserCacheKey(user.id);
      await redisClient.setJson(cacheKey, user, USER_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache user:', error);
      // Don't throw error as caching is not critical
    }
  }

  /**
   * Get cached user data
   * @param userId - User ID
   * @returns Promise<UserResponse | null>
   */
  private async getCachedUser(userId: string): Promise<UserResponse | null> {
    try {
      const cacheKey = RedisClient.getUserCacheKey(userId);
      return await redisClient.getJson<UserResponse>(cacheKey);
    } catch (error) {
      logger.warn(`Failed to get cached user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Remove user from cache
   * @param userId - User ID
   */
  private async removeCachedUser(userId: string): Promise<void> {
    try {
      const cacheKey = RedisClient.getUserCacheKey(userId);
      await redisClient.delete(cacheKey);
    } catch (error) {
      logger.warn(`Failed to remove cached user ${userId}:`, error);
      // Don't throw error as caching is not critical
    }
  }
}

export default UserService.getInstance();