// ACCESS MATRIX: every new protected endpoint MUST be added to `matrix` below in the same PR that
// creates it. The test sends a request as every role (and with no token) and checks that only
// the listed roles get through. It checks access only, not endpoint behaviour.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Role } from './common/enums';
import { cleanupTestData } from './test-utils/cleanup';
import {
  authHeader,
  createAdmin,
  createCandidate,
  createRecruiterWithOrg,
} from './test-utils/factories';

type Method = 'get' | 'post' | 'patch' | 'delete';
type MatrixEntry = { method: Method; path: string; allowed: Role[] | 'public' };

const matrix: MatrixEntry[] = [
  { method: 'get', path: '/auth/me', allowed: ['CANDIDATE', 'RECRUITER', 'ADMIN'] },
  { method: 'get', path: '/candidates/me/profile', allowed: ['CANDIDATE'] },
  { method: 'patch', path: '/candidates/me/profile', allowed: ['CANDIDATE'] },
  { method: 'get', path: '/recruiters/me/profile', allowed: ['RECRUITER'] },
  { method: 'patch', path: '/recruiters/me/profile', allowed: ['RECRUITER'] },
  { method: 'post', path: '/organizations', allowed: ['RECRUITER'] },
  { method: 'get', path: '/organizations/me', allowed: ['RECRUITER'] },
  { method: 'patch', path: '/organizations/me', allowed: ['RECRUITER'] },
  { method: 'post', path: '/organizations/me/recruiters', allowed: ['RECRUITER'] },
];

const ROLES: Role[] = ['CANDIDATE', 'RECRUITER', 'ADMIN'];
const app = createApp();
const headers = {} as Record<Role, { Authorization: string }>;

beforeAll(async () => {
  await cleanupTestData();
  headers.CANDIDATE = authHeader((await createCandidate()).user);
  headers.RECRUITER = authHeader((await createRecruiterWithOrg()).user);
  headers.ADMIN = authHeader(await createAdmin());
});

afterAll(cleanupTestData);

function send(entry: MatrixEntry, authorization?: { Authorization: string }) {
  const req = request(app)
    [entry.method](entry.path)
    .set(authorization ?? {});
  return entry.method === 'get' || entry.method === 'delete' ? req : req.send({});
}

describe.each(matrix)('$method $path', (entry) => {
  if (entry.allowed !== 'public') {
    it('requires a token (401 without one)', async () => {
      expect((await send(entry)).status).toBe(401);
    });
  }

  it.each(ROLES)('role %s', async (role) => {
    const { status } = await send(entry, headers[role]);
    if (entry.allowed === 'public' || entry.allowed.includes(role)) {
      expect([401, 403]).not.toContain(status);
    } else {
      expect(status).toBe(403);
    }
  });
});
