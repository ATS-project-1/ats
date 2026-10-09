import { z } from 'zod';

export const ResumeEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'), // e.g., Job Title, Degree, Project Name
  subtitle: z.string().optional(),                // e.g., Company Name, Institution
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  url: z.string().url().optional().or(z.literal('')),
});

export const ResumeSectionSchema = z.object({
  sectionType: z.enum(['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS', 'PROJECTS', 'CUSTOM']),
  title: z.string().min(1, 'Section title is required'),
  order: z.number().int().default(0),
  content: z.string().optional(), // For raw summary/bio strings
  entries: z.array(ResumeEntrySchema).default([]),
});

export const FullResumeDataSchema = z.object({
  title: z.string().min(1, 'Resume title is required'),
  personalInfo: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    github: z.string().url().optional().or(z.literal('')),
  }),
  sections: z.array(ResumeSectionSchema).min(1, 'At least one resume section is required'),
});

export type ResumeEntry = z.infer<typeof ResumeEntrySchema>;
export type ResumeSection = z.infer<typeof ResumeSectionSchema>;
export type FullResumeData = z.infer<typeof FullResumeDataSchema>;