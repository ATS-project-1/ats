import express from 'express';
import { errorHandler } from './common/http/error-handler';
import { notFound } from './common/http/not-found';
import { jobPostingRouter } from './job/job-posting.routes';
import { applicationRouter } from './application/application.routes';
import { organizationRouter } from './user/organization/organization.routes';
import { candidateProfileRouter } from './user/profile/candidate-profile.routes';
import { recruiterProfileRouter } from './user/profile/recruiter-profile.routes';
import { authRouter } from './user/auth/auth.routes';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  app.use('/candidates', candidateProfileRouter);
  app.use('/recruiters', recruiterProfileRouter);
  app.use('/organizations', organizationRouter);
  app.use('/job-postings', jobPostingRouter);
  app.use('/applications', applicationRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
