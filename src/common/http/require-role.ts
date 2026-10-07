import type { RequestHandler } from 'express';
import type { Role } from '../enums';
import { ForbiddenError } from '../errors';

/**
 * Allows only the listed roles. Roles are explicit: ADMIN gets NO implicit access, so a route
 * that should admit admins must list ADMIN. Must be mounted after requireAuth.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  if (roles.length === 0) {
    throw new Error('requireRole needs at least one role');
  }

  return (req, _res, next) => {
    if (!req.auth) {
      throw new Error('requireRole used on a route without requireAuth mounted before it');
    }
    if (!roles.includes(req.auth.role)) {
      throw new ForbiddenError('You do not have permission to perform this action', 'FORBIDDEN');
    }
    next();
  };
}
