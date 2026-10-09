import { Request, Response, NextFunction } from 'express';
import { PrismaClient, JobStatus, UserRole, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// TICKET-201: POST /job-postings
export const createJobPosting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const role = req.user!.role;

    if (role !== UserRole.RECRUITER && role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Only recruiters can create job postings.' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!recruiterProfile || !recruiterProfile.organizationId) {
      return res.status(400).json({ error: 'Recruiter must belong to an organization to post jobs.' });
    }

    const { title, description, requiredSkills, seniority, location, status } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const job = await prisma.jobPosting.create({
      data: {
        organizationId: recruiterProfile.organizationId,
        title,
        description,
        requirements: Array.isArray(requiredSkills) ? requiredSkills.join(', ') : requiredSkills,
        seniority,
        location,
        status: status || JobStatus.DRAFT,
      },
    });

    return res.status(201).json(job);
  } catch (error) {
    next(error);
  }
};

// TICKET-202: GET /job-postings (Listing + Filters + Pagination)
export const listJobPostings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, seniority, skill, page = '1', limit = '10' } = req.query;
    const user = req.user;

    const pageNumber = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNumber - 1) * pageSize;

    const whereAnd: Prisma.JobPostingWhereInput[] = [];

    // Acceptance criteria: Candidates/Public can only read PUBLISHED postings
    if (!user || user.role !== UserRole.RECRUITER) {
      whereAnd.push({ status: JobStatus.PUBLISHED });
    }

    if (location) {
      whereAnd.push({ location: { contains: location as string, mode: 'insensitive' } });
    }

    if (seniority) {
      whereAnd.push({ seniority: { equals: seniority as string, mode: 'insensitive' } });
    }

    if (skill) {
      whereAnd.push({ requirements: { contains: skill as string, mode: 'insensitive' } });
    }

    const where: Prisma.JobPostingWhereInput = whereAnd.length > 0 ? { AND: whereAnd } : {};

    const [total, items] = await Promise.all([
      prisma.jobPosting.count({ where }),
      prisma.jobPosting.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    return res.status(200).json({
      data: items,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

// TICKET-201: GET /job-postings/:id
export const getJobPostingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    if (job.status !== JobStatus.PUBLISHED) {
      if (!user || user.role !== UserRole.RECRUITER) {
        return res.status(403).json({ error: 'Access denied to non-published job postings.' });
      }

      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: user.sub },
      });

      if (recruiterProfile?.organizationId !== job.organizationId) {
        return res.status(403).json({ error: 'Forbidden: You do not belong to the owning organization.' });
      }
    }

    return res.status(200).json(job);
  } catch (error) {
    next(error);
  }
};

// TICKET-201: PATCH /job-postings/:id
export const updateJobPosting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    if (req.user!.role !== UserRole.RECRUITER && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Only recruiters can update job postings.' });
    }

    const job = await prisma.jobPosting.findUnique({ where: { id } });

    if (!job) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    // Acceptance: Only owning organization's recruiters can edit
    if (!recruiterProfile || recruiterProfile.organizationId !== job.organizationId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this job posting.' });
    }

    const { title, description, requiredSkills, seniority, location, status } = req.body;

    const updatedJob = await prisma.jobPosting.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(requiredSkills && {
          requirements: Array.isArray(requiredSkills) ? requiredSkills.join(', ') : requiredSkills,
        }),
        ...(seniority && { seniority }),
        ...(location && { location }),
        ...(status && { status }),
      },
    });

    return res.status(200).json(updatedJob);
  } catch (error) {
    next(error);
  }
};