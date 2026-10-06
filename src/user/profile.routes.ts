import { Router } from 'express';
import { requireAuth } from '../common/middleware';
import { profileController } from './profile.controller';

const profileRoutes = Router();

profileRoutes.get('/', requireAuth, profileController.getProfile);
profileRoutes.put('/', requireAuth, profileController.updateProfile);

export default profileRoutes;
