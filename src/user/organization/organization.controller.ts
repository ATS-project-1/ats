import type { Request, Response } from 'express';
import { getAuth } from '../../common/http/get-auth';
import type {
  AddRecruiterInput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schemas';
import { organizationService } from './organization.service';

export const organizationController = {
  async create(req: Request, res: Response): Promise<void> {
    const organization = await organizationService.create(
      getAuth(req).userId,
      req.body as CreateOrganizationInput,
    );
    res.status(201).json({ organization });
  },

  async getMine(req: Request, res: Response): Promise<void> {
    const organization = await organizationService.getMine(getAuth(req).userId);
    res.status(200).json({ organization });
  },

  async updateMine(req: Request, res: Response): Promise<void> {
    const organization = await organizationService.updateMine(
      getAuth(req).userId,
      req.body as UpdateOrganizationInput,
    );
    res.status(200).json({ organization });
  },

  async addRecruiter(req: Request, res: Response): Promise<void> {
    const organization = await organizationService.addRecruiter(
      getAuth(req).userId,
      req.body as AddRecruiterInput,
    );
    res.status(200).json({ organization });
  },
};
