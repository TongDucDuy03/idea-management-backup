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
const ideaController_1 = require("../controllers/ideaController");
const Idea_1 = __importDefault(require("../models/Idea"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ===========================================
// QUAN TRỌNG: PUBLIC ROUTES PHẢI ĐẶT TRƯỚC!
// ===========================================
// 1. Public: Tạo ý tưởng mới
router.post('/', ideaController_1.createIdea);
// 2. Public: Tìm ý tưởng theo mã code - ENDPOINT CHÍNH
router.get('/code/:ideaCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ideaCode } = req.params;
        console.log('[PUBLIC] GET /ideas/code/:ideaCode - Searching for:', ideaCode);
        const idea = yield Idea_1.default.findOne({ ideaCode });
        if (!idea) {
            console.log('[PUBLIC] Idea not found:', ideaCode);
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
        }
        console.log('[PUBLIC] Found idea:', {
            id: idea._id,
            code: idea.ideaCode,
            status: idea.implementationStatus
        });
        return res.json(idea);
    }
    catch (error) {
        console.error('[PUBLIC] Error getting idea by code:', error);
        return res.status(500).json({ message: 'Lỗi server', error });
    }
}));
// 3. Public: Tìm kiếm theo query param (dự phòng)
router.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ideaCode } = req.query;
        console.log('[PUBLIC] GET /ideas/search - Query:', ideaCode);
        if (!ideaCode || typeof ideaCode !== 'string') {
            return res.status(400).json({ message: 'Thiếu tham số ideaCode' });
        }
        const idea = yield Idea_1.default.findOne({ ideaCode: ideaCode.trim() });
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
        }
        return res.json(idea);
    }
    catch (error) {
        console.error('[PUBLIC] Error in search:', error);
        return res.status(500).json({ message: 'Lỗi server', error });
    }
}));
// 4. Public: Cập nhật ý tưởng theo code (chỉ các trường A3)
router.put('/code/:ideaCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ideaCode } = req.params;
        console.log('[PUBLIC] PUT /ideas/code/:ideaCode - Code:', ideaCode);
        const idea = yield Idea_1.default.findOne({ ideaCode });
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
        }
        // Kiểm tra trạng thái
        const currentStatus = idea.implementationStatus;
        if (currentStatus !== 'Lập báo cáo A3') {
            return res.status(400).json({
                message: 'Ý tưởng chưa ở trạng thái "Lập báo cáo A3"',
                currentStatus: currentStatus
            });
        }
        // Chỉ cho phép cập nhật các trường A3
        const allowedFields = [
            'topicTitle',
            'solution',
            'benefit',
            'benefitOutcome',
            'scalingOpportunity',
            'resourcesUsed',
            'calculationDescription',
            'beforeImage',
            'afterImage'
        ];
        const updatePayload = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                updatePayload[key] = req.body[key];
            }
        }
        console.log('[PUBLIC] Updating fields:', Object.keys(updatePayload));
        const updated = yield Idea_1.default.findByIdAndUpdate(idea._id, updatePayload, { new: true });
        return res.json(updated);
    }
    catch (error) {
        console.error('[PUBLIC] Error updating by code:', error);
        return res.status(500).json({ message: 'Lỗi server', error });
    }
}));
// ===========================================
// PROTECTED ROUTES (yêu cầu authentication)
// ===========================================
// Protected: Lấy tất cả ý tưởng (admin)
router.get('/', auth_1.auth, ideaController_1.getAllIdeas);
// Protected: Cập nhật ý tưởng theo ID (admin)
router.put('/:id', auth_1.auth, ideaController_1.updateIdea);
// Protected: Xóa ý tưởng (admin)
router.delete('/:id', auth_1.auth, ideaController_1.deleteIdea);
// Protected: Cập nhật trạng thái thanh toán (admin)
router.patch('/:id/payment', auth_1.auth, ideaController_1.updatePaymentStatus);
exports.default = router;
