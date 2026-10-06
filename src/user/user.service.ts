import { userRepository } from './user.repository';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';

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

  async login(email: string, password: string) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new Error('Invalid_Credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid_Credentials');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    const { passwordHash, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
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
