import { z } from 'zod';
import { ApplicationStatus } from '../common/enums';

export const applyForJobSchema = z.strictObject({
  jobPostingId: z.uuid(),
  resumeVersionId: z.uuid(),
});

export type ApplyForJobInput = z.infer<typeof applyForJobSchema>;

export const updateApplicationStatusSchema = z.strictObject({
  status: z.enum(ApplicationStatus),
});

export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
