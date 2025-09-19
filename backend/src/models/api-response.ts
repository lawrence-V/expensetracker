export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createSuccessResponse = <T>(
  data: T,
  message: string = 'Success'
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

export const createErrorResponse = (
  message: string,
  error?: string,
  statusCode?: number
): ErrorResponse => ({
  success: false,
  message,
  error: error || message,
  statusCode,
  timestamp: new Date().toISOString(),
});

export const createPaginatedResponse = <T>(
  data: T,
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): PaginatedResponse<T> => ({
  success: true,
  message,
  data,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  },
});