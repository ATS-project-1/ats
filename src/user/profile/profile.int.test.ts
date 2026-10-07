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

type Actor = { id: string; role: Role };

const app = createApp();
const CANDIDATE = '/candidates/me/profile';
const RECRUITER = '/recruiters/me/profile';

const get = (path: string, user: Actor) => request(app).get(path).set(authHeader(user));
const patch = (path: string, user: Actor, body: unknown) =>
  request(app)
    .patch(path)
    .set(authHeader(user))
    .send(body as object);

const countCandidateProfiles = (userId: string) =>
  prisma.candidateProfile.count({ where: { userId } });
const countRecruiterProfiles = (userId: string) =>
  prisma.recruiterProfile.count({ where: { userId } });

function expectNoInternalKeys(body: unknown) {
  const text = JSON.stringify(body);
  expect(text).not.toMatch(/passwordHash|"userId"|"organizationId"|"status"/);
}

describe('candidate profile', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('creates the profile on first GET and returns the same one afterwards', async () => {
    const user = await createUser('CANDIDATE');
    expect(await countCandidateProfiles(user.id)).toBe(0);

    const first = await get(CANDIDATE, user);
    expect(first.status).toBe(200);
    expect(first.body.profile).toMatchObject({
      headline: null,
      location: null,
      phone: null,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });

    const second = await get(CANDIDATE, user);
    expect(second.body.profile.id).toBe(first.body.profile.id);
    expect(await countCandidateProfiles(user.id)).toBe(1);
    expectNoInternalKeys(first.body);
  });

  it('survives two concurrent first requests', async () => {
    const user = await createUser('CANDIDATE');
    const [a, b] = await Promise.all([get(CANDIDATE, user), get(CANDIDATE, user)]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.profile.id).toBe(b.body.profile.id);
    expect(await countCandidateProfiles(user.id)).toBe(1);
  });

  it('creates the profile when PATCH is the very first access', async () => {
    const user = await createUser('CANDIDATE');
    const res = await patch(CANDIDATE, user, {
      headline: '  Backend engineer ',
      phone: '+234 801',
    });

    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      headline: 'Backend engineer',
      phone: '+234 801',
      location: null,
    });
    expect(await countCandidateProfiles(user.id)).toBe(1);
  });

  it('updates only the fields sent', async () => {
    const { user } = await createCandidate();
    await patch(CANDIDATE, user, { headline: 'One', location: 'Lagos', phone: '+1 555 0100' });
    const res = await patch(CANDIDATE, user, { location: 'Abuja' });

    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      headline: 'One',
      location: 'Abuja',
      phone: '+1 555 0100',
    });
  });

  it('clears a field with null', async () => {
    const { user } = await createCandidate();
    await patch(CANDIDATE, user, { headline: 'One', location: 'Lagos' });
    const res = await patch(CANDIDATE, user, { headline: null });

    expect(res.status).toBe(200);
    expect(res.body.profile.headline).toBeNull();
    expect(res.body.profile.location).toBe('Lagos');
  });

  it('rejects an empty body, empty strings and an invalid phone', async () => {
    const { user } = await createCandidate();

    const empty = await patch(CANDIDATE, user, {});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(empty.body.error.details)).toContain('at least one field is required');

    expect((await patch(CANDIDATE, user, { headline: '' })).status).toBe(400);
    expect((await patch(CANDIDATE, user, { headline: '   ' })).status).toBe(400);
    expect((await patch(CANDIDATE, user, { phone: 'call-me-maybe' })).status).toBe(400);
    expect((await patch(CANDIDATE, user, { phone: '12345' })).status).toBe(400);
  });

  it.each(['userId', 'id', 'organizationId', 'isOrgAdmin'])(
    'rejects the extra field %s',
    async (key) => {
      const { user } = await createCandidate();
      const res = await patch(CANDIDATE, user, { headline: 'ok', [key]: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('keeps two candidates isolated', async () => {
    const a = (await createCandidate()).user;
    const b = (await createCandidate()).user;

    await patch(CANDIDATE, a, { headline: 'Alice headline' });
    await patch(CANDIDATE, b, { headline: 'Bob headline' });

    const ra = await get(CANDIDATE, a);
    const rb = await get(CANDIDATE, b);
    expect(ra.body.profile.headline).toBe('Alice headline');
    expect(rb.body.profile.headline).toBe('Bob headline');
    expect(ra.body.profile.id).not.toBe(rb.body.profile.id);
    expect(ra.body.profile.user.id).toBe(a.id);
    expect(rb.body.profile.user.id).toBe(b.id);
  });
});

describe('recruiter profile', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('shows no organization and isOrgAdmin false for a recruiter without one', async () => {
    const user = await createUser('RECRUITER');
    const res = await get(RECRUITER, user);

    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      jobTitle: null,
      isOrgAdmin: false,
      organization: null,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
    expect(await countRecruiterProfiles(user.id)).toBe(1);
    expectNoInternalKeys(res.body);
  });

  it('shows the organization and isOrgAdmin for a recruiter with one', async () => {
    const { user, organization } = await createRecruiterWithOrg();
    const res = await get(RECRUITER, user);

    expect(res.status).toBe(200);
    expect(res.body.profile.organization).toEqual({ id: organization.id, name: organization.name });
    expect(res.body.profile.isOrgAdmin).toBe(true);
    expectNoInternalKeys(res.body);
  });

  it('survives two concurrent first requests', async () => {
    const user = await createUser('RECRUITER');
    const [a, b] = await Promise.all([get(RECRUITER, user), get(RECRUITER, user)]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.profile.id).toBe(b.body.profile.id);
    expect(await countRecruiterProfiles(user.id)).toBe(1);
  });

  it('updates the job title', async () => {
    const { user } = await createRecruiterWithOrg();
    const res = await patch(RECRUITER, user, { jobTitle: 'Head of Talent' });

    expect(res.status).toBe(200);
    expect(res.body.profile.jobTitle).toBe('Head of Talent');
    expect(res.body.profile.isOrgAdmin).toBe(true);
  });

  it.each([{ isOrgAdmin: true }, { organizationId: 'x' }, { userId: 'x' }])(
    'rejects extra fields %j',
    async (extra) => {
      const { user } = await createRecruiterWithOrg();
      const res = await patch(RECRUITER, user, { jobTitle: 'ok', ...extra });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('rejects an empty body', async () => {
    const { user } = await createRecruiterWithOrg();
    expect((await patch(RECRUITER, user, {})).status).toBe(400);
  });
});
