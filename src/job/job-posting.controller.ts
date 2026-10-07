import type { Request, Response } from 'express';
import { ValidationError } from '../common/errors';
import { getAuth } from '../common/http/get-auth';
import { getRecruiterMembership } from '../user/organization/organization-access';
import type { JobPostingFilters } from './job-posting.repository';
import { jobPostingService } from './job-posting.service';
import {
  type CreateJobPostingBody,
  type ListJobPostingsQuery,
  type UpdateJobPostingBody,
  listJobPostingsQuerySchema,
} from './job-posting.schemas';

export const jobPostingController = {
  async create(req: Request, res: Response): Promise<void> {
    const jobPosting = await jobPostingService.create(
      getAuth(req).userId,
      req.body as CreateJobPostingBody,
    );
    res.status(201).json({ jobPosting });
  },

  async update(req: Request, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string') {
      throw new ValidationError('Invalid job posting ID');
    }

    const jobPosting = await jobPostingService.updateJobPosting(
      getAuth(req).userId,
      req.params.id,
      req.body as UpdateJobPostingBody,
    );
    res.status(200).json({ jobPosting });
  },

  async list(req: Request, res: Response): Promise<void> {
    const auth = getAuth(req);
    const query = listJobPostingsQuerySchema.parse(req.query) satisfies ListJobPostingsQuery;
    const organizationId =
      auth.role === 'RECRUITER'
        ? (await getRecruiterMembership(auth.userId))?.organizationId ?? null
        : null;
    const filters: JobPostingFilters = {
      status: query.status,
      seniority: query.seniority,
      location: query.location,
      skill: query.skill,
    };
    const result = await jobPostingService.getJobPostings(auth.role, organizationId, filters, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    res.status(200).json({
      jobPostings: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  },
};
