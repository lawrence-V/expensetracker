import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createErrorResponse } from '../models/api-response';
import logger from '../utils/logger';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Generic validation middleware factory
 * @param schema - Joi validation schema
 * @param source - Source of data to validate (body, query, params)
 * @returns Express middleware function
 */
export const validate = (schema: Joi.ObjectSchema, source: ValidationSource = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate: any;
      
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
        const errorResponse = createErrorResponse(
          'Validation error',
          errorMessages.join(', '),
          400
        );
        
        logger.warn(`Validation failed for ${source}:`, {
          errors: errorMessages,
          data: dataToValidate,
        });
        
        res.status(400).json(errorResponse);
        return;
      }

      // Replace the original data with validated and sanitized data
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
    } catch (err) {
      logger.error('Validation middleware error:', err);
      const errorResponse = createErrorResponse(
        'Internal validation error',
        'An error occurred during validation',
        500
      );
      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Validate request body
 * @param schema - Joi validation schema
 * @returns Express middleware function
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'body');
};

/**
 * Validate query parameters
 * @param schema - Joi validation schema
 * @returns Express middleware function
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'query');
};

/**
 * Validate route parameters
 * @param schema - Joi validation schema
 * @returns Express middleware function
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'params');
};

/**
 * Multiple validation middleware
 * @param validations - Array of validation configurations
 * @returns Express middleware function
 */
export const validateMultiple = (validations: Array<{
  schema: Joi.ObjectSchema;
  source: ValidationSource;
}>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = [];

      for (const validation of validations) {
        let dataToValidate: any;
        
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
        } else {
          // Update the request with validated data
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
        const errorResponse = createErrorResponse(
          'Validation error',
          errors.join(', '),
          400
        );
        
        logger.warn('Multiple validation failed:', { errors });
        res.status(400).json(errorResponse);
        return;
      }

      next();
    } catch (err) {
      logger.error('Multiple validation middleware error:', err);
      const errorResponse = createErrorResponse(
        'Internal validation error',
        'An error occurred during validation',
        500
      );
      res.status(500).json(errorResponse);
    }
  };
};