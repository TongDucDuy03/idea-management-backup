import mongoose, { Schema } from 'mongoose';

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionVersion: { type: Number, required: true },
  csrfToken: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export default mongoose.model('Session', SessionSchema);
