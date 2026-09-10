import '../loadEnv';
import mongoose from 'mongoose';
import User from '../models/User';

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || username.length > 128 || !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 12 characters, at most 72 UTF-8 bytes).');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  await User.create({ username, password, role: 'admin' });
  console.log('Admin account created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
