"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const uploadDir_1 = require("./utils/uploadDir");
const ideaRoutes_1 = __importDefault(require("./routes/ideaRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const a3ReportRoutes_1 = __importDefault(require("./routes/a3ReportRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const importRoutes_1 = __importDefault(require("./routes/importRoutes"));
const makeRoutes_1 = __importDefault(require("./routes/makeRoutes"));
dotenv_1.default.config();
console.log(">>> ENV MONGODB_URI:", process.env.MONGODB_URI);
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const uploadsDir = (0, uploadDir_1.resolveUploadDir)();
(0, uploadDir_1.ensureUploadDirExists)(uploadsDir);
console.log('[UPLOAD] static dir =', uploadsDir);
app.use('/uploads', express_1.default.static(uploadsDir));
// Middleware - CORS configuration
// Cho phép credentials và origin cụ thể (không được dùng wildcard * khi có credentials)
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'http://172.104.39.94'
        : 'http://localhost:3000', // Development origin
    credentials: true, // Cho phép gửi cookies và credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-KEY'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
};
app.use((0, cors_1.default)(corsOptions));
// Tăng giới hạn kích thước body để hỗ trợ upload ảnh dạng data URL
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Routes
app.use('/api/ideas', ideaRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/a3-reports', a3ReportRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/imports', importRoutes_1.default);
app.use('/api/make', makeRoutes_1.default);
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management')
    .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
})
    .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});
