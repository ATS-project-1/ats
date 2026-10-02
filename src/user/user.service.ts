import { userRepository } from './user.repository';
import { Prisma } from '@prisma/client';

export const userService = {
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
