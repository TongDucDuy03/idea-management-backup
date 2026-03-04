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
exports.fetchRealtimeData = void 0;
const Idea_1 = __importDefault(require("../models/Idea"));
const ImportSession_1 = __importDefault(require("../models/ImportSession"));
const imageStorageService_1 = require("./imageStorageService");
const buildImageUrl = (rawPath, assetBaseUrl) => {
    if (!rawPath)
        return null;
    const trimmed = rawPath.trim();
    if (!trimmed)
        return null;
    // Nếu DB đã lưu full URL: chuẩn hóa http:// thành https://
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed.replace(/^http:\/\//i, 'https://');
    }
    const base = (assetBaseUrl || '').replace(/\/$/, '');
    if (!base)
        return null;
    const pathPart = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${pathPart}`;
};
const fetchRealtimeData = (params) => __awaiter(void 0, void 0, void 0, function* () {
    if (params.source === 'imports') {
        return fetchImportSessions(params);
    }
    return fetchIdeas(params);
});
exports.fetchRealtimeData = fetchRealtimeData;
const fetchIdeas = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, since, limit, status, department } = params;
    const timeFilter = {};
    const cursorDate = since || from;
    if (cursorDate) {
        timeFilter.$gte = cursorDate;
    }
    if (to) {
        timeFilter.$lte = to;
    }
    const query = {};
    if (Object.keys(timeFilter).length > 0) {
        query.submissionDate = timeFilter;
    }
    if (status) {
        query.status = status;
    }
    if (department) {
        query.department = department;
    }
    const ideas = yield Idea_1.default.find(query)
        .sort({ submissionDate: 1 })
        .limit(limit)
        .lean();
    const cursor = ideas.length > 0 ? new Date(ideas[ideas.length - 1].submissionDate).toISOString() : undefined;
    const includeBase64 = params.includeBase64 === true;
    const assetBaseUrl = params.baseUrl;
    const data = yield Promise.all(ideas.map((raw) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const paths = yield (0, imageStorageService_1.ensureIdeaImagePaths)(raw);
        const beforeImagePath = (_a = paths.beforeImagePath) !== null && _a !== void 0 ? _a : raw.beforeImagePath;
        const afterImagePath = (_b = paths.afterImagePath) !== null && _b !== void 0 ? _b : raw.afterImagePath;
        const item = Object.assign({}, raw);
        // Ưu tiên path; nếu path là full URL http:// thì buildImageUrl sẽ chuẩn hóa sang https://
        item.beforeImageUrl = buildImageUrl(beforeImagePath !== null && beforeImagePath !== void 0 ? beforeImagePath : raw.beforeImagePath, assetBaseUrl);
        item.afterImageUrl = buildImageUrl(afterImagePath !== null && afterImagePath !== void 0 ? afterImagePath : raw.afterImagePath, assetBaseUrl);
        if (!includeBase64) {
            delete item.beforeImage;
            delete item.afterImage;
        }
        return item;
    })));
    return {
        data,
        cursor,
    };
});
const fetchImportSessions = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, since, limit } = params;
    const timeFilter = {};
    const cursorDate = since || from;
    if (cursorDate) {
        timeFilter.$gte = cursorDate;
    }
    if (to) {
        timeFilter.$lte = to;
    }
    const query = {};
    if (Object.keys(timeFilter).length > 0) {
        query.createdAt = timeFilter;
    }
    const sessions = yield ImportSession_1.default.find(query)
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();
    const cursor = sessions.length > 0
        ? new Date(sessions[sessions.length - 1].createdAt).toISOString()
        : undefined;
    return {
        data: sessions,
        cursor,
    };
});
