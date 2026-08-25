// PHẢI là import đầu tiên: nạp biến môi trường trước khi bất kỳ module nào
// khác đọc process.env ở cấp module.
import './loadEnv';

import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { assertRequiredEnv } from './config/env';
import { resolveUploadDir, ensureUploadDirExists } from './utils/uploadDir';
import ideaRoutes from './routes/ideaRoutes';
import authRoutes from './routes/authRoutes';
import a3ReportRoutes from './routes/a3ReportRoutes';
import aiRoutes from './routes/aiRoutes';
import importRoutes from './routes/importRoutes';
import makeRoutes from './routes/makeRoutes';

// Dừng ngay nếu cấu hình thiếu, thay vì chạy với giá trị mặc định không an toàn
assertRequiredEnv();

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Sau reverse proxy (nginx), cần bật để req.ip lấy đúng IP client — rate limit
// dựa vào giá trị này.
app.set('trust proxy', 1);

const uploadsDir = resolveUploadDir();
ensureUploadDirExists(uploadsDir);
console.log('[UPLOAD] static dir =', uploadsDir);

// Middleware - CORS configuration
// Cho phép credentials và origin cụ thể (không được dùng wildcard * khi có credentials)
const allowedOrigins = (
  isProduction
    ? process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://172.104.39.94'
    : process.env.CORS_ORIGIN || 'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-KEY'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(cors(corsOptions));
// CORS must run before static uploads so legacy direct backend image URLs can
// still be read by html2canvas. New clients use the same-origin /uploads proxy.
app.use('/uploads', express.static(uploadsDir));
// Tăng giới hạn kích thước body để hỗ trợ upload ảnh dạng data URL
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Healthcheck cho giám sát / load balancer
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Routes
app.use('/api/ideas', ideaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/a3-reports', a3ReportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/make', makeRoutes);

// 404 cho các đường dẫn API không tồn tại
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Không tìm thấy endpoint' });
});

/**
 * Error handler tập trung — phải khai báo SAU tất cả routes.
 *
 * Ghi log đầy đủ ở server nhưng chỉ trả thông báo chung cho client, tránh lộ
 * stack trace và cấu trúc database.
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);

  // Lỗi kích thước file từ multer
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File vượt quá dung lượng cho phép (10MB)' });
  }
  // Body JSON sai định dạng
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ' });
  }

  return res.status(err?.status || 500).json({
    message: err?.expose ? err.message : 'Lỗi server',
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    // Thoát với mã lỗi để process manager (pm2/systemd/docker) khởi động lại,
    // thay vì để tiến trình sống mà không có database.
    process.exit(1);
  });
