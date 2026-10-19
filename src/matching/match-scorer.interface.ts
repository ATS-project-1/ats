import type { Prisma } from '@prisma/client';

export interface MatchScorer {
  calculateScore(
    resume: unknown,
    jobPosting: { requiredSkills?: unknown },
  ): Promise<{ score: number; breakdown: Prisma.InputJsonObject }>;
}
