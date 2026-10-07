/**
 * Organization access helpers.
 *
 * FOR THE JOB POSTINGS TICKET:
 * - When a recruiter CREATES a job posting, the organizationId must come from
 *   requireMembership(userId), NEVER from the request body. A client-supplied organizationId
 *   would let a recruiter post on behalf of an organization they don't belong to.
 * - When a recruiter EDITS or VIEWS an existing posting, call
 *   assertMemberOf(userId, posting.organizationId) with the posting's own organizationId.
 */
import type { DbClient } from '../../common/db';
import { ForbiddenError } from '../../common/errors';
import { recruiterProfileRepository } from '../recruiter-profile.repository';

export interface RecruiterMembership {
  recruiterProfileId: string;
  organizationId: string;
  isOrgAdmin: boolean;
}

/** The recruiter's organization membership, or null when they have no organization. */
export async function getRecruiterMembership(
  userId: string,
  db?: DbClient,
): Promise<RecruiterMembership | null> {
  const profile = await recruiterProfileRepository.findByUserId(userId, db);
  if (!profile?.organization) return null;
  return {
    recruiterProfileId: profile.id,
    organizationId: profile.organization.id,
    isOrgAdmin: profile.isOrgAdmin,
  };
}

export async function requireMembership(
  userId: string,
  db?: DbClient,
): Promise<RecruiterMembership> {
  const membership = await getRecruiterMembership(userId, db);
  if (!membership) {
    throw new ForbiddenError(
      'You must belong to an organization to do this',
      'NOT_IN_ORGANIZATION',
    );
  }
  return membership;
}

export async function requireOrgAdmin(userId: string, db?: DbClient): Promise<RecruiterMembership> {
  const membership = await requireMembership(userId, db);
  if (!membership.isOrgAdmin) {
    throw new ForbiddenError('Only organization admins can do this', 'ORG_ADMIN_REQUIRED');
  }
  return membership;
}

/** Throws unless the user is a recruiter in exactly this organization. */
export async function assertMemberOf(
  userId: string,
  organizationId: string,
  db?: DbClient,
): Promise<void> {
  const membership = await getRecruiterMembership(userId, db);
  if (membership?.organizationId !== organizationId) {
    throw new ForbiddenError(
      'You are not a member of this organization',
      'NOT_ORGANIZATION_MEMBER',
    );
  }
}
