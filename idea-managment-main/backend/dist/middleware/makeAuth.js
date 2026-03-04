"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRateLimit = exports.makeAuth = void 0;
const MAKE_API_KEY = process.env.MAKE_API_KEY;
const MAKE_BEARER_TOKEN = process.env.MAKE_BEARER_TOKEN;
const makeAuth = (req, res, next) => {
    try {
        const apiKeyHeader = req.header('X-API-KEY');
        const authHeader = req.header('Authorization');
        // GET có thể dùng query ?api_key=... để test trên trình duyệt (Make nên dùng header)
        const apiKeyQuery = req.method === 'GET' ? req.query.api_key : undefined;
        const hasApiKey = !!MAKE_API_KEY &&
            (apiKeyHeader === MAKE_API_KEY ||
                (typeof apiKeyQuery === 'string' && apiKeyQuery === MAKE_API_KEY));
        let hasBearer = false;
        if (MAKE_BEARER_TOKEN && authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '').trim();
            hasBearer = token === MAKE_BEARER_TOKEN;
        }
        if (!hasApiKey && !hasBearer) {
            return res.status(401).json({
                success: false,
                error: 'unauthorized',
            });
        }
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });
    }
};
exports.makeAuth = makeAuth;
const rateStore = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = Number(process.env.MAKE_RATE_LIMIT_PER_MINUTE || 60);
const makeRateLimit = (req, res, next) => {
    const now = Date.now();
    // Use API key or IP as identifier
    const apiKey = req.header('X-API-KEY') || req.query.api_key;
    const bearer = req.header('Authorization');
    const identifier = (apiKey && `key:${apiKey}`) ||
        (bearer && `bearer:${bearer}`) ||
        `ip:${req.ip}`;
    const record = rateStore[identifier];
    if (!record || now - record.windowStart > WINDOW_MS) {
        rateStore[identifier] = { count: 1, windowStart: now };
        return next();
    }
    if (record.count >= MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            error: 'rate_limit_exceeded',
            next_poll_after_seconds: Math.ceil((record.windowStart + WINDOW_MS - now) / 1000),
        });
    }
    record.count += 1;
    return next();
};
exports.makeRateLimit = makeRateLimit;
