export const ResponseUtil = {
  success<T>(data: T, statusCode = 200) {
    return {
      success: true,
      data,
      statusCode,
    };
  },

  created<T>(data: T) {
    return this.success(data, 201);
  },

  error(message: string, code?: string, statusCode = 400) {
    return {
      success: false,
      error: message,
      code,
      statusCode,
    };
  },

  badRequest(message: string) {
    return this.error(message, 'BAD_REQUEST', 400);
  },

  unauthorized(message = 'Unauthorized') {
    return this.error(message, 'UNAUTHORIZED', 401);
  },

  forbidden(message = 'Forbidden') {
    return this.error(message, 'FORBIDDEN', 403);
  },

  notFound(message = 'Not found') {
    return this.error(message, 'NOT_FOUND', 404);
  },
};
