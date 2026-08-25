/**
 * Truy cập bí mật tập trung.
 *
 * Đọc theo kiểu lazy (trong hàm, không phải cấp module) để không phụ thuộc vào
 * thứ tự import — tránh lặp lại lỗi cũ: process.env bị đọc trước khi dotenv chạy.
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      '[CONFIG] Thiếu JWT_SECRET. Không dùng giá trị mặc định vì như vậy ' +
        'bất kỳ ai cũng tự ký được token quản trị.'
    );
  }

  return secret;
}

/** Thời hạn token đăng nhập. */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
