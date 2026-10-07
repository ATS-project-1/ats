import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { userRepository } from '../../user/user.repository';
import { verifyAccessToken } from '../../user/auth/token';

const BEARER = /^\s*bearer\s+(\S+)\s*$/i;

const authRequired = () => new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
const invalidToken = () => new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');

/** Requires a valid "Authorization: Bearer <token>" header and sets req.auth. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const match = BEARER.exec(req.headers.authorization ?? '');
  if (!match) throw authRequired();

  const claims = verifyAccessToken(match[1]);

  // Re-read the user on every request and take the role from the DATABASE, not from the token.
  // A token stays valid until it expires, so this makes a suspension or role change take effect
  // on the user's next request instead of when their token runs out. The cost is one indexed
  // primary-key lookup per request; a later caching ticket could reduce it.
  const user = await userRepository.findById(claims.sub);
  if (!user) throw invalidToken();
  if (user.status === 'SUSPENDED') {
    throw new ForbiddenError('This account is suspended', 'ACCOUNT_SUSPENDED');
  }

  req.auth = { userId: user.id, role: user.role };
  next();
};
