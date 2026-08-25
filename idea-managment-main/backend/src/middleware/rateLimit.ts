import { Request, Response, NextFunction } from 'express';

type RateRecord = {
  count: number;
  windowStart: number;
};

export interface RateLimitOptions {
  /** Độ dài cửa sổ tính giới hạn (ms). */
  windowMs: number;
  /** Số request tối đa trong một cửa sổ. */
  max: number;
  /** Thông báo trả về khi vượt giới hạn. */
  message?: string;
  /** Cách xác định "ai" đang gọi. Mặc định theo IP. */
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiter lưu trong bộ nhớ tiến trình.
 *
 * Đủ dùng cho triển khai một tiến trình như hiện tại. Nếu sau này chạy nhiều
 * instance (pm2 cluster, nhiều container) thì cần chuyển sang Redis, vì mỗi
 * tiến trình đang đếm riêng.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message, keyGenerator } = options;
  const store = new Map<string, RateRecord>();

  // Dọn bản ghi hết hạn định kỳ để bộ nhớ không phình theo số IP đã gặp
  const cleanup = setInterval(() => {
    const now = Date.now();
    store.forEach((record, key) => {
      if (now - record.windowStart > windowMs) {
        store.delete(key);
      }
    });
  }, windowMs);
  // Không giữ tiến trình sống chỉ vì timer này
  cleanup.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();
    const record = store.get(key);

    if (!record || now - record.windowStart > windowMs) {
      store.set(key, { count: 1, windowStart: now });
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        message: message || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        retryAfterSeconds: retryAfter,
      });
    }

    record.count += 1;
    return next();
  };
}
