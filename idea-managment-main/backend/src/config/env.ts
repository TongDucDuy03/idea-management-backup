import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

export function loadEnv() {
  const rootDir = path.join(__dirname, '..');
  const isProd = process.env.NODE_ENV === 'production';

  const candidateFiles = isProd
    ? ['.env.prod', '.env']
    : ['.env.local', '.env'];

  for (const file of candidateFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
      console.log(`[ENV] Loaded ${file}`);
      return;
    }
  }

  // Fallback: default behavior (looks for .env in CWD)
  dotenv.config();
  console.log('[ENV] Loaded default .env (if present)');
}

