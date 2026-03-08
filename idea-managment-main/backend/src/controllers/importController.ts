import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import ImportSession, { ImportRowStatus, IImportRow } from '../models/ImportSession';
import Idea, { IdeaStatus, RewardStatus, RewardCalculationMethod } from '../models/Idea';

// Mapping cột Excel → field hệ thống
const DEFAULT_COLUMN_MAPPING: Record<string, string> = {
  'Mã ý tưởng': 'ideaCode',
  'Idea Code': 'ideaCode',
  'Họ và tên': 'fullName',
  'Full Name': 'fullName',
  'Đơn vị': 'department',
  'Department': 'department',
  'Ý tưởng': 'idea',
  'Idea': 'idea',
  'Thực trạng': 'solution',
  'Solution': 'solution',
  'Giải pháp': 'benefit',
  'Benefit': 'benefit',
  'Lợi ích mang lại': 'benefitOutcome',
  'Benefit Outcome': 'benefitOutcome',
  'Nguồn lực sử dụng': 'resourcesUsed',
  'Resources Used': 'resourcesUsed',
  'Mô tả cách tính': 'calculationDescription',
  'Calculation Description': 'calculationDescription',
  'Cơ hội nhân rộng phát triển': 'scalingOpportunity',
  'Scaling Opportunity': 'scalingOpportunity',
  'Trạng thái': 'status',
  'Status': 'status',
  'Quyết định phê duyệt': 'status', // Tên cột từ export
  'Tình trạng khen thưởng': 'rewardStatuses',
  'Reward Statuses': 'rewardStatuses',
  'Ghi chú': 'note',
  'Note': 'note',
  'Lý do không duy trì': 'note',
  'Phòng ban triển khai': 'implementationDepartment',
  'Implementation Department': 'implementationDepartment',
  'Giá trị làm lợi (VND)': 'benefitValue',
  'Benefit Value': 'benefitValue',
  'Tiền thưởng (VND)': 'rewardAmount',
  'Reward Amount': 'rewardAmount',
  'Ngày duyệt khen thưởng': 'rewardApprovalDate',
  'Reward Approval Date': 'rewardApprovalDate',
  'Phương thức tính thưởng': 'rewardCalculationMethod',
  'Reward Calculation Method': 'rewardCalculationMethod',
  'Ngày gửi': 'submissionDate',
  'Submission Date': 'submissionDate',
  'Hình trước': 'beforeImage',
  'Before Image': 'beforeImage',
  'Hình sau': 'afterImage',
  'After Image': 'afterImage',
  // 4 trường mới
  'Trạng thái triển khai': 'implementationStatus',
  'Implementation Status': 'implementationStatus',
  'Hạn dự kiến hoàn thành': 'expectedCompletionDate',
  'Expected Completion Date': 'expectedCompletionDate',
  'Trạng thái duy trì/mở rộng': 'netReserveStatus', // Alias
  'Ghi chú lý do (Dừng/Hủy)': 'reasonNote',
  'Reason Note': 'reasonNote'
};

