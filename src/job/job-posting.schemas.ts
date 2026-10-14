import { JobPostingStatus, Seniority } from '../common/enums';
import { z } from 'zod';

const nonEmptyText = z.string().trim().min(1);

export const createJobPostingSchema = z.strictObject({
  title: nonEmptyText.max(150),
  description: nonEmptyText.max(20_000),
  requiredSkills: z.array(nonEmptyText.max(100)).max(100).optional(),
  preferredSkills: z.array(nonEmptyText.max(100)).max(100).optional(),
  seniority: z.enum(Seniority),
  location: nonEmptyText.max(200),
  isRemote: z.boolean().optional(),
});

const atLeastOneField = (value: object) => Object.values(value).some((v) => v !== undefined);

export const updateJobPostingSchema = z
  .strictObject({
    title: nonEmptyText.max(150).optional(),
    description: nonEmptyText.max(20_000).optional(),
    requiredSkills: z.array(nonEmptyText.max(100)).max(100).optional(),
    preferredSkills: z.array(nonEmptyText.max(100)).max(100).optional(),
    seniority: z.enum(Seniority).optional(),
    location: nonEmptyText.max(200).optional(),
    isRemote: z.boolean().optional(),
    status: z.enum(JobPostingStatus).optional(),
  })
  .refine(atLeastOneField, { message: 'at least one field is required' });

export const listJobPostingsQuerySchema = z.strictObject({
  status: z.enum(JobPostingStatus).optional(),
  seniority: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.toUpperCase() : value),
      z.enum(Seniority),
    )
    .optional(),
  location: z.string().trim().min(1).max(200).optional(),
  skill: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateJobPostingBody = z.infer<typeof createJobPostingSchema>;
export type UpdateJobPostingBody = z.infer<typeof updateJobPostingSchema>;
export type ListJobPostingsQuery = z.infer<typeof listJobPostingsQuerySchema>;
