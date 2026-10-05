import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import config from '../config';
import { requireAuth, requireRole } from './middleware';

const app = express();

app.use(express.json());
app.get('/public', (_req, res) => res.sendStatus(200));
app.get(
  '/candidate-only',
  requireAuth,
  requireRole(['CANDIDATE']),
  (_req, res) => res.sendStatus(200),
);
app.get(
  '/recruiter-only',
  requireAuth,
  requireRole(['RECRUITER']),
  (_req, res) => res.sendStatus(200),
);

function tokenForRole(role: 'CANDIDATE' | 'RECRUITER') {
  return jwt.sign({ userId: 'test-user', role }, config.JWT_SECRET);
}

describe('role-based access control middleware', () => {
  it('allows public requests without a token', async () => {
    await request(app).get('/public').expect(200);
  });

  it('rejects requests without a token', async () => {
    await request(app).get('/candidate-only').expect(401);
  });

  it('allows candidates on candidate-only routes', async () => {
    await request(app)
      .get('/candidate-only')
      .set('Authorization', `Bearer ${tokenForRole('CANDIDATE')}`)
      .expect(200);
  });

  it('rejects candidates from recruiter-only routes', async () => {
    await request(app)
      .get('/recruiter-only')
      .set('Authorization', `Bearer ${tokenForRole('CANDIDATE')}`)
      .expect(403);
  });

  it('allows recruiters on recruiter-only routes', async () => {
    await request(app)
      .get('/recruiter-only')
      .set('Authorization', `Bearer ${tokenForRole('RECRUITER')}`)
      .expect(200);
  });

  it('rejects recruiters from candidate-only routes', async () => {
    await request(app)
      .get('/candidate-only')
      .set('Authorization', `Bearer ${tokenForRole('RECRUITER')}`)
      .expect(403);
  });
});
