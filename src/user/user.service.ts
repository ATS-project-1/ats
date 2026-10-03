import { userRepository } from './user.repository';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

export const userService = {
  async register(
    email: string,
    password: string,
    role: Role,
    fullName: string,
  ) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email_In_Use');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [firstName = '', ...lastNameParts] = fullName.trim().split(/\s+/);

    return userRepository.createUserWithProfile(
      { email, passwordHash, role },
      { firstName, lastName: lastNameParts.join(' ') },
    );
  },

  async getUserById(id: string) {
    return userRepository.findById(id);
  },

  async getUserByEmail(email: string) {
    return userRepository.findByEmail(email);
  },

  async getAllUsers() {
    return userRepository.findAll();
  },

  async createUser(data: Prisma.UserCreateInput) {
    return userRepository.create(data);
  },

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return userRepository.update(id, data);
  },

  async deleteUser(id: string) {
    return userRepository.delete(id);
  },
};
