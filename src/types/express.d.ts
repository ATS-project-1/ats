import type { Role } from '../common/enums';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Read it with getAuth(req), never with a non-null assertion. */
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
