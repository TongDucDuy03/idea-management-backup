import path from 'path';
import fs from 'fs/promises';
import Idea from '../models/Idea';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const DATA_URL_PREFIX = 'data:';

export function isBase64DataUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith(DATA_URL_PREFIX)) return false;
  return /^data:image\/[^;]+;base64,/.test(value);
}

export interface ParsedDataUrl {
  mime: string;
  ext: string;
  buffer: Buffer;
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = MIME_TO_EXT[mime] || '.jpg';
  try {
    const buffer = Buffer.from(match[2], 'base64');
    return { mime, ext, buffer };
  } catch {
    return null;
  }
}

async function ensureUploadsDir(): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

/**
 * Decode base64 data URL, save to uploads/, return path like "/uploads/ideaCode-before-1234567890.jpg"
 */
export async function saveBase64ToFile(
  dataUrl: string,
  ideaCode: string,
  kind: 'before' | 'after'
): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Invalid base64 data URL for image');

  await ensureUploadsDir();

  const safeCode = (ideaCode || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '_');
  const ts = Date.now();
  const fileName = `${safeCode}-${kind}-${ts}${parsed.ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  await fs.writeFile(filePath, parsed.buffer);

  return `/uploads/${fileName}`;
}

/**
 * Nếu idea có beforeImage/afterImage dạng base64 nhưng chưa có Path -> lưu file 1 lần và cập nhật DB.
 * Trả về bản ghi đã có beforeImagePath/afterImagePath (và đã cập nhật DB).
 */
export async function ensureIdeaImagePaths(idea: {
  _id?: any;
  ideaCode: string;
  beforeImage?: string;
  afterImage?: string;
  beforeImagePath?: string;
  afterImagePath?: string;
}): Promise<{ beforeImagePath?: string; afterImagePath?: string }> {
  const result: { beforeImagePath?: string; afterImagePath?: string } = {};
  const updates: { beforeImagePath?: string; afterImagePath?: string } = {};

  if (isBase64DataUrl(idea.beforeImage) && !idea.beforeImagePath) {
    try {
      const p = await saveBase64ToFile(idea.beforeImage!, idea.ideaCode, 'before');
      result.beforeImagePath = p;
      updates.beforeImagePath = p;
    } catch (e) {
      console.error('[imageStorage] Failed to save beforeImage for idea', idea._id, e);
    }
  } else if (idea.beforeImagePath) {
    result.beforeImagePath = idea.beforeImagePath;
  }

  if (isBase64DataUrl(idea.afterImage) && !idea.afterImagePath) {
    try {
      const p = await saveBase64ToFile(idea.afterImage!, idea.ideaCode, 'after');
      result.afterImagePath = p;
      updates.afterImagePath = p;
    } catch (e) {
      console.error('[imageStorage] Failed to save afterImage for idea', idea._id, e);
    }
  } else if (idea.afterImagePath) {
    result.afterImagePath = idea.afterImagePath;
  }

  if (Object.keys(updates).length > 0 && idea._id) {
    await Idea.findByIdAndUpdate(idea._id, updates);
  }

  return result;
}
