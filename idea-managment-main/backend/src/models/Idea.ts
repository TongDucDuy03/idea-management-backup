import mongoose, { Document, Schema } from 'mongoose';

// Enum tình trạng khen thưởng (đặt trước IdeaStatus để tránh lỗi)
export enum RewardStatus {
  CHO_KHEN_THUONG_50K = 'CHO_KHEN_THUONG_50K',
  DA_KHEN_THUONG_50K = 'DA_KHEN_THUONG_50K',
  CHO_KHEN_THUONG_20 = 'CHO_KHEN_THUONG_20',
  DA_KHEN_THUONG_20 = 'DA_KHEN_THUONG_20'
}

// Enum phương thức tính tiền thưởng
export enum RewardCalculationMethod {
  PERCENT_20 = 'PERCENT_20', // Tính được 20%
  TOOL_BASED = 'TOOL_BASED' // Tính bằng công cụ
}

// Enum trạng thái chuẩn - Single Source of Truth
export enum IdeaStatus {
  DE_NGHI_MOI = 'DE_NGHI_MOI',
  XEM_XET = 'XEM_XET',
  CHO_PHE_DUYET = 'CHO_PHE_DUYET',
  TRIEN_KHAI = 'TRIEN_KHAI',
  KHONG_PHU_HOP = 'KHONG_PHU_HOP',
  LUU_Y_TUONG = 'LUU_Y_TUONG',
  BAO_CAO_A3 = 'BAO_CAO_A3',
  KHEN_THUONG = 'KHEN_THUONG',
  DONE = 'DONE',
  REJECTED = 'REJECTED'
}

export interface IIdea extends Document {
  fullName?: string;
  department: string;
  idea: string;
  solution?: string;
  benefit?: string;
  ideaCode: string;
  submissionDate: Date;
  isPaid: boolean;
  status: IdeaStatus; // Single source of truth - chỉ sử dụng trường này
  implementationDepartment?: string;
  // Legacy field used in migration scripts (hướng triển khai cũ)
  implementationDirection?: string;
  note?: string;
  benefitValue?: number; // Giá trị làm lợi (VND)
  rewardAmount?: number; // Tiền thưởng (VND)
  rewardApprovalDate?: Date; // Ngày duyệt khen thưởng
  rewardStatuses?: RewardStatus[]; // Tình trạng khen thưởng (multi-select)
  rewardCalculationMethod?: RewardCalculationMethod; // Phương thức tính tiền thưởng
  // New fields
  benefitOutcome?: string; // Lợi ích mang lại (mô tả)
  resourcesUsed?: string; // Nguồn lực sử dụng
  calculationDescription?: string; // Mô tả cách tính
  scalingOpportunity?: string; // Cơ hội nhân rộng phát triển
  beforeImage?: string; // Hình ảnh trước (data URL hoặc URL) - legacy
  afterImage?: string; // Hình ảnh sau (data URL hoặc URL) - legacy
  beforeImagePath?: string; // Đường dẫn file: /uploads/xxx.jpg
  afterImagePath?: string; // Đường dẫn file: /uploads/xxx.jpg
}

const IdeaSchema: Schema = new Schema({
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

export default mongoose.model<IIdea>('Idea', IdeaSchema); 