import { Role } from '../common/enums';
import { ForbiddenError, NotFoundError } from '../common/errors';
import type { PageParams } from '../common/pagination';
import {
  getRecruiterMembership,
  requireMembership,
} from '../user/organization/organization-access';
import {
  jobPostingRepository,
  type CreateJobPostingInput,
  type JobPostingFilters,
  type UpdateJobPostingInput,
} from './job-posting.repository';
import { matchingService } from '../matching/matching.service';

export const jobPostingService = {
  async create(
    userId: string,
    input: Omit<CreateJobPostingInput, 'organizationId' | 'createdById'>,
  ) {
    const membership = await requireMembership(userId);
    const status = input.status ?? 'DRAFT';
    const now = new Date();

    return jobPostingRepository.create({
      ...input,
      organizationId: membership.organizationId,
      createdById: membership.recruiterProfileId,
      publishedAt: status === 'PUBLISHED' ? now : null,
      closedAt: status === 'CLOSED' ? now : null,
    });
  },

  async updateJobPosting(
    userId: string,
    jobPostingId: string,
    input: UpdateJobPostingInput,
  ) {
    const job = await jobPostingRepository.findById(jobPostingId);
    if (!job) throw new NotFoundError('Job posting not found', 'JOB_POSTING_NOT_FOUND');

    const user = await getRecruiterMembership(userId);
    if (!user || job.organizationId !== user.organizationId) {
      throw new ForbiddenError(
        'You are not authorized to modify this job posting',
        'Unauthorized_Action',
      );
    }

    const now = new Date();
    const data: UpdateJobPostingInput = { ...input };
    if (input.status === 'PUBLISHED' && job.status !== 'PUBLISHED') {
      data.publishedAt = now;
      data.closedAt = null;
    } else if (input.status === 'CLOSED' && job.status !== 'CLOSED') {
      data.closedAt = now;
    } else if (input.status === 'DRAFT') {
      data.publishedAt = null;
      data.closedAt = null;
    }

    const updatedJob = await jobPostingRepository.update(jobPostingId, data);
    const requiredSkillsChanged =
      input.requiredSkills !== undefined &&
      (input.requiredSkills.length !== job.requiredSkills.length ||
        input.requiredSkills.some((skill, index) => skill !== job.requiredSkills[index]));

    if (requiredSkillsChanged) {
      void matchingService.recomputeScoresForJob(jobPostingId).catch((error: unknown) => {
        console.error(`Failed to recompute match scores for job ${jobPostingId}:`, error);
      });
    }

    return updatedJob;
  },

  async getJobPostings(
    role: Role,
    organizationId: string | null,
    filters: JobPostingFilters,
    pageParams: PageParams,
  ) {
    if (role === 'CANDIDATE') {
      return jobPostingRepository.getJobs(
        { ...filters, status: 'PUBLISHED' },
        pageParams.page,
        pageParams.pageSize,
      );
    }

    if (role === 'RECRUITER') {
      if (!organizationId) {
        throw new ForbiddenError(
          'You must belong to an organization to view its job postings',
          'NOT_IN_ORGANIZATION',
        );
      }
      return jobPostingRepository.getJobs(
        { ...filters, organizationId },
        pageParams.page,
        pageParams.pageSize,
      );
    }

    return jobPostingRepository.getJobs(filters, pageParams.page, pageParams.pageSize);
  },
};
