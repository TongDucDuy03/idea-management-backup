export interface Idea {
  _id: string;
  fullName: string;
  department: string;
  idea: string;
  solution: string;
  benefit?: string;
  ideaCode: string;
  submissionDate: Date;
  status: 'pending' | 'rejected' | 'noted' | 'approved'; // Quyết định phê duyệt (cũ)
  implementationStatus: 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'; // Trạng thái triển khai (mới)
  implementationDepartment?: string;
  note?: string;
  benefitValue?: number; // Giá trị làm lợi (VND)
  rewardAmount?: number; // Tiền thưởng (VND)
  // New fields
  benefitOutcome?: string; // Lợi ích mang lại (mô tả)
  resourcesUsed?: string; // Nguồn lực sử dụng
  calculationDescription?: string; // Mô tả cách tính
  topicTitle?: string; // Tên đề tài
  scalingOpportunity?: string; // Cơ hội nhân rộng phát triển
  beforeImage?: string; // Hình ảnh trước (data URL hoặc URL)
  afterImage?: string; // Hình ảnh sau (data URL hoặc URL)
}

export interface IdeaFormData {
  fullName: string;
  department: string;
  idea: string;
  solution: string;
  benefit?: string;
  // New fields
  benefitOutcome?: string;
  resourcesUsed?: string;
  calculationDescription?: string;
  topicTitle?: string;
  scalingOpportunity?: string;
  beforeImage?: string;
  afterImage?: string;
}

export interface A3Report {
  _id?: string;
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