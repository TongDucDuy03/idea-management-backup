import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import ideaRoutes from './routes/ideaRoutes';
import authRoutes from './routes/authRoutes';
import a3ReportRoutes from './routes/a3ReportRoutes';
import aiRoutes from './routes/aiRoutes';
import importRoutes from './routes/importRoutes';

dotenv.config();
console.log(">>> ENV MONGODB_URI:", process.env.MONGODB_URI);
const app = express();
const port = process.env.PORT || 5000;

// Middleware - CORS configuration
// Cho phép credentials và origin cụ thể (không được dùng wildcard * khi có credentials)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://172.104.39.94'
    : 'http://localhost:3000', // Development origin
  credentials: true, // Cho phép gửi cookies và credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(cors(corsOptions));
// Tăng giới hạn kích thước body để hỗ trợ upload ảnh dạng data URL
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api/ideas', ideaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/a3-reports', a3ReportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/imports', importRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  }); 
