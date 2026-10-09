import {
  PrismaClient,
  UserRole,
  JobStatus,
  ApplicationStatus,
  EmploymentType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run seed script in production environment.');
    process.exit(1);
  }

  console.log('🌱 Starting database seed...');

  // Clean existing data in reverse dependency order
  await prisma.applicationStatusHistory.deleteMany(); // Added to resolve foreign key conflicts
  await prisma.interview.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.application.deleteMany();
  await prisma.resumeVersion.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.recruiterProfile.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'TechCorp Solutions',
      slug: 'techcorp-solutions',
      website: 'https://techcorp.example.com',
      description: 'Leading innovations in web and cloud technology.',
    },
  });

  // 2. Create Recruiter User & Profile
  const recruiterUser = await prisma.user.create({
    data: {
      email: 'recruiter@techcorp.com',
      passwordHash: '$2b$10$e84W/32lK1...mock_hashed_password',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: UserRole.RECRUITER,
      recruiterProfile: {
        create: {
          title: 'Lead Technical Recruiter',
          organizationId: org.id,
        },
      },
    },
  });

  // 3. Create Candidate Users
  const candidateUser1 = await prisma.user.create({
    data: {
      email: 'alex.developer@example.com',
      passwordHash: '$2b$10$e84W/32lK1...mock_hashed_password',
      firstName: 'Alex',
      lastName: 'Rivera',
      role: UserRole.CANDIDATE,
      candidateProfile: {
        create: {
          headline: 'Full Stack TypeScript Engineer',
          bio: '5+ years experience building Node.js and React web apps.',
          phone: '+1234567890',
        },
      },
    },
    include: {
      candidateProfile: true,
    },
  });

  const candidateUser2 = await prisma.user.create({
    data: {
      email: 'praise.dev@example.com',
      passwordHash: '$2b$10$e84W/32lK1...mock_hashed_password',
      firstName: 'Praise',
      lastName: 'Ade',
      role: UserRole.CANDIDATE,
      candidateProfile: {
        create: {
          headline: 'Backend Systems Developer',
          bio: 'Specialized in Node.js, Express, and PostgreSQL backend services.',
          phone: '+1987654321',
        },
      },
    },
    include: {
      candidateProfile: true,
    },
  });

  const candidateProfile1 = candidateUser1.candidateProfile!;
  const candidateProfile2 = candidateUser2.candidateProfile!;

  // 4. Create Job Postings
  const job1 = await prisma.jobPosting.create({
    data: {
      organizationId: org.id,
      title: 'Senior Backend Engineer',
      description: 'Looking for a Node.js/TypeScript expert to build scalable API services.',
      requirements: 'Strong proficiency in Node.js, Express, PostgreSQL, and Prisma ORM.',
      location: 'Remote',
      type: EmploymentType.FULL_TIME,
      status: JobStatus.PUBLISHED,
    },
  });

  const job2 = await prisma.jobPosting.create({
    data: {
      organizationId: org.id,
      title: 'Frontend React Developer',
      description: 'Build sleek modern user interfaces using React and Tailwind CSS.',
      requirements: 'Experience with React, Next.js, Tailwind CSS, and REST API integrations.',
      location: 'Hybrid',
      type: EmploymentType.FULL_TIME,
      status: JobStatus.PUBLISHED,
    },
  });

  // 5. Create Resumes & Resume Versions
  const resume1 = await prisma.resume.create({
    data: {
      candidateId: candidateProfile1.id,
      title: 'Fullstack Software Engineer Resume',
    },
  });

  const resumeVersion1 = await prisma.resumeVersion.create({
    data: {
      resumeId: resume1.id,
      version: 1,
      fileUrl: 'https://storage.example.com/resumes/alex_rivera_v1.pdf',
      parsedData: {
        skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
        experienceYears: 5,
      },
    },
  });

  const resume2 = await prisma.resume.create({
    data: {
      candidateId: candidateProfile2.id,
      title: 'Backend Systems Developer Resume',
    },
  });

  const resumeVersion2 = await prisma.resumeVersion.create({
    data: {
      resumeId: resume2.id,
      version: 1,
      fileUrl: 'https://storage.example.com/resumes/praise_ade_v1.pdf',
      parsedData: {
        skills: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Docker'],
        experienceYears: 4,
      },
    },
  });

  // 6. Create Applications
  await prisma.application.create({
    data: {
      jobId: job1.id,
      candidateId: candidateProfile1.id,
      resumeId: resume1.id,
      resumeVersionId: resumeVersion1.id,
      status: ApplicationStatus.SUBMITTED,
    },
  });

  await prisma.application.create({
    data: {
      jobId: job2.id,
      candidateId: candidateProfile2.id,
      resumeId: resume2.id,
      resumeVersionId: resumeVersion2.id,
      status: ApplicationStatus.SCREENING,
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });