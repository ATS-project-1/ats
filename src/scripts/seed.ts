import bcrypt from 'bcrypt';
import { prisma } from '../common/db';
import { config } from '../config';
import { jobPostingRepository } from '../job/job-posting.repository';
import { resumeRepository } from '../resume/resume.repository';
import { resumeVersionRepository } from '../resume/resume-version.repository';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { organizationRepository } from '../user/organization.repository';
import { recruiterProfileRepository } from '../user/recruiter-profile.repository';
import { userRepository } from '../user/user.repository';

// Development seed data. Idempotent: each part is skipped if it already exists.
// Each organization has exactly one admin (the first recruiter); other recruiters are members.
// Development-only password shared by all seeded accounts.
const SEED_PASSWORD = 'Password123!';
const ORG_NAME = 'Tech Corp';
const RECRUITER_EMAIL = 'recruiter@tech-corp.example.com';
const MEMBER_EMAIL = 'member@tech-corp.example.com';
const CANDIDATE_EMAIL = 'alex.candidate@example.com';
const JOB_TITLE = 'Senior Backend Engineer';

async function seedBase(passwordHash: string): Promise<boolean> {
  if (await userRepository.findByEmail(RECRUITER_EMAIL)) return false;

  const organization = await organizationRepository.create({
    name: ORG_NAME,
    description: 'A sample technology company for development.',
    website: 'https://tech-corp.example.com',
  });

  const recruiterUser = await userRepository.create({
    email: RECRUITER_EMAIL,
    passwordHash,
    fullName: 'Taylor Recruiter',
    role: 'RECRUITER',
  });
  const recruiter = await recruiterProfileRepository.create(recruiterUser.id, {
    jobTitle: 'Talent Acquisition Lead',
  });
  await recruiterProfileRepository.assignToOrganization(recruiter.id, organization.id, true);

  const candidateUser = await userRepository.create({
    email: CANDIDATE_EMAIL,
    passwordHash,
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

  return true;
}

/** A non-admin recruiter who belongs to the seeded organization. */
async function seedMember(passwordHash: string): Promise<boolean> {
  if (await userRepository.findByEmail(MEMBER_EMAIL)) return false;

  const admin = await userRepository.findByEmail(RECRUITER_EMAIL);
  const adminProfile = admin && (await recruiterProfileRepository.findByUserId(admin.id));
  if (!adminProfile?.organization) {
    throw new Error('Seeded admin recruiter has no organization; cannot add a member');
  }

  const user = await userRepository.create({
    email: MEMBER_EMAIL,
    passwordHash,
    fullName: 'Morgan Member',
    role: 'RECRUITER',
  });
  const profile = await recruiterProfileRepository.create(user.id, { jobTitle: 'Recruiter' });
  await recruiterProfileRepository.assignToOrganizationIfUnassigned(
    profile.id,
    adminProfile.organization.id,
    false,
  );
  return true;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, config.bcryptRounds);
  const base = await seedBase(passwordHash);
  const member = await seedMember(passwordHash);

  if (!base && !member) {
    console.log('Seed data already present, nothing to do.');
    return;
  }
  const parts = [
    base && 'organization (1 admin), candidate, job posting, resume',
    member && 'non-admin member recruiter',
  ].filter(Boolean);
  console.log(`Seeded: ${parts.join('; ')}.`);
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
