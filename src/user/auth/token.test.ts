import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '../../common/errors';
import { config } from '../../config';
import { signAccessToken, verifyAccessToken } from './token';

const userId = randomUUID();

function validOptions(overrides: jwt.SignOptions = {}): jwt.SignOptions {
  return {
    algorithm: 'HS256',
    expiresIn: 60,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    subject: userId,
    ...overrides,
  };
}

function expectInvalid(token: string) {
  try {
    verifyAccessToken(token);
  } catch (err) {
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect((err as UnauthorizedError).code).toBe('INVALID_TOKEN');
    expect((err as UnauthorizedError).statusCode).toBe(401);
    return;
  }
  throw new Error('verifyAccessToken did not throw');
}

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('access tokens', () => {
  it('round-trips sub and role', () => {
    const token = signAccessToken({ id: userId, role: 'RECRUITER' });
    expect(verifyAccessToken(token)).toEqual({ sub: userId, role: 'RECRUITER' });
  });

  it('carries only the role in the payload (plus standard claims)', () => {
    const payload = jwt.decode(signAccessToken({ id: userId, role: 'CANDIDATE' })) as Record<
      string,
      unknown
    >;
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'role', 'sub']);
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ role: 'CANDIDATE' }, 'x'.repeat(40), validOptions());
    expectInvalid(token);
  });

  it('rejects an expired token', () => {
    const token = jwt.sign(
      { role: 'CANDIDATE' },
      config.jwt.secret,
      validOptions({ expiresIn: -10 }),
    );
    expectInvalid(token);
  });

  it('rejects a token with alg "none"', () => {
    const header = b64url({ alg: 'none', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      role: 'ADMIN',
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    expectInvalid(`${header}.${payload}.`);
  });

  it('rejects a token signed with a different HMAC algorithm', () => {
    const token = jwt.sign(
      { role: 'CANDIDATE' },
      config.jwt.secret,
      validOptions({ algorithm: 'HS512' }),
    );
    expectInvalid(token);
  });

  it('rejects the wrong issuer', () => {
    expectInvalid(
      jwt.sign({ role: 'CANDIDATE' }, config.jwt.secret, validOptions({ issuer: 'someone-else' })),
    );
  });

  it('rejects the wrong audience', () => {
    expectInvalid(
      jwt.sign({ role: 'CANDIDATE' }, config.jwt.secret, validOptions({ audience: 'other-api' })),
    );
  });

  it('rejects a payload with an invalid role or a non-UUID subject', () => {
    expectInvalid(jwt.sign({ role: 'GOD' }, config.jwt.secret, validOptions()));
    expectInvalid(
      jwt.sign({ role: 'CANDIDATE' }, config.jwt.secret, validOptions({ subject: 'not-a-uuid' })),
    );
    expectInvalid(jwt.sign({}, config.jwt.secret, validOptions()));
  });

  it('rejects garbage', () => {
    expectInvalid('not.a.jwt');
    expectInvalid('garbage');
    expectInvalid('');
  });
});
