import type { Request, Response } from 'express';
import { z } from 'zod';
import { authService, AuthError } from './auth.service.js';
import { created, success, badRequest, unauthorized, error } from '../../utils/response.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = registerSchema.safeParse(req.body);

      if (!parseResult.success) {
        badRequest(res, 'Invalid email or password');
        return;
      }

      const tokens = await authService.register(parseResult.data);
      created(res, tokens);
    } catch (err) {
      if (err instanceof AuthError && err.code === 'DUPLICATE_USER') {
        error(res, 'Registration failed', 'CONFLICT', 409);
      } else {
        badRequest(res, 'Registration failed');
      }
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);

      if (!parseResult.success) {
        badRequest(res, 'Invalid email or password');
        return;
      }

      const tokens = await authService.login(parseResult.data);
      success(res, tokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      unauthorized(res, message);
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = refreshSchema.safeParse(req.body);

      if (!parseResult.success) {
        badRequest(res, 'Invalid request body');
        return;
      }

      const tokens = await authService.refresh(parseResult.data.refreshToken);
      success(res, tokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      unauthorized(res, message);
    }
  },
};
