"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
const api_response_1 = require("../models/api-response");
class JwtUtils {
    static generateAccessToken(payload) {
        try {
            const options = {
                expiresIn: env_1.default.jwt.expiresIn,
                issuer: 'expense-tracker-api',
                audience: 'expense-tracker-client',
            };
            return jsonwebtoken_1.default.sign(payload, env_1.default.jwt.secret, options);
        }
        catch (error) {
            throw new api_response_1.ApiError('Error generating access token', 500);
        }
    }
    static generateRefreshToken(payload) {
        try {
            const options = {
                expiresIn: env_1.default.jwt.refreshExpiresIn,
                issuer: 'expense-tracker-api',
                audience: 'expense-tracker-client',
            };
            return jsonwebtoken_1.default.sign(payload, env_1.default.jwt.refreshSecret, options);
        }
        catch (error) {
            throw new api_response_1.ApiError('Error generating refresh token', 500);
        }
    }
    static verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.default.jwt.secret, {
                issuer: 'expense-tracker-api',
                audience: 'expense-tracker-client',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new api_response_1.ApiError('Access token expired', 401);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new api_response_1.ApiError('Invalid access token', 401);
            }
            else {
                throw new api_response_1.ApiError('Token verification failed', 401);
            }
        }
    }
    static verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.default.jwt.refreshSecret, {
                issuer: 'expense-tracker-api',
                audience: 'expense-tracker-client',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new api_response_1.ApiError('Refresh token expired', 401);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new api_response_1.ApiError('Invalid refresh token', 401);
            }
            else {
                throw new api_response_1.ApiError('Refresh token verification failed', 401);
            }
        }
    }
    static decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (error) {
            throw new api_response_1.ApiError('Error decoding token', 400);
        }
    }
    static getTokenExpiration(token) {
        try {
            const decoded = this.decodeToken(token);
            return decoded.exp || 0;
        }
        catch (error) {
            return 0;
        }
    }
    static isTokenExpired(token) {
        try {
            const exp = this.getTokenExpiration(token);
            return Date.now() >= exp * 1000;
        }
        catch (error) {
            return true;
        }
    }
}
exports.JwtUtils = JwtUtils;
//# sourceMappingURL=jwt.js.map