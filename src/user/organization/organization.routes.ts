import { Router } from 'express';
import { requireAuth } from '../../common/http/require-auth';
import { requireRole } from '../../common/http/require-role';
import { validateBody } from '../../common/http/validate';
import { organizationController } from './organization.controller';
import {
  addRecruiterSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
} from './organization.schemas';

// Every route acts on the CALLER's own organization (derived from their recruiter profile), never
// on an organization id taken from the URL or body, so there is no IDOR surface here. Admin-only
// actions are checked in the service with requireOrgAdmin().
export const organizationRouter = Router();

const guard = [requireAuth, requireRole('RECRUITER')];

organizationRouter.post(
  '/',
  ...guard,
  validateBody(createOrganizationSchema),
  organizationController.create,
);
organizationRouter.get('/me', ...guard, organizationController.getMine);
organizationRouter.patch(
  '/me',
  ...guard,
  validateBody(updateOrganizationSchema),
  organizationController.updateMine,
);
organizationRouter.post(
  '/me/recruiters',
  ...guard,
  validateBody(addRecruiterSchema),
  organizationController.addRecruiter,
);
