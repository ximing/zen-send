import type { TokenPayload } from '../utils/jwt.js';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
