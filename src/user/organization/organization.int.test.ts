import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { prisma } from '../../common/db';
import type { Role } from '../../common/enums';
import { cleanupTestData } from '../../test-utils/cleanup';
import {
  authHeader,
  createCandidate,
  createRecruiterWithOrg,
  createUser,
} from '../../test-utils/factories';
import { recruiterProfileRepository } from '../recruiter-profile.repository';

type Actor = { id: string; role: Role };

const app = createApp();

// Names start with "Test Org " so cleanupTestData() removes them even if a test fails.
const orgName = (tag: string) => `Test Org ${tag}-${randomUUID().slice(0, 8)}`;

const post = (path: string, actor: Actor, body: unknown) =>
  request(app)
    .post(path)
    .set(authHeader(actor))
    .send(body as object);
const patch = (path: string, actor: Actor, body: unknown) =>
  request(app)
    .patch(path)
    .set(authHeader(actor))
    .send(body as object);
const get = (path: string, actor: Actor) => request(app).get(path).set(authHeader(actor));

const countOrgsNamed = (name: string) => prisma.organization.count({ where: { name } });

/** An organization admin plus a non-admin member of the same organization. */
async function createOrgWithMember() {
  const admin = await createRecruiterWithOrg();
  const member = await createUser('RECRUITER');
  const profile = await recruiterProfileRepository.create(member.id);
  await recruiterProfileRepository.assignToOrganization(profile.id, admin.organization.id, false);
  return { admin, member };
}

