import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users } from '../../db/schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from '../../config/jwt.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateTokens(payload: TokenPayload): AuthTokens {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthTokens> {
    const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (existingUser.length > 0) {
      throw new AuthError('User already exists', 'DUPLICATE_USER');
    }

    const passwordHash = await hashPassword(input.password);
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(users).values({
      id,
      email: input.email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    return generateTokens({ userId: id });
  },

  async login(input: LoginInput): Promise<AuthTokens> {
    const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (result.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result[0];
    const isValid = await verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return generateTokens({ userId: user.id });
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(refreshToken);

    if (!payload.userId) {
      throw new Error('Invalid refresh token');
    }

    return generateTokens({ userId: payload.userId });
  },
};
