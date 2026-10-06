import { Request, Response } from 'express';
import { OrganizationData } from './organization.repository';
import { organizationService } from './organization.service';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const organizationController = {
  async createOrganization(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isObject(req.body)) {
      return res.status(400).json({ error: 'Invalid organization data' });
    }

    const { name, description, website } = req.body;
    if (
      typeof name !== 'string' ||
      name.trim() === '' ||
      (description !== undefined && typeof description !== 'string') ||
      (website !== undefined && typeof website !== 'string')
    ) {
      return res.status(400).json({ error: 'Invalid organization data' });
    }

    const data: OrganizationData = { name, description, website };

    try {
      const result = await organizationService.createOrganization(
        userId,
        data,
      );
      return res.status(201).json(result);
    } catch (error) {
      console.error('Failed to create organization:', error);
      return res.status(500).json({ error: 'Unable to create organization' });
    }
  },
};
