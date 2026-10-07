import { prisma } from '../common/db';
import { TEST_EMAIL_DOMAIN, TEST_ORG_NAME_PREFIX } from './factories';

/**
 * Deletes all rows created through the factories, in dependency-safe order:
 * candidate users (cascades to profiles, resumes, versions, applications, history and match
 * results), then job postings of test organizations, then recruiter users, then the organizations.
 */
export async function cleanupTestData(): Promise<void> {
  const testEmail = { endsWith: TEST_EMAIL_DOMAIN };

  const organizations = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { startsWith: TEST_ORG_NAME_PREFIX } },
        { recruiters: { some: { user: { email: testEmail } } } },
      ],
    },
    select: { id: true },
  });
  const organizationIds = organizations.map((o) => o.id);

  await prisma.user.deleteMany({ where: { email: testEmail, role: 'CANDIDATE' } });
  await prisma.jobPosting.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
}
