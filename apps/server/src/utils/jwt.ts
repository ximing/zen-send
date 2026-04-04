import jwt from 'jsonwebtoken';

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';

const ACCESS_TOKEN_EXPIRES_IN = '3y';
const REFRESH_TOKEN_EXPIRES_IN = '3y';

export interface TokenPayload {
  userId: string;
  deviceId?: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
