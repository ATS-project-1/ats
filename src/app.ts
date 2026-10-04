import express, { Request, Response } from 'express';
import { config } from './common/config/env.config';
import { connectPrisma } from './common/database/prisma';
import { userRepository } from './user/user.repository';

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async (): Promise<void> => {
  await connectPrisma();

  // TICKET-004 Smoke Test: Execute query through repository layer
  try {
    const testUser = await userRepository.findByEmail('smoke-test@example.com');
    console.log('Repository layer smoke test passed successfully:', testUser === null ? 'No error (User null as expected)' : 'User found');
  } catch (error) {
    console.error('Repository layer smoke test failed:', error);
    process.exit(1);
  }

  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT} in [${config.NODE_ENV}] mode`);
  });
};

startServer();