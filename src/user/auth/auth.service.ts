import bcrypt from 'bcrypt';
import { config } from '../../config';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../common/errors';
import { userRepository } from '../user.repository';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { signAccessToken } from './token';

const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists';

// Compared against when the email is unknown, so a failed login costs one bcrypt comparison
// whether or not the account exists. Without it, "no such email" would return noticeably faster
// and attackers could discover registered emails by timing requests. Created once at module
// load with the same cost factor as real hashes.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'dummy-password-for-timing-equalization',
  config.bcryptRounds,
);

const invalidCredentials = () =>
  new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

export type PublicUser = Pick<
  Awaited<ReturnType<typeof userRepository.create>>,
  'id' | 'email' | 'fullName' | 'role' | 'status' | 'createdAt'
>;

function toPublicUser(user: PublicUser): PublicUser {
  const { id, email, fullName, role, status, createdAt } = user;
  return { id, email, fullName, role, status, createdAt };
}

export const authService = {
  async register(input: RegisterInput): Promise<PublicUser> {
    if (await userRepository.findByEmail(input.email)) {
      throw new ConflictError(EMAIL_TAKEN_MESSAGE, 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

    try {
      const user = await userRepository.create({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
      });
      return toPublicUser(user);
    } catch (err) {
      // A concurrent registration won the race; the unique constraint on email fired.
      if (err instanceof ConflictError) {
        throw new ConflictError(EMAIL_TAKEN_MESSAGE, 'EMAIL_TAKEN');
      }
      throw err;
    }
  },

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
    return toPublicUser(user);
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmailForAuth(input.email);

    const passwordMatches = await bcrypt.compare(
      input.password,
      user ? user.passwordHash : DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      throw invalidCredentials();
    }

    // Status is only revealed after the password is verified.
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('This account is suspended', 'ACCOUNT_SUSPENDED');
    }
    // TODO: PENDING_VERIFICATION users may log in for now because the backlog has no
    // email-verification flow yet. Revisit once verification exists.

    return {
      accessToken: signAccessToken(user),
      tokenType: 'Bearer' as const,
      expiresIn: config.jwt.expiresInSeconds,
      user: toPublicUser(user),
    };
  },
};
