import { ObjectId, Collection } from 'mongodb';
import database from '../config/database';
import { User, CreateUserDto } from '../models/user';
import { ApiError } from '../models/api-response';
import logger from '../utils/logger';

export class UserRepository {
  private static instance: UserRepository;
  private collection: Collection<User> | null = null;

  private constructor() {}

  private getCollection(): Collection<User> {
    if (!this.collection) {
      this.collection = database.getCollection<User>('users');
    }
    return this.collection;
  }

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  /**
   * Create a new user
   * @param userData - User data
   * @returns Promise<User> - Created user
   */
  public async create(userData: CreateUserDto & { password: string }): Promise<User> {
    try {
      const now = new Date();
      const userDoc: Omit<User, '_id'> = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.getCollection().insertOne(userDoc as User);
      
      if (!result.insertedId) {
        throw new ApiError('Failed to create user', 500);
      }

      const createdUser = await this.findById(result.insertedId.toHexString());
      if (!createdUser) {
        throw new ApiError('Failed to retrieve created user', 500);
      }

      logger.info(`User created successfully: ${createdUser.email}`);
      return createdUser;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle MongoDB duplicate key error
      if ((error as any).code === 11000) {
        logger.warn(`Duplicate email attempted: ${userData.email}`);
        throw new ApiError('Email already exists', 409);
      }

      logger.error('Error creating user:', error);
      throw new ApiError('Failed to create user', 500);
    }
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns Promise<User | null> - User or null if not found
   */
  public async findById(id: string): Promise<User | null> {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const user = await this.getCollection().findOne({ _id: new ObjectId(id) });
      return user;
    } catch (error) {
      logger.error(`Error finding user by ID ${id}:`, error);
      throw new ApiError('Failed to find user', 500);
    }
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns Promise<User | null> - User or null if not found
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.getCollection().findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
      return user;
    } catch (error) {
      logger.error(`Error finding user by email ${email}:`, error);
      throw new ApiError('Failed to find user', 500);
    }
  }

  /**
   * Update user by ID
   * @param id - User ID
   * @param updates - Update data
   * @returns Promise<User | null> - Updated user or null if not found
   */
  public async updateById(
    id: string, 
    updates: Partial<Pick<User, 'firstName' | 'lastName' | 'password'>>
  ): Promise<User | null> {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const updateDoc = {
        ...updates,
        updatedAt: new Date(),
      };

      const result = await this.getCollection().findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

      if (!result) {
        return null;
      }

      logger.info(`User updated successfully: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw new ApiError('Failed to update user', 500);
    }
  }

  /**
   * Delete user by ID
   * @param id - User ID
   * @returns Promise<boolean> - True if deleted, false if not found
   */
  public async deleteById(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) {
        return false;
      }

      const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 1) {
        logger.info(`User deleted successfully: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw new ApiError('Failed to delete user', 500);
    }
  }

  /**
   * Check if email exists
   * @param email - Email to check
   * @param excludeId - User ID to exclude from check (for updates)
   * @returns Promise<boolean> - True if email exists
   */
  public async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      };

      if (excludeId && ObjectId.isValid(excludeId)) {
        query._id = { $ne: new ObjectId(excludeId) };
      }

      const user = await this.getCollection().findOne(query, { projection: { _id: 1 } });
      return user !== null;
    } catch (error) {
      logger.error(`Error checking email existence ${email}:`, error);
      throw new ApiError('Failed to check email', 500);
    }
  }

  /**
   * Get user count
   * @returns Promise<number> - Total number of users
   */
  public async count(): Promise<number> {
    try {
      return await this.getCollection().countDocuments();
    } catch (error) {
      logger.error('Error counting users:', error);
      throw new ApiError('Failed to count users', 500);
    }
  }

  /**
   * Find users with pagination
   * @param page - Page number (1-based)
   * @param limit - Number of users per page
   * @returns Promise<{users: User[], total: number}> - Users and total count
   */
  public async findWithPagination(
    page: number = 1, 
    limit: number = 20
  ): Promise<{ users: User[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        this.getCollection()
          .find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.getCollection().countDocuments()
      ]);

      return { users, total };
    } catch (error) {
      logger.error('Error finding users with pagination:', error);
      throw new ApiError('Failed to fetch users', 500);
    }
  }

  /**
   * Update user's last login timestamp
   * @param id - User ID
   * @returns Promise<void>
   */
  public async updateLastLogin(id: string): Promise<void> {
    try {
      if (!ObjectId.isValid(id)) {
        throw new ApiError('Invalid user ID', 400);
      }

      await this.getCollection().updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            lastLoginAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );

      logger.info(`Updated last login for user: ${id}`);
    } catch (error) {
      logger.error(`Error updating last login for user ${id}:`, error);
      // Don't throw error as this is not critical
    }
  }
}

export default UserRepository.getInstance();