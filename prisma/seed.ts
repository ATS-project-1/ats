import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const passwordHash = 'development-seed-password-hash';

async function main() {
  const organization = await prisma.organization.create({
    data: {
      name: 'Tech Corp',
      description: 'A sample technology company for development.',
      website: 'https://tech-corp.example.com',
    },
  });

  await prisma.user.create({
    data: {
      email: 'recruiter@tech-corp.example.com',
      passwordHash,
      role: Role.RECRUITER,
      organization: { connect: { id: organization.id } },
      profile: {
        create: {
          firstName: 'Taylor',
          lastName: 'Recruiter',
          headline: 'Talent Acquisition Lead',
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'alex.candidate@example.com',
      passwordHash,
      role: Role.CANDIDATE,
      profile: {
        create: {
          firstName: 'Alex',
          lastName: 'Candidate',
          headline: 'Software Engineer',
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'jordan.candidate@example.com',
      passwordHash,
      role: Role.CANDIDATE,
      profile: {
        create: {
          firstName: 'Jordan',
          lastName: 'Candidate',
          headline: 'Product Designer',
        },
      },
    },
  });

  await prisma.jobPosting.createMany({
    data: [
      {
        organizationId: organization.id,
        title: 'Full Stack Engineer',
        description: 'Build and maintain user-facing products.',
        requirements: 'Experience with TypeScript and web application development.',
      },
      {
        organizationId: organization.id,
        title: 'Product Designer',
        description: 'Design intuitive experiences for our customers.',
        requirements: 'Experience with product design and prototyping.',
      },
    ],
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
