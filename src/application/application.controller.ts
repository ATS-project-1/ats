import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole, ApplicationStatus, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Allowed Pipeline Transitions (TICKET-204)
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: [ApplicationStatus.SCREENING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  SCREENING: [ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  INTERVIEW: [ApplicationStatus.OFFER, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  OFFER: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  REJECTED: [],
  WITHDRAWN: [],
};

// TICKET-203: POST /applications
export const submitApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    if (req.user!.role !== UserRole.CANDIDATE) {
      return res.status(403).json({ error: 'Only candidate accounts can submit applications.' });
    }

    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!candidateProfile) {
      return res.status(400).json({ error: 'Candidate profile required before submitting an application.' });
    }

    const { jobId, resumeId, resumeVersionId } = req.body;

    if (!jobId || !resumeId || !resumeVersionId) {
      return res.status(400).json({ error: 'jobId, resumeId, and resumeVersionId are required.' });
    }

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job || job.status !== JobStatus.PUBLISHED) {
      return res.status(400).json({ error: 'Job posting is unavailable for applications.' });
    }

    // Acceptance: Reject duplicate applications
    const existingApp = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidateProfile.id,
          jobId,
        },
      },
    });

    if (existingApp) {
      return res.status(409).json({ error: 'Duplicate application: You have already applied for this job.' });
    }

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          jobId,
          candidateId: candidateProfile.id,
          resumeId,
          resumeVersionId,
          status: ApplicationStatus.SUBMITTED,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: null,
          toStatus: ApplicationStatus.SUBMITTED,
          changedById: userId,
        },
      });

      return app;
    });

    return res.status(201).json(application);
  } catch (error) {
    next(error);
  }
};

// TICKET-204: PATCH /applications/:id/status
export const updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status: nextStatus } = req.body as { status: ApplicationStatus };
    const userId = req.user!.sub;

    if (req.user!.role !== UserRole.RECRUITER && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Only recruiters can update application statuses.' });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!recruiterProfile || recruiterProfile.organizationId !== application.job.organizationId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify applications for other organizations.' });
    }

    // Validate legal transition
    const allowed = ALLOWED_TRANSITIONS[application.status] || [];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        error: `Illegal status transition from '${application.status}' to '${nextStatus}'.`,
        allowedTransitions: allowed,
      });
    }

    const updatedApplication = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status: nextStatus },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: nextStatus,
          changedById: userId,
        },
      });

      return updated;
    });

    return res.status(200).json(updatedApplication);
  } catch (error) {
    next(error);
  }
};

// TICKET-205: GET /job-postings/:id/applications
export const listApplicationsForJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: jobId } = req.params;
    const { status } = req.query;
    const userId = req.user!.sub;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!recruiterProfile || recruiterProfile.organizationId !== job.organizationId) {
      return res.status(403).json({ error: 'Forbidden: Only recruiters from the owning organization can view applications.' });
    }

    const applications = await prisma.application.findMany({
      where: {
        jobId,
        ...(status && { status: status as ApplicationStatus }),
      },
      include: {
        history: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(applications);
  } catch (error) {
    next(error);
  }
};