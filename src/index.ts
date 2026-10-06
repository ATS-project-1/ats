import config from './config';
import express, { Request, Response } from 'express';
import jobRoutes from './job/job.routes';
import organizationRoutes from './organization/organization.routes';
import profileRoutes from './user/profile.routes';
import userRoutes from './user/user.routes';

const app = express();

app.use(express.json());
app.use('/', userRoutes);
app.use('/profile', profileRoutes);
app.use('/organizations', organizationRoutes);
app.use('/jobs', jobRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Server is configured and running!');
});

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

export default app;
