import './loadEnv';
import mongoose from 'mongoose';
import app from './app';
import { assertRequiredEnv } from './config/env';
import { assetBaseUrl, sessionTtlSeconds, allowedOrigins } from './config/security';
import Session from './models/Session';
import RateBucket from './models/RateBucket';

assertRequiredEnv();
assetBaseUrl();
sessionTtlSeconds();
if (process.env.NODE_ENV === 'production' && allowedOrigins().some(origin => !origin.startsWith('https://'))) {
  throw new Error('Production FRONTEND_URL/CORS_ORIGIN must use HTTPS');
}
const port = Number(process.env.PORT || 5000);
// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(async () => {
    await Promise.all([Session.init(), RateBucket.init()]);
    console.log('Connected to MongoDB');
    app.listen(Number(port), process.env.BIND_HOST || '127.0.0.1', () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    // Thoát với mã lỗi để process manager (pm2/systemd/docker) khởi động lại,
    // thay vì để tiến trình sống mà không có database.
    process.exit(1);
  });
