import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { jobService } from './job.service';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const jobController = {
  async createJob(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isObject(req.body)) {
      return res.status(400).json({ error: 'Invalid job data' });
    }

    const { title, description, requirements, isActive } = req.body;
    if (
      typeof title !== 'string' ||
      title.trim() === '' ||
      typeof description !== 'string' ||
      typeof requirements !== 'string' ||
      (isActive !== undefined && typeof isActive !== 'boolean')
    ) {
      return res.status(400).json({ error: 'Invalid job data' });
    }

    const jobData: Pick<
      Prisma.JobPostingCreateInput,
      'title' | 'description' | 'requirements' | 'isActive'
    > = { title, description, requirements, isActive };

    try {
      const job = await jobService.createJobPosting(userId, jobData);
      return res.status(201).json(job);
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized_Organization') {
        return res.status(403).json({
          error: 'Your account must be linked to an organization to create jobs.',
        });
      }

      console.error('Failed to create job:', error);
      return res.status(500).json({ error: 'Unable to create job' });
    }
  },
};
