import { Router } from 'express';
import { userController } from './user.controller';

const userRoutes = Router();

userRoutes.post('/auth/register', userController.register);
userRoutes.post('/auth/login', userController.login);

export default userRoutes;
