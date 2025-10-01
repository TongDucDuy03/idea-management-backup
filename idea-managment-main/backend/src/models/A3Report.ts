import mongoose, { Document, Schema } from 'mongoose';

export interface IA3Report extends Document {
  ideaId: string;
  ideaCode: string;
  fullName: string;
  department: string;
  topicTitle: string;
  submissionDate: Date;
  
  // Thông tin cơ bản
  problemDescription: string; // Mô tả vấn đề
  currentSituation: string; // Thực trạng hiện tại
  rootCause: string; // Nguyên nhân gốc
  targetSituation: string; // Tình hình mục tiêu
  solution: string; // Giải pháp
  implementationPlan: string; // Kế hoạch triển khai
  resources: string; // Nguồn lực
  timeline: string; // Thời gian thực hiện
  responsiblePerson: string; // Người chịu trách nhiệm
  expectedResult: string; // Kết quả mong đợi
  actualResult: string; // Kết quả thực tế
  benefit: string; // Lợi ích
  cost: string; // Chi phí
  risk: string; // Rủi ro
  followUpAction: string; // Hành động theo dõi
  lessonsLearned: string; // Bài học kinh nghiệm
  scalingOpportunity: string; // Cơ hội nhân rộng
  
  // Thông tin bổ sung
  implementationDepartment?: string;
  implementationDate?: Date;
  completionDate?: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  note?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const A3ReportSchema: Schema = new Schema({
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
A3ReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IA3Report>('A3Report', A3ReportSchema);
