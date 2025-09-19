"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const user_service_1 = __importDefault(require("../services/user-service"));
const api_response_1 = require("../models/api-response");
const error_handler_1 = require("../middlewares/error-handler");
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    constructor() {
        this.register = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const { firstName, lastName, email, password } = req.body;
            const result = await user_service_1.default.register({
                firstName,
                lastName,
                email,
                password,
            });
            logger_1.default.info(`New user registered: ${email}`);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'User registered successfully'));
        });
        this.login = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const { email, password } = req.body;
            const result = await user_service_1.default.login({ email, password });
            logger_1.default.info(`User logged in: ${email}`);
            res.json((0, api_response_1.createSuccessResponse)(result, 'Login successful'));
        });
        this.refreshToken = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const { refreshToken } = req.body;
            const result = await user_service_1.default.refreshToken(refreshToken);
            res.json((0, api_response_1.createSuccessResponse)(result, 'Token refreshed successfully'));
        });
        this.getProfile = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const user = await user_service_1.default.getProfile(userId);
            res.json((0, api_response_1.createSuccessResponse)(user, 'Profile retrieved successfully'));
        });
        this.updateProfile = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const { firstName, lastName } = req.body;
            const updatedUser = await user_service_1.default.updateProfile(userId, {
                firstName,
                lastName,
            });
            res.json((0, api_response_1.createSuccessResponse)(updatedUser, 'Profile updated successfully'));
        });
        this.changePassword = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;
            await user_service_1.default.changePassword(userId, currentPassword, newPassword);
            res.json((0, api_response_1.createSuccessResponse)(null, 'Password changed successfully'));
        });
        this.deleteAccount = (0, error_handler_1.asyncHandler)(async (req, res) => {
            const userId = req.user.userId;
            await user_service_1.default.deleteAccount(userId);
            logger_1.default.info(`User account deleted: ${userId}`);
            res.json((0, api_response_1.createSuccessResponse)(null, 'Account deleted successfully'));
        });
    }
}
exports.AuthController = AuthController;
exports.default = new AuthController();
//# sourceMappingURL=auth-controller.js.map