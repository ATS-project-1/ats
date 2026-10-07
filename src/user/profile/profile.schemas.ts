import { z } from 'zod';

// Each field is optional (omit to leave unchanged) and nullable (null clears it). Empty strings
// are rejected: clients send null to clear a field.
const text = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

const atLeastOneField = (value: object) => Object.values(value).some((v) => v !== undefined);
const AT_LEAST_ONE = { message: 'at least one field is required' };

export const updateCandidateProfileSchema = z
  .strictObject({
    headline: text(120),
    location: text(100),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(20)
      .regex(/^[0-9 +\-()]+$/, 'phone may only contain digits, spaces and + - ( )')
      .nullable()
      .optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE);

// organizationId and isOrgAdmin are deliberately absent: they are managed by the organizations
// ticket (TICKET-105), and strict mode rejects them here.
export const updateRecruiterProfileSchema = z
  .strictObject({
    jobTitle: text(100),
  })
  .refine(atLeastOneField, AT_LEAST_ONE);

export type UpdateCandidateProfileInput = z.infer<typeof updateCandidateProfileSchema>;
export type UpdateRecruiterProfileInput = z.infer<typeof updateRecruiterProfileSchema>;
