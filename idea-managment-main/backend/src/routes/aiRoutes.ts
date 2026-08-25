import { Router } from 'express';
import {
  improveDescription,
  suggestBenefit,
  suggestSolution,
  suggestTopicTitle,
} from '../controllers/aiController';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Các endpoint này phục vụ form gửi ý tưởng công khai nên KHÔNG thể yêu cầu
// đăng nhập. Bù lại phải giới hạn tần suất, vì mỗi lượt gọi tốn credit LLM
// thật — trước đây bot có thể spam làm cạn tài khoản.
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 10),
  message: 'Bạn đang dùng trợ lý AI quá nhanh. Vui lòng chờ một chút rồi thử lại.',
});

router.use(aiRateLimit);

router.post('/improve-description', improveDescription);
router.post('/suggest-solution', suggestSolution);
router.post('/suggest-benefit', suggestBenefit);
router.post('/suggest-topic-title', suggestTopicTitle);

export default router;
