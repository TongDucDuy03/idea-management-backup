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
const express_1 = __importDefault(require("express"));
const makeAuth_1 = require("../middleware/makeAuth");
const makeRealtimeService_1 = require("../services/makeRealtimeService");
const router = express_1.default.Router();
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;
router.get('/realtime', makeAuth_1.makeAuth, makeAuth_1.makeRateLimit, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to, since, limit, status, department, source, } = req.query;
        // Validate and parse limit
        let parsedLimit = DEFAULT_LIMIT;
        if (typeof limit === 'string') {
            const n = Number(limit);
            if (!Number.isFinite(n) || n <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'invalid_limit',
                    message: 'limit must be a positive integer',
                });
            }
            parsedLimit = Math.min(n, MAX_LIMIT);
        }
        // Validate and parse datetime fields
        const parseDate = (value, fieldName) => {
            if (!value || typeof value !== 'string')
                return undefined;
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) {
                throw new Error(`invalid_${fieldName}`);
            }
            return d;
        };
        let fromDate;
        let toDate;
        let sinceDate;
        try {
            fromDate = parseDate(from, 'from');
            toDate = parseDate(to, 'to');
            sinceDate = parseDate(since, 'since');
        }
        catch (e) {
            return res.status(400).json({
                success: false,
                error: e.message || 'invalid_time_param',
            });
        }
        const sourceValue = (typeof source === 'string' && source) || 'ideas';
        const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
        const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL ||
            process.env.PUBLIC_BASE_URL ||
            requestBaseUrl;
        const includeBase64 = req.query.includeBase64 === 'true';
        const result = yield (0, makeRealtimeService_1.fetchRealtimeData)({
            from: fromDate,
            to: toDate,
            since: sinceDate,
            limit: parsedLimit,
            status: typeof status === 'string' ? status : undefined,
            department: typeof department === 'string' ? department : undefined,
            source: sourceValue,
            baseUrl: assetBaseUrl,
            includeBase64,
        });
        return res.status(200).json({
            success: true,
            server_time: new Date().toISOString(),
            data: result.data,
            cursor: result.cursor,
            next_poll_after_seconds: Number(process.env.MAKE_NEXT_POLL_SECONDS || 10),
        });
    }
    catch (error) {
        console.error('[MAKE REALTIME] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'internal_server_error',
        });
    }
}));
exports.default = router;
