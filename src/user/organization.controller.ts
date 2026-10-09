import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// POST /organizations — Create org & assign recruiter creator
export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { name, slug, website, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Organization name and slug are required.' });
    }

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return res.status(409).json({ error: 'Organization slug is already in use.' });
    }

    // Transaction to create organization and bind or create the recruiter profile
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, slug, website, description },
      });

      const recruiterProfile = await tx.recruiterProfile.upsert({
        where: { userId },
        update: { organizationId: org.id },
        create: {
          userId,
          organizationId: org.id,
          title: 'Organization Creator / Admin',
        },
      });

      return { organization: org, recruiterProfile };
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};