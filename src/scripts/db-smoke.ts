import { prisma } from '../common/db';
import { ConflictError } from '../common/errors';
import { applicationRepository } from '../application/application.repository';
import { jobPostingRepository } from '../job/job-posting.repository';
import { matchResultRepository } from '../matching/match-result.repository';
import { resumeRepository } from '../resume/resume.repository';
import { resumeVersionRepository } from '../resume/resume-version.repository';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { organizationRepository } from '../user/organization.repository';
import { recruiterProfileRepository } from '../user/recruiter-profile.repository';
import { userRepository } from '../user/user.repository';

let failures = 0;

function report(name: string, ok: boolean, detail?: string): void {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` (${detail})` : ''}`);
}

async function check(name: string, fn: () => Promise<boolean>): Promise<void> {
  try {
    report(name, await fn());
  } catch (err) {
    report(name, false, err instanceof Error ? err.message : String(err));
  }
}

async function checkThrowsConflict(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
    report(name, false, 'did not throw');
  } catch (err) {
    report(name, err instanceof ConflictError, err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  const suffix = `${Date.now()}`;
  let candidateUserId: string | undefined;
  let recruiterUserId: string | undefined;
  let organizationId: string | undefined;
  let jobPostingId: string | undefined;

  try {
    // Users, profiles, organization
    const candidateUser = await userRepository.create({
      email: `  Smoke-Candidate-${suffix}@Example.test `,
      passwordHash: 'x',
      fullName: 'Smoke Candidate',
      role: 'CANDIDATE',
    });
    candidateUserId = candidateUser.id;
    const candidate = await candidateProfileRepository.create(candidateUser.id, {
      headline: 'Engineer',
    });

    const recruiterUser = await userRepository.create({
      email: `smoke-recruiter-${suffix}@example.test`,
      passwordHash: 'x',
      fullName: 'Smoke Recruiter',
      role: 'RECRUITER',
    });
    recruiterUserId = recruiterUser.id;
    const org = await organizationRepository.create({ name: `Smoke Org ${suffix}` });
    organizationId = org.id;
    const recruiter = await recruiterProfileRepository.create(recruiterUser.id, {
      jobTitle: 'Recruiter',
    });
    const assigned = await recruiterProfileRepository.assignToOrganization(
      recruiter.id,
      org.id,
      true,
    );
    await check(
      'create candidate+profile and recruiter+org+profile (org admin)',
      async () =>
        candidateUser.email === `smoke-candidate-${suffix}@example.test` &&
        assigned.isOrgAdmin &&
        assigned.organization?.id === org.id &&
        (await recruiterProfileRepository.findByUserId(recruiterUser.id))?.organization?.name ===
          org.name,
    );

    // Job posting + list with skill filter
    const skill = `smoke-skill-${suffix}`;
    const job = await jobPostingRepository.create({
      organizationId: org.id,
      createdById: recruiter.id,
      title: 'Smoke Engineer',
      description: 'Test posting',
      requiredSkills: [skill, 'typescript'],
      seniority: 'MID',
      location: 'Lagos',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    jobPostingId = job.id;
    await check('list() with skill filter returns the posting, total=1', async () => {
      const page = await jobPostingRepository.list(
        { skill, status: 'PUBLISHED', location: 'lag' },
        { page: 1, pageSize: 10 },
      );
      return page.total === 1 && page.items.length === 1 && page.items[0].id === job.id;
    });

    // Resume + snapshots
    const resume = await resumeRepository.create({
      candidateId: candidate.id,
      title: 'My resume',
      content: { summary: 'v1' },
    });
    const v1 = await resumeVersionRepository.createSnapshot(resume.id);
    const v2 = await resumeVersionRepository.createSnapshot(resume.id);
    await check(
      'two snapshots get version numbers 1 and 2',
      async () => v1.versionNumber === 1 && v2.versionNumber === 2,
    );

    await resumeRepository.updateContent(resume.id, { content: { summary: 'edited' } });
    await check('editing the resume leaves version 1 content unchanged', async () => {
      const again = await resumeVersionRepository.findById(v1.id);
      return JSON.stringify(again?.content) === JSON.stringify({ summary: 'v1' });
    });

    // Applications
    const input = {
      candidateId: candidate.id,
      jobPostingId: job.id,
      resumeVersionId: v1.id,
    };
    const app = await applicationRepository.createWithInitialHistory(input, recruiterUser.id);
    await check('createWithInitialHistory: SUBMITTED with 1 history row', async () => {
      const history = await applicationRepository.getStatusHistory(app.id);
      return app.status === 'SUBMITTED' && history.length === 1 && history[0].fromStatus === null;
    });

    await check(
      'transitionStatus SUBMITTED -> SCREENING; history has 2 rows in order',
      async () => {
        const updated = await applicationRepository.transitionStatus(
          app.id,
          'SUBMITTED',
          'SCREENING',
          recruiterUser.id,
          'looks good',
        );
        const history = await applicationRepository.getStatusHistory(app.id);
        return (
          updated.status === 'SCREENING' &&
          history.length === 2 &&
          history[0].toStatus === 'SUBMITTED' &&
          history[1].fromStatus === 'SUBMITTED' &&
          history[1].toStatus === 'SCREENING'
        );
      },
    );

    await checkThrowsConflict('transitionStatus with stale fromStatus throws ConflictError', () =>
      applicationRepository.transitionStatus(app.id, 'SUBMITTED', 'SCREENING', recruiterUser.id),
    );
    await check('failed transition wrote no history', async () => {
      return (await applicationRepository.getStatusHistory(app.id)).length === 2;
    });

    await checkThrowsConflict('duplicate application throws ConflictError', () =>
      applicationRepository.createWithInitialHistory(input, recruiterUser.id),
    );

    // User selects
    await check('findById has no passwordHash; findByEmailForAuth does', async () => {
      const plain = await userRepository.findById(candidateUser.id);
      const auth = await userRepository.findByEmailForAuth(candidateUser.email.toUpperCase());
      return !!plain && !('passwordHash' in plain) && !!auth && 'passwordHash' in auth;
    });
    await check("findById('not-a-uuid') returns null", async () => {
      return (await userRepository.findById('not-a-uuid')) === null;
    });

    // Match results
    await check('matchResult upsert twice leaves one row with the newer score', async () => {
      const key = {
        resumeVersionId: v1.id,
        jobPostingId: job.id,
        scorer: 'smoke',
        breakdown: { skills: 1 },
        jobPostingUpdatedAt: job.updatedAt,
      };
      await matchResultRepository.upsert({ ...key, score: 0.4 });
      await matchResultRepository.upsert({ ...key, score: 0.9 });
      const rows = await matchResultRepository.listForJobPosting(job.id, { page: 1, pageSize: 10 });
      const one = await matchResultRepository.find(v1.id, job.id, 'smoke');
      return rows.total === 1 && one?.score === 0.9;
    });
  } catch (err) {
    failures++;
    console.error('Smoke test aborted:', err);
  } finally {
    // Cleanup with prisma directly (cascades cover profile, resumes, versions, applications,
    // history and match results).
    try {
      if (candidateUserId) await prisma.user.deleteMany({ where: { id: candidateUserId } });
      if (jobPostingId) await prisma.jobPosting.deleteMany({ where: { id: jobPostingId } });
      if (recruiterUserId) await prisma.user.deleteMany({ where: { id: recruiterUserId } });
      if (organizationId) await prisma.organization.deleteMany({ where: { id: organizationId } });
    } catch (err) {
      failures++;
      console.error('Cleanup failed:', err);
    }
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
