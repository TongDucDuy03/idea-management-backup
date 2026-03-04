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
exports.IdeaStatus = exports.RewardCalculationMethod = exports.RewardStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Enum tình trạng khen thưởng (đặt trước IdeaStatus để tránh lỗi)
var RewardStatus;
(function (RewardStatus) {
    RewardStatus["CHO_KHEN_THUONG_50K"] = "CHO_KHEN_THUONG_50K";
    RewardStatus["DA_KHEN_THUONG_50K"] = "DA_KHEN_THUONG_50K";
    RewardStatus["CHO_KHEN_THUONG_20"] = "CHO_KHEN_THUONG_20";
    RewardStatus["DA_KHEN_THUONG_20"] = "DA_KHEN_THUONG_20";
})(RewardStatus || (exports.RewardStatus = RewardStatus = {}));
// Enum phương thức tính tiền thưởng
var RewardCalculationMethod;
(function (RewardCalculationMethod) {
    RewardCalculationMethod["PERCENT_20"] = "PERCENT_20";
    RewardCalculationMethod["TOOL_BASED"] = "TOOL_BASED"; // Tính bằng công cụ
})(RewardCalculationMethod || (exports.RewardCalculationMethod = RewardCalculationMethod = {}));
// Enum trạng thái chuẩn - Single Source of Truth
var IdeaStatus;
(function (IdeaStatus) {
    IdeaStatus["DE_NGHI_MOI"] = "DE_NGHI_MOI";
    IdeaStatus["XEM_XET"] = "XEM_XET";
    IdeaStatus["CHO_PHE_DUYET"] = "CHO_PHE_DUYET";
    IdeaStatus["TRIEN_KHAI"] = "TRIEN_KHAI";
    IdeaStatus["KHONG_PHU_HOP"] = "KHONG_PHU_HOP";
    IdeaStatus["LUU_Y_TUONG"] = "LUU_Y_TUONG";
    IdeaStatus["BAO_CAO_A3"] = "BAO_CAO_A3";
    IdeaStatus["KHEN_THUONG"] = "KHEN_THUONG";
    IdeaStatus["DONE"] = "DONE";
    IdeaStatus["REJECTED"] = "REJECTED";
})(IdeaStatus || (exports.IdeaStatus = IdeaStatus = {}));
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
        enum: Object.values(IdeaStatus),
        default: IdeaStatus.DE_NGHI_MOI
    },
    implementationDepartment: { type: String, required: false },
    // Legacy field giữ lại để phục vụ các script migrate cũ
    implementationDirection: { type: String, required: false },
    note: { type: String, required: false },
    benefitValue: { type: Number, required: false, default: 0 },
    rewardAmount: { type: Number, required: false, default: 0 },
    rewardApprovalDate: { type: Date, required: false },
    rewardStatuses: {
        type: [String],
        enum: Object.values(RewardStatus),
        default: []
    },
    rewardCalculationMethod: {
        type: String,
        enum: Object.values(RewardCalculationMethod),
        required: false
    },
    // New fields
    benefitOutcome: { type: String, required: false },
    resourcesUsed: { type: String, required: false },
    calculationDescription: { type: String, required: false },
    scalingOpportunity: { type: String, required: false },
    beforeImage: { type: String, required: false },
    afterImage: { type: String, required: false },
    beforeImagePath: { type: String, required: false },
    afterImagePath: { type: String, required: false },
    // 4 trường mới theo yêu cầu
    implementationStatus: { type: String, required: false }, // Trạng thái triển khai
    expectedCompletionDate: { type: Date, required: false }, // Hạn dự kiến hoàn thành (dự kiến)
    netReserveStatus: { type: String, required: false }, // Trạng thái dự trữ ròng
    reasonNote: { type: String, required: false }, // Ghi chú lý do (Đăng/Huy)
});
exports.default = mongoose_1.default.model('Idea', IdeaSchema);
