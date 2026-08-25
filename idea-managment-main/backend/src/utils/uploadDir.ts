import path from 'path';
import fs from 'fs';

export function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== '') {
    return path.resolve(process.env.UPLOAD_DIR.trim());
  }

  // Mặc định luôn là thư mục uploads nằm trong backend (dù ở dev hay production)
  // Từ dist/utils/uploadDir.js -> ../.. -> backend/uploads
  return path.join(__dirname, '..', '..', 'uploads');
}

export function ensureUploadDirExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

