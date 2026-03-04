"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUploadDir = resolveUploadDir;
exports.ensureUploadDirExists = ensureUploadDirExists;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function resolveUploadDir() {
    if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== '') {
        return process.env.UPLOAD_DIR.trim();
    }
    if (process.env.NODE_ENV === 'production') {
        return '/var/www/idea/uploads';
    }
    // Dev/local: backend/uploads (từ dist/utils → ../.. → backend/uploads)
    return path_1.default.join(__dirname, '..', '..', 'uploads');
}
function ensureUploadDirExists(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
