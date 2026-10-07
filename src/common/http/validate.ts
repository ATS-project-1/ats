import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/** Parses req.body with the schema and replaces it with the cleaned result. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}
