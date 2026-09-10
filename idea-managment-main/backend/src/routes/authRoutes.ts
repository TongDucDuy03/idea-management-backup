import express from 'express';
import { login, logout, currentSession } from '../controllers/authController';
import { rateLimit } from '../middleware/rateLimit';
import { auth } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/origin';

const router = express.Router();

// Chống dò mật khẩu: tối đa 10 lần thử / 15 phút cho mỗi IP
router.post(
  '/login',
  requireTrustedOrigin,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' }),
  rateLimit({ scope: 'login-account', windowMs: 15 * 60 * 1000, max: 20,
    keyGenerator: req => typeof req.body?.username === 'string' ? req.body.username.slice(0, 128) : 'invalid' }),
  login
);

router.get('/session', auth, currentSession);
router.post('/logout', requireTrustedOrigin, auth, logout);

// POST /create-admin đã bị gỡ: trước đây công khai, ai cũng tạo được tài khoản
// quản trị. Dùng `npm run create-admin` trên server thay thế.

export default router;
