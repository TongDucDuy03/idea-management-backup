import { Request, Response, NextFunction } from 'express';
import { allowedOrigins } from '../config/security';

// Login needs protection before an authenticated CSRF token exists.
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  if (!origin || !allowedOrigins().includes(origin)) return res.status(403).json({ message: 'Nguồn yêu cầu không được phép' });
  return next();
}
