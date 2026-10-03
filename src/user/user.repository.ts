import prisma from '../common/prisma';
import { Prisma } from '@prisma/client';

// Safe user shape — passwordHash is never included in read queries
export type SafeUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      headline: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export const userRepository = {
  /** Read queries — passwordHash always excluded */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: safeUserSelect,
    });
  },

  /** Used only for authentication — returns full record including passwordHash */
  async findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    });
  },

  async findAll() {
    return prisma.user.findMany({ select: safeUserSelect });
  },

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: safeUserSelect,
    });
  },

  async createUserWithProfile(
    userData: Pick<Prisma.UserCreateInput, 'email' | 'passwordHash' | 'role'>,
    profileData: Pick<Prisma.ProfileCreateWithoutUserInput, 'firstName' | 'lastName'>,
  ) {
    return prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: profileData,
        },
      },
      select: safeUserSelect,
    });
  },

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  },

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
      select: { id: true, email: true, role: true },
    });
  },
};
