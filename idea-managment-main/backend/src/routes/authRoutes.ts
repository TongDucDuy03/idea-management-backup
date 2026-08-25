import express from 'express';
import { login } from '../controllers/authController';
import { rateLimit } from '../middleware/rateLimit';

const router = express.Router();

// Chống dò mật khẩu: tối đa 10 lần thử / 15 phút cho mỗi IP
router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' }),
  login
);

// POST /create-admin đã bị gỡ: trước đây công khai, ai cũng tạo được tài khoản
// quản trị. Dùng `npm run create-admin` trên server thay thế.

export default router;
