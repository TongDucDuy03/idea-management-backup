import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { getJwtSecret, JWT_EXPIRES_IN } from '../config/secrets';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      // Cùng một thông báo cho mọi trường hợp sai, tránh lộ username nào tồn tại
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign({ userId: user._id }, getJwtSecret(), {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return res.json({ token });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

// LƯU Ý: endpoint tạo tài khoản quản trị qua HTTP đã được gỡ bỏ vì trước đây
// hoàn toàn công khai — ai cũng tự tạo được tài khoản admin.
// Tạo tài khoản bằng lệnh chạy trực tiếp trên server:
//   cd backend && npm run create-admin
