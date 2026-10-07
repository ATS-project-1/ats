import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../errors';
import { errorHandler } from './error-handler';

function appThrowing(err: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns a generic Error into a 500 without leaking the message or stack', async () => {
    const res = await request(appThrowing(new Error('db password is hunter2'))).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('hunter2');
    expect(text).not.toMatch(/stack|\.ts|\.js|at /);
    expect(console.error).toHaveBeenCalled();
  });

  it('maps AppError subclasses to their status and code', async () => {
    const res = await request(appThrowing(new ConflictError('taken', 'EMAIL_TAKEN'))).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { code: 'EMAIL_TAKEN', message: 'taken' } });
  });
});
