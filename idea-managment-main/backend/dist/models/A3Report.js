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
const A3ReportSchema = new mongoose_1.Schema({
    ideaId: { type: String, required: true },
    ideaCode: { type: String, required: true },
    fullName: { type: String, required: true },
    department: { type: String, required: true },
    topicTitle: { type: String, required: true },
    submissionDate: { type: Date, required: true },
    // Thông tin cơ bản
    problemDescription: { type: String, required: true },
    currentSituation: { type: String, required: true },
    rootCause: { type: String, required: true },
    targetSituation: { type: String, required: true },
    solution: { type: String, required: true },
    implementationPlan: { type: String, required: true },
    resources: { type: String, required: true },
    timeline: { type: String, required: true },
    responsiblePerson: { type: String, required: true },
    expectedResult: { type: String, required: true },
    actualResult: { type: String, required: true },
    benefit: { type: String, required: true },
    cost: { type: String, required: true },
    risk: { type: String, required: true },
    followUpAction: { type: String, required: true },
    lessonsLearned: { type: String, required: true },
    scalingOpportunity: { type: String, required: true },
    // Thông tin bổ sung
    implementationDepartment: { type: String, required: false },
    implementationDate: { type: Date, required: false },
    completionDate: { type: Date, required: false },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected'],
        default: 'draft'
    },
    note: { type: String, required: false },
    createdBy: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// Tự động cập nhật updatedAt khi save
A3ReportSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.default = mongoose_1.default.model('A3Report', A3ReportSchema);
