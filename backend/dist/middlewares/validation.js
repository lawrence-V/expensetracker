"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMultiple = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validate = void 0;
const api_response_1 = require("../models/api-response");
const logger_1 = __importDefault(require("../utils/logger"));
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            let dataToValidate;
            switch (source) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                default:
                    dataToValidate = req.body;
            }
            const { error, value } = schema.validate(dataToValidate, {
                abortEarly: false,
                stripUnknown: true,
                convert: true,
            });
            if (error) {
                const errorMessages = error.details.map(detail => detail.message);
                const errorResponse = (0, api_response_1.createErrorResponse)('Validation error', errorMessages.join(', '), 400);
                logger_1.default.warn(`Validation failed for ${source}:`, {
                    errors: errorMessages,
                    data: dataToValidate,
                });
                res.status(400).json(errorResponse);
                return;
            }
            switch (source) {
                case 'body':
                    req.body = value;
                    break;
                case 'query':
                    req.query = value;
                    break;
                case 'params':
                    req.params = value;
                    break;
            }
            next();
        }
        catch (err) {
            logger_1.default.error('Validation middleware error:', err);
            const errorResponse = (0, api_response_1.createErrorResponse)('Internal validation error', 'An error occurred during validation', 500);
            res.status(500).json(errorResponse);
        }
    };
};
exports.validate = validate;
const validateBody = (schema) => {
    return (0, exports.validate)(schema, 'body');
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (0, exports.validate)(schema, 'query');
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (0, exports.validate)(schema, 'params');
};
exports.validateParams = validateParams;
const validateMultiple = (validations) => {
    return (req, res, next) => {
        try {
            const errors = [];
            for (const validation of validations) {
                let dataToValidate;
                switch (validation.source) {
                    case 'body':
                        dataToValidate = req.body;
                        break;
                    case 'query':
                        dataToValidate = req.query;
                        break;
                    case 'params':
                        dataToValidate = req.params;
                        break;
                }
                const { error, value } = validation.schema.validate(dataToValidate, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                if (error) {
                    const errorMessages = error.details.map(detail => detail.message);
                    errors.push(...errorMessages);
                }
                else {
                    switch (validation.source) {
                        case 'body':
                            req.body = value;
                            break;
                        case 'query':
                            req.query = value;
                            break;
                        case 'params':
                            req.params = value;
                            break;
                    }
                }
            }
            if (errors.length > 0) {
                const errorResponse = (0, api_response_1.createErrorResponse)('Validation error', errors.join(', '), 400);
                logger_1.default.warn('Multiple validation failed:', { errors });
                res.status(400).json(errorResponse);
                return;
            }
            next();
        }
        catch (err) {
            logger_1.default.error('Multiple validation middleware error:', err);
            const errorResponse = (0, api_response_1.createErrorResponse)('Internal validation error', 'An error occurred during validation', 500);
            res.status(500).json(errorResponse);
        }
    };
};
exports.validateMultiple = validateMultiple;
//# sourceMappingURL=validation.js.map