import {
  OrganizationData,
  organizationRepository,
} from './organization.repository';

export const organizationService = {
  async createOrganization(userId: string, data: OrganizationData) {
    return organizationRepository.createOrganizationWithAdmin(userId, data);
  },
};
