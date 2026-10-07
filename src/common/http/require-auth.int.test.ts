import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { cleanupTestData } from '../../test-utils/cleanup';
import { authHeader, createCandidate } from '../../test-utils/factories';
import { userRepository } from '../../user/user.repository';
import { errorHandler } from './error-handler';
import { getAuth } from './get-auth';
import { requireAuth } from './require-auth';

function buildApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ auth: getAuth(req) });
  });
  app.use(errorHandler);
  return app;
}

const app = buildApp();

describe('requireAuth', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('rejects a missing header with 401 AUTH_REQUIRED and a WWW-Authenticate challenge', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it('rejects a non-Bearer scheme', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects "Bearer" with no token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('accepts a lowercase scheme and extra whitespace', async () => {
    const { user } = await createCandidate();
    const token = authHeader(user).Authorization.split(' ')[1];
    const res = await request(app).get('/protected').set('Authorization', `  bearer   ${token}  `);
    expect(res.status).toBe(200);
    expect(res.body.auth).toEqual({ userId: user.id, role: 'CANDIDATE' });
  });

  it('rejects a garbage token with 401 INVALID_TOKEN and a challenge', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it('rejects a token for a user who has since been deleted', async () => {
    const { user } = await createCandidate();
    const headers = authHeader(user);
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app).get('/protected').set(headers);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token for a user who has since been suspended with 403 ACCOUNT_SUSPENDED', async () => {
    const { user } = await createCandidate();
    const headers = authHeader(user);
    await userRepository.updateStatus(user.id, 'SUSPENDED');

    const res = await request(app).get('/protected').set(headers);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('uses the role from the database, not from the token', async () => {
    const { user } = await createCandidate();
    const headers = authHeader(user); // token says CANDIDATE
    await prisma.user.update({ where: { id: user.id }, data: { role: 'RECRUITER' } });

    const res = await request(app).get('/protected').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.auth.role).toBe('RECRUITER');
  });
});
