import { Action } from 'routing-controllers';
import type { Request } from 'express';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';

export async function currentUserChecker(action: Action): Promise<TokenPayload | null> {
  const request = action.request as Request;
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    return payload;
  } catch {
    return null;
  }
}
