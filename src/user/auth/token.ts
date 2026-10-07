import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { Role } from '../../common/enums';
import { UnauthorizedError } from '../../common/errors';
import { isUuid } from '../../common/ids';

export type AccessTokenClaims = { sub: string; role: Role };

const ALGORITHM = 'HS256';
const ROLES = Object.values(Role) as string[];

/** Signs an access token. The payload holds only the role; `sub` comes from the subject option. */
export function signAccessToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, config.jwt.secret, {
    algorithm: ALGORITHM,
    expiresIn: config.jwt.expiresInSeconds,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    subject: user.id,
  });
}

const invalidToken = () => new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');

/** Verifies a token, throwing UnauthorizedError("INVALID_TOKEN") on any failure. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret, {
      algorithms: [ALGORITHM],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  } catch {
    throw invalidToken();
  }

  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    !isUuid(payload.sub) ||
    typeof payload.role !== 'string' ||
    !ROLES.includes(payload.role)
  ) {
    throw invalidToken();
  }

  return { sub: payload.sub, role: payload.role as Role };
}
