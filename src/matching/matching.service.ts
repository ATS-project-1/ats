import { applicationRepository } from '../application/application.repository';
import { applicationMatchResultRepository } from './application-match-result.repository';
import type { MatchScorer } from './match-scorer.interface';
import { WeightedSkillScorer } from './strategies/weighted-skill.strategy';
import { NotFoundError } from '../common/errors';
import { chunkArray } from '../common/utils';

type MatchingDependencies = {
  applicationRepository: Pick<
    typeof applicationRepository,
    'findForScoring' | 'findIdsForJobPosting'
  >;
  applicationMatchResultRepository: Pick<typeof applicationMatchResultRepository, 'upsert'>;
};

export class MatchingService {
  constructor(
    private readonly scorer: MatchScorer,
    private readonly dependencies: MatchingDependencies = {
      applicationRepository,
      applicationMatchResultRepository,
    },
  ) {}

  async scoreApplication(applicationId: string) {
    const application = await this.dependencies.applicationRepository.findForScoring(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
    }

    const result = await this.scorer.calculateScore(
      application.resumeVersion.content,
      application.jobPosting,
    );

    return this.dependencies.applicationMatchResultRepository.upsert(
      application.id,
      result.score,
      result.breakdown,
    );
  }

  async recomputeScoresForJob(jobId: string) {
    const applicationIds =
      await this.dependencies.applicationRepository.findIdsForJobPosting(jobId);
    const results = [];
    for (const batch of chunkArray(applicationIds, 50)) {
      results.push(
        ...(await Promise.all(batch.map((applicationId) => this.scoreApplication(applicationId)))),
      );
    }
    return results;
  }
}

export const matchingService = new MatchingService(new WeightedSkillScorer());
