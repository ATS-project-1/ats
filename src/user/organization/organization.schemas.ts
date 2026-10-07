import { z } from 'zod';

const name = z.string().trim().min(2).max(100);
const description = z.string().trim().max(2000);
// Only http: and https: URLs; this rejects javascript:, ftp:, data: and similar.
const website = z
  .string()
  .trim()
  .max(200)
  .pipe(z.url({ protocol: /^https?$/ }));

const atLeastOneField = (value: object) => Object.values(value).some((v) => v !== undefined);

export const createOrganizationSchema = z.strictObject({
  name,
  description: description.optional(),
  website: website.optional(),
});

// All fields optional; description and website may be null to clear them.
export const updateOrganizationSchema = z
  .strictObject({
    name: name.optional(),
    description: description.nullable().optional(),
    website: website.nullable().optional(),
  })
  .refine(atLeastOneField, { message: 'at least one field is required' });

export const addRecruiterSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type AddRecruiterInput = z.infer<typeof addRecruiterSchema>;
