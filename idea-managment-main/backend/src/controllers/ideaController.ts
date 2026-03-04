import { Request, Response } from 'express';
import Idea, { IIdea, IdeaStatus, RewardCalculationMethod } from '../models/Idea';
import { sendIdeaSubmittedEmail } from '../services/emailService';
import {
  isBase64DataUrl,
  saveBase64ToFile,
} from '../services/imageStorageService';

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
    
    // Generate idea code (without name prefix)
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 1000);
    const ideaCode = `${timestamp}-${randomNum}`;

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
      // Giữ lại base64 trong beforeImage/afterImage để admin-view & admin luôn xem được
      beforeImage: beforeImage || undefined,
      afterImage: afterImage || undefined,
      // Đồng thời lưu đường dẫn file để Make/API realtime dùng
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
    res.status(500).json({ message: 'Error creating idea', error });
  }
};

export const getAllIdeas = async (req: Request, res: Response) => {
  try {
    const { search, isPaid, rewardCalculationMethod } = req.query;
    let query: any = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { ideaCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (isPaid !== undefined) {
      query.isPaid = isPaid === 'true';
    }

    if (rewardCalculationMethod) {
      // Validate enum value
      if (Object.values(RewardCalculationMethod).includes(rewardCalculationMethod as RewardCalculationMethod)) {
        query.rewardCalculationMethod = rewardCalculationMethod;
      }
    }

    const ideas = await Idea.find(query).sort({ submissionDate: -1 });
    
    // Build base URL cho image URLs
    const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
    
    // Transform mỗi idea để có beforeImageUrl/afterImageUrl
    const transformedIdeas = ideas.map(idea => transformIdeaWithImageUrls(idea, assetBaseUrl));
    
    res.json(transformedIdeas);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ideas', error });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPaid } = req.body;

    const updatedIdea = await Idea.findByIdAndUpdate(
      id,
      { isPaid },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    res.json(updatedIdea);
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status', error });
  }
};

export const updateIdea = async (req: Request, res: Response) => {
  try {
    console.log('Updating idea:', {
      id: req.params.id,
      beforeImage: req.body.beforeImage ? 'Present' : 'Missing',
      afterImage: req.body.afterImage ? 'Present' : 'Missing',
      rewardApprovalDate: req.body.rewardApprovalDate ? 'Present' : 'Missing',
      bodyKeys: Object.keys(req.body)
    });

    const existing = await Idea.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }

    const updateData: any = { ...req.body };

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

    // beforeImage: clear, or base64 -> save file and set path
    if (updateData.beforeImage === null || updateData.beforeImage === '') {
      updateData.beforeImage = null;
      updateData.beforeImagePath = null;
    } else if (isBase64DataUrl(updateData.beforeImage)) {
      try {
        updateData.beforeImagePath = await saveBase64ToFile(
          updateData.beforeImage,
          existing.ideaCode,
          'before'
        );
        // KHÔNG xóa base64: giữ lại để admin/admin-view luôn xem được
      } catch (e) {
        console.error('Failed to save beforeImage on update:', e);
      }
    }

    if (updateData.afterImage === null || updateData.afterImage === '') {
      updateData.afterImage = null;
      updateData.afterImagePath = null;
    } else if (isBase64DataUrl(updateData.afterImage)) {
      try {
        updateData.afterImagePath = await saveBase64ToFile(
          updateData.afterImage,
          existing.ideaCode,
          'after'
        );
        // KHÔNG xóa base64: giữ lại để admin/admin-view luôn xem được
      } catch (e) {
        console.error('Failed to save afterImage on update:', e);
      }
    }

    const idea = await Idea.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }
    
    console.log('Updated idea:', {
      id: idea._id,
      beforeImage: (idea as any).beforeImage ? 'Present' : 'Missing',
      afterImage: (idea as any).afterImage ? 'Present' : 'Missing',
      rewardApprovalDate: (idea as any).rewardApprovalDate ? 'Present' : 'Missing'
    });
    
    // Transform response với image URLs
    const requestBaseUrl = `${req.protocol}://${req.get('host') || req.get('x-forwarded-host') || 'localhost:' + (process.env.PORT || 5000)}`;
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL || requestBaseUrl;
    const transformed = transformIdeaWithImageUrls(idea, assetBaseUrl);
    
    res.json(transformed);
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
};

export const deleteIdea = async (req: Request, res: Response) => {
  try {
    const idea = await Idea.findByIdAndDelete(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }
    res.json({ message: 'Đã xóa ý tưởng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
}; 