// Hàm parse date từ Excel (hỗ trợ cả string và serial number)
// Xử lý đúng timezone cho Việt Nam (GMT+7)
function parseExcelDate(value: any): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Nếu là số, có thể là serial number của Excel
  if (typeof value === 'number') {
    // Excel serial date: 1 = Jan 1, 1900
    // Cần điều chỉnh vì Excel có bug (coi 1900 là năm nhuận)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30, 0, 0, 0));
    const days = value;
    const result = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return result;
  }

  // Nếu là string, thử parse theo định dạng dd/MM/yyyy hoặc d/M/yyyy
  const strValue = value.toString().trim();
  if (strValue === '') {
    return null;
  }

  // Thử parse theo định dạng Việt Nam: d/M/yyyy hoặc dd/MM/yyyy
  const parts = strValue.split(/[\/\-\.]/);
  if (parts.length >= 2) {
    let day: number, month: number, year: number;

    if (parts.length === 2) {
      // d/M (giả định là năm hiện tại)
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // Month trong JS bắt đầu từ 0
      year = new Date().getFullYear();
    } else {
      // d/M/yyyy hoặc dd/MM/yyyy
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      // Nếu năm chỉ có 2 chữ số
      if (year < 100) {
        year += year > 50 ? 1900 : 2000;
      }
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      // Tạo date theo giờ Việt Nam (UTC+7)
      // Sử dụng UTC để tránh bị ảnh hưởng bởi timezone server
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Fallback: thử parse bình thường
  const date = new Date(strValue);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

// Validate và parse một row
async function validateAndParseRow(
  row: Record<string, any>,
  rowIndex: number,
  columnMapping: Record<string, string>
): Promise<IImportRow> {
  const ideaCode = row[columnMapping['ideaCode']] || 
                    row['Mã ý tưởng'] || row['Idea Code'] || 
                    row['ideaCode'] || '';
  
  const messages: string[] = [];
  let status: ImportRowStatus = ImportRowStatus.OK;
  const payload: Record<string, any> = {};

  // 1. Kiểm tra ideaCode có tồn tại không
  if (!ideaCode || ideaCode.toString().trim() === '') {
    messages.push('Mã ý tưởng không được để trống');
    status = ImportRowStatus.ERROR;
    return {
      rowIndex,
      ideaCode: ideaCode || '',
      payload: {},
      status,
      messages,
      selected: false
    };
  }

  // Tìm idea trong DB
  const idea = await Idea.findOne({ ideaCode: ideaCode.toString().trim() });
  if (!idea) {
    messages.push(`Không tìm thấy ý tưởng với mã: ${ideaCode}`);
    status = ImportRowStatus.ERROR;
    return {
      rowIndex,
      ideaCode: ideaCode.toString().trim(),
      payload: {},
      status,
      messages,
      selected: false
    };
  }

  const diff: { current: Record<string, any>; new: Record<string, any> } = {
    current: {},
    new: {}
  };

  // 2. Parse các field khác
  // Status
  if (row[columnMapping['status']] !== undefined || row['Trạng thái'] !== undefined || row['Status'] !== undefined || row['Quyết định phê duyệt'] !== undefined) {
    const statusValue = row[columnMapping['status']] || row['Trạng thái'] || row['Status'] || row['Quyết định phê duyệt'];
    if (statusValue !== null && statusValue !== undefined && statusValue !== '') {
      const normalizedStatus = normalizeStatus(statusValue.toString());
      if (normalizedStatus) {
        payload.status = normalizedStatus;
        diff.current.status = idea.status;
        diff.new.status = normalizedStatus;
        // So sánh enum values bằng string để đảm bảo chính xác
        if (String(idea.status) !== String(normalizedStatus)) {
          messages.push(`Trạng thái sẽ thay đổi từ "${idea.status}" sang "${normalizedStatus}"`);
          status = ImportRowStatus.WARNING;
        }
      } else {
        // Vẫn thêm vào diff để hiển thị lỗi
        diff.current.status = idea.status;
        diff.new.status = statusValue.toString();
        messages.push(`Trạng thái không hợp lệ: ${statusValue}`);
        status = ImportRowStatus.ERROR;
      }
    }
  }

  // RewardStatuses
  const rewardValueKey = columnMapping['rewardStatuses'] || 'Tình trạng khen thưởng';
  if (row[rewardValueKey] !== undefined || row['Tình trạng khen thưởng'] !== undefined || row['Reward Statuses'] !== undefined) {
    const rewardValue = row[rewardValueKey] || row['Tình trạng khen thưởng'] || row['Reward Statuses'];
    const currentRewards = (idea.rewardStatuses || []) as RewardStatus[];
    
    // LUÔN thêm vào diff (để hiển thị trong preview)
    diff.current.rewardStatuses = currentRewards;
    
    // Nếu giá trị rỗng hoặc null, coi như muốn xóa (set thành mảng rỗng)
    if (!rewardValue || rewardValue.toString().trim() === '' || rewardValue.toString().trim().toLowerCase() === 'null') {
      payload.rewardStatuses = [];
      diff.new.rewardStatuses = [];
      if (currentRewards.length > 0) {
        messages.push('Tình trạng khen thưởng sẽ bị xóa');
        if (status === ImportRowStatus.OK) status = ImportRowStatus.WARNING;
      }
    } else {
      const rewardStatuses = parseRewardStatuses(rewardValue.toString());
      // LUÔN set vào diff.new (kể cả khi parse không thành công)
      diff.new.rewardStatuses = rewardStatuses.length > 0 ? rewardStatuses : [];
      payload.rewardStatuses = rewardStatuses.length > 0 ? rewardStatuses : [];
      
      if (rewardStatuses.length > 0) {
        // Kiểm tra xung đột
        const hasConflict = checkRewardConflict(rewardStatuses);
        if (hasConflict) {
          messages.push('Có xung đột trong tình trạng khen thưởng (vừa CHỜ vừa ĐÃ cùng loại)');
          status = ImportRowStatus.WARNING;
        }

        // So sánh sau khi sort để phát hiện thay đổi
        const currentSorted = [...currentRewards].sort();
        const newSorted = [...rewardStatuses].sort();
        if (JSON.stringify(currentSorted) !== JSON.stringify(newSorted)) {
          messages.push(`Tình trạng khen thưởng sẽ thay đổi`);
          if (status === ImportRowStatus.OK) status = ImportRowStatus.WARNING;
        }
      } else {
        // Parse không thành công
        messages.push(`Tình trạng khen thưởng không hợp lệ: ${rewardValue}`);
        status = ImportRowStatus.WARNING;
      }
    }
  }

  // Note
  if (row[columnMapping['note']] !== undefined || row['Ghi chú'] !== undefined || row['Note'] !== undefined || row['Lý do không duy trì'] !== undefined) {
    const noteValue = row[columnMapping['note']] || row['Ghi chú'] || row['Note'] || row['Lý do không duy trì'];
    // Xử lý cả trường hợp để trống (xóa data)
    if (noteValue !== null && noteValue !== undefined) {
      const trimmedValue = noteValue.toString().trim();
      const currentNote = idea.note || '';
      // Xử lý cả trường hợp muốn xóa data (để trống)
      if (trimmedValue !== currentNote) {
        payload.note = trimmedValue;
        diff.current.note = currentNote;
        diff.new.note = trimmedValue;
        if (currentNote) {
          messages.push('Ghi chú sẽ được ghi đè');
        }
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Implementation Department
  if (row[columnMapping['implementationDepartment']] !== undefined || row['Phòng ban triển khai'] !== undefined || row['Implementation Department'] !== undefined) {
    const deptValue = row[columnMapping['implementationDepartment']] || row['Phòng ban triển khai'] || row['Implementation Department'];
    if (deptValue !== null && deptValue !== undefined) {
      const trimmedValue = deptValue.toString().trim();
      const currentImplDept = (idea as any).implementationDepartment || '';
      if (trimmedValue !== currentImplDept) {
        payload.implementationDepartment = trimmedValue;
        diff.current.implementationDepartment = currentImplDept;
        diff.new.implementationDepartment = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Full Name
  if (row[columnMapping['fullName']] !== undefined || row['Họ và tên'] !== undefined || row['Full Name'] !== undefined) {
    const fullNameValue = row[columnMapping['fullName']] || row['Họ và tên'] || row['Full Name'];
    if (fullNameValue !== null && fullNameValue !== undefined) {
      const trimmedValue = fullNameValue.toString().trim();
      const currentFullName = idea.fullName || '';
      if (trimmedValue !== currentFullName) {
        payload.fullName = trimmedValue;
        diff.current.fullName = currentFullName;
        diff.new.fullName = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Department
  if (row[columnMapping['department']] !== undefined || row['Đơn vị'] !== undefined || row['Department'] !== undefined) {
    const deptValue = row[columnMapping['department']] || row['Đơn vị'] || row['Department'];
    if (deptValue !== null && deptValue !== undefined) {
      const trimmedValue = deptValue.toString().trim();
      const currentDept = idea.department || '';
      if (trimmedValue !== currentDept) {
        payload.department = trimmedValue;
        diff.current.department = currentDept;
        diff.new.department = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Idea
  if (row[columnMapping['idea']] !== undefined || row['Ý tưởng'] !== undefined || row['Idea'] !== undefined) {
    const ideaValue = row[columnMapping['idea']] || row['Ý tưởng'] || row['Idea'];
    if (ideaValue !== null && ideaValue !== undefined) {
      const trimmedValue = ideaValue.toString().trim();
      const currentIdea = idea.idea || '';
      if (trimmedValue !== currentIdea) {
        payload.idea = trimmedValue;
        diff.current.idea = currentIdea;
        diff.new.idea = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Solution
  if (row[columnMapping['solution']] !== undefined || row['Thực trạng'] !== undefined || row['Solution'] !== undefined) {
    const solutionValue = row[columnMapping['solution']] || row['Thực trạng'] || row['Solution'];
    if (solutionValue !== null && solutionValue !== undefined) {
      const trimmedValue = solutionValue.toString().trim();
      const currentSolution = idea.solution || '';
      if (trimmedValue !== currentSolution) {
        payload.solution = trimmedValue;
        diff.current.solution = currentSolution;
        diff.new.solution = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Benefit
  if (row[columnMapping['benefit']] !== undefined || row['Giải pháp'] !== undefined || row['Benefit'] !== undefined) {
    const benefitValue = row[columnMapping['benefit']] || row['Giải pháp'] || row['Benefit'];
    if (benefitValue !== null && benefitValue !== undefined) {
      const trimmedValue = benefitValue.toString().trim();
      const currentBenefit = idea.benefit || '';
      if (trimmedValue !== currentBenefit) {
        payload.benefit = trimmedValue;
        diff.current.benefit = currentBenefit;
        diff.new.benefit = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Benefit Outcome
  if (row[columnMapping['benefitOutcome']] !== undefined || row['Lợi ích mang lại'] !== undefined || row['Benefit Outcome'] !== undefined) {
    const benefitOutcomeValue = row[columnMapping['benefitOutcome']] || row['Lợi ích mang lại'] || row['Benefit Outcome'];
    if (benefitOutcomeValue !== null && benefitOutcomeValue !== undefined) {
      const trimmedValue = benefitOutcomeValue.toString().trim();
      const currentBenefitOutcome = (idea as any).benefitOutcome || '';
      if (trimmedValue !== currentBenefitOutcome) {
        payload.benefitOutcome = trimmedValue;
        diff.current.benefitOutcome = currentBenefitOutcome;
        diff.new.benefitOutcome = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Resources Used
  if (row[columnMapping['resourcesUsed']] !== undefined || row['Nguồn lực sử dụng'] !== undefined || row['Resources Used'] !== undefined) {
    const resourcesValue = row[columnMapping['resourcesUsed']] || row['Nguồn lực sử dụng'] || row['Resources Used'];
    if (resourcesValue !== null && resourcesValue !== undefined) {
      const trimmedValue = resourcesValue.toString().trim();
      const currentResourcesUsed = (idea as any).resourcesUsed || '';
      if (trimmedValue !== currentResourcesUsed) {
        payload.resourcesUsed = trimmedValue;
        diff.current.resourcesUsed = currentResourcesUsed;
        diff.new.resourcesUsed = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Calculation Description
  if (row[columnMapping['calculationDescription']] !== undefined || row['Mô tả cách tính'] !== undefined || row['Calculation Description'] !== undefined) {
    const calcValue = row[columnMapping['calculationDescription']] || row['Mô tả cách tính'] || row['Calculation Description'];
    if (calcValue !== null && calcValue !== undefined) {
      const trimmedValue = calcValue.toString().trim();
      const currentCalc = (idea as any).calculationDescription || '';
      if (trimmedValue !== currentCalc) {
        payload.calculationDescription = trimmedValue;
        diff.current.calculationDescription = currentCalc;
        diff.new.calculationDescription = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Scaling Opportunity
  if (row[columnMapping['scalingOpportunity']] !== undefined || row['Cơ hội nhân rộng phát triển'] !== undefined || row['Scaling Opportunity'] !== undefined) {
    const scalingValue = row[columnMapping['scalingOpportunity']] || row['Cơ hội nhân rộng phát triển'] || row['Scaling Opportunity'];
    if (scalingValue !== null && scalingValue !== undefined) {
      const trimmedValue = scalingValue.toString().trim();
      const currentScaling = (idea as any).scalingOpportunity || '';
      if (trimmedValue !== currentScaling) {
        payload.scalingOpportunity = trimmedValue;
        diff.current.scalingOpportunity = currentScaling;
        diff.new.scalingOpportunity = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Benefit Value
  if (row[columnMapping['benefitValue']] !== undefined || row['Giá trị làm lợi (VND)'] !== undefined || row['Benefit Value'] !== undefined) {
    const benefitValueStr = row[columnMapping['benefitValue']] || row['Giá trị làm lợi (VND)'] || row['Benefit Value'];
    if (benefitValueStr !== null && benefitValueStr !== undefined && benefitValueStr.toString().trim() !== '') {
      const benefitValueNum = parseFloat(benefitValueStr.toString().replace(/,/g, ''));
      if (!isNaN(benefitValueNum)) {
        const currentBenefitValue = idea.benefitValue || 0;
        if (benefitValueNum !== currentBenefitValue) {
          payload.benefitValue = benefitValueNum;
          diff.current.benefitValue = currentBenefitValue;
          diff.new.benefitValue = benefitValueNum;
          if (status === ImportRowStatus.OK) {
            status = ImportRowStatus.WARNING;
          }
        }
      }
    }
  }

  // Reward Amount
  if (row[columnMapping['rewardAmount']] !== undefined || row['Tiền thưởng (VND)'] !== undefined || row['Reward Amount'] !== undefined) {
    const rewardAmountStr = row[columnMapping['rewardAmount']] || row['Tiền thưởng (VND)'] || row['Reward Amount'];
    if (rewardAmountStr !== null && rewardAmountStr !== undefined && rewardAmountStr.toString().trim() !== '') {
      const rewardAmountNum = parseFloat(rewardAmountStr.toString().replace(/,/g, ''));
      if (!isNaN(rewardAmountNum)) {
        const currentRewardAmount = idea.rewardAmount || 0;
        if (rewardAmountNum !== currentRewardAmount) {
          payload.rewardAmount = rewardAmountNum;
          diff.current.rewardAmount = currentRewardAmount;
          diff.new.rewardAmount = rewardAmountNum;
          if (status === ImportRowStatus.OK) {
            status = ImportRowStatus.WARNING;
          }
        }
      }
    }
  }

  // Reward Approval Date
  if (row[columnMapping['rewardApprovalDate']] !== undefined || row['Ngày duyệt khen thưởng'] !== undefined || row['Reward Approval Date'] !== undefined) {
    const dateValue = row[columnMapping['rewardApprovalDate']] || row['Ngày duyệt khen thưởng'] || row['Reward Approval Date'];
    if (dateValue !== null && dateValue !== undefined && dateValue.toString().trim() !== '') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const currentDate = idea.rewardApprovalDate ? new Date(idea.rewardApprovalDate).getTime() : null;
        const newDate = date.getTime();
        if (currentDate !== newDate) {
          payload.rewardApprovalDate = date;
          diff.current.rewardApprovalDate = idea.rewardApprovalDate || null;
          diff.new.rewardApprovalDate = date;
          if (status === ImportRowStatus.OK) {
            status = ImportRowStatus.WARNING;
          }
        }
      }
    }
  }

  // Implementation Status (Trạng thái triển khai)
  // Kiểm tra cột có tồn tại trong Excel không
  const implStatusCol = columnMapping['implementationStatus'];
  const hasImplStatusCol = implStatusCol && row[implStatusCol] !== undefined;
  const hasImplStatusColVN = row['Trạng thái triển khai'] !== undefined;
  const hasImplStatusColEN = row['Implementation Status'] !== undefined;

  if (hasImplStatusCol || hasImplStatusColVN || hasImplStatusColEN) {
    const statusValue = row[implStatusCol] || row['Trạng thái triển khai'] || row['Implementation Status'];
    // Nếu giá trị là empty/null/undefined trong Excel → xóa data
    if (statusValue === null || statusValue === undefined || statusValue.toString().trim() === '') {
      const currentValue = (idea as any).implementationStatus || '';
      if (currentValue !== '') {
        payload.implementationStatus = '';
        diff.current.implementationStatus = currentValue;
        diff.new.implementationStatus = '';
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    } else {
      const trimmedValue = statusValue.toString().trim();
      const currentValue = (idea as any).implementationStatus || '';
      if (trimmedValue !== currentValue) {
        payload.implementationStatus = trimmedValue;
        diff.current.implementationStatus = currentValue;
        diff.new.implementationStatus = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Expected Completion Date (Hạn dự kiến hoàn thành)
  const expectedDateCol = columnMapping['expectedCompletionDate'];
  const hasExpectedDateCol = expectedDateCol && row[expectedDateCol] !== undefined;
  const hasExpectedDateColVN = row['Hạn dự kiến hoàn thành'] !== undefined;
  const hasExpectedDateColEN = row['Expected Completion Date'] !== undefined;

  if (hasExpectedDateCol || hasExpectedDateColVN || hasExpectedDateColEN) {
    const dateValue = row[expectedDateCol] || row['Hạn dự kiến hoàn thành'] || row['Expected Completion Date'];
    const date = parseExcelDate(dateValue);
    const currentDate = (idea as any).expectedCompletionDate ? new Date((idea as any).expectedCompletionDate).getTime() : null;

    // Nếu giá trị là empty trong Excel → xóa data
    if (dateValue === null || dateValue === undefined || dateValue.toString().trim() === '') {
      if (currentDate !== null) {
        payload.expectedCompletionDate = null;
        diff.current.expectedCompletionDate = (idea as any).expectedCompletionDate || null;
        diff.new.expectedCompletionDate = null;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    } else if (date !== null) {
      const newDate = date.getTime();
      if (currentDate !== newDate) {
        payload.expectedCompletionDate = date;
        diff.current.expectedCompletionDate = (idea as any).expectedCompletionDate || null;
        diff.new.expectedCompletionDate = date;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Net Reserve Status (Trạng thái duy trì mở rộng)
  const netReserveCol = columnMapping['netReserveStatus'];
  const hasNetReserveCol = netReserveCol && row[netReserveCol] !== undefined;
  const hasNetReserveColVN =  row['Trạng thái duy trì/mở rộng'] !== undefined;

  if (hasNetReserveCol || hasNetReserveColVN) {
    const statusValue = row[netReserveCol]  || row['Trạng thái duy trì/mở rộng'];
    // Nếu giá trị là empty/null/undefined trong Excel → xóa data
    if (statusValue === null || statusValue === undefined || statusValue.toString().trim() === '') {
      const currentValue = (idea as any).netReserveStatus || '';
      if (currentValue !== '') {
        payload.netReserveStatus = '';
        diff.current.netReserveStatus = currentValue;
        diff.new.netReserveStatus = '';
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    } else {
      const trimmedValue = statusValue.toString().trim();
      const currentValue = (idea as any).netReserveStatus || '';
      if (trimmedValue !== currentValue) {
        payload.netReserveStatus = trimmedValue;
        diff.current.netReserveStatus = currentValue;
        diff.new.netReserveStatus = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Reason Note (Ghi chú lý do Dừng/Hủy)
  const reasonNoteCol = columnMapping['reasonNote'];
  const hasReasonNoteCol = reasonNoteCol && row[reasonNoteCol] !== undefined;
  const hasReasonNoteColVN = row['Ghi chú lý do (Dừng/Hủy)'] !== undefined;
  const hasReasonNoteColEN = row['Reason Note'] !== undefined;

  if (hasReasonNoteCol || hasReasonNoteColVN || hasReasonNoteColEN) {
    const noteValue = row[reasonNoteCol] || row['Ghi chú lý do (Dừng/Hủy)'] || row['Reason Note'];
    // Nếu giá trị là empty/null/undefined trong Excel → xóa data
    if (noteValue === null || noteValue === undefined || noteValue.toString().trim() === '') {
      const currentValue = (idea as any).reasonNote || '';
      if (currentValue !== '') {
        payload.reasonNote = '';
        diff.current.reasonNote = currentValue;
        diff.new.reasonNote = '';
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    } else {
      const trimmedValue = noteValue.toString().trim();
      const currentValue = (idea as any).reasonNote || '';
      if (trimmedValue !== currentValue) {
        payload.reasonNote = trimmedValue;
        diff.current.reasonNote = currentValue;
        diff.new.reasonNote = trimmedValue;
        if (status === ImportRowStatus.OK) {
          status = ImportRowStatus.WARNING;
        }
      }
    }
  }

  // Chỉ giữ lại các field có thay đổi trong diff (để frontend chỉ hiển thị các cột có thay đổi)
  const finalDiff: { current: Record<string, any>; new: Record<string, any> } = {
    current: {},
    new: {}
  };
  
  Object.keys(diff.new).forEach(field => {
    const currentVal = diff.current[field];
    const newVal = diff.new[field];
    
    // So sánh giá trị (xử lý array, object, date)
    let hasChanged = false;
    
    // Xử lý array đặc biệt (như rewardStatuses) - cần sort trước khi so sánh
    if (Array.isArray(currentVal) && Array.isArray(newVal)) {
      const currentSorted = [...currentVal].sort();
      const newSorted = [...newVal].sort();
      hasChanged = JSON.stringify(currentSorted) !== JSON.stringify(newSorted);
    } else if (currentVal instanceof Date && newVal instanceof Date) {
      hasChanged = currentVal.getTime() !== newVal.getTime();
    } else if (typeof currentVal === 'object' && typeof newVal === 'object' && currentVal !== null && newVal !== null) {
      hasChanged = JSON.stringify(currentVal) !== JSON.stringify(newVal);
    } else {
      // So sánh enum values bằng string để đảm bảo chính xác
      hasChanged = String(currentVal) !== String(newVal);
    }
    
    if (hasChanged) {
      finalDiff.current[field] = currentVal;
      finalDiff.new[field] = newVal;
    }
  });

  return {
    rowIndex,
    ideaCode: ideaCode.toString().trim(),
    payload,
    diff: Object.keys(finalDiff.new).length > 0 ? finalDiff : undefined,
    status,
    messages,
    selected: status === ImportRowStatus.OK
  };
}

// Normalize status string to IdeaStatus enum
function normalizeStatus(statusStr: string): IdeaStatus | null {
  if (!statusStr) return null;
  
  const trimmed = statusStr.trim();
  
  // Nếu đã là enum value hợp lệ, trả về luôn
  if (Object.values(IdeaStatus).includes(trimmed as IdeaStatus)) {
    return trimmed as IdeaStatus;
  }
  
  const normalized = trimmed.toUpperCase();
  const statusMap: Record<string, IdeaStatus> = {
    'ĐỀ NGHỊ MỚI': IdeaStatus.DE_NGHI_MOI,
    'DE NGHI MOI': IdeaStatus.DE_NGHI_MOI,
    'XEM XÉT': IdeaStatus.XEM_XET,
    'XEM XET': IdeaStatus.XEM_XET,
    'CHỜ PHÊ DUYỆT': IdeaStatus.CHO_PHE_DUYET,
    'CHO PHE DUYET': IdeaStatus.CHO_PHE_DUYET,
    'TRIỂN KHAI': IdeaStatus.TRIEN_KHAI,
    'TRIEN KHAI': IdeaStatus.TRIEN_KHAI,
    'KHÔNG PHÙ HỢP': IdeaStatus.KHONG_PHU_HOP,
    'KHONG PHU HOP': IdeaStatus.KHONG_PHU_HOP,
    'LƯU Ý TƯỞNG': IdeaStatus.LUU_Y_TUONG,
    'LUU Y TUONG': IdeaStatus.LUU_Y_TUONG,
    'BÁO CÁO A3': IdeaStatus.BAO_CAO_A3,
    'BAO CAO A3': IdeaStatus.BAO_CAO_A3,
    'KHEN THƯỞNG': IdeaStatus.KHEN_THUONG,
    'KHEN THUONG': IdeaStatus.KHEN_THUONG,
    'HOÀN THÀNH': IdeaStatus.DONE,
    'HOAN THANH': IdeaStatus.DONE,
    'DONE': IdeaStatus.DONE,
    'KHÔNG THÀNH CÔNG': IdeaStatus.REJECTED,
    'KHONG THANH CONG': IdeaStatus.REJECTED,
    'REJECTED': IdeaStatus.REJECTED,
    // Thêm các enum values trực tiếp
    'DE_NGHI_MOI': IdeaStatus.DE_NGHI_MOI,
    'XEM_XET': IdeaStatus.XEM_XET,
    'CHO_PHE_DUYET': IdeaStatus.CHO_PHE_DUYET,
    'TRIEN_KHAI': IdeaStatus.TRIEN_KHAI,
    'KHONG_PHU_HOP': IdeaStatus.KHONG_PHU_HOP,
    'LUU_Y_TUONG': IdeaStatus.LUU_Y_TUONG,
    'BAO_CAO_A3': IdeaStatus.BAO_CAO_A3,
    'KHEN_THUONG': IdeaStatus.KHEN_THUONG
  };
  return statusMap[normalized] || null;
}

// Parse reward statuses từ string
function parseRewardStatuses(value: string): RewardStatus[] {
  const statuses: RewardStatus[] = [];
  const parts = value.split(/[,;|]/).map(s => s.trim());
  
  const statusMap: Record<string, RewardStatus> = {
    'Chờ khen thưởng 50.000đ': RewardStatus.CHO_KHEN_THUONG_50K,
    'CHO_KHEN_THUONG_50K': RewardStatus.CHO_KHEN_THUONG_50K,
    'Đã khen thưởng 50.000đ': RewardStatus.DA_KHEN_THUONG_50K,
    'DA_KHEN_THUONG_50K': RewardStatus.DA_KHEN_THUONG_50K,
    'Chờ khen thưởng 20%': RewardStatus.CHO_KHEN_THUONG_20,
    'CHO_KHEN_THUONG_20': RewardStatus.CHO_KHEN_THUONG_20,
    'Đã khen thưởng 20%': RewardStatus.DA_KHEN_THUONG_20,
    'DA_KHEN_THUONG_20': RewardStatus.DA_KHEN_THUONG_20
  };

  parts.forEach(part => {
    const normalized = part.trim();
    // Nếu đã là enum value hợp lệ, thêm trực tiếp
    if (Object.values(RewardStatus).includes(normalized as RewardStatus)) {
      statuses.push(normalized as RewardStatus);
    } else if (statusMap[normalized]) {
      statuses.push(statusMap[normalized]);
    }
  });

  return statuses;
}

// Kiểm tra xung đột trong reward statuses
function checkRewardConflict(statuses: RewardStatus[]): boolean {
  const hasCho50k = statuses.includes(RewardStatus.CHO_KHEN_THUONG_50K);
  const hasDa50k = statuses.includes(RewardStatus.DA_KHEN_THUONG_50K);
  const hasCho20 = statuses.includes(RewardStatus.CHO_KHEN_THUONG_20);
  const hasDa20 = statuses.includes(RewardStatus.DA_KHEN_THUONG_20);

  return (hasCho50k && hasDa50k) || (hasCho20 && hasDa20);
}

// POST /api/imports/preview
export const previewImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'File Excel không có dữ liệu' });
    }

    // Detect column mapping từ header
    const firstRow = rows[0];
    const columnMapping: Record<string, string> = { ...DEFAULT_COLUMN_MAPPING };
    
    // Auto-detect mapping từ header
    Object.keys(firstRow).forEach(excelCol => {
      const normalized = excelCol.trim();
      if (DEFAULT_COLUMN_MAPPING[normalized]) {
        columnMapping[normalized] = DEFAULT_COLUMN_MAPPING[normalized];
      }
    });

    // Validate và parse từng row
    const importRows: IImportRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const parsedRow = await validateAndParseRow(row, i + 2, columnMapping); // +2 vì Excel bắt đầu từ 1 và có header
      importRows.push(parsedRow);
    }

    // Tính summary
    const summary = {
      total: importRows.length,
      ok: importRows.filter(r => r.status === ImportRowStatus.OK).length,
      warn: importRows.filter(r => r.status === ImportRowStatus.WARNING).length,
      error: importRows.filter(r => r.status === ImportRowStatus.ERROR).length
    };

    // Lưu vào ImportSession
    const importSession = new ImportSession({
      fileName: req.file.originalname,
      uploadedBy: (req as any).user?.id || 'anonymous',
      mappingConfig: columnMapping,
      summary,
      rows: importRows
    });

    await importSession.save();

    res.json({
      importSessionId: importSession._id,
      summary,
      message: 'Parse và validate thành công'
    });
  } catch (error: any) {
    console.error('Import preview error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi xử lý file import' });
  }
};

// GET /api/imports/:id
export const getImportSession = async (req: Request, res: Response) => {
  try {
    const session = await ImportSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Không tìm thấy session import' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Lỗi khi lấy dữ liệu import' });
  }
};

// POST /api/imports/:id/commit
export const commitImport = async (req: Request, res: Response) => {
  try {
    const { selectedRowIndices, mode = 'patch' } = req.body; // mode: 'patch' | 'overwrite'
    
    const session = await ImportSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Không tìm thấy session import' });
    }

    // Lọc các row được chọn và có status OK hoặc WARNING
    const rowsToImport = session.rows.filter((row, index) => 
      selectedRowIndices.includes(index) && 
      (row.status === ImportRowStatus.OK || row.status === ImportRowStatus.WARNING)
    );

    if (rowsToImport.length === 0) {
      return res.status(400).json({ message: 'Không có dòng nào được chọn để import' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Update từng idea
    for (const row of rowsToImport) {
      try {
        const idea = await Idea.findOne({ ideaCode: row.ideaCode });
        if (!idea) {
          errorCount++;
          errors.push(`Dòng ${row.rowIndex}: Không tìm thấy ý tưởng ${row.ideaCode}`);
          continue;
        }

        const updateData: any = {};
        
        if (mode === 'patch') {
          // Update tất cả các field có trong payload (bao gồm cả empty string để xóa data)
          // Chỉ bỏ qua nếu key không có trong payload
          Object.keys(row.payload).forEach(key => {
            if (row.payload.hasOwnProperty(key)) {
              updateData[key] = row.payload[key];
            }
          });
        } else {
          // Overwrite: update tất cả field trong payload
          Object.assign(updateData, row.payload);
        }

        // Xử lý rewardStatuses đặc biệt (merge hoặc replace)
        if (updateData.rewardStatuses) {
          if (req.body.rewardStatusesMode === 'merge') {
            const current = (idea.rewardStatuses || []) as RewardStatus[];
            const newStatuses = updateData.rewardStatuses as RewardStatus[];
            const merged = [...new Set([...current, ...newStatuses])];
            updateData.rewardStatuses = merged;
          }
          // Nếu không phải merge thì replace (mặc định)
        }

        await Idea.findByIdAndUpdate(idea._id, updateData);
        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`Dòng ${row.rowIndex}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      summary: {
        total: rowsToImport.length,
        success: successCount,
        error: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Lỗi khi commit import' });
  }
};

// GET /api/imports/:id/export-errors
export const exportErrors = async (req: Request, res: Response) => {
  try {
    const session = await ImportSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Không tìm thấy session import' });
    }

    const errorRows = session.rows.filter(r => r.status === ImportRowStatus.ERROR);
    
    // Tạo Excel với các dòng lỗi
    const wsData = errorRows.map(row => ({
      'Dòng': row.rowIndex,
      'Mã ý tưởng': row.ideaCode,
      'Lỗi': row.messages.join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lỗi');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="import_errors_${session._id}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Lỗi khi export lỗi' });
  }
};

