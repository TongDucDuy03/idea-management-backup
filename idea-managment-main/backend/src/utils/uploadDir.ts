import path from 'path';
import fs from 'fs';

export function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== '') {
    return process.env.UPLOAD_DIR.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    return '/var/www/idea/uploads';
  }

  // Dev/local: backend/uploads (từ dist/utils → ../.. → backend/uploads)
  return path.join(__dirname, '..', '..', 'uploads');
}

export function ensureUploadDirExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

