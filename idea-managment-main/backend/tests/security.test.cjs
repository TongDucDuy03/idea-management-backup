const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const XLSX = require('xlsx');

process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.RATE_LIMIT_STORE = 'mongo';
process.env.PUBLIC_ASSET_BASE_URL = 'https://idea.example.com';
process.env.EMAIL_TO = 'admin@example.test';
const sentMail = [];
require('nodemailer').createTransport = () => ({ sendMail: async mail => { sentMail.push(mail); } });

let mongo, server, base, uploadDir, User, Session, Idea, RateBucket;
const password = 'Strong-test-password!';
before(async () => {
  // Disposable database only; never load .env or connect to a deployed database.
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'idea-security-'));
  process.env.UPLOAD_DIR = uploadDir;
  User = require('../dist/models/User').default;
  Session = require('../dist/models/Session').default;
  Idea = require('../dist/models/Idea').default;
  RateBucket = require('../dist/models/RateBucket').default;
  await Promise.all([User.init(), Session.init(), Idea.init(), RateBucket.init()]);
  const app = require('../dist/app').default;
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = 'http://127.0.0.1:' + server.address().port;
}, { timeout: 180000 });

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  // Remove only this test's known file and empty temporary directory.
  if (uploadDir) {
    await fs.unlink(path.join(uploadDir, 'private.png')).catch(() => {});
    await fs.rmdir(uploadDir);
  }
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), Idea.deleteMany({}), RateBucket.deleteMany({})]);
  await User.create([{ username: 'admin', password, role: 'admin' }, { username: 'viewer', password, role: 'viewer' }]);
  sentMail.length = 0;
});

async function request(url, { method = 'GET', body, cookie, csrf, headers = {} } = {}) {
  return fetch(base + url, { method, headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers,
  }, body: body ? JSON.stringify(body) : undefined });
}
async function login(username = 'admin') {
  const response = await request('/api/auth/login', { method: 'POST', body: { username, password }, headers: { Origin: process.env.CORS_ORIGIN } });
  assert.equal(response.status, 200);
  const data = await response.json();
  return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: data.csrfToken, response, data };
}
async function idea() {
  return Idea.create({ fullName: 'Private Name', department: 'Engineering', idea: 'Internal plan', ideaCode: 'TEST-SECRET',
    benefitValue: 1000000, rewardAmount: 200000, note: 'private note', beforeImagePath: '/uploads/private.png' });
}

test('anonymous requests cannot enumerate records or read uploads; lookup only exposes progress', async () => {
  await idea();
  for (const url of ['/api/ideas', '/api/ideas/public', '/api/ideas/detail/code/TEST-SECRET', '/uploads/private.png']) {
    assert.equal((await request(url)).status, 401, url);
  }
  for (const url of ['/api/ideas/code/TEST-SECRET', '/api/ideas/search?ideaCode=TEST-SECRET']) {
    const response = await request(url);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ['ideaCode', 'status', 'submissionDate']);
  }
  assert.equal((await request('/api/ideas/search?ideaCode[$ne]=x')).status, 400);
});

test('public submission cannot set approval, rewards, internal notes or role; email escapes all fields', async () => {
  const payload = '<img src=x onerror="window.pwned=1"> & Việt Nam';
  const response = await request('/api/ideas', { method: 'POST', body: { fullName: payload, department: payload, idea: payload,
    status: 'DONE', rewardAmount: 999999, benefitValue: 1234, implementationStatus: 'Đã khen thưởng', note: 'injected', role: 'admin' } });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.deepEqual(Object.keys(result).sort(), ['ideaCode', 'status', 'submissionDate']);
  const stored = await Idea.findOne({ ideaCode: result.ideaCode }).lean();
  assert.equal(stored.status, 'DE_NGHI_MOI');
  assert.equal(stored.rewardAmount, 0);
  assert.equal(stored.benefitValue, 0);
  assert.equal(stored.note, undefined);
  assert.equal(stored.implementationStatus, undefined);
  assert.equal(sentMail.length, 1);
  assert.ok(!sentMail[0].html.includes('<img'));
  assert.ok(sentMail[0].html.includes('&lt;img'));
  assert.ok(sentMail[0].text.includes(payload));
});

