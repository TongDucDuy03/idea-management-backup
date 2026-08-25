import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import Idea, { IIdea, IdeaStatus, RewardCalculationMethod } from '../models/Idea';
import { sendIdeaSubmittedEmail } from '../services/emailService';
import { resolveUploadDir } from '../utils/uploadDir';
import {
  isBase64DataUrl,
  saveBase64ToFile,
} from '../services/imageStorageService';

/**
 * Các trường client được phép ghi khi cập nhật ý tưởng.
 *
 * Trước đây code dùng `{ ...req.body }` nên client gửi field nào cũng ghi được
 * vào document (mass assignment) — kể cả các field nội bộ.
 */
const UPDATABLE_IDEA_FIELDS = [
  'fullName',
  'department',
  'idea',
  'solution',
  'benefit',
  'status',
  'implementationDepartment',
  'implementationDirection',
  'note',
  'benefitValue',
  'rewardAmount',
  'rewardApprovalDate',
  'rewardStatuses',
  'rewardCalculationMethod',
  'benefitOutcome',
  'resourcesUsed',
  'calculationDescription',
  'scalingOpportunity',
  'beforeImage',
  'afterImage',
  'implementationStatus',
  'expectedCompletionDate',
  'netReserveStatus',
  'reasonNote',
  'isPaid',
] as const;

function pickUpdatableFields(body: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of UPDATABLE_IDEA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  }
  return result;
}

/**
 * Escape ký tự đặc biệt của regex.
 *
 * Không có bước này, người dùng gõ "(" vào ô tìm kiếm sẽ làm server trả 500,
 * còn chuỗi kiểu "(a+)+$" gây ReDoS treo tiến trình.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sinh mã ý tưởng không đoán được.
 *
 * Bản cũ dùng `${Date.now()}-${random 0..999}`: không gian tìm kiếm nhỏ nên có
 * thể dò ra mã của người khác, trong khi GET /ideas/code/:ideaCode là công khai.
 */
function generateIdeaCode(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${datePart}-${randomPart}`;
}

function buildImageUrl(rawPath: string | undefined, baseUrl: string): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  // Nếu DB đã lưu full URL: chuẩn hóa http:// thành https://
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }

  const base = (baseUrl || '').replace(/\/$/, '');
  if (!base) return null;

  const pathPart = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${pathPart}`;
}

function transformIdeaWithImageUrls(idea: any, baseUrl: string): any {
  const result = { ...idea.toObject ? idea.toObject() : idea };

  // Ưu tiên: beforeImageUrl/afterImageUrl (nếu có), sau đó build từ path, cuối cùng fallback về base64 cũ
  result.beforeImageUrl = result.beforeImageUrl ||
    buildImageUrl(result.beforeImagePath, baseUrl) ||
    (result.beforeImage && !isBase64DataUrl(result.beforeImage) ? result.beforeImage : null);

  result.afterImageUrl = result.afterImageUrl ||
    buildImageUrl(result.afterImagePath, baseUrl) ||
    (result.afterImage && !isBase64DataUrl(result.afterImage) ? result.afterImage : null);

  // Giữ lại beforeImage/afterImage nếu là base64 (cho backward compat)
  if (!result.beforeImageUrl && isBase64DataUrl(result.beforeImage)) {
    result.beforeImageUrl = result.beforeImage;
  }
  if (!result.afterImageUrl && isBase64DataUrl(result.afterImage)) {
    result.afterImageUrl = result.afterImage;
  }

  return result;
}

