import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors';

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function bodyParserErrorType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const { type } = err as { type: unknown };
    return typeof type === 'string' ? type : undefined;
  }
  return undefined;
}

// 401 codes raised by requireAuth; these responses must carry a WWW-Authenticate challenge.
const CHALLENGE_CODES = new Set(['AUTH_REQUIRED', 'INVALID_TOKEN']);

/** Final Express error middleware; every error response uses the ErrorBody shape. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const send = (status: number, error: ErrorBody['error']) => {
    res.status(status).json({ error } satisfies ErrorBody);
  };

  if (err instanceof AppError) {
    if (err.statusCode === 401 && CHALLENGE_CODES.has(err.code)) {
      res.set('WWW-Authenticate', 'Bearer');
    }
    send(err.statusCode, { code: err.code, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    send(400, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const isFileTooLarge = err.code === 'LIMIT_FILE_SIZE';
    send(isFileTooLarge ? 413 : 400, {
      code: isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_FILE_UPLOAD',
      message: isFileTooLarge
        ? 'Uploaded file exceeds the 5 MB size limit'
        : 'Invalid multipart file upload',
    });
    return;
  }

  if (err instanceof Error && err.message === 'Unsupported_Media_Type') {
    res.status(415).json({ error: 'Only PDF and DOCX files are allowed.' });
    return;
  }

  const type = bodyParserErrorType(err);
  if (err instanceof SyntaxError && type === 'entity.parse.failed') {
    send(400, { code: 'INVALID_JSON', message: 'Request body is not valid JSON' });
    return;
  }
  if (type === 'entity.too.large') {
    send(413, { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' });
    return;
  }

  // Structured logging arrives in a later ticket.
  console.error('Unhandled error:', err);
  send(500, { code: 'INTERNAL_ERROR', message: 'Internal server error' });
};
