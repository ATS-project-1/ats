import bcrypt from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { config } from '../../config';
import { cleanupTestData } from '../../test-utils/cleanup';
import { userRepository } from '../user.repository';
import { verifyAccessToken } from './token';

const app = createApp();
const PASSWORD = 'Password123!';

const login = (body: unknown) =>
  request(app)
    .post('/auth/login')
    .send(body as object);

async function createUser(status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' = 'ACTIVE') {
  const email = `login-${Math.random().toString(36).slice(2, 10)}@test.local`;
  const user = await userRepository.create({
    email,
    passwordHash: await bcrypt.hash(PASSWORD, config.bcryptRounds),
    fullName: 'Login Tester',
    role: 'RECRUITER',
  });
  if (status !== 'PENDING_VERIFICATION') await userRepository.updateStatus(user.id, status);
  return { ...user, email };
}

describe('POST /auth/login', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('logs in with valid credentials', async () => {
    const user = await createUser();
    const res = await login({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.expiresIn).toBe(config.jwt.expiresInSeconds);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      fullName: 'Login Tester',
      role: 'RECRUITER',
      status: 'ACTIVE',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('issues a verifiable token with the right claims and lifetime', async () => {
    const user = await createUser();
    const { accessToken } = (await login({ email: user.email, password: PASSWORD })).body;

    expect(verifyAccessToken(accessToken)).toEqual({ sub: user.id, role: 'RECRUITER' });
    const payload = jwt.decode(accessToken) as JwtPayload;
    expect(payload.exp! - payload.iat!).toBe(config.jwt.expiresInSeconds);
  });

  it('puts no email or name in the token', async () => {
    const user = await createUser();
    const { accessToken } = (await login({ email: user.email, password: PASSWORD })).body;
    const payload = jwt.decode(accessToken) as Record<string, unknown>;

    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('fullName');
    const decoded = Buffer.from(accessToken.split('.')[1], 'base64url').toString();
    expect(decoded).not.toContain(user.email);
    expect(decoded).not.toContain('Login Tester');
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const user = await createUser();
    const res = await login({ email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('answers an unknown email exactly like a wrong password', async () => {
    const user = await createUser();
    const wrongPassword = await login({ email: user.email, password: 'wrong-password' });
    const unknownEmail = await login({ email: 'nobody@test.local', password: 'wrong-password' });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('ignores email case and surrounding spaces', async () => {
    const user = await createUser();
    const res = await login({ email: `  ${user.email.toUpperCase()} `, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('returns 403 ACCOUNT_SUSPENDED only when the password is right', async () => {
    const user = await createUser('SUSPENDED');

    const right = await login({ email: user.email, password: PASSWORD });
    expect(right.status).toBe(403);
    expect(right.body.error.code).toBe('ACCOUNT_SUSPENDED');

    const wrong = await login({ email: user.email, password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('lets a PENDING_VERIFICATION user log in', async () => {
    const user = await createUser('PENDING_VERIFICATION');
    const res = await login({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('PENDING_VERIFICATION');
  });

  it('rejects missing and extra fields with 400 VALIDATION_ERROR', async () => {
    const missing = await login({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    const paths = (missing.body.error.details as { path: string }[]).map((d) => d.path).sort();
    expect(paths).toEqual(['email', 'password']);

    const extra = await login({ email: 'a@test.local', password: PASSWORD, role: 'ADMIN' });
    expect(extra.status).toBe(400);
    expect(extra.body.error.code).toBe('VALIDATION_ERROR');

    const empty = await login({ email: 'a@test.local', password: '' });
    expect(empty.status).toBe(400);
  });
});
