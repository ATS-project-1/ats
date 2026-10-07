import type { Request, Response } from 'express';
import { getAuth } from '../../common/http/get-auth';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { authService } from './auth.service';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const user = await authService.register(req.body as RegisterInput);
    res.status(201).json({ user });
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);
    res.status(200).json(result);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getCurrentUser(getAuth(req).userId);
    res.status(200).json({ user });
  },
};
