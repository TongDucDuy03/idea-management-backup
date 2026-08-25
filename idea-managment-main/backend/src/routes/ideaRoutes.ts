import express from 'express';
import {
  getAllIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
  updatePaymentStatus,
  getIdeaStats,
} from '../controllers/ideaController';
import Idea from '../models/Idea';
import { auth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = express.Router();

// ===========================================
// QUAN TRỌNG: PUBLIC ROUTES PHẢI ĐẶT TRƯỚC!
// ===========================================

// 1. Public: Tạo ý tưởng mới (form gửi ý tưởng công khai)
//    Giới hạn 20 lượt gửi / giờ cho mỗi IP để tránh spam làm ngập database.
router.post(
  '/',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.IDEA_SUBMIT_LIMIT_PER_HOUR || 20),
    message: 'Bạn đã gửi quá nhiều ý tưởng trong một giờ. Vui lòng thử lại sau.',
  }),
  createIdea
);

// 2. Public: Số liệu tổng hợp cho trang chủ (chỉ trả về 3 con số)
router.get('/stats', getIdeaStats);

// 3. Public: Tìm ý tưởng theo mã code - ENDPOINT CHÍNH
router.get('/code/:ideaCode', async (req, res) => {
  try {
    const { ideaCode } = req.params;
    const idea = await Idea.findOne({ ideaCode });

    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
    }

    return res.json(idea);
  } catch (error) {
    console.error('[PUBLIC] Error getting idea by code:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
});

// 4. Public: Tìm kiếm theo query param (dự phòng)
router.get('/search', async (req, res) => {
  try {
    const { ideaCode } = req.query;

    if (!ideaCode || typeof ideaCode !== 'string') {
      return res.status(400).json({ message: 'Thiếu tham số ideaCode' });
    }

    const idea = await Idea.findOne({ ideaCode: ideaCode.trim() });

    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
    }

    return res.json(idea);
  } catch (error) {
    console.error('[PUBLIC] Error in search:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
});

// 5. Public: Lấy số liệu cho trang Statistics và Admin-view công khai
router.get('/public', async (req, res) => {
  try {
    const ideas = await Idea.find({})
      .select('ideaCode fullName department idea solution benefit status submissionDate implementationDepartment rewardStatuses rewardCalculationMethod implementationStatus expectedCompletionDate rewardApprovalDate benefitValue rewardAmount beforeImagePath afterImagePath beforeMediaType afterMediaType')
      .sort({ submissionDate: -1 });

    const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;

    const transformedIdeas = ideas.map(idea => {
      const doc: any = idea.toObject ? idea.toObject() : idea;
      if (doc.beforeImagePath) {
        const pathPart = doc.beforeImagePath.startsWith('/') ? doc.beforeImagePath : `/${doc.beforeImagePath}`;
        doc.beforeImageUrl = `${assetBaseUrl.replace(/\/$/, '')}${pathPart}`;
      }
      if (doc.afterImagePath) {
        const pathPart = doc.afterImagePath.startsWith('/') ? doc.afterImagePath : `/${doc.afterImagePath}`;
        doc.afterImageUrl = `${assetBaseUrl.replace(/\/$/, '')}${pathPart}`;
      }
      return doc;
    });

    res.json(transformedIdeas);
  } catch (error) {
    console.error('[PUBLIC] Error fetching ideas for public view:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// LƯU Ý: PUT /code/:ideaCode đã được gỡ bỏ.
// Endpoint đó cho phép sửa nội dung ý tưởng chỉ bằng mã code, không cần đăng
// nhập. Việc cập nhật báo cáo A3 nay đi qua PUT /:id có xác thực bên dưới.

// ===========================================
// PROTECTED ROUTES (yêu cầu authentication)
// ===========================================

// Protected: Lấy tất cả ý tưởng (admin)
router.get('/', auth, getAllIdeas);

// Protected: Cập nhật ý tưởng theo ID (admin)
router.put('/:id', auth, updateIdea);

// Protected: Xóa ý tưởng (admin)
router.delete('/:id', auth, deleteIdea);

// Protected: Cập nhật trạng thái thanh toán (admin)
router.patch('/:id/payment', auth, updatePaymentStatus);

export default router;
