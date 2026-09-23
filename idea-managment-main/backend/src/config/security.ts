import { CookieOptions } from 'express';

export function allowedOrigins(): string[] {
  const configured = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',').map(value => value.trim()).filter(Boolean);

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const devDefaults = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    for (const dev of devDefaults) {
      if (!configured.includes(dev)) {
        configured.push(dev);
      }
    }
  }

  return configured;
}

export function assetBaseUrl(): string {
  const configured = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('PUBLIC_ASSET_BASE_URL is required in production');
  const url = new URL(configured || `http://localhost:${process.env.PORT || 5000}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
      || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Invalid PUBLIC_ASSET_BASE_URL');
  return url.href.replace(/\/$/, '');
}

export const sessionCookieName = () => process.env.NODE_ENV === 'production' ? '__Host-idea-session' : 'idea-session';
export const sessionCookieOptions = (): CookieOptions => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/',
});

export function sessionTtlSeconds(): number {
  const seconds = Number(process.env.SESSION_TTL_SECONDS || 28800);
  if (!Number.isInteger(seconds) || seconds < 300 || seconds > 86400) throw new Error('Invalid SESSION_TTL_SECONDS (300..86400)');
  return seconds;
}
