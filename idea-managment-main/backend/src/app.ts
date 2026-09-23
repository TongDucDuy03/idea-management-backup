import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { auth } from './middleware/auth';
import { makeAuth } from './middleware/makeAuth';
import { allowedOrigins as getAllowedOrigins } from './config/security';
import { isOriginAllowed } from './middleware/origin';
import { resolveUploadDir, ensureUploadDirExists } from './utils/uploadDir';
import ideaRoutes from './routes/ideaRoutes';
import authRoutes from './routes/authRoutes';
import a3ReportRoutes from './routes/a3ReportRoutes';
import aiRoutes from './routes/aiRoutes';
import importRoutes from './routes/importRoutes';
import makeRoutes from './routes/makeRoutes';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Sau reverse proxy (nginx), cần bật để req.ip lấy đúng IP client — rate limit
// dựa vào giá trị này.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, strictTransportSecurity: isProduction ? { maxAge: 31536000 } : false, crossOriginResourcePolicy: { policy: 'same-site' } }));

const uploadsDir = resolveUploadDir();
ensureUploadDirExists(uploadsDir);
console.log('[UPLOAD] static dir =', uploadsDir);

// Middleware - CORS configuration
// Cho phép credentials và origin cụ thể (không được dùng wildcard * khi có credentials)
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    callback(null, !origin || isOriginAllowed(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-KEY', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(cors(corsOptions));
// CORS must run before static uploads so legacy direct backend image URLs can
// still be read by html2canvas. New clients use the same-origin /uploads proxy.
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  // Machine integrations send their credential in a header, never in image URLs.
  if (req.get('X-API-KEY') || req.get('Authorization')) return makeAuth(req, res, next);
  return auth(req, res, next);
}, express.static(uploadsDir, { cacheControl: false, dotfiles: 'deny' }));
app.use('/uploads', (_req, res) => {
  res.status(404).json({ message: 'Không tìm thấy hình ảnh' });
});
// Tăng giới hạn kích thước body để hỗ trợ upload ảnh dạng data URL
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Healthcheck cho giám sát / load balancer
app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.setHeader('Cache-Control', 'no-store');
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
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


export default app;
