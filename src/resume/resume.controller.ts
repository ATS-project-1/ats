import type { Request, Response } from 'express';
import { ValidationError } from '../common/errors';
import { getAuth } from '../common/http/get-auth';
import { resumeJsonService } from './resume-json.service';
import { resumeSchema, resumeRecordSchema, updateResumeRecordSchema } from './resume.schema';
import { resumeService } from './resume.service';
import { pdfService } from './pdf.service';
import { z } from 'zod';
import { resumeParserService, UnsupportedFileTypeError } from './resume-parser.service';
import { resumeAiService } from './resume-ai.service';

const downloadPdfSchema = z.strictObject({
  templateId: z.enum(['classic', 'modern']).default('classic'),
});

export const resumeController = {
  async create(req: Request, res: Response): Promise<void> {
    const { userId } = getAuth(req);
    const recordInput = resumeRecordSchema.safeParse(req.body);
    if (recordInput.success) {
      const resume = await resumeService.createResume(userId, recordInput.data);
      res.status(201).json({ resume });
      return;
    }

    const jsonInput = resumeSchema.parse(req.body);
    const resume = await resumeJsonService.createResume(userId, jsonInput);
    res.status(201).json({ resume });
  },

  async update(req: Request, res: Response): Promise<void> {
    const resumeId = req.params.id;
    if (!resumeId || Array.isArray(resumeId)) {
      throw new ValidationError('A single resume ID is required', 'INVALID_RESUME_ID');
    }
    const { userId } = getAuth(req);
    const recordInput = updateResumeRecordSchema.safeParse(req.body);
    if (recordInput.success) {
      const resume = await resumeService.updateResume(resumeId, userId, recordInput.data);
      res.status(200).json({ resume });
      return;
    }

    const jsonInput = resumeSchema.partial().parse(req.body);
    const resume = await resumeJsonService.updateResume(userId, resumeId, jsonInput);
    res.status(200).json({ resume });
  },

  async createVersion(req: Request, res: Response): Promise<void> {
    const resumeId = req.params.id;
    if (!resumeId || Array.isArray(resumeId)) {
      throw new ValidationError('A single resume ID is required', 'INVALID_RESUME_ID');
    }
    const version = await resumeService.snapshotResume(resumeId, getAuth(req).userId);
    res.status(201).json({ version });
  },

  async downloadPdf(req: Request, res: Response): Promise<void> {
    const versionId = req.params.versionId;
    if (!versionId || Array.isArray(versionId)) {
      throw new ValidationError(
        'A single resume version ID is required',
        'INVALID_RESUME_VERSION_ID',
      );
    }
    const { templateId } = downloadPdfSchema.parse(req.body ?? {});
    const version = await resumeService.getOwnedVersion(versionId, getAuth(req).userId);
    const resumeData = resumeSchema.parse(version.content);
    const pdfBuffer = await pdfService.generatePdf(resumeData, templateId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.status(200).send(pdfBuffer);
  },

  async uploadResume(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided.' });
      return;
    }

    try {
      const rawText = await resumeParserService.extractTextFromFile(req.file);
      const resume = await resumeAiService.parseRawTextToSchema(rawText);
      res.status(200).json({ resume });
    } catch (error) {
      if (
        error instanceof UnsupportedFileTypeError ||
        (error instanceof ValidationError && error.code === 'FILE_PARSE_ERROR')
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  },
};
