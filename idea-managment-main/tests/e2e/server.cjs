const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const express = require('../../backend/node_modules/express');
const mongoose = require('../../backend/node_modules/mongoose');
const { MongoMemoryServer } = require('../../backend/node_modules/mongodb-memory-server');

// Never load the application's .env or use existing credentials/data.
const origin = 'http://127.0.0.1:4173';
Object.assign(process.env, { NODE_ENV: 'test', CORS_ORIGIN: origin, FRONTEND_URL: origin,
  PUBLIC_ASSET_BASE_URL: origin, RATE_LIMIT_STORE: 'mongo', IDEA_SUBMIT_LIMIT_PER_HOUR: '500',
  AI_RATE_LIMIT_PER_MINUTE: '100', OPENROUTER_API_KEY: 'local-test-key', AI_API_URL: origin + '/__test/ai',
  EMAIL_TO: 'test@example.invalid', MAKE_API_KEY: 'local-make-test-key' });
const emails = [];
require('../../backend/node_modules/nodemailer').createTransport = () => ({ sendMail: async mail => { emails.push(mail); } });

let mongo, server, uploadDir;
async function main() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'idea-e2e-'));
  process.env.UPLOAD_DIR = uploadDir;
  const User = require('../../backend/dist/models/User').default;
  const Idea = require('../../backend/dist/models/Idea').default;
  const Session = require('../../backend/dist/models/Session').default;
  const RateBucket = require('../../backend/dist/models/RateBucket').default;
  const ImportSession = require('../../backend/dist/models/ImportSession').default;
  const A3Report = require('../../backend/dist/models/A3Report').default;
  await Promise.all([User.init(), Idea.init(), Session.init(), RateBucket.init()]);
  const app = express();
  // These fixture-only endpoints do not exist in the shipped application.
  app.post('/__test/reset', async (_req, res) => {
    await Promise.all([User.deleteMany({}), Idea.deleteMany({}), Session.deleteMany({}), RateBucket.deleteMany({}), ImportSession.deleteMany({}), A3Report.deleteMany({})]);
    await User.create([{ username: 'admin-test', password: 'Testing-password-123!', role: 'admin' },
      { username: 'viewer-test', password: 'Testing-password-123!', role: 'viewer' }]);
    await Idea.create([
      { ideaCode: 'E2E-A3', fullName: 'Nguyễn Kiểm Thử', department: 'Phòng Cải Tiến', idea: 'Cải tiến dây chuyền kiểm thử',
        solution: 'Thực trạng thử nghiệm', benefit: 'Giải pháp thử nghiệm', status: 'BAO_CAO_A3', implementationStatus: 'Lập báo cáo A3',
        benefitOutcome: 'Giảm thời gian chờ', resourcesUsed: 'Nguồn lực thử', calculationDescription: 'Cách tính thử',
        scalingOpportunity: 'Có thể nhân rộng', benefitValue: 1000000, rewardAmount: 200000, note: 'Ghi chú cần giữ',
        submissionDate: new Date(), rewardApprovalDate: new Date(), expectedCompletionDate: new Date() },
      { ideaCode: 'E2E-NEW', fullName: 'Trần Thử Nghiệm', department: 'Phòng Cải Tiến', idea: 'Ý tưởng mới để lọc và sửa',
        status: 'DE_NGHI_MOI', implementationStatus: 'Đề xuất mới', submissionDate: new Date() },
    ]);
    emails.length = 0;
    res.json({ ok: true });
  });
  app.post('/__test/revoke', async (_req, res) => { await Session.deleteMany({}); res.json({ ok: true }); });
  app.post('/__test/ai', express.json(), (_req, res) => res.json({ choices: [{ message: { content: 'Nội dung gợi ý từ dịch vụ AI giả lập.' } }] }));
  app.use(require('../../backend/dist/app').default);
  // Apply the enforceable CSP from the nginx template to actual browser tests.
  const headers = await fs.readFile(path.resolve('nginx-security-headers.conf'), 'utf8');
  const csp = headers.match(/add_header Content-Security-Policy "([^"]+)"/)[1].replace('; upgrade-insecure-requests', '');
  app.use((_req, res, next) => { res.setHeader('Content-Security-Policy', csp); next(); });
  app.use(express.static(path.resolve('build')));
  app.get('*', (_req, res) => res.sendFile(path.resolve('build/index.html')));
  server = app.listen(4173, '127.0.0.1', () => console.log('E2E fixture ready on ' + origin));
}
async function stop() {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (uploadDir) {
    // Only files generated inside this unique test directory; no recursive delete.
    for (const entry of await fs.readdir(uploadDir, { withFileTypes: true })) {
      if (entry.isFile()) await fs.unlink(path.join(uploadDir, entry.name));
    }
    await fs.rmdir(uploadDir);
  }
}
process.on('SIGTERM', () => stop().finally(() => process.exit()));
process.on('SIGINT', () => stop().finally(() => process.exit()));
main().catch(error => { console.error(error); stop().finally(() => process.exit(1)); });