export const createIdea = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      department,
      idea,
      solution,
      benefit,
      status,
      implementationDepartment,
      note,
      benefitValue,
      rewardAmount,
      rewardApprovalDate,
      beforeImage,
      afterImage,
      implementationStatus,
      expectedCompletionDate,
      netReserveStatus,
      reasonNote
    } = req.body;

    // Mã ý tưởng ngẫu nhiên bằng crypto, không đoán được
    const ideaCode = generateIdeaCode();

    // Validate và set status mặc định
    const ideaStatus = status && Object.values(IdeaStatus).includes(status)
      ? status
      : IdeaStatus.DE_NGHI_MOI;

    let beforeImagePath: string | undefined;
    let afterImagePath: string | undefined;
    if (isBase64DataUrl(beforeImage)) {
      try {
        beforeImagePath = await saveBase64ToFile(beforeImage, ideaCode, 'before');
      } catch (e) {
        console.error('Failed to save beforeImage:', e);
      }
    }
    if (isBase64DataUrl(afterImage)) {
      try {
        afterImagePath = await saveBase64ToFile(afterImage, ideaCode, 'after');
      } catch (e) {
        console.error('Failed to save afterImage:', e);
      }
    }

    const newIdea = new Idea({
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
      // Không lưu trữ chuỗi base64 nhiều MB vào DB (chỉ lưu URL nếu là link ngoài)
      beforeImage: isBase64DataUrl(beforeImage) ? undefined : (beforeImage || undefined),
      afterImage: isBase64DataUrl(afterImage) ? undefined : (afterImage || undefined),
      // Lưu đường dẫn file trên server
      beforeImagePath: beforeImagePath || undefined,
      afterImagePath: afterImagePath || undefined,
    });

    const savedIdea = await newIdea.save();

    // Fire-and-forget email (do not block response)
    sendIdeaSubmittedEmail(savedIdea as IIdea).catch((err) => {
      console.error('Failed to send idea notification email:', err);
    });

    // Transform response với image URLs
    const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
    const transformed = transformIdeaWithImageUrls(savedIdea, assetBaseUrl);

    res.status(201).json(transformed);
  } catch (error) {
    console.error('[IDEA] Error creating idea:', error);
    res.status(500).json({ message: 'Không thể tạo ý tưởng' });
  }
};

/**
 * Số liệu tổng hợp cho trang chủ.
 *
 * Trang chủ trước đây tải TOÀN BỘ danh sách ý tưởng (kèm ảnh base64) chỉ để
 * đếm 3 con số. Endpoint này gộp việc đếm về phía database.
 */
export const getIdeaStats = async (_req: Request, res: Response) => {
  try {
    const APPROVED_STATUSES = [
      IdeaStatus.TRIEN_KHAI,
      IdeaStatus.BAO_CAO_A3,
      IdeaStatus.KHEN_THUONG,
      IdeaStatus.DONE,
    ];
    const REWARDED_STATUSES = [IdeaStatus.KHEN_THUONG, IdeaStatus.DONE];

    const [total, approved, rewarded] = await Promise.all([
      Idea.countDocuments({}),
      Idea.countDocuments({ status: { $in: APPROVED_STATUSES } }),
      Idea.countDocuments({ status: { $in: REWARDED_STATUSES } }),
    ]);

    res.json({ total, approved, rewarded });
  } catch (error) {
    console.error('[IDEA] Error fetching stats:', error);
    res.status(500).json({ message: 'Không thể tải số liệu thống kê' });
  }
};

