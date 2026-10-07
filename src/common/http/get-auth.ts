import type { Request } from 'express';
import type { Role } from '../enums';

/**
 * Returns the authenticated caller. Throwing a plain Error here is deliberate: a missing
 * req.auth means the route forgot requireAuth, which is a programmer error (a 500).
 */
export function getAuth(req: Request): { userId: string; role: Role } {
  if (!req.auth) {
    throw new Error('getAuth called on a route without requireAuth');
  }
  return req.auth;
}
