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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIdea = exports.updateIdea = exports.updatePaymentStatus = exports.getAllIdeas = exports.createIdea = void 0;
const Idea_1 = __importStar(require("../models/Idea"));
const emailService_1 = require("../services/emailService");
const imageStorageService_1 = require("../services/imageStorageService");
function buildImageUrl(rawPath, baseUrl) {
    if (!rawPath)
        return null;
    const trimmed = rawPath.trim();
    if (!trimmed)
        return null;
    // Nếu DB đã lưu full URL: chuẩn hóa http:// thành https://
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed.replace(/^http:\/\//i, 'https://');
    }
    const base = (baseUrl || '').replace(/\/$/, '');
    if (!base)
        return null;
    const pathPart = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${pathPart}`;
}
function transformIdeaWithImageUrls(idea, baseUrl) {
    const result = Object.assign({}, idea.toObject ? idea.toObject() : idea);
    // Ưu tiên: beforeImageUrl/afterImageUrl (nếu có), sau đó build từ path, cuối cùng fallback về base64 cũ
    result.beforeImageUrl = result.beforeImageUrl ||
        buildImageUrl(result.beforeImagePath, baseUrl) ||
        (result.beforeImage && !(0, imageStorageService_1.isBase64DataUrl)(result.beforeImage) ? result.beforeImage : null);
    result.afterImageUrl = result.afterImageUrl ||
        buildImageUrl(result.afterImagePath, baseUrl) ||
        (result.afterImage && !(0, imageStorageService_1.isBase64DataUrl)(result.afterImage) ? result.afterImage : null);
    // Giữ lại beforeImage/afterImage nếu là base64 (cho backward compat)
    if (!result.beforeImageUrl && (0, imageStorageService_1.isBase64DataUrl)(result.beforeImage)) {
        result.beforeImageUrl = result.beforeImage;
    }
    if (!result.afterImageUrl && (0, imageStorageService_1.isBase64DataUrl)(result.afterImage)) {
        result.afterImageUrl = result.afterImage;
    }
    return result;
}
const createIdea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, department, idea, solution, benefit, status, implementationDepartment, note, benefitValue, rewardAmount, rewardApprovalDate, beforeImage, afterImage, implementationStatus, expectedCompletionDate, netReserveStatus, reasonNote } = req.body;
        // Generate idea code (without name prefix)
        const timestamp = new Date().getTime();
        const randomNum = Math.floor(Math.random() * 1000);
        const ideaCode = `${timestamp}-${randomNum}`;
        // Validate và set status mặc định
        const ideaStatus = status && Object.values(Idea_1.IdeaStatus).includes(status)
            ? status
            : Idea_1.IdeaStatus.DE_NGHI_MOI;
        let beforeImagePath;
        let afterImagePath;
        if ((0, imageStorageService_1.isBase64DataUrl)(beforeImage)) {
            try {
                beforeImagePath = yield (0, imageStorageService_1.saveBase64ToFile)(beforeImage, ideaCode, 'before');
            }
            catch (e) {
                console.error('Failed to save beforeImage:', e);
            }
        }
        if ((0, imageStorageService_1.isBase64DataUrl)(afterImage)) {
            try {
                afterImagePath = yield (0, imageStorageService_1.saveBase64ToFile)(afterImage, ideaCode, 'after');
            }
            catch (e) {
                console.error('Failed to save afterImage:', e);
            }
        }
        const newIdea = new Idea_1.default({
            fullName,
            department,
            idea,
            solution,
            benefit,
            ideaCode,
            submissionDate: new Date(),
            status: ideaStatus,
            implementationDepartment,
            note,
            benefitValue: benefitValue || 0,
            rewardAmount: rewardAmount || 0,
            rewardApprovalDate: rewardApprovalDate ? new Date(rewardApprovalDate) : undefined,
            implementationStatus,
            expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
            netReserveStatus,
            reasonNote,
            // Giữ lại base64 trong beforeImage/afterImage để admin-view & admin luôn xem được
            beforeImage: beforeImage || undefined,
            afterImage: afterImage || undefined,
            // Đồng thời lưu đường dẫn file để Make/API realtime dùng
            beforeImagePath: beforeImagePath || undefined,
            afterImagePath: afterImagePath || undefined,
        });
        const savedIdea = yield newIdea.save();
        // Fire-and-forget email (do not block response)
        (0, emailService_1.sendIdeaSubmittedEmail)(savedIdea).catch((err) => {
            console.error('Failed to send idea notification email:', err);
        });
        // Transform response với image URLs
        const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
        const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
        const transformed = transformIdeaWithImageUrls(savedIdea, assetBaseUrl);
        res.status(201).json(transformed);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating idea', error });
    }
});
exports.createIdea = createIdea;
const getAllIdeas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, isPaid, rewardCalculationMethod } = req.query;
        let query = {};
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { ideaCode: { $regex: search, $options: 'i' } }
            ];
        }
        if (isPaid !== undefined) {
            query.isPaid = isPaid === 'true';
        }
        if (rewardCalculationMethod) {
            // Validate enum value
            if (Object.values(Idea_1.RewardCalculationMethod).includes(rewardCalculationMethod)) {
                query.rewardCalculationMethod = rewardCalculationMethod;
            }
        }
        const ideas = yield Idea_1.default.find(query).sort({ submissionDate: -1 });
        // Build base URL cho image URLs
        const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
        const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
        // Transform mỗi idea để có beforeImageUrl/afterImageUrl
        const transformedIdeas = ideas.map(idea => transformIdeaWithImageUrls(idea, assetBaseUrl));
        res.json(transformedIdeas);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching ideas', error });
    }
});
exports.getAllIdeas = getAllIdeas;
const updatePaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isPaid } = req.body;
        const updatedIdea = yield Idea_1.default.findByIdAndUpdate(id, { isPaid }, { new: true });
        if (!updatedIdea) {
            return res.status(404).json({ message: 'Idea not found' });
        }
        res.json(updatedIdea);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating payment status', error });
    }
});
exports.updatePaymentStatus = updatePaymentStatus;
const updateIdea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Updating idea:', {
            id: req.params.id,
            beforeImage: req.body.beforeImage ? 'Present' : 'Missing',
            afterImage: req.body.afterImage ? 'Present' : 'Missing',
            rewardApprovalDate: req.body.rewardApprovalDate ? 'Present' : 'Missing',
            bodyKeys: Object.keys(req.body)
        });
        const existing = yield Idea_1.default.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
        }
        const updateData = Object.assign({}, req.body);
        // Convert rewardApprovalDate to Date if it's a string
        if (updateData.rewardApprovalDate) {
            updateData.rewardApprovalDate = new Date(updateData.rewardApprovalDate);
        }
        else if (updateData.rewardApprovalDate === null || updateData.rewardApprovalDate === '') {
            updateData.rewardApprovalDate = null;
        }
        // Convert expectedCompletionDate to Date if it's a string
        if (updateData.expectedCompletionDate) {
            updateData.expectedCompletionDate = new Date(updateData.expectedCompletionDate);
        }
        else if (updateData.expectedCompletionDate === null || updateData.expectedCompletionDate === '') {
            updateData.expectedCompletionDate = null;
        }
        // beforeImage: clear, or base64 -> save file and set path
        if (updateData.beforeImage === null || updateData.beforeImage === '') {
            updateData.beforeImage = null;
            updateData.beforeImagePath = null;
        }
        else if ((0, imageStorageService_1.isBase64DataUrl)(updateData.beforeImage)) {
            try {
                updateData.beforeImagePath = yield (0, imageStorageService_1.saveBase64ToFile)(updateData.beforeImage, existing.ideaCode, 'before');
                // KHÔNG xóa base64: giữ lại để admin/admin-view luôn xem được
            }
            catch (e) {
                console.error('Failed to save beforeImage on update:', e);
            }
        }
        if (updateData.afterImage === null || updateData.afterImage === '') {
            updateData.afterImage = null;
            updateData.afterImagePath = null;
        }
        else if ((0, imageStorageService_1.isBase64DataUrl)(updateData.afterImage)) {
            try {
                updateData.afterImagePath = yield (0, imageStorageService_1.saveBase64ToFile)(updateData.afterImage, existing.ideaCode, 'after');
                // KHÔNG xóa base64: giữ lại để admin/admin-view luôn xem được
            }
            catch (e) {
                console.error('Failed to save afterImage on update:', e);
            }
        }
        const idea = yield Idea_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
        }
        console.log('Updated idea:', {
            id: idea._id,
            beforeImage: idea.beforeImage ? 'Present' : 'Missing',
            afterImage: idea.afterImage ? 'Present' : 'Missing',
            rewardApprovalDate: idea.rewardApprovalDate ? 'Present' : 'Missing'
        });
        // Transform response với image URLs
        const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
        const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
        const transformed = transformIdeaWithImageUrls(idea, assetBaseUrl);
        res.json(transformed);
    }
    catch (error) {
        console.error('Error updating idea:', error);
        res.status(500).json({ message: 'Lỗi server', error });
    }
});
exports.updateIdea = updateIdea;
const deleteIdea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const idea = yield Idea_1.default.findByIdAndDelete(req.params.id);
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
        }
        res.json({ message: 'Đã xóa ý tưởng thành công' });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
});
exports.deleteIdea = deleteIdea;
