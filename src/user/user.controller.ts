import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { userService } from './user.service';

export const userController = {
  async register(req: Request, res: Response) {
    const { email, password, role, fullName } = req.body as Record<
      string,
      unknown
    >;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof fullName !== 'string' ||
      typeof role !== 'string' ||
      !Object.values(Role).some((validRole) => validRole === role)
    ) {
      return res.status(400).json({ error: 'Invalid registration details' });
    }

    try {
      const user = await userService.register(
        email,
        password,
        role as Role,
        fullName,
      );
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email_In_Use') {
        return res.status(409).json({
          error: 'An account with this email already exists.',
        });
      }

      console.error('User registration failed:', error);
      return res.status(500).json({ error: 'Unable to register user' });
    }
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body as Record<string, unknown>;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const result = await userService.login(email, password);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid_Credentials') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      console.error('Login failed:', error);
      return res.status(500).json({ error: 'Unable to process login' });
    }
  },
};
