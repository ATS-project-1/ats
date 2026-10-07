import { prisma } from '../common/db';
import { jobPostingRepository } from '../job/job-posting.repository';
import { resumeRepository } from '../resume/resume.repository';
import { resumeVersionRepository } from '../resume/resume-version.repository';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { organizationRepository } from '../user/organization.repository';
import { recruiterProfileRepository } from '../user/recruiter-profile.repository';
import { userRepository } from '../user/user.repository';

// Development seed data. Idempotent: running it again leaves existing rows alone.
// Real password hashing arrives with the auth tickets, so these accounts cannot log in yet.
const PLACEHOLDER_PASSWORD_HASH = 'seed-placeholder-hash';
const ORG_NAME = 'Tech Corp';
const RECRUITER_EMAIL = 'recruiter@tech-corp.example.com';
const CANDIDATE_EMAIL = 'alex.candidate@example.com';
const JOB_TITLE = 'Senior Backend Engineer';

async function main(): Promise<void> {
  const existingRecruiter = await userRepository.findByEmail(RECRUITER_EMAIL);
  if (existingRecruiter) {
    console.log('Seed data already present, nothing to do.');
    return;
  }

  const organization = await organizationRepository.create({
    name: ORG_NAME,
    description: 'A sample technology company for development.',
    website: 'https://tech-corp.example.com',
  });

  const recruiterUser = await userRepository.create({
    email: RECRUITER_EMAIL,
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    fullName: 'Taylor Recruiter',
    role: 'RECRUITER',
  });
  const recruiter = await recruiterProfileRepository.create(recruiterUser.id, {
    jobTitle: 'Talent Acquisition Lead',
  });
  await recruiterProfileRepository.assignToOrganization(recruiter.id, organization.id, true);

  const candidateUser = await userRepository.create({
    email: CANDIDATE_EMAIL,
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    fullName: 'Alex Candidate',
    role: 'CANDIDATE',
  });
  const candidate = await candidateProfileRepository.create(candidateUser.id, {
    headline: 'Backend engineer',
    location: 'Lagos',
  });

  await jobPostingRepository.create({
    organizationId: organization.id,
    createdById: recruiter.id,
    title: JOB_TITLE,
    description: 'Build and run our applicant tracking APIs.',
    requiredSkills: ['typescript', 'postgresql', 'node.js'],
    preferredSkills: ['prisma', 'kafka'],
    seniority: 'SENIOR',
    location: 'Lagos',
    isRemote: true,
    status: 'PUBLISHED',
    publishedAt: new Date(),
  });

  const resume = await resumeRepository.create({
    candidateId: candidate.id,
    title: 'Alex Candidate - Backend',
    content: { summary: 'Backend engineer with 6 years of TypeScript and PostgreSQL.' },
  });
  await resumeVersionRepository.createSnapshot(resume.id);

  console.log('Seeded: 1 organization, 2 users, 1 job posting, 1 resume with 1 version.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // ts-node-dev keeps the process alive after a natural exit, so exit explicitly.
    process.exit(process.exitCode ?? 0);
  });