test('public submission rejects active or invalid image data', async () => {
  for (const image of ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,PGh0bWw+', 'https://evil.example/image.png']) {
    const response = await request('/api/ideas', { method: 'POST', body: { department: 'Engineering', idea: 'Test', beforeImage: image } });
    assert.equal(response.status, 400);
  }
  assert.equal(await Idea.countDocuments({}), 0);
});

test('login uses HttpOnly sessions, rejects login CSRF and object credentials', async () => {
  const body = { username: 'admin', password };
  for (const origin of [undefined, 'https://evil.example']) {
    assert.equal((await request('/api/auth/login', { method: 'POST', body, headers: origin ? { Origin: origin } : {} })).status, 403);
  }
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: { $ne: '' }, password }, headers: { Origin: process.env.CORS_ORIGIN } })).status, 400);
  const auth = await login();
  assert.match(auth.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(auth.response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal(auth.data.token, undefined);
  const saved = await Session.findOne({}).lean();
  assert.notEqual(saved.tokenHash, auth.cookie.split('=')[1]);
  assert.equal((await request('/api/auth/session', auth)).status, 200);
  assert.equal((await request('/api/ideas', { headers: { Authorization: 'Bearer old-jwt' } })).status, 401);
});

test('mutations require CSRF and viewer cannot write, delete or import', async () => {
  const record = await idea();
  const admin = await login();
  const viewer = await login('viewer');
  assert.equal((await request('/api/ideas', viewer)).status, 200);
  assert.equal((await request('/api/ideas/' + record._id, { method: 'PUT', cookie: admin.cookie, body: { note: 'x' } })).status, 403);
  for (const [method, url] of [['PUT', '/api/ideas/' + record._id], ['DELETE', '/api/ideas/' + record._id],
    ['POST', '/api/ideas/admin'], ['POST', '/api/imports/preview'], ['POST', '/api/a3-reports']]) {
    assert.equal((await request(url, { ...viewer, method, body: { note: 'blocked' } })).status, 403, url);
  }
  assert.equal((await request('/api/ideas/' + record._id, { ...admin, method: 'PUT', body: { note: 'authorized' } })).status, 200);
  assert.equal((await Idea.findById(record._id)).note, 'authorized');
});

test('logout revokes the session on the server', async () => {
  const auth = await login();
  assert.equal((await request('/api/auth/logout', { ...auth, method: 'POST', headers: { Origin: process.env.CORS_ORIGIN } })).status, 204);
  assert.equal((await request('/api/ideas', auth)).status, 401);
});

test('legacy users default to viewer and password changes invalidate existing sessions', async () => {
  await User.collection.updateOne({ username: 'viewer' }, { $unset: { role: '' } });
  const viewer = await login('viewer');
  assert.equal(viewer.data.user.role, 'viewer');
  assert.equal((await request('/api/ideas', viewer)).status, 200);
  assert.equal((await request('/api/ideas/admin', { ...viewer, method: 'POST', body: { department: 'x' } })).status, 403);
  const user = await User.findOne({ username: 'viewer' });
  user.password = 'Changed-strong-password!';
  await user.save();
  assert.equal((await request('/api/ideas', viewer)).status, 401);
});

test('expired, disabled, version-revoked and deleted users lose access immediately', async () => {
  for (const change of ['expired', 'disabled', 'version', 'deleted']) {
    await User.updateOne({ username: 'admin' }, { $set: { isActive: true } });
    const auth = await login();
    if (change === 'expired') await Session.updateMany({}, { $set: { expiresAt: new Date(0) } });
    if (change === 'disabled') await User.updateOne({ username: 'admin' }, { $set: { isActive: false } });
    if (change === 'version') await User.updateOne({ username: 'admin' }, { $inc: { sessionVersion: 1 } });
    if (change === 'deleted') await User.deleteOne({ username: 'admin' });
    assert.equal((await request('/api/ideas', auth)).status, 401, change);
  }
});

