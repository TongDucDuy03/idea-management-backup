"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
function loadEnv() {
    const rootDir = path_1.default.join(__dirname, '..');
    const isProd = process.env.NODE_ENV === 'production';
    const candidateFiles = isProd
        ? ['.env.prod', '.env']
        : ['.env.local', '.env'];
    for (const file of candidateFiles) {
        const fullPath = path_1.default.join(rootDir, file);
        if (fs_1.default.existsSync(fullPath)) {
            dotenv_1.default.config({ path: fullPath });
            console.log(`[ENV] Loaded ${file}`);
            return;
        }
    }
    // Fallback: default behavior (looks for .env in CWD)
    dotenv_1.default.config();
    console.log('[ENV] Loaded default .env (if present)');
}
