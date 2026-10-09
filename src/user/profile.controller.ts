import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// GET /profiles/me — Auto-creates profile on first access if missing
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const role = req.user!.role;

    if (role === UserRole.CANDIDATE) {
      let candidateProfile = await prisma.candidateProfile.findUnique({
        where: { userId },
      });

      if (!candidateProfile) {
        candidateProfile = await prisma.candidateProfile.create({
          data: { userId },
        });
      }

      return res.status(200).json(candidateProfile);
    }

    if (role === UserRole.RECRUITER) {
      let recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId },
        include: { organization: true },
      });

      return res.status(200).json(recruiterProfile);
    }

    return res.status(400).json({ error: 'Profile requested for unsupported user role.' });
  } catch (error) {
    next(error);
  }
};

// PATCH /profiles/me — Updates profile with ownership enforcement
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const role = req.user!.role;

    if (role === UserRole.CANDIDATE) {
      const { headline, bio, phone } = req.body;

      const updatedProfile = await prisma.candidateProfile.upsert({
        where: { userId },
        update: {
          ...(headline !== undefined && { headline }),
          ...(bio !== undefined && { bio }),
          ...(phone !== undefined && { phone }),
        },
        create: {
          userId,
          headline,
          bio,
          phone,
        },
      });

      return res.status(200).json(updatedProfile);
    }

    if (role === UserRole.RECRUITER) {
      const { title } = req.body;

      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId },
      });

      if (!recruiterProfile) {
        return res.status(404).json({ error: 'Recruiter profile not found. Join an organization first.' });
      }

      const updatedProfile = await prisma.recruiterProfile.update({
        where: { userId },
        data: {
          ...(title !== undefined && { title }),
        },
      });

      return res.status(200).json(updatedProfile);
    }

    return res.status(400).json({ error: 'Cannot update profile for this role.' });
  } catch (error) {
    next(error);
  }
};