test('asset URLs ignore client Host headers; private uploads and health headers are protected', async () => {
  await idea();
  await fs.writeFile(path.join(uploadDir, 'private.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  const auth = await login();
  const response = await request('/api/ideas', { ...auth, headers: { 'X-Forwarded-Host': 'evil.example', Host: 'evil.example' } });
  const data = await response.json();
  const records = Array.isArray(data) ? data : data.ideas;
  assert.equal(records[0].beforeImageUrl, 'https://idea.example.com/uploads/private.png');
  const media = await request('/uploads/private.png', auth);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get('cache-control'), 'no-store');
  const health = await request('/api/health');
  assert.deepEqual(await health.json(), { status: 'ok' });
  assert.equal(health.headers.get('x-powered-by'), null);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
});

test('account rate limit applies across different client IP addresses', async () => {
  for (let i = 0; i < 21; i++) {
    const response = await request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'incorrect' },
      headers: { Origin: process.env.CORS_ORIGIN, 'X-Forwarded-For': '192.0.2.' + (i + 1) } });
    assert.equal(response.status, i < 20 ? 401 : 429);
  }
});

test('independent limiter instances share atomic counters', async () => {
  const { rateLimit } = require('../dist/middleware/rateLimit');
  const a = rateLimit({ scope: 'shared-test', max: 3, windowMs: 60000 });
  const b = rateLimit({ scope: 'shared-test', max: 3, windowMs: 60000 });
  const statuses = await Promise.all(Array.from({ length: 8 }, (_, i) => new Promise(resolve => {
    const res = { setHeader() {}, status(status) { this.code = status; return this; }, json() { resolve(this.code); } };
    (i % 2 ? a : b)({ ip: '192.0.2.1' }, res, () => resolve(200));
  })));
  assert.equal(statuses.filter(status => status === 200).length, 3);
  assert.equal(statuses.filter(status => status === 429).length, 5);
});

test('patched Excel parser supports XLS/XLSX and exports formula-looking text as strings', async () => {
  const { parseExcel } = require('../dist/services/excelParser');
  assert.equal(XLSX.version, '0.20.3');
  for (const bookType of ['xlsx', 'xls']) {
    const rows = [{ name: '=HYPERLINK("https://example.test")', amount: -12 }, { name: '+SUM(1,2)', amount: 5 },
      { name: '@SUM(A1)', amount: 0 }, { name: '-text', amount: 1 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType });
    assert.deepEqual(await parseExcel(buffer), rows);
    const read = XLSX.read(buffer, { type: 'buffer' }).Sheets.Data;
    assert.equal(read.A2.t, 's');
    assert.equal(read.A2.f, undefined);
    assert.equal(read.B2.t, 'n');
  }
});

test('parser rejects malformed files and excessive worksheet dimensions', async () => {
  const { parseExcel } = require('../dist/services/excelParser');
  await assert.rejects(parseExcel(Buffer.from('not an Excel file')));
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['header']]);
  sheet.A5002 = { t: 's', v: 'too far' }; sheet['!ref'] = 'A1:A5002';
  XLSX.utils.book_append_sheet(wb, sheet, 'Data');
  await assert.rejects(parseExcel(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })), /5000/);
});

test('image storage rejects active formats and mismatched raster signatures', () => {
  const { parseDataUrl } = require('../dist/services/imageStorageService');
  assert.equal(parseDataUrl('data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64')), null);
  assert.equal(parseDataUrl('data:image/png;base64,' + Buffer.from('<html>not png</html>').toString('base64')), null);
  assert.equal(parseDataUrl('data:image/png;base64,iVBORw0KGgo=').ext, '.png');
});

test('production cookie is Secure, HttpOnly and host-only', () => {
  const config = require('../dist/config/security');
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(config.sessionCookieName(), '__Host-idea-session');
    assert.deepEqual(config.sessionCookieOptions(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  } finally { process.env.NODE_ENV = previous; }
});

test('development proxy preserves Origin and forwards both API and protected uploads', async () => {
  const express = require('express');
  const proxyApp = express();
  const previous = process.env.DEV_API_TARGET;
  process.env.DEV_API_TARGET = base;
  require('../../src/setupProxy')(proxyApp);
  if (previous === undefined) delete process.env.DEV_API_TARGET; else process.env.DEV_API_TARGET = previous;
  const proxy = await new Promise(resolve => { const listener = proxyApp.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const url = 'http://127.0.0.1:' + proxy.address().port;
    for (const [origin, expected] of [[process.env.CORS_ORIGIN, 200], ['https://evil.example', 403]]) {
      const response = await fetch(url + '/api/auth/login', { method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password }) });
      assert.equal(response.status, expected);
      await response.text();
    }
    assert.equal((await fetch(url + '/uploads/private.png')).status, 401);
  } finally { await new Promise(resolve => proxy.close(resolve)); }
});
