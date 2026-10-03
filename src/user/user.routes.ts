import { Router } from 'express';
import { userController } from './user.controller';

const userRoutes = Router();

userRoutes.post('/auth/register', userController.register);

export default userRoutes;
