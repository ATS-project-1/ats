import { Router } from 'express';
import { requireAuth } from '../../common/http/require-auth';
import { validateBody } from '../../common/http/validate';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.get('/me', requireAuth, authController.me);
