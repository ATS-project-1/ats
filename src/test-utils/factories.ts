import { randomUUID } from 'node:crypto';
import { jobPostingRepository } from '../job/job-posting.repository';
import { resumeRepository } from '../resume/resume.repository';
import { resumeVersionRepository } from '../resume/resume-version.repository';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { organizationRepository } from '../user/organization.repository';
import { recruiterProfileRepository } from '../user/recruiter-profile.repository';
import { userRepository } from '../user/user.repository';

export const TEST_EMAIL_DOMAIN = '@test.local';
export const TEST_ORG_NAME_PREFIX = 'Test Org ';

// Real password hashing arrives with the auth tickets.
const PLACEHOLDER_PASSWORD_HASH = 'test-placeholder-hash';

const uniqueSuffix = () => randomUUID().replace(/-/g, '').slice(0, 12);

export async function createCandidate() {
  const suffix = uniqueSuffix();
  const user = await userRepository.create({
    email: `candidate-${suffix}${TEST_EMAIL_DOMAIN}`,
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    fullName: `Test Candidate ${suffix}`,
    role: 'CANDIDATE',
  });
  const profile = await candidateProfileRepository.create(user.id, { headline: 'Test candidate' });
  return { user, profile };
}

export async function createRecruiterWithOrg() {
  const suffix = uniqueSuffix();
  const user = await userRepository.create({
    email: `recruiter-${suffix}${TEST_EMAIL_DOMAIN}`,
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    fullName: `Test Recruiter ${suffix}`,
    role: 'RECRUITER',
  });
  const organization = await organizationRepository.create({
    name: `${TEST_ORG_NAME_PREFIX}${suffix}`,
  });
  const created = await recruiterProfileRepository.create(user.id, { jobTitle: 'Recruiter' });
  const profile = await recruiterProfileRepository.assignToOrganization(
    created.id,
    organization.id,
    true,
  );
  return { user, organization, profile };
}

export function createPublishedJobPosting(
  organizationId: string,
  createdById: string | null = null,
  overrides: { title?: string; requiredSkills?: string[] } = {},
) {
  return jobPostingRepository.create({
    organizationId,
    createdById,
    title: overrides.title ?? 'Test Engineer',
    description: 'A test job posting',
    requiredSkills: overrides.requiredSkills ?? ['typescript'],
    seniority: 'MID',
    location: 'Remote',
    isRemote: true,
    status: 'PUBLISHED',
    publishedAt: new Date(),
  });
}

export async function createResumeWithVersion(candidateId: string) {
  const resume = await resumeRepository.create({
    candidateId,
    title: 'Test resume',
    content: { summary: 'Test summary' },
  });
  const version = await resumeVersionRepository.createSnapshot(resume.id);
  return { resume, version };
}
