"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controllers/auth-controller"));
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const user_validators_1 = require("../validators/user-validators");
const router = (0, express_1.Router)();
router.post('/register', (0, validation_1.validateBody)(user_validators_1.createUserSchema), auth_controller_1.default.register);
router.post('/login', (0, validation_1.validateBody)(user_validators_1.loginUserSchema), auth_controller_1.default.login);
router.post('/refresh', (0, validation_1.validateBody)(user_validators_1.refreshTokenSchema), auth_1.validateRefreshToken, auth_controller_1.default.refreshToken);
router.get('/profile', auth_1.authenticateToken, auth_controller_1.default.getProfile);
router.put('/profile', auth_1.authenticateToken, (0, validation_1.validateBody)(user_validators_1.updateUserSchema), auth_controller_1.default.updateProfile);
router.post('/change-password', auth_1.authenticateToken, (0, validation_1.validateBody)(user_validators_1.changePasswordSchema), auth_controller_1.default.changePassword);
router.delete('/account', auth_1.authenticateToken, auth_controller_1.default.deleteAccount);
exports.default = router;
//# sourceMappingURL=auth-routes.js.map