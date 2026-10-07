import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupTestData } from '../../test-utils/cleanup';
import { createRecruiterWithOrg, createUser } from '../../test-utils/factories';
import { recruiterProfileRepository } from '../recruiter-profile.repository';
import {
  assertMemberOf,
  getRecruiterMembership,
  requireMembership,
  requireOrgAdmin,
} from './organization-access';

const forbidden = (code: string) => ({ code, statusCode: 403 });

async function createOrgWithMember() {
  const admin = await createRecruiterWithOrg();
  const member = await createUser('RECRUITER');
  const profile = await recruiterProfileRepository.create(member.id);
  await recruiterProfileRepository.assignToOrganization(profile.id, admin.organization.id, false);
  return { admin, member, memberProfileId: profile.id };
}

describe('organization access helpers', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('getRecruiterMembership returns null without an organization', async () => {
    const user = await createUser('RECRUITER');
    expect(await getRecruiterMembership(user.id)).toBeNull();
    await recruiterProfileRepository.create(user.id);
    expect(await getRecruiterMembership(user.id)).toBeNull();
  });

  describe('requireMembership', () => {
    it('returns the membership for a member', async () => {
      const { admin, member, memberProfileId } = await createOrgWithMember();
      expect(await requireMembership(member.id)).toEqual({
        recruiterProfileId: memberProfileId,
        organizationId: admin.organization.id,
        isOrgAdmin: false,
      });
    });

    it('throws NOT_IN_ORGANIZATION for a recruiter with no organization', async () => {
      const user = await createUser('RECRUITER');
      await expect(requireMembership(user.id)).rejects.toMatchObject(
        forbidden('NOT_IN_ORGANIZATION'),
      );
    });
  });

  describe('requireOrgAdmin', () => {
    it('passes for an admin', async () => {
      const { admin } = await createOrgWithMember();
      expect(await requireOrgAdmin(admin.user.id)).toMatchObject({
        organizationId: admin.organization.id,
        isOrgAdmin: true,
      });
    });

    it('throws ORG_ADMIN_REQUIRED for a non-admin member', async () => {
      const { member } = await createOrgWithMember();
      await expect(requireOrgAdmin(member.id)).rejects.toMatchObject(
        forbidden('ORG_ADMIN_REQUIRED'),
      );
    });
  });

  describe('assertMemberOf', () => {
    it('passes for the own organization', async () => {
      const { admin, member } = await createOrgWithMember();
      await expect(assertMemberOf(admin.user.id, admin.organization.id)).resolves.toBeUndefined();
      await expect(assertMemberOf(member.id, admin.organization.id)).resolves.toBeUndefined();
    });

    it('throws NOT_ORGANIZATION_MEMBER for another organization', async () => {
      const a = await createRecruiterWithOrg();
      const b = await createRecruiterWithOrg();
      await expect(assertMemberOf(a.user.id, b.organization.id)).rejects.toMatchObject(
        forbidden('NOT_ORGANIZATION_MEMBER'),
      );
    });

    it('throws NOT_ORGANIZATION_MEMBER for a recruiter with no organization', async () => {
      const user = await createUser('RECRUITER');
      await expect(assertMemberOf(user.id, randomUUID())).rejects.toMatchObject(
        forbidden('NOT_ORGANIZATION_MEMBER'),
      );
    });
  });
});
