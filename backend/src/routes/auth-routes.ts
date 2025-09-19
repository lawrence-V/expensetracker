import { Router } from 'express';
import authController from '../controllers/auth-controller';
import { authenticateToken, validateRefreshToken } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import {
  createUserSchema,
  loginUserSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateUserSchema,
} from '../validators/user-validators';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register', validateBody(createUserSchema), authController.register);

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', validateBody(loginUserSchema), authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', validateBody(refreshTokenSchema), validateRefreshToken, authController.refreshToken);

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticateToken, validateBody(updateUserSchema), authController.updateProfile);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', authenticateToken, validateBody(changePasswordSchema), authController.changePassword);

/**
 * @route DELETE /api/auth/account
 * @desc Delete user account
 * @access Private
 */
router.delete('/account', authenticateToken, authController.deleteAccount);

export default router;