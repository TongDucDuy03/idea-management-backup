import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Session from '../models/Session';
import { AuthRequest, hashSessionToken, readSessionCookie } from '../middleware/auth';
import { sessionCookieName, sessionCookieOptions, sessionTtlSeconds } from '../config/security';

const dummyHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password
        || username.length > 128 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: 'Thông tin đăng nhập không hợp lệ' });
    }
    const user = await User.findOne({ username });
    const matches = await bcrypt.compare(password, user?.password || dummyHash);
    if (!user || !matches || user.isActive === false || !['admin', 'viewer'].includes(user.role)) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    const token = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    const ttl = sessionTtlSeconds();
    await Session.create({ tokenHash: hashSessionToken(token), userId: user._id,
      sessionVersion: user.sessionVersion || 0, csrfToken, expiresAt: new Date(Date.now() + ttl * 1000) });
    const previous = readSessionCookie(req);
    if (previous) await Session.deleteOne({ tokenHash: hashSessionToken(previous) });
    res.setHeader('Cache-Control', 'no-store');
    res.cookie(sessionCookieName(), token, { ...sessionCookieOptions(), maxAge: ttl * 1000 });
    return res.json({ user: { userId: String(user._id), role: user.role }, csrfToken });
  } catch (error) { return next(error); }
};
export const currentSession = (req: AuthRequest, res: Response) =>
  res.json({ user: req.user, csrfToken: req.session!.csrfToken });
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Session.deleteOne({ _id: req.session!.id });
    res.clearCookie(sessionCookieName(), sessionCookieOptions());
    return res.status(204).end();
  } catch (error) { return next(error); }
};
