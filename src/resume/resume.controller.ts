import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { FullResumeDataSchema } from './resume.schema';
import { renderResumeHtml, TemplateType } from './resume.templates';
import { generatePdfFromHtml } from './pdf.service';

const prisma = new PrismaClient();

// TICKET-302: POST /resumes
export const createResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    if (req.user!.role !== UserRole.CANDIDATE) {
      return res.status(403).json({ error: 'Only candidates can create structured resumes.' });
    }

    const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidateProfile) {
      return res.status(400).json({ error: 'Candidate profile must exist before creating a resume.' });
    }

    // Runtime validation with Zod (TICKET-301)
    const parseResult = FullResumeDataSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten(),
      });
    }

    const resumeData = parseResult.data;

    const resume = await prisma.$transaction(async (tx) => {
      const newResume = await tx.resume.create({
        data: {
          candidateId: candidateProfile.id,
          title: resumeData.title,
        },
      });

      // Automatically create initial version 1 (TICKET-303)
      const initialVersion = await tx.resumeVersion.create({
        data: {
          resumeId: newResume.id,
          version: 1,
          fileUrl: '', // Will be dynamically generated or uploaded
          parsedData: resumeData as any,
        },
      });

      return { ...newResume, currentVersion: initialVersion };
    });

    return res.status(201).json(resume);
  } catch (error) {
    next(error);
  }
};

// TICKET-302: GET /resumes
export const listMyResumes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidateProfile) {
      return res.status(200).json([]);
    }

    const resumes = await prisma.resume.findMany({
      where: { candidateId: candidateProfile.id },
      include: {
        versions: { orderBy: { version: 'desc' } },
      },
    });

    return res.status(200).json(resumes);
  } catch (error) {
    next(error);
  }
};

// TICKET-302: PATCH /resumes/:id
export const updateResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
    const resume = await prisma.resume.findUnique({ where: { id } });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    // Acceptance: Candidate can only edit their own resume
    if (!candidateProfile || resume.candidateId !== candidateProfile.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this resume.' });
    }

    const parseResult = FullResumeDataSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const updated = await prisma.resume.update({
      where: { id },
      data: {
        ...(parseResult.data.title && { title: parseResult.data.title }),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// TICKET-303: POST /resumes/:id/versions (Immutable Snapshot)
export const createResumeVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: resumeId } = req.params;
    const userId = req.user!.sub;

    const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });

    if (!resume || !candidateProfile || resume.candidateId !== candidateProfile.id) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this resume.' });
    }

    const parseResult = FullResumeDataSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const latestVersion = await prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { version: 'desc' },
    });

    const nextVersionNumber = (latestVersion?.version || 0) + 1;

    const newVersion = await prisma.resumeVersion.create({
      data: {
        resumeId,
        version: nextVersionNumber,
        fileUrl: '',
        parsedData: parseResult.data as any,
      },
    });

    return res.status(201).json(newVersion);
  } catch (error) {
    next(error);
  }
};

// TICKET-305: POST /resumes/versions/:versionId/pdf
export const generateResumePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionId } = req.params;
    const template = (req.query.template as TemplateType) || 'MODERN';

    const resumeVersion = await prisma.resumeVersion.findUnique({
      where: { id: versionId },
      include: { resume: true },
    });

    if (!resumeVersion) {
      return res.status(404).json({ error: 'Resume version not found.' });
    }

    const resumeData = resumeVersion.parsedData as any;
    if (!resumeData) {
      return res.status(400).json({ error: 'No structured data available for this version.' });
    }

    // TICKET-304: Render HTML with selected template
    const html = renderResumeHtml(resumeData, template);

    // TICKET-305: Render to downloadable PDF
    const pdfBuffer = await generatePdfFromHtml(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resumeVersion.resume.title}_v${resumeVersion.version}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};