import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import RateBucket from '../models/RateBucket';

type RateRecord = {
  count: number;
  windowStart: number;
};

export interface RateLimitOptions {
  /** Stable namespace shared across application instances. */
  scope?: string;
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
 * Production dùng MongoDB atomic để chia sẻ giới hạn giữa các tiến trình.
 * Development mặc định dùng bộ nhớ; RATE_LIMIT_STORE=mongo bật store dùng chung.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message, keyGenerator } = options;
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0 || !Number.isSafeInteger(max) || max <= 0) {
    throw new Error('Rate limit windowMs and max must be positive integers');
  }
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

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();
    // Use the existing MongoDB for atomic counters across workers. Fail closed on errors.
    if (process.env.RATE_LIMIT_STORE === 'mongo' || (process.env.NODE_ENV === 'production' && process.env.RATE_LIMIT_STORE !== 'memory')) {
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const scope = options.scope || `${req.baseUrl}:${req.path}`;
      const id = createHash('sha256').update(`${scope}:${windowMs}:${max}:${key}:${windowStart}`).digest('hex');
      try {
        let bucket;
        try {
          bucket = await RateBucket.findOneAndUpdate({ _id: id }, {
            $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs) },
          }, { upsert: true, new: true }).lean();
        } catch (error: any) {
          if (error.code !== 11000) throw error;
          bucket = await RateBucket.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true }).lean();
        }
        if (!bucket) throw new Error('Rate limit counter unavailable');
        if (bucket.count > max) {
          const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ message: message || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.', retryAfterSeconds: retryAfter });
        }
        return next();
      } catch (error) {
        console.error('[RATE LIMIT] Counter unavailable');
        return res.status(503).json({ message: 'Tạm thời không thể xử lý yêu cầu' });
      }
    }
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
