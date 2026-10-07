import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { cleanupTestData } from '../../test-utils/cleanup';
import { userRepository } from '../user.repository';

const app = createApp();
const PASSWORD = 'correct-horse-battery';

function valid(overrides: Record<string, unknown> = {}) {
  return {
    email: `ada-${Math.random().toString(36).slice(2, 10)}@test.local`,
    password: PASSWORD,
    fullName: 'Ada Lovelace',
    role: 'CANDIDATE',
    ...overrides,
  };
}

const register = (body: unknown) =>
  request(app)
    .post('/auth/register')
    .send(body as object);

function detailPaths(res: request.Response): string[] {
  return (res.body.error.details as { path: string }[]).map((d) => d.path);
}

describe('POST /auth/register', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('registers a user and never returns the password hash', async () => {
    const body = valid();
    const res = await register(body);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: body.email,
      fullName: 'Ada Lovelace',
      role: 'CANDIDATE',
      status: 'PENDING_VERIFICATION',
    });
    expect(res.body.user.id).toEqual(expect.any(String));
    expect(res.body.user.createdAt).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password/i);
  });

  it('stores a bcrypt hash that matches the password, not the plaintext', async () => {
    const body = valid();
    await register(body).expect(201);

    const stored = await userRepository.findByEmailForAuth(body.email);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, stored!.passwordHash)).toBe(true);
  });

  it('trims and lowercases the email', async () => {
    const local = `ada-${Math.random().toString(36).slice(2, 10)}`;
    const res = await register(valid({ email: `  ${local.toUpperCase()}@Test.Local ` }));

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(`${local}@test.local`);
    expect(await userRepository.findByEmail(`${local}@test.local`)).not.toBeNull();
  });

  it('rejects a duplicate email with 409 EMAIL_TAKEN, including a case-only variant', async () => {
    const body = valid({ email: 'dupe@test.local' });
    await register(body).expect(201);

    const same = await register(body);
    expect(same.status).toBe(409);
    expect(same.body.error.code).toBe('EMAIL_TAKEN');

    const variant = await register({ ...body, email: 'Dupe@TEST.local' });
    expect(variant.status).toBe(409);
    expect(variant.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('lets exactly one of two concurrent registrations win', async () => {
    const body = valid({ email: 'race@test.local' });
    const results = await Promise.all([register(body), register(body)]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(loser.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects role ADMIN', async () => {
    const res = await register(valid({ role: 'ADMIN' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(detailPaths(res)).toContain('role');
  });

  it('rejects unknown fields (strict schema)', async () => {
    const res = await register(valid({ status: 'ACTIVE' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reports every missing field', async () => {
    const res = await register({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(detailPaths(res).sort()).toEqual(['email', 'fullName', 'password', 'role']);
  });

  it('rejects an invalid email', async () => {
    const res = await register(valid({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(detailPaths(res)).toEqual(['email']);
  });

  it('rejects a 7-character password', async () => {
    const res = await register(valid({ password: '1234567' }));
    expect(res.status).toBe(400);
    expect(detailPaths(res)).toEqual(['password']);
  });

  it('rejects a password over 72 bytes (multi-byte characters count as bytes)', async () => {
    // 40 characters but 80 bytes in UTF-8.
    const password = 'é'.repeat(40);
    expect(password.length).toBeLessThanOrEqual(72);
    const res = await register(valid({ password }));
    expect(res.status).toBe(400);
    expect(detailPaths(res)).toEqual(['password']);
    expect(res.body.error.details[0].message).toBe('password must be at most 72 bytes');
  });

  it('rejects malformed JSON with INVALID_JSON', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 404 ROUTE_NOT_FOUND for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
