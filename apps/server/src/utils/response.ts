import type { Response } from 'express';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export function success<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ data });
}

export function error(res: Response, message: string, code?: string, statusCode = 400): Response {
  return res.status(statusCode).json({ error: code || 'Error', message });
}

export function badRequest(res: Response, message: string): Response {
  return error(res, message, 'BadRequest', 400);
}

export function unauthorized(res: Response, message = 'Unauthorized'): Response {
  return error(res, message, 'Unauthorized', 401);
}

export function notFound(res: Response, message: string): Response {
  return error(res, message, 'NotFound', 404);
}

export function gone(res: Response, message: string): Response {
  return error(res, message, 'Gone', 410);
}

export function serverError(res: Response, message = 'Internal server error'): Response {
  return error(res, message, 'InternalServerError', 500);
}
