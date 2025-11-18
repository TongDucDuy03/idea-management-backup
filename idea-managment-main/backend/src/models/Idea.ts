import mongoose, { Document, Schema } from 'mongoose';

export interface IIdea extends Document {
  fullName?: string;
  department: string;
  idea: string;
  solution?: string;
  benefit?: string;
  ideaCode: string;
  submissionDate: Date;
  isPaid: boolean;
  status: 'pending' | 'rejected' | 'noted' | 'approved'; // Quyết định phê duyệt (cũ)
  implementationStatus: 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'; // Trạng thái triển khai (mới)
  implementationDepartment?: string;
  // Legacy field used in migration scripts (hướng triển khai cũ)
  implementationDirection?: string;
  note?: string;
  benefitValue?: number; // Giá trị làm lợi (VND)
  rewardAmount?: number; // Tiền thưởng (VND)
  rewardApprovalDate?: Date; // Ngày duyệt khen thưởng
  // New fields
  benefitOutcome?: string; // Lợi ích mang lại (mô tả)
  resourcesUsed?: string; // Nguồn lực sử dụng
  calculationDescription?: string; // Mô tả cách tính
  topicTitle?: string; // Tên đề tài
  scalingOpportunity?: string; // Cơ hội nhân rộng phát triển
  beforeImage?: string; // Hình ảnh trước (data URL hoặc URL)
  afterImage?: string; // Hình ảnh sau (data URL hoặc URL)
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

export default mongoose.model<IIdea>('Idea', IdeaSchema); 