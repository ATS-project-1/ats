import { z } from 'zod';

const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything past 72 bytes

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

// Strict: unknown fields (e.g. "status" or "id") are rejected rather than silently dropped.
export const registerSchema = z.strictObject({
  email,
  password: z
    .string()
    .min(8, 'password must be at least 8 characters')
    .refine((v) => Buffer.byteLength(v, 'utf8') <= MAX_PASSWORD_BYTES, {
      message: 'password must be at most 72 bytes',
    }),
  fullName: z.string().trim().min(1).max(100),
  // ADMIN is deliberately not self-assignable.
  role: z.enum(['CANDIDATE', 'RECRUITER']),
});

// Login does not enforce the registration password rules; it only rejects empty or oversized input.
export const loginSchema = z.strictObject({
  email,
  password: z
    .string()
    .min(1, 'password is required')
    .refine((v) => Buffer.byteLength(v, 'utf8') <= MAX_PASSWORD_BYTES, {
      message: 'password must be at most 72 bytes',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