describe('organizations', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  describe('POST /organizations', () => {
    it('creates an organization and makes the creator its admin', async () => {
      const user = await createUser('RECRUITER');
      const name = orgName('create');
      const res = await post('/organizations', user, {
        name,
        description: 'We hire',
        website: 'https://example.com',
      });

      expect(res.status).toBe(201);
      expect(res.body.organization).toMatchObject({
        name,
        description: 'We hire',
        website: 'https://example.com',
      });
      expect(res.body.organization.recruiters).toHaveLength(1);
      expect(res.body.organization.recruiters[0]).toMatchObject({
        isOrgAdmin: true,
        user: { id: user.id, email: user.email, fullName: user.fullName },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);

      const profile = await get('/recruiters/me/profile', user);
      expect(profile.body.profile.organization).toEqual({
        id: res.body.organization.id,
        name,
      });
      expect(profile.body.profile.isOrgAdmin).toBe(true);
    });

    it('rejects a second organization with 409 ALREADY_IN_ORGANIZATION', async () => {
      const user = await createUser('RECRUITER');
      const first = orgName('first');
      const second = orgName('second');
      await post('/organizations', user, { name: first }).expect(201);

      const res = await post('/organizations', user, { name: second });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_IN_ORGANIZATION');
      expect(await countOrgsNamed(first)).toBe(1);
      expect(await countOrgsNamed(second)).toBe(0); // rolled back, no orphan
    });

    it('lets exactly one of two concurrent creates win and leaves no orphan', async () => {
      const user = await createUser('RECRUITER');
      const name = orgName('race');
      const results = await Promise.all([
        post('/organizations', user, { name }),
        post('/organizations', user, { name }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)!.body.error.code).toBe(
        'ALREADY_IN_ORGANIZATION',
      );
      expect(await countOrgsNamed(name)).toBe(1);
    });

    it.each([
      ['a 1-character name', { name: 'A' }],
      ['a javascript: website', { name: 'Valid Name', website: 'javascript:alert(1)' }],
      ['an ftp: website', { name: 'Valid Name', website: 'ftp://example.com' }],
      ['an extra isOrgAdmin field', { name: 'Valid Name', isOrgAdmin: true }],
      ['a missing name', {}],
    ])('rejects %s', async (_label, body) => {
      const user = await createUser('RECRUITER');
      const res = await post('/organizations', user, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(
        await prisma.recruiterProfile.count({ where: { userId: user.id } }),
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /organizations/me', () => {
    it('returns 404 NOT_IN_ORGANIZATION for a recruiter without one', async () => {
      const user = await createUser('RECRUITER');
      const res = await get('/organizations/me', user);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_IN_ORGANIZATION');
    });

    it("never shows another organization's data", async () => {
      const a = await createRecruiterWithOrg();
      const b = await createRecruiterWithOrg();

      const res = await get('/organizations/me', a.user);
      expect(res.status).toBe(200);
      expect(res.body.organization.id).toBe(a.organization.id);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(b.organization.id);
      expect(text).not.toContain(b.user.email);
      expect(text).not.toMatch(/passwordHash/);
    });
  });

  describe('PATCH /organizations/me', () => {
    it('lets the org admin update it, including clearing the website', async () => {
      const { admin } = await createOrgWithMember();
      await patch('/organizations/me', admin.user, { website: 'https://old.example.com' }).expect(
        200,
      );

      const updated = await patch('/organizations/me', admin.user, { description: 'New text' });
      expect(updated.status).toBe(200);
      expect(updated.body.organization.description).toBe('New text');
      expect(updated.body.organization.website).toBe('https://old.example.com');

      const cleared = await patch('/organizations/me', admin.user, { website: null });
      expect(cleared.status).toBe(200);
      expect(cleared.body.organization.website).toBeNull();
    });

    it('rejects a non-admin member with 403 ORG_ADMIN_REQUIRED', async () => {
      const { member } = await createOrgWithMember();
      const res = await patch('/organizations/me', member, { description: 'hijack' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ORG_ADMIN_REQUIRED');
    });

    it('rejects an empty body', async () => {
      const { admin } = await createOrgWithMember();
      expect((await patch('/organizations/me', admin.user, {})).status).toBe(400);
    });
  });

  describe('POST /organizations/me/recruiters', () => {
    it('adds an unassigned recruiter as a non-admin member', async () => {
      const admin = await createRecruiterWithOrg();
      const target = await createUser('RECRUITER');
      await recruiterProfileRepository.create(target.id);

      const res = await post('/organizations/me/recruiters', admin.user, { email: target.email });
      expect(res.status).toBe(200);
      const added = res.body.organization.recruiters.find(
        (r: { user: { id: string } }) => r.user.id === target.id,
      );
      expect(added.isOrgAdmin).toBe(false);

      const profile = await get('/recruiters/me/profile', target);
      expect(profile.body.profile.organization.id).toBe(admin.organization.id);
      expect(profile.body.profile.isOrgAdmin).toBe(false);
    });

    it('adds a recruiter who has never had a profile (the profile gets created)', async () => {
      const admin = await createRecruiterWithOrg();
      const target = await createUser('RECRUITER');
      expect(await prisma.recruiterProfile.count({ where: { userId: target.id } })).toBe(0);

      const res = await post('/organizations/me/recruiters', admin.user, {
        email: `  ${target.email.toUpperCase()} `,
      });
      expect(res.status).toBe(200);
      expect(await prisma.recruiterProfile.count({ where: { userId: target.id } })).toBe(1);
    });

    it("returns 404 RECRUITER_NOT_FOUND for a candidate's email and for an unknown email", async () => {
      const admin = await createRecruiterWithOrg();
      const { user: candidate } = await createCandidate();

      for (const email of [candidate.email, 'nobody@test.local']) {
        const res = await post('/organizations/me/recruiters', admin.user, { email });
        expect(res.status).toBe(404);
        expect(res.body.error).toEqual({
          code: 'RECRUITER_NOT_FOUND',
          message: 'No recruiter account with this email',
        });
      }
    });

    it('returns 409 for a recruiter already in another organization', async () => {
      const admin = await createRecruiterWithOrg();
      const other = await createRecruiterWithOrg();

      const res = await post('/organizations/me/recruiters', admin.user, {
        email: other.user.email,
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_IN_ORGANIZATION');

      const otherOrg = await get('/organizations/me', other.user);
      expect(otherOrg.body.organization.id).toBe(other.organization.id);
    });

    it('rejects a non-admin member with 403 ORG_ADMIN_REQUIRED', async () => {
      const { member } = await createOrgWithMember();
      const target = await createUser('RECRUITER');
      const res = await post('/organizations/me/recruiters', member, { email: target.email });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ORG_ADMIN_REQUIRED');
    });
  });
});
