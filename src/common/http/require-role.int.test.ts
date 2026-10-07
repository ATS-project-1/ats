import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupTestData } from '../../test-utils/cleanup';
import {
  authHeader,
  createAdmin,
  createCandidate,
  createRecruiterWithOrg,
} from '../../test-utils/factories';
import { errorHandler } from './error-handler';
import { requireAuth } from './require-auth';
import { requireRole } from './require-role';

const ok = (_req: express.Request, res: express.Response) => {
  res.json({ ok: true });
};

function buildApp() {
  const app = express();
  app.get('/recruiters-only', requireAuth, requireRole('RECRUITER'), ok);
  app.get('/no-auth', requireRole('RECRUITER'), ok); // misconfigured: requireAuth missing
  app.use(errorHandler);
  return app;
}

const app = buildApp();

describe('requireRole', () => {
  beforeEach(async () => {
    await cleanupTestData();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestData();
  });

  it('lets an allowed role through', async () => {
    const { user } = await createRecruiterWithOrg();
    const res = await request(app).get('/recruiters-only').set(authHeader(user));
    expect(res.status).toBe(200);
  });

  it('rejects a CANDIDATE with 403 FORBIDDEN', async () => {
    const { user } = await createCandidate();
    const res = await request(app).get('/recruiters-only').set(authHeader(user));
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    });
  });

  it('gives ADMIN no implicit access', async () => {
    const admin = await createAdmin();
    const res = await request(app).get('/recruiters-only').set(authHeader(admin));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 500 when requireAuth was not mounted before requireRole', async () => {
    const res = await request(app).get('/no-auth');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('throws when defined with no roles', () => {
    expect(() => requireRole()).toThrow();
  });
});
