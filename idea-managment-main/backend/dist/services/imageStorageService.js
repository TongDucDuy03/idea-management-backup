"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBase64DataUrl = isBase64DataUrl;
exports.parseDataUrl = parseDataUrl;
exports.saveBase64ToFile = saveBase64ToFile;
exports.ensureIdeaImagePaths = ensureIdeaImagePaths;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const Idea_1 = __importDefault(require("../models/Idea"));
const uploadDir_1 = require("../utils/uploadDir");
const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
};
const DATA_URL_PREFIX = 'data:';
function isBase64DataUrl(value) {
    if (typeof value !== 'string' || !value.startsWith(DATA_URL_PREFIX))
        return false;
    return /^data:image\/[^;]+;base64,/.test(value);
}
function parseDataUrl(dataUrl) {
    const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match)
        return null;
    const mime = match[1].toLowerCase();
    const ext = MIME_TO_EXT[mime] || '.jpg';
    try {
        const buffer = Buffer.from(match[2], 'base64');
        return { mime, ext, buffer };
    }
    catch (_a) {
        return null;
    }
}
/**
 * Decode base64 data URL, save to uploads/, return path like "/uploads/ideaCode-before-1234567890.jpg"
 */
function saveBase64ToFile(dataUrl, ideaCode, kind) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsed = parseDataUrl(dataUrl);
        if (!parsed)
            throw new Error('Invalid base64 data URL for image');
        const uploadDir = (0, uploadDir_1.resolveUploadDir)();
        (0, uploadDir_1.ensureUploadDirExists)(uploadDir);
        const safeCode = (ideaCode || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '_');
        const ts = Date.now();
        const fileName = `${safeCode}-${kind}-${ts}${parsed.ext}`;
        const filePath = path_1.default.join(uploadDir, fileName);
        console.log('[UPLOAD]', {
            env: process.env.NODE_ENV,
            dir: uploadDir,
            file: fileName,
        });
        yield promises_1.default.writeFile(filePath, parsed.buffer);
        return `/uploads/${fileName}`;
    });
}
/**
 * Nếu idea có beforeImage/afterImage dạng base64 nhưng chưa có Path -> lưu file 1 lần và cập nhật DB.
 * Trả về bản ghi đã có beforeImagePath/afterImagePath (và đã cập nhật DB).
 */
function ensureIdeaImagePaths(idea) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        const updates = {};
        if (isBase64DataUrl(idea.beforeImage) && !idea.beforeImagePath) {
            try {
                const p = yield saveBase64ToFile(idea.beforeImage, idea.ideaCode, 'before');
                result.beforeImagePath = p;
                updates.beforeImagePath = p;
            }
            catch (e) {
                console.error('[imageStorage] Failed to save beforeImage for idea', idea._id, e);
            }
        }
        else if (idea.beforeImagePath) {
            result.beforeImagePath = idea.beforeImagePath;
        }
        if (isBase64DataUrl(idea.afterImage) && !idea.afterImagePath) {
            try {
                const p = yield saveBase64ToFile(idea.afterImage, idea.ideaCode, 'after');
                result.afterImagePath = p;
                updates.afterImagePath = p;
            }
            catch (e) {
                console.error('[imageStorage] Failed to save afterImage for idea', idea._id, e);
            }
        }
        else if (idea.afterImagePath) {
            result.afterImagePath = idea.afterImagePath;
        }
        if (Object.keys(updates).length > 0 && idea._id) {
            yield Idea_1.default.findByIdAndUpdate(idea._id, updates);
        }
        return result;
    });
}
