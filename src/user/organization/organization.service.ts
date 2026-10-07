import { withTransaction } from '../../common/db';
import { ConflictError, NotFoundError } from '../../common/errors';
import { organizationRepository } from '../organization.repository';
import { recruiterProfileRepository } from '../recruiter-profile.repository';
import { profileService } from '../profile/profile.service';
import { userRepository } from '../user.repository';
import { getRecruiterMembership, requireOrgAdmin } from './organization-access';
import type {
  AddRecruiterInput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schemas';

// TODO (out of scope for TICKET-105): removing members, transferring admin rights, and deleting
// organizations.

const alreadyInOrganization = () =>
  new ConflictError('The recruiter already belongs to an organization', 'ALREADY_IN_ORGANIZATION');

async function loadOrganization(organizationId: string) {
  const organization = await organizationRepository.findByIdWithMembers(organizationId);
  if (!organization) throw new NotFoundError('Organization not found', 'NOT_IN_ORGANIZATION');
  return organization;
}

export const organizationService = {
  async create(userId: string, input: CreateOrganizationInput) {
    const profile = await profileService.getOrCreateRecruiterProfile(userId);

    return withTransaction(async (tx) => {
      const organization = await organizationRepository.create(input, tx);
      const assigned = await recruiterProfileRepository.assignToOrganizationIfUnassigned(
        profile.id,
        organization.id,
        true,
        tx,
      );
      // Throwing inside the transaction rolls back the organization insert too, so a recruiter
      // who is already in an organization never leaves an orphan organization behind.
      if (!assigned) throw alreadyInOrganization();

      const created = await organizationRepository.findByIdWithMembers(organization.id, tx);
      return created!;
    });
  },

  async getMine(userId: string) {
    const membership = await getRecruiterMembership(userId);
    if (!membership) {
      throw new NotFoundError('You do not belong to an organization', 'NOT_IN_ORGANIZATION');
    }
    return loadOrganization(membership.organizationId);
  },

  async updateMine(userId: string, input: UpdateOrganizationInput) {
    const { organizationId } = await requireOrgAdmin(userId);
    return organizationRepository.update(organizationId, input);
  },

  async addRecruiter(adminUserId: string, input: AddRecruiterInput) {
    const { organizationId } = await requireOrgAdmin(adminUserId);

    const notFound = () =>
      new NotFoundError('No recruiter account with this email', 'RECRUITER_NOT_FOUND');

    let profileId: string;
    const existing = await recruiterProfileRepository.findByUserEmail(input.email);
    if (existing) {
      if (existing.user.role !== 'RECRUITER') throw notFound();
      profileId = existing.id;
    } else {
      // No recruiter profile: either no such user, or a recruiter who has never had one yet.
      const user = await userRepository.findByEmail(input.email);
      if (!user || user.role !== 'RECRUITER') throw notFound();
      profileId = (await profileService.getOrCreateRecruiterProfile(user.id)).id;
    }

    const assigned = await recruiterProfileRepository.assignToOrganizationIfUnassigned(
      profileId,
      organizationId,
      false,
    );
    if (!assigned) throw alreadyInOrganization();

    return loadOrganization(organizationId);
  },
};
