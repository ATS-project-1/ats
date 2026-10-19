import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applicationMatchResultRepository } from '../matching/application-match-result.repository';
import { jobPostingRepository } from '../job/job-posting.repository';
import {
  createCandidate,
  createPublishedJobPosting,
  createRecruiterWithOrg,
  createResumeWithVersion,
} from '../test-utils/factories';
import { cleanupTestData } from '../test-utils/cleanup';
import { applicationService } from './application.service';
import { applicationRepository } from './application.repository';

describe('applicationService.getApplicationsForJob match-result freshness', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('hides a match result computed before the job posting was updated', async () => {
    const candidate = await createCandidate();
    const recruiter = await createRecruiterWithOrg();
    const job = await createPublishedJobPosting(
      recruiter.organization.id,
      recruiter.profile.id,
      { requiredSkills: ['TypeScript'] },
    );
    const { version } = await createResumeWithVersion(candidate.profile.id);
    const application = await applicationRepository.createWithInitialHistory(
      {
        candidateId: candidate.profile.id,
        jobPostingId: job.id,
        resumeVersionId: version.id,
      },
      recruiter.user.id,
    );
    await applicationMatchResultRepository.upsert(application.id, 75, { matchedSkills: [] });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await jobPostingRepository.update(job.id, { requiredSkills: ['React'] });

    const result = await applicationService.getApplicationsForJob(job.id, recruiter.user.id, {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).not.toHaveProperty('matchResult');
  });
});
