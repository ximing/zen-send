// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Service } from 'typedi';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from '../config/jwt.js';
import { logger } from '@zen-send/logger';

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

@Service()
export class AuthService {
  private invalidatedTokens = new Set<string>();

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  async register(input: RegisterInput): Promise<AuthTokens> {
    logger.info({ email: input.email }, 'Starting registration');
    const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    logger.info({ existingUserCount: existingUser.length }, 'Checked existing user');

    if (existingUser.length > 0) {
      throw new AuthError('User already exists', 'DUPLICATE_USER');
    }

    logger.info('Hashing password');
    const passwordHash = await this.hashPassword(input.password);
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    logger.info({ id, now }, 'Inserting user');

    await db.insert(users).values({
      id,
      email: input.email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Generating tokens');
    return this.generateTokens({ userId: id });
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (result.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result[0];
    const isValid = await this.verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens({ userId: user.id });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (this.invalidatedTokens.has(refreshToken)) {
      throw new Error('Token has been invalidated');
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload.userId) {
      throw new Error('Invalid refresh token');
    }

    return this.generateTokens({ userId: payload.userId });
  }

  logout(refreshToken: string): void {
    this.invalidatedTokens.add(refreshToken);
  }
}
