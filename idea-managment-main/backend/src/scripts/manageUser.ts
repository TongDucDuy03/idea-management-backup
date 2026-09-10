import '../loadEnv';
import mongoose from 'mongoose';
import User from '../models/User';
import Session from '../models/Session';

// Explicitly name the account to promote; never grant admin to every old record.
async function main() {
  const [username, action] = process.argv.slice(2);
  if (!username || !['admin', 'viewer', 'disable', 'enable', 'revoke', 'reset-password'].includes(action)) {
    throw new Error('Usage: npm run manage-user -- USERNAME admin|viewer|disable|enable|revoke|reset-password');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  if (action === 'reset-password') {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 12 || Buffer.byteLength(password) > 72) throw new Error('Set ADMIN_PASSWORD (12+ characters, at most 72 UTF-8 bytes)');
    const user = await User.findOne({ username });
    if (!user) throw new Error('User not found');
    user.password = password;
    await user.save();
    await Session.deleteMany({ userId: user._id });
    console.log('Password updated; previous sessions revoked.');
    return;
  }
  const update: Record<string, unknown> = {};
  if (action === 'admin' || action === 'viewer') update.role = action;
  if (action === 'disable' || action === 'enable') update.isActive = action === 'enable';
  const user = await User.findOneAndUpdate({ username }, { $set: update, $inc: { sessionVersion: 1 } }, { new: true });
  if (!user) throw new Error('User not found');
  await Session.deleteMany({ userId: user._id });
  console.log('Account updated; previous sessions revoked.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
