import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_key';
const JWT_EXPIRES_IN = '1d';

// TICKET-101: POST /auth/register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }

    // Uniqueness validation on email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // Password hashing
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userRole = Object.values(UserRole).includes(role) ? role : UserRole.CANDIDATE;

    // Acceptance: Valid request creates a User with PENDING_VERIFICATION status
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: userRole,
        status: UserStatus.PENDING_VERIFICATION,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'User registered successfully. Pending verification.',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

// TICKET-102: POST /auth/login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Generic error to prevent user enumeration leaks
    const invalidCredentialsError = 'Invalid email or password.';

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: invalidCredentialsError });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: invalidCredentialsError });
    }

    // Issue JWT with user id + role claim
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};