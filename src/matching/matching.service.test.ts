import type { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { ApplicationForScoringRecord } from '../application/application.repository';
import type { ApplicationMatchResultRecord } from './application-match-result.repository';
import { MatchingService } from './matching.service';

describe('MatchingService.recomputeScoresForJob', () => {
  it('processes application scores in sequential batches of at most 50', async () => {
    const applicationIds = Array.from({ length: 101 }, (_, index) => `application-${index}`);
    const application = {
      id: '',
      candidateId: 'candidate-id',
      jobPostingId: 'job-id',
      resumeVersionId: 'resume-version-id',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      updatedAt: new Date(),
      resumeVersion: { content: { sections: [] } },
      jobPosting: {
        id: 'job-id',
        requiredSkills: [],
        title: 'Engineer',
        description: 'Test job',
        updatedAt: new Date(),
      },
    } satisfies ApplicationForScoringRecord;
    let activeScores = 0;
    let maximumActiveScores = 0;
    let savedResults = 0;

    const service = new MatchingService(
      {
        calculateScore: async () => ({ score: 100, breakdown: {} }),
      },
      {
        applicationRepository: {
          findIdsForJobPosting: async () => applicationIds,
          findForScoring: async (id) => ({ ...application, id }),
        },
        applicationMatchResultRepository: {
          upsert: async (
            applicationId,
            score,
            breakdown: Prisma.InputJsonValue,
          ): Promise<ApplicationMatchResultRecord> => {
            void breakdown;
            activeScores++;
            maximumActiveScores = Math.max(maximumActiveScores, activeScores);
            await new Promise((resolve) => setTimeout(resolve, 1));
            activeScores--;
            savedResults++;
            return {
              id: `result-${applicationId}`,
              applicationId,
              score,
              breakdown: {},
              computedAt: new Date(),
            };
          },
        },
      },
    );

    const results = await service.recomputeScoresForJob('job-id');

    expect(results).toHaveLength(101);
    expect(savedResults).toBe(101);
    expect(maximumActiveScores).toBeLessThanOrEqual(50);
  });
});
