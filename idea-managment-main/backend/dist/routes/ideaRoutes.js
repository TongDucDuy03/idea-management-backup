"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            status: idea.status
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
// 4. Public: Lấy tất cả ý tưởng cho Statistics (chỉ đọc)
router.get('/public', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ideas = yield Idea_1.default.find({}).sort({ submissionDate: -1 });
        res.json(ideas);
    }
    catch (error) {
        console.error('[PUBLIC] Error fetching ideas for statistics:', error);
        res.status(500).json({ message: 'Lỗi server', error });
    }
}));
// 5. Public: Cập nhật ý tưởng theo code (chỉ các trường A3)
router.put('/code/:ideaCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ideaCode } = req.params;
        console.log('[PUBLIC] PUT /ideas/code/:ideaCode - Code:', ideaCode);
        const idea = yield Idea_1.default.findOne({ ideaCode });
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng với mã này' });
        }
        // Kiểm tra trạng thái (sử dụng status mới)
        const { IdeaStatus } = yield Promise.resolve().then(() => __importStar(require('../models/Idea')));
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
