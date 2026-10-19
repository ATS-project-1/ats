import { z } from 'zod';

// ---------------------------------------------------------------------------
// Resume entry – a single line item within a section
// ---------------------------------------------------------------------------

export const resumeEntrySchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Resume section – a labelled group of entries
// ---------------------------------------------------------------------------

export const resumeSectionSchema = z.object({
  type: z.enum(['summary', 'experience', 'education', 'skills', 'projects']),
  title: z.string(),
  entries: z.array(resumeEntrySchema),
});

// ---------------------------------------------------------------------------
// Top-level resume document
// ---------------------------------------------------------------------------

export const resumeSchema = z.object({
  sections: z.array(resumeSectionSchema),
});

export const resumeRecordSchema = z.strictObject({
  title: z.string().trim().min(1),
  content: z.json().optional(),
});

export const updateResumeRecordSchema = resumeRecordSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided',
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type ResumeEntry = z.infer<typeof resumeEntrySchema>;
export type ResumeSection = z.infer<typeof resumeSectionSchema>;
export type Resume = z.infer<typeof resumeSchema>;
export type ResumeRecordInput = z.infer<typeof resumeRecordSchema>;
export type UpdateResumeRecordInput = z.infer<typeof updateResumeRecordSchema>;
