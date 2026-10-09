import { z } from 'zod';

export const applyForJobSchema = z.strictObject({
  jobPostingId: z.uuid(),
  resumeVersionId: z.uuid(),
});

export type ApplyForJobInput = z.infer<typeof applyForJobSchema>;
