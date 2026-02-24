import express from 'express';
import { makeAuth, makeRateLimit } from '../middleware/makeAuth';
import { fetchRealtimeData, RealtimeSource } from '../services/makeRealtimeService';

const router = express.Router();

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

router.get('/realtime', makeAuth, makeRateLimit, async (req, res) => {
  try {
    const {
      from,
      to,
      since,
      limit,
      status,
      department,
      source,
    } = req.query;

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
    const parseDate = (value: unknown, fieldName: string): Date | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        throw new Error(`invalid_${fieldName}`);
      }
      return d;
    };

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    let sinceDate: Date | undefined;

    try {
      fromDate = parseDate(from, 'from');
      toDate = parseDate(to, 'to');
      sinceDate = parseDate(since, 'since');
    } catch (e: any) {
      return res.status(400).json({
        success: false,
        error: e.message || 'invalid_time_param',
      });
    }

    const sourceValue: RealtimeSource =
      (typeof source === 'string' && (source as RealtimeSource)) || 'ideas';

    const publicBaseUrl =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const includeBase64 = req.query.includeBase64 === 'true';

    const result = await fetchRealtimeData({
      from: fromDate,
      to: toDate,
      since: sinceDate,
      limit: parsedLimit,
      status: typeof status === 'string' ? status : undefined,
      department: typeof department === 'string' ? department : undefined,
      source: sourceValue,
      baseUrl: publicBaseUrl,
      includeBase64,
    });

    return res.status(200).json({
      success: true,
      server_time: new Date().toISOString(),
      data: result.data,
      cursor: result.cursor,
      next_poll_after_seconds: Number(process.env.MAKE_NEXT_POLL_SECONDS || 10),
    });
  } catch (error) {
    console.error('[MAKE REALTIME] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
    });
  }
});

export default router;

