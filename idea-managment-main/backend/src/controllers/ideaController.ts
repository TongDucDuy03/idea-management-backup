import { Request, Response } from 'express';
import Idea, { IIdea, IdeaStatus, RewardCalculationMethod } from '../models/Idea';
import { sendIdeaSubmittedEmail } from '../services/emailService';
import {
  isBase64DataUrl,
  saveBase64ToFile,
} from '../services/imageStorageService';

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
      afterImage
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
      beforeImage: beforeImagePath ? undefined : (beforeImage || undefined),
      afterImage: afterImagePath ? undefined : (afterImage || undefined),
      beforeImagePath: beforeImagePath || undefined,
      afterImagePath: afterImagePath || undefined,
    });

    const savedIdea = await newIdea.save();

    // Fire-and-forget email (do not block response)
    sendIdeaSubmittedEmail(savedIdea as IIdea).catch((err) => {
      console.error('Failed to send idea notification email:', err);
    });

    res.status(201).json(savedIdea);
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
    res.json(ideas);
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
        updateData.beforeImage = undefined; // không lưu base64
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
        updateData.afterImage = undefined;
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
    
    res.json(idea);
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