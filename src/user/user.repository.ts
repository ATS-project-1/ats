import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import type { Role, UserStatus } from '../common/enums';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userAuthSelect = { ...userSelect, passwordHash: true } satisfies Prisma.UserSelect;

export type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;
export type UserAuthRecord = Prisma.UserGetPayload<{ select: typeof userAuthSelect }>;

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const userRepository = {
  create(input: CreateUserInput, db: DbClient = prisma): Promise<UserRecord> {
    return withMappedErrors(() =>
      db.user.create({
        data: { ...input, email: normalizeEmail(input.email) },
        select: userSelect,
      }),
    );
  },

  async findById(id: string, db: DbClient = prisma): Promise<UserRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() => db.user.findUnique({ where: { id }, select: userSelect }));
  },

  findByEmail(email: string, db: DbClient = prisma): Promise<UserRecord | null> {
    return withMappedErrors(() =>
      db.user.findUnique({ where: { email: normalizeEmail(email) }, select: userSelect }),
    );
  },

  /** The only function that returns passwordHash. */
  findByEmailForAuth(email: string, db: DbClient = prisma): Promise<UserAuthRecord | null> {
    return withMappedErrors(() =>
      db.user.findUnique({ where: { email: normalizeEmail(email) }, select: userAuthSelect }),
    );
  },

  updateStatus(id: string, status: UserStatus, db: DbClient = prisma): Promise<UserRecord> {
    return withMappedErrors(() =>
      db.user.update({ where: { id }, data: { status }, select: userSelect }),
    );
  },
};
