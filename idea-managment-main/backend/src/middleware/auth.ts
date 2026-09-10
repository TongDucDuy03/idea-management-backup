import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import User from '../models/User';
import Session from '../models/Session';
import { sessionCookieName } from '../config/security';

export interface AuthRequest extends Request {
  user?: { userId: string; role: 'admin' | 'viewer' };
  session?: { id: string; csrfToken: string };
}
export const hashSessionToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function readSessionCookie(req: Request): string {
  const name = sessionCookieName() + '=';
  return (req.headers.cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(name))?.slice(name.length) || '';
}
export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = readSessionCookie(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  try {
    const session = await Session.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } }).lean();
    if (!session) return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
    const user = await User.findById(session.userId).select('role isActive sessionVersion').lean();
    const role = user?.role || 'viewer';
    if (!user || user.isActive === false || (user.sessionVersion || 0) !== session.sessionVersion
        || !['admin', 'viewer'].includes(role)) {
      return res.status(401).json({ message: 'Phiên đăng nhập không còn hợp lệ' });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const supplied = Buffer.from(req.get('X-CSRF-Token') || '');
      const expected = Buffer.from(session.csrfToken);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        return res.status(403).json({ message: 'Yêu cầu xác thực CSRF không hợp lệ' });
      }
    }
    req.user = { userId: String(user._id), role };
    req.session = { id: String(session._id), csrfToken: session.csrfToken };
    return next();
  } catch (error) { return next(error); }
};
export const requireRole = (...roles: Array<'admin' | 'viewer'>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
    return next();
  };
