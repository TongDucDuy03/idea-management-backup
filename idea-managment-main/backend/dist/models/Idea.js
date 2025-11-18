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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const IdeaSchema = new mongoose_1.Schema({
    fullName: { type: String, required: false },
    department: { type: String, required: true },
    idea: { type: String, required: false },
    solution: { type: String, required: false },
    benefit: { type: String, required: false },
    ideaCode: { type: String, required: true, unique: true },
    submissionDate: { type: Date, default: Date.now },
    isPaid: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['pending', 'rejected', 'noted', 'approved'],
        default: 'pending'
    },
    implementationStatus: {
        type: String,
        enum: ['Đề xuất mới', 'Xem xét', 'Phê duyệt', 'Phản hồi phê duyệt', 'Đang triển khai', 'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'],
        default: 'Đề xuất mới'
    },
    implementationDepartment: { type: String, required: false },
    // Legacy field giữ lại để phục vụ các script migrate cũ
    implementationDirection: { type: String, required: false },
    note: { type: String, required: false },
    benefitValue: { type: Number, required: false, default: 0 },
    rewardAmount: { type: Number, required: false, default: 0 },
    rewardApprovalDate: { type: Date, required: false },
    // New fields
    benefitOutcome: { type: String, required: false },
    resourcesUsed: { type: String, required: false },
    calculationDescription: { type: String, required: false },
    topicTitle: { type: String, required: false },
    scalingOpportunity: { type: String, required: false },
    beforeImage: { type: String, required: false },
    afterImage: { type: String, required: false }
});
exports.default = mongoose_1.default.model('Idea', IdeaSchema);
