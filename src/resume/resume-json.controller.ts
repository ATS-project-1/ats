import type { Request, Response } from 'express';
import { getAuth } from '../common/http/get-auth';
import type { Resume } from './resume.schema';
import { resumeJsonService } from './resume-json.service';

export const resumeJsonController = {
  /** POST /resumes — create a new resume for the authenticated candidate. */
  async create(req: Request, res: Response): Promise<void> {
    const { userId } = getAuth(req);
    const resume = await resumeJsonService.createResume(userId, req.body as Resume);
    res.status(201).json({ resume });
  },

  /** GET /resumes — return the authenticated candidate's resume. */
  async get(req: Request, res: Response): Promise<void> {
    const { userId } = getAuth(req);
    const resume = await resumeJsonService.getResume(userId);
    res.status(200).json({ resume });
  },

  /** PATCH /resumes/:id — update a resume owned by the authenticated candidate. */
  async update(req: Request, res: Response): Promise<void> {
    const { userId } = getAuth(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const resume = await resumeJsonService.updateResume(userId, id, req.body as Resume);
    res.status(200).json({ resume });
  },
};
