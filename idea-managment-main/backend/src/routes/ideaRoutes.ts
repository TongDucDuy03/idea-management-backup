import express from 'express';
import { getAllIdeas, createIdea, updateIdea, deleteIdea, updatePaymentStatus } from '../controllers/ideaController';
import Idea from '../models/Idea';
import { auth } from '../middleware/auth';

const router = express.Router();

// ===========================================
// QUAN TRỌNG: PUBLIC ROUTES PHẢI ĐẶT TRƯỚC!
// ===========================================

// 1. Public: Tạo ý tưởng mới
router.post('/', createIdea);

// 2. Public: Tìm ý tưởng theo mã code - ENDPOINT CHÍNH
router.get('/code/:ideaCode', async (req, res) => {
  try {
    const { ideaCode } = req.params;
    console.log('[PUBLIC] GET /ideas/code/:ideaCode - Searching for:', ideaCode);
    
    const idea = await Idea.findOne({ ideaCode });
    
    if (!idea) {
      console.log('[PUBLIC] Idea not found:', ideaCode);
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
    }
    
    console.log('[PUBLIC] Found idea:', {
      id: idea._id,
      code: idea.ideaCode,
      status: idea.status
    });
    
    return res.json(idea);
  } catch (error) {
    console.error('[PUBLIC] Error getting idea by code:', error);
    return res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 3. Public: Tìm kiếm theo query param (dự phòng)
router.get('/search', async (req, res) => {
  try {
    const { ideaCode } = req.query;
    console.log('[PUBLIC] GET /ideas/search - Query:', ideaCode);
    
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
    return res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 4. Public: Lấy tất cả ý tưởng cho Statistics (chỉ đọc)
router.get('/public', async (req, res) => {
  try {
    const ideas = await Idea.find({}).sort({ submissionDate: -1 });
    res.json(ideas);
  } catch (error) {
    console.error('[PUBLIC] Error fetching ideas for statistics:', error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 5. Public: Cập nhật ý tưởng theo code (chỉ các trường A3)
router.put('/code/:ideaCode', async (req, res) => {
  try {
    const { ideaCode } = req.params;
    console.log('[PUBLIC] PUT /ideas/code/:ideaCode - Code:', ideaCode);
    
    const idea = await Idea.findOne({ ideaCode });
    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
    }

    // Kiểm tra trạng thái (sử dụng status mới)
    const { IdeaStatus } = await import('../models/Idea');
    if (idea.status !== IdeaStatus.BAO_CAO_A3) {
      return res.status(400).json({ 
        message: 'Ý tưởng chưa ở trạng thái "BAO_CAO_A3"',
        currentStatus: idea.status
      });
    }

    // Chỉ cho phép cập nhật các trường A3
    const allowedFields = [
      'solution',
      'benefit',
      'benefitOutcome',
      'scalingOpportunity',
      'resourcesUsed',
      'calculationDescription',
      'beforeImage',
      'afterImage'
    ];

    const updatePayload: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updatePayload[key] = req.body[key];
      }
    }

    console.log('[PUBLIC] Updating fields:', Object.keys(updatePayload));
    const updated = await Idea.findByIdAndUpdate(idea._id, updatePayload, { new: true });
    
    return res.json(updated);
  } catch (error) {
    console.error('[PUBLIC] Error updating by code:', error);
    return res.status(500).json({ message: 'Lỗi server', error });
  }
});

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