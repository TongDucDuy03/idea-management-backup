import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

let loaded = false;

/**
 * Nạp biến môi trường.
 *
 * QUAN TRỌNG: hàm này phải chạy TRƯỚC khi bất kỳ module nào đọc process.env.
 * Xem backend/src/loadEnv.ts — module đó được import đầu tiên trong index.ts.
 *
 * Tìm ngược lên từ thư mục hiện tại để hoạt động cả khi chạy bằng ts-node
 * (backend/src/config) lẫn khi chạy bản build (backend/dist/config).
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const isProd = process.env.NODE_ENV === 'production';
  const candidateFiles = isProd ? ['.env.prod', '.env'] : ['.env.local', '.env'];

  // Đi ngược tối đa 4 cấp để tìm thư mục chứa file env
  let dir = __dirname;
  for (let depth = 0; depth < 4; depth += 1) {
    for (const file of candidateFiles) {
      const fullPath = path.join(dir, file);
      if (fs.existsSync(fullPath)) {
        dotenv.config({ path: fullPath });
        console.log(`[ENV] Loaded ${path.relative(process.cwd(), fullPath)}`);
        return;
      }
    }
    dir = path.join(dir, '..');
  }

  // Fallback: hành vi mặc định (tìm .env trong CWD)
  dotenv.config();
  console.log('[ENV] Loaded default .env (if present)');
}

/**
 * Kiểm tra các biến bắt buộc ngay lúc khởi động, để lỗi cấu hình lộ ra
 * tại thời điểm deploy chứ không phải khi người dùng đang thao tác.
 */
export function assertRequiredEnv(): void {
  const missing: string[] = [];

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  } else if (process.env.JWT_SECRET.length < 32) {
    throw new Error(
      '[ENV] JWT_SECRET quá ngắn (cần tối thiểu 32 ký tự). ' +
        'Sinh khóa mới bằng: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  if (!process.env.MONGODB_URI) {
    missing.push('MONGODB_URI');
  }

  if (missing.length > 0) {
    throw new Error(
      `[ENV] Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. ` +
        'Xem backend/.env.example để biết danh sách đầy đủ.'
    );
  }
}
