import assert from 'node:assert/strict';
import request from 'supertest';
// The temporary acceptance script closes its own shared test connection.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { prisma } from './common/db';
import { createApp } from './app';
import { applicationRepository } from './application/application.repository';
import {
  createCandidate,
  createPublishedJobPosting,
  createRecruiterWithOrg,
  createResumeWithVersion,
} from './test-utils/factories';
import { cleanupTestData } from './test-utils/cleanup';
import { signAccessToken } from './user/auth/token';

async function main() {
  const candidate = await createCandidate();
  const recruiter = await createRecruiterWithOrg();
  const job = await createPublishedJobPosting(
    recruiter.organization.id,
    recruiter.profile.id,
  );
  const { version } = await createResumeWithVersion(candidate.profile.id);
  const application = await applicationRepository.createWithInitialHistory(
    {
      candidateId: candidate.profile.id,
      jobPostingId: job.id,
      resumeVersionId: version.id,
    },
    candidate.user.id,
  );
  const authorization = `Bearer ${signAccessToken(recruiter.user)}`;
  const endpoint = `/applications/${application.id}/status`;
  const app = createApp();

  try {
    const invalidTransition = await request(app)
      .patch(endpoint)
      .set('Authorization', authorization)
      .send({ status: 'OFFER' });
    assert.equal(invalidTransition.status, 400, JSON.stringify(invalidTransition.body));
    assert.equal(
      invalidTransition.body.error.message,
      'Invalid status transition from SUBMITTED to OFFER.',
    );

    const validTransition = await request(app)
      .patch(endpoint)
      .set('Authorization', authorization)
      .send({ status: 'SCREENING' });
    assert.equal(validTransition.status, 200, JSON.stringify(validTransition.body));
    assert.equal(validTransition.body.application.status, 'SCREENING');

    console.log('Application status transition acceptance checks passed.');
  } finally {
    await cleanupTestData();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
