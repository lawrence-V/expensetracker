import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import config from '../config/env';
import { JwtPayload } from '../models/user';
import { ApiError } from '../models/api-response';

export class JwtUtils {
  /**
   * Generate access token
   * @param payload - JWT payload containing user information
   * @returns string - JWT access token
   */
  public static generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: config.jwt.expiresIn as StringValue,
        issuer: 'expense-tracker-api',
        audience: 'expense-tracker-client',
      };
      return jwt.sign(payload as object, config.jwt.secret, options);
    } catch (error) {
      throw new ApiError('Error generating access token', 500);
    }
  }

  /**
   * Generate refresh token
   * @param payload - JWT payload containing user information
   * @returns string - JWT refresh token
   */
  public static generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: config.jwt.refreshExpiresIn as StringValue,
        issuer: 'expense-tracker-api',
        audience: 'expense-tracker-client',
      };
      return jwt.sign(payload as object, config.jwt.refreshSecret, options);
    } catch (error) {
      throw new ApiError('Error generating refresh token', 500);
    }
  }

  /**
   * Verify access token
   * @param token - JWT access token
   * @returns JwtPayload - Decoded token payload
   */
  public static verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'expense-tracker-api',
        audience: 'expense-tracker-client',
      }) as JwtPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError('Access token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError('Invalid access token', 401);
      } else {
        throw new ApiError('Token verification failed', 401);
      }
    }
  }

  /**
   * Verify refresh token
   * @param token - JWT refresh token
   * @returns JwtPayload - Decoded token payload
   */
  public static verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'expense-tracker-api',
        audience: 'expense-tracker-client',
      }) as JwtPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError('Refresh token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError('Invalid refresh token', 401);
      } else {
        throw new ApiError('Refresh token verification failed', 401);
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param token - JWT token
   * @returns any - Decoded payload
   */
  public static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new ApiError('Error decoding token', 400);
    }
  }

  /**
   * Get token expiration time
   * @param token - JWT token
   * @returns number - Expiration timestamp
   */
  public static getTokenExpiration(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      return decoded.exp || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if token is expired
   * @param token - JWT token
   * @returns boolean - True if token is expired
   */
  public static isTokenExpired(token: string): boolean {
    try {
      const exp = this.getTokenExpiration(token);
      return Date.now() >= exp * 1000;
    } catch (error) {
      return true;
    }
  }
}