"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaginatedResponse = exports.createErrorResponse = exports.createSuccessResponse = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
const createSuccessResponse = (data, message = 'Success') => ({
    success: true,
    message,
    data,
});
exports.createSuccessResponse = createSuccessResponse;
const createErrorResponse = (message, error, statusCode) => ({
    success: false,
    message,
    error: error || message,
    statusCode,
    timestamp: new Date().toISOString(),
});
exports.createErrorResponse = createErrorResponse;
const createPaginatedResponse = (data, page, limit, total, message = 'Success') => ({
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
exports.createPaginatedResponse = createPaginatedResponse;
//# sourceMappingURL=api-response.js.map