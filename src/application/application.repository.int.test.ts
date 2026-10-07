import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../common/errors';
import { cleanupTestData } from '../test-utils/cleanup';
import {
  createCandidate,
  createPublishedJobPosting,
  createRecruiterWithOrg,
  createResumeWithVersion,
} from '../test-utils/factories';
import { applicationRepository } from './application.repository';

async function setup() {
  const candidate = await createCandidate();
  const recruiter = await createRecruiterWithOrg();
  const job = await createPublishedJobPosting(recruiter.organization.id, recruiter.profile.id);
  const { version } = await createResumeWithVersion(candidate.profile.id);
  const input = {
    candidateId: candidate.profile.id,
    jobPostingId: job.id,
    resumeVersionId: version.id,
  };
  return { input, changedById: recruiter.user.id };
}

describe('applicationRepository', () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it('createWithInitialHistory creates a SUBMITTED application with one history row', async () => {
    const { input, changedById } = await setup();

    const app = await applicationRepository.createWithInitialHistory(input, changedById);
    const history = await applicationRepository.getStatusHistory(app.id);

    expect(app.status).toBe('SUBMITTED');
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ fromStatus: null, toStatus: 'SUBMITTED' });
  });

  it('transitionStatus SUBMITTED -> SCREENING updates status and appends history', async () => {
    const { input, changedById } = await setup();
    const app = await applicationRepository.createWithInitialHistory(input, changedById);

    const updated = await applicationRepository.transitionStatus(
      app.id,
      'SUBMITTED',
      'SCREENING',
      changedById,
    );
    const history = await applicationRepository.getStatusHistory(app.id);

    expect(updated.status).toBe('SCREENING');
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({ fromStatus: 'SUBMITTED', toStatus: 'SCREENING' });
  });

  it('transitionStatus with a stale fromStatus throws ConflictError and adds no history', async () => {
    const { input, changedById } = await setup();
    const app = await applicationRepository.createWithInitialHistory(input, changedById);
    await applicationRepository.transitionStatus(app.id, 'SUBMITTED', 'SCREENING', changedById);

    await expect(
      applicationRepository.transitionStatus(app.id, 'SUBMITTED', 'SCREENING', changedById),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(await applicationRepository.getStatusHistory(app.id)).toHaveLength(2);
  });

  it('a duplicate application throws ConflictError', async () => {
    const { input, changedById } = await setup();
    await applicationRepository.createWithInitialHistory(input, changedById);

    await expect(
      applicationRepository.createWithInitialHistory(input, changedById),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
