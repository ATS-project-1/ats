import express, { Request, Response } from 'express';
import { config } from './common/config/env.config';
import { connectPostgres } from './common/database/postgres';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async (): Promise<void> => {
  await connectPostgres();

  app.listen(config.PORT, () => {
    console.log(` Server running on http://localhost:${config.PORT} in [${config.NODE_ENV}] mode`);
  });
};

startServer();