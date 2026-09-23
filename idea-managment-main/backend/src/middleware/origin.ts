import { Request, Response, NextFunction } from 'express';
import { allowedOrigins } from '../config/security';

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const list = allowedOrigins();
  if (list.includes(origin)) return true;

  // Trong môi trường development (không phải test/production), cho phép localhost và IP nội bộ
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    try {
      const url = new URL(origin);
      const host = url.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.')
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

// Login needs protection before an authenticated CSRF token exists.
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  if (!origin || !isOriginAllowed(origin)) {
    return res.status(403).json({ message: 'Nguồn yêu cầu không được phép' });
  }
  return next();
}
