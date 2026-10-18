import type { RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On success, calls next(). On failure, returns 400 with mapped field errors.
 */
export function validateBody(schema: z.ZodSchema): RequestHandler {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: err.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        });
        return;
      }
      next(err);
    }
  };
}