export const getAllIdeas = async (req: Request, res: Response) => {
  try {
    const {
      search,
      isPaid,
      rewardCalculationMethod,
      status,
      department,
      implementationDepartment,
      rewardStatuses,
      implementationStatus,
      dateFrom,
      dateTo,
      rewardDateFrom,
      rewardDateTo,
      page,
      limit,
      sortBy = 'submissionDate',
      sortOrder = 'desc',
      all,
    } = req.query;

    const query: any = {};

    // 1. Tìm kiếm văn bản (họ tên, mã ý tưởng, nội dung ý tưởng)
    if (typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegExp(search.trim().slice(0, 100));
      query.$or = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { ideaCode: { $regex: safeSearch, $options: 'i' } },
        { idea: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    // 2. Lọc trạng thái thanh toán
    if (isPaid !== undefined) {
      query.isPaid = isPaid === 'true';
    }

    // 3. Lọc trạng thái ý tưởng (hỗ trợ single hoặc danh sách phân tách bằng dấu phẩy)
    if (status) {
      const statusArr = (Array.isArray(status) ? status : String(status).split(','))
        .map(s => String(s).trim())
        .filter(Boolean);
      if (statusArr.length > 0) {
        query.status = statusArr.length === 1 ? statusArr[0] : { $in: statusArr };
      }
    }

    // 4. Lọc phòng ban đề xuất
    if (department) {
      const deptArr = (Array.isArray(department) ? department : String(department).split(','))
        .map(d => String(d).trim())
        .filter(Boolean);
      if (deptArr.length > 0) {
        query.department = deptArr.length === 1 ? deptArr[0] : { $in: deptArr };
      }
    }

    // 5. Lọc phòng ban triển khai
    if (implementationDepartment) {
      const implDeptArr = (Array.isArray(implementationDepartment) ? implementationDepartment : String(implementationDepartment).split(','))
        .map(d => String(d).trim())
        .filter(Boolean);
      if (implDeptArr.length > 0) {
        query.implementationDepartment = implDeptArr.length === 1 ? implDeptArr[0] : { $in: implDeptArr };
      }
    }

    // 6. Lọc tình trạng khen thưởng
    if (rewardStatuses) {
      const rewardArr = (Array.isArray(rewardStatuses) ? rewardStatuses : String(rewardStatuses).split(','))
        .map(r => String(r).trim())
        .filter(Boolean);
      if (rewardArr.length > 0) {
        query.rewardStatuses = { $in: rewardArr };
      }
    }

    // 7. Lọc phương thức tính thưởng
    if (rewardCalculationMethod && Object.values(RewardCalculationMethod).includes(rewardCalculationMethod as RewardCalculationMethod)) {
      query.rewardCalculationMethod = rewardCalculationMethod;
    }

    // 8. Lọc trạng thái triển khai
    if (implementationStatus && typeof implementationStatus === 'string' && implementationStatus.trim()) {
      query.implementationStatus = implementationStatus.trim();
    }

    // 9. Lọc khoảng ngày nộp
    if (dateFrom || dateTo) {
      query.submissionDate = {};
      if (dateFrom) query.submissionDate.$gte = new Date(String(dateFrom));
      if (dateTo) {
        const toD = new Date(String(dateTo));
        toD.setHours(23, 59, 59, 999);
        query.submissionDate.$lte = toD;
      }
    }

    // 10. Lọc khoảng ngày duyệt khen thưởng
    if (rewardDateFrom || rewardDateTo) {
      query.rewardApprovalDate = {};
      if (rewardDateFrom) query.rewardApprovalDate.$gte = new Date(String(rewardDateFrom));
      if (rewardDateTo) {
        const toR = new Date(String(rewardDateTo));
        toR.setHours(23, 59, 59, 999);
        query.rewardApprovalDate.$lte = toR;
      }
    }

    // Sắp xếp
    const sortField = typeof sortBy === 'string' && ['submissionDate', 'rewardApprovalDate', 'benefitValue', 'rewardAmount', 'createdAt'].includes(sortBy)
      ? sortBy
      : 'submissionDate';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortField]: sortDirection };

    const total = await Idea.countDocuments(query);

    let queryBuilder = Idea.find(query).sort(sortOptions);

    // Phân trang
    const isExportOrAll = all === 'true' || limit === '0' || limit === 'all';
    let pageNum = Math.max(1, parseInt(String(page || 1), 10) || 1);
    let limitNum = Math.min(1000, Math.max(1, parseInt(String(limit || 50), 10) || 50));

    if (!isExportOrAll && (page !== undefined || limit !== undefined)) {
      queryBuilder = queryBuilder.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const ideas = await queryBuilder.lean();

    // Build base URL cho image URLs
    const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;

    const transformedIdeas = ideas.map(idea => transformIdeaWithImageUrls(idea, assetBaseUrl));

    // Nếu request yêu cầu phân trang rõ ràng
    if (page !== undefined || limit !== undefined) {
      return res.json({
        ideas: transformedIdeas,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    }

    return res.json(transformedIdeas);
  } catch (error) {
    console.error('[IDEA] Error fetching ideas:', error);
    res.status(500).json({ message: 'Không thể tải danh sách ý tưởng' });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPaid } = req.body;

    if (typeof isPaid !== 'boolean') {
      return res.status(400).json({ message: 'Trường isPaid phải là kiểu boolean (true/false)' });
    }

    const updatedIdea = await Idea.findByIdAndUpdate(
      id,
      { isPaid },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }

    res.json(updatedIdea);
  } catch (error) {
    console.error('[IDEA] Error updating payment status:', error);
    res.status(500).json({ message: 'Không thể cập nhật trạng thái thanh toán' });
  }
};

export const updateIdea = async (req: Request, res: Response) => {
  try {
    const existing = await Idea.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }

    // Helper xóa file ảnh trên server
    const uploadDir = resolveUploadDir();
    const deleteFileIfLocal = async (imagePath?: string) => {
      if (!imagePath || !imagePath.startsWith('/uploads/')) return;
      const fileName = path.basename(imagePath);
      const fullPath = path.join(uploadDir, fileName);
      try {
        await fs.unlink(fullPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('[IDEA] Failed to delete old image file:', fullPath, err);
        }
      }
    };

    // Chỉ nhận các trường nằm trong whitelist (chống mass assignment)
    const updateData: any = pickUpdatableFields(req.body || {});

    // Convert rewardApprovalDate to Date if it's a string
    if (updateData.rewardApprovalDate) {
      updateData.rewardApprovalDate = new Date(updateData.rewardApprovalDate);
    } else if (updateData.rewardApprovalDate === null || updateData.rewardApprovalDate === '') {
      updateData.rewardApprovalDate = null;
    }

    // Convert expectedCompletionDate to Date if it's a string
    if (updateData.expectedCompletionDate) {
      updateData.expectedCompletionDate = new Date(updateData.expectedCompletionDate);
    } else if (updateData.expectedCompletionDate === null || updateData.expectedCompletionDate === '') {
      updateData.expectedCompletionDate = null;
    }

    const unsetFields: Record<string, 1> = {};

    // Xử lý beforeImage & beforeImagePath
    if (updateData.beforeImage === null || updateData.beforeImage === '') {
      if (existing.beforeImagePath) {
        await deleteFileIfLocal(existing.beforeImagePath);
      }
      delete updateData.beforeImage;
      delete updateData.beforeImagePath;
      unsetFields.beforeImage = 1;
      unsetFields.beforeImagePath = 1;
    } else if (isBase64DataUrl(updateData.beforeImage)) {
      try {
        const newPath = await saveBase64ToFile(
          updateData.beforeImage,
          existing.ideaCode,
          'before'
        );
        if (existing.beforeImagePath && existing.beforeImagePath !== newPath) {
          await deleteFileIfLocal(existing.beforeImagePath);
        }
        updateData.beforeImagePath = newPath;
        delete updateData.beforeImage;
        unsetFields.beforeImage = 1;
      } catch (e) {
        console.error('Failed to save beforeImage on update:', e);
      }
    } else if (existing.beforeImage) {
      unsetFields.beforeImage = 1;
    }

    // Xử lý afterImage & afterImagePath
    if (updateData.afterImage === null || updateData.afterImage === '') {
      if (existing.afterImagePath) {
        await deleteFileIfLocal(existing.afterImagePath);
      }
      delete updateData.afterImage;
      delete updateData.afterImagePath;
      unsetFields.afterImage = 1;
      unsetFields.afterImagePath = 1;
    } else if (isBase64DataUrl(updateData.afterImage)) {
      try {
        const newPath = await saveBase64ToFile(
          updateData.afterImage,
          existing.ideaCode,
          'after'
        );
        if (existing.afterImagePath && existing.afterImagePath !== newPath) {
          await deleteFileIfLocal(existing.afterImagePath);
        }
        updateData.afterImagePath = newPath;
        delete updateData.afterImage;
        unsetFields.afterImage = 1;
      } catch (e) {
        console.error('Failed to save afterImage on update:', e);
      }
    } else if (existing.afterImage) {
      unsetFields.afterImage = 1;
    }

    const updateQuery: any = { ...updateData };
    if (Object.keys(unsetFields).length > 0) {
      updateQuery.$unset = unsetFields;
    }

    const idea = await Idea.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true }
    );
    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }

    // Transform response với image URLs
    const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
    const transformed = transformIdeaWithImageUrls(idea, assetBaseUrl);

    res.json(transformed);
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const deleteIdea = async (req: Request, res: Response) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }

    // Xóa file ảnh đính kèm trên ổ đĩa nếu có
    const uploadDir = resolveUploadDir();
    const deleteFileIfLocal = async (imagePath?: string) => {
      if (!imagePath || !imagePath.startsWith('/uploads/')) return;
      const fileName = path.basename(imagePath);
      const fullPath = path.join(uploadDir, fileName);
      try {
        await fs.unlink(fullPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('[IDEA] Failed to delete image file:', fullPath, err);
        }
      }
    };

    await Promise.all([
      deleteFileIfLocal(idea.beforeImagePath),
      deleteFileIfLocal(idea.afterImagePath),
    ]);

    await Idea.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa ý tưởng thành công' });
  } catch (error) {
    console.error('[IDEA] Error deleting idea:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}; 