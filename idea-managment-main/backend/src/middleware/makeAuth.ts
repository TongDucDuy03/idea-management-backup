import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { rateLimit } from './rateLimit';

/**
 * So sánh chuỗi theo thời gian hằng số, tránh rò rỉ thông tin qua thời gian phản hồi.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const makeAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Đọc env trong hàm, KHÔNG ở cấp module: trước đây đọc ở cấp module nên giá
    // trị luôn undefined (module được nạp trước khi dotenv.config() chạy),
    // khiến /api/make/realtime luôn trả 401 dù .env có key đúng.
    const MAKE_API_KEY = process.env.MAKE_API_KEY;
    const MAKE_BEARER_TOKEN = process.env.MAKE_BEARER_TOKEN;

    if (!MAKE_API_KEY && !MAKE_BEARER_TOKEN) {
      console.error('[MAKE] Chưa cấu hình MAKE_API_KEY hoặc MAKE_BEARER_TOKEN');
      return res.status(503).json({ success: false, error: 'not_configured' });
    }

    const apiKeyHeader = req.header('X-API-KEY');
    // GET có thể dùng query ?api_key=... để test trên trình duyệt (Make nên dùng header)
    const apiKeyQuery = req.method === 'GET' ? req.query.api_key : undefined;
    const presentedKey =
      apiKeyHeader || (typeof apiKeyQuery === 'string' ? apiKeyQuery : undefined);

    const hasApiKey = !!MAKE_API_KEY && !!presentedKey && safeEqual(presentedKey, MAKE_API_KEY);

    const authHeader = req.header('Authorization');
    let hasBearer = false;
    if (MAKE_BEARER_TOKEN && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      hasBearer = safeEqual(token, MAKE_BEARER_TOKEN);
    }

    if (!hasApiKey && !hasBearer) {
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }
};

/**
 * Giới hạn tần suất cho endpoint Make, tính theo API key nếu có, nếu không thì theo IP.
 */
export const makeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.MAKE_RATE_LIMIT_PER_MINUTE || 60),
  message: 'rate_limit_exceeded',
  keyGenerator: (req) => {
    const apiKey = req.header('X-API-KEY') || (req.query.api_key as string | undefined);
    if (apiKey) return `key:${apiKey}`;
    const bearer = req.header('Authorization');
    if (bearer) return `bearer:${bearer}`;
    return `ip:${req.ip}`;
  },
});
