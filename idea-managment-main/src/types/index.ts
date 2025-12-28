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

// Enum tình trạng khen thưởng
export enum RewardStatus {
  CHO_KHEN_THUONG_50K = 'CHO_KHEN_THUONG_50K',
  DA_KHEN_THUONG_50K = 'DA_KHEN_THUONG_50K',
  CHO_KHEN_THUONG_20 = 'CHO_KHEN_THUONG_20',
  DA_KHEN_THUONG_20 = 'DA_KHEN_THUONG_20'
}

// Mapping để hiển thị tiếng Việt cho RewardStatus
export const RewardStatusLabels: Record<RewardStatus, string> = {
  [RewardStatus.CHO_KHEN_THUONG_50K]: 'Chờ khen thưởng 50.000đ',
  [RewardStatus.DA_KHEN_THUONG_50K]: 'Đã khen thưởng 50.000đ',
  [RewardStatus.CHO_KHEN_THUONG_20]: 'Chờ khen thưởng 20%',
  [RewardStatus.DA_KHEN_THUONG_20]: 'Đã khen thưởng 20%'
};

// Mapping để hiển thị tiếng Việt
export const IdeaStatusLabels: Record<IdeaStatus, string> = {
  [IdeaStatus.DE_NGHI_MOI]: 'Đề nghị mới',
  [IdeaStatus.XEM_XET]: 'Xem xét',
  [IdeaStatus.CHO_PHE_DUYET]: 'Chờ phê duyệt',
  [IdeaStatus.TRIEN_KHAI]: 'Triển khai',
  [IdeaStatus.KHONG_PHU_HOP]: 'Không phù hợp',
  [IdeaStatus.LUU_Y_TUONG]: 'Lưu ý tưởng',
  [IdeaStatus.BAO_CAO_A3]: 'Báo cáo A3',
  [IdeaStatus.KHEN_THUONG]: 'Khen thưởng',
  [IdeaStatus.DONE]: 'Hoàn thành',
  [IdeaStatus.REJECTED]: 'Không thành công'
};

export interface Idea {
  _id: string;
  fullName: string;
  department: string;
  idea: string;
  solution: string;
  benefit?: string;
  ideaCode: string;
  submissionDate: Date;
  status: IdeaStatus; // Single source of truth - chỉ sử dụng trường này
  implementationDepartment?: string;
  note?: string;
  benefitValue?: number; // Giá trị làm lợi (VND)
  rewardAmount?: number; // Tiền thưởng (VND)
  rewardApprovalDate?: Date; // Ngày duyệt khen thưởng
  rewardStatuses?: RewardStatus[]; // Tình trạng khen thưởng (multi-select)
  // New fields
  benefitOutcome?: string; // Lợi ích mang lại (mô tả)
  resourcesUsed?: string; // Nguồn lực sử dụng
  calculationDescription?: string; // Mô tả cách tính
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