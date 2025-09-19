import { Request, Response } from 'express';
import userService from '../services/user-service';
import { createSuccessResponse } from '../models/api-response';
import { asyncHandler } from '../middlewares/error-handler';
import logger from '../utils/logger';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  public register = asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body;
    
    const result = await userService.register({
      firstName,
      lastName,
      email,
      password,
    });

    logger.info(`New user registered: ${email}`);
    
    res.status(201).json(createSuccessResponse(
      result,
      'User registered successfully'
    ));
  });

  /**
   * User login
   * POST /api/auth/login
   */
  public login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    const result = await userService.login({ email, password });

    logger.info(`User logged in: ${email}`);
    
    res.json(createSuccessResponse(
      result,
      'Login successful'
    ));
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  public refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    const result = await userService.refreshToken(refreshToken);
    
    res.json(createSuccessResponse(
      result,
      'Token refreshed successfully'
    ));
  });

  /**
   * Get user profile
   * GET /api/auth/profile
   */
  public getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    
    const user = await userService.getProfile(userId);
    
    res.json(createSuccessResponse(
      user,
      'Profile retrieved successfully'
    ));
  });

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  public updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { firstName, lastName } = req.body;
    
    const updatedUser = await userService.updateProfile(userId, {
      firstName,
      lastName,
    });
    
    res.json(createSuccessResponse(
      updatedUser,
      'Profile updated successfully'
    ));
  });

  /**
   * Change password
   * POST /api/auth/change-password
   */
  public changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;
    
    await userService.changePassword(userId, currentPassword, newPassword);
    
    res.json(createSuccessResponse(
      null,
      'Password changed successfully'
    ));
  });

  /**
   * Delete user account
   * DELETE /api/auth/account
   */
  public deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    
    await userService.deleteAccount(userId);
    
    logger.info(`User account deleted: ${userId}`);
    
    res.json(createSuccessResponse(
      null,
      'Account deleted successfully'
    ));
  });
}

export default new AuthController();