"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_repository_1 = __importDefault(require("../repositories/user-repository"));
const redis_1 = __importStar(require("../config/redis"));
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const user_1 = require("../models/user");
const api_response_1 = require("../models/api-response");
const logger_1 = __importDefault(require("../utils/logger"));
const USER_CACHE_TTL = 3600;
class UserService {
    constructor() { }
    static getInstance() {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }
    async register(userData) {
        try {
            const existingUser = await user_repository_1.default.findByEmail(userData.email);
            if (existingUser) {
                throw new api_response_1.ApiError('Email already registered', 409);
            }
            const passwordValidation = password_1.PasswordUtils.validatePasswordStrength(userData.password);
            if (!passwordValidation.isValid) {
                throw new api_response_1.ApiError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
            }
            const hashedPassword = await password_1.PasswordUtils.hash(userData.password);
            const user = await user_repository_1.default.create({
                ...userData,
                password: hashedPassword,
            });
            const tokenPayload = { userId: user._id.toHexString(), email: user.email };
            const accessToken = jwt_1.JwtUtils.generateAccessToken(tokenPayload);
            const refreshToken = jwt_1.JwtUtils.generateRefreshToken(tokenPayload);
            const userResponse = (0, user_1.transformUserToResponse)(user);
            await this.cacheUser(userResponse);
            logger_1.default.info(`User registered successfully: ${user.email}`);
            return {
                user: userResponse,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error('Error during user registration:', error);
            throw new api_response_1.ApiError('Registration failed', 500);
        }
    }
    async login(loginData) {
        try {
            const user = await user_repository_1.default.findByEmail(loginData.email);
            if (!user) {
                throw new api_response_1.ApiError('Invalid credentials', 401);
            }
            const isPasswordValid = await password_1.PasswordUtils.compare(loginData.password, user.password);
            if (!isPasswordValid) {
                throw new api_response_1.ApiError('Invalid credentials', 401);
            }
            const tokenPayload = { userId: user._id.toHexString(), email: user.email };
            const accessToken = jwt_1.JwtUtils.generateAccessToken(tokenPayload);
            const refreshToken = jwt_1.JwtUtils.generateRefreshToken(tokenPayload);
            user_repository_1.default.updateLastLogin(user._id.toHexString()).catch(err => {
                logger_1.default.warn('Failed to update last login:', err);
            });
            const userResponse = (0, user_1.transformUserToResponse)(user);
            await this.cacheUser(userResponse);
            logger_1.default.info(`User logged in successfully: ${user.email}`);
            return {
                user: userResponse,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error('Error during user login:', error);
            throw new api_response_1.ApiError('Login failed', 500);
        }
    }
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt_1.JwtUtils.verifyRefreshToken(refreshToken);
            const user = await user_repository_1.default.findById(decoded.userId);
            if (!user) {
                throw new api_response_1.ApiError('User not found', 404);
            }
            const tokenPayload = { userId: user._id.toHexString(), email: user.email };
            const newAccessToken = jwt_1.JwtUtils.generateAccessToken(tokenPayload);
            const newRefreshToken = jwt_1.JwtUtils.generateRefreshToken(tokenPayload);
            logger_1.default.info(`Token refreshed for user: ${user.email}`);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error('Error refreshing token:', error);
            throw new api_response_1.ApiError('Token refresh failed', 500);
        }
    }
    async getProfile(userId) {
        try {
            const cachedUser = await this.getCachedUser(userId);
            if (cachedUser) {
                return cachedUser;
            }
            const user = await user_repository_1.default.findById(userId);
            if (!user) {
                throw new api_response_1.ApiError('User not found', 404);
            }
            const userResponse = (0, user_1.transformUserToResponse)(user);
            await this.cacheUser(userResponse);
            return userResponse;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error getting user profile ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to get user profile', 500);
        }
    }
    async updateProfile(userId, updates) {
        try {
            const updatedUser = await user_repository_1.default.updateById(userId, updates);
            if (!updatedUser) {
                throw new api_response_1.ApiError('User not found', 404);
            }
            const userResponse = (0, user_1.transformUserToResponse)(updatedUser);
            await this.cacheUser(userResponse);
            logger_1.default.info(`User profile updated: ${userId}`);
            return userResponse;
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error updating user profile ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to update user profile', 500);
        }
    }
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await user_repository_1.default.findById(userId);
            if (!user) {
                throw new api_response_1.ApiError('User not found', 404);
            }
            const isCurrentPasswordValid = await password_1.PasswordUtils.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new api_response_1.ApiError('Current password is incorrect', 400);
            }
            const passwordValidation = password_1.PasswordUtils.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                throw new api_response_1.ApiError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
            }
            const hashedNewPassword = await password_1.PasswordUtils.hash(newPassword);
            await user_repository_1.default.updateById(userId, { password: hashedNewPassword });
            logger_1.default.info(`Password changed for user: ${userId}`);
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error changing password for user ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to change password', 500);
        }
    }
    async deleteAccount(userId) {
        try {
            const deleted = await user_repository_1.default.deleteById(userId);
            if (!deleted) {
                throw new api_response_1.ApiError('User not found', 404);
            }
            await this.removeCachedUser(userId);
            logger_1.default.info(`User account deleted: ${userId}`);
        }
        catch (error) {
            if (error instanceof api_response_1.ApiError) {
                throw error;
            }
            logger_1.default.error(`Error deleting user account ${userId}:`, error);
            throw new api_response_1.ApiError('Failed to delete account', 500);
        }
    }
    async cacheUser(user) {
        try {
            const cacheKey = redis_1.RedisClient.getUserCacheKey(user.id);
            await redis_1.default.setJson(cacheKey, user, USER_CACHE_TTL);
        }
        catch (error) {
            logger_1.default.warn('Failed to cache user:', error);
        }
    }
    async getCachedUser(userId) {
        try {
            const cacheKey = redis_1.RedisClient.getUserCacheKey(userId);
            return await redis_1.default.getJson(cacheKey);
        }
        catch (error) {
            logger_1.default.warn(`Failed to get cached user ${userId}:`, error);
            return null;
        }
    }
    async removeCachedUser(userId) {
        try {
            const cacheKey = redis_1.RedisClient.getUserCacheKey(userId);
            await redis_1.default.delete(cacheKey);
        }
        catch (error) {
            logger_1.default.warn(`Failed to remove cached user ${userId}:`, error);
        }
    }
}
exports.UserService = UserService;
exports.default = UserService.getInstance();
//# sourceMappingURL=user-service.js.map