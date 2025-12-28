import { Request, Response } from 'express';
import Idea, { IIdea, IdeaStatus } from '../models/Idea';
import { sendIdeaSubmittedEmail } from '../services/emailService';

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
      beforeImage: beforeImage || undefined,
      afterImage: afterImage || undefined
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
    const { search, isPaid } = req.query;
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

    // Prepare update data
    const updateData: any = { ...req.body };
    
    // Convert rewardApprovalDate to Date if it's a string
    if (updateData.rewardApprovalDate) {
      updateData.rewardApprovalDate = new Date(updateData.rewardApprovalDate);
    } else if (updateData.rewardApprovalDate === null || updateData.rewardApprovalDate === '') {
      // Allow clearing the date
      updateData.rewardApprovalDate = null;
    }
    
    // Handle beforeImage - allow null to clear, or keep string value
    if (updateData.beforeImage === null || updateData.beforeImage === '') {
      updateData.beforeImage = null;
    }
    // If it's a string (base64), keep it as is
    
    // Handle afterImage - allow null to clear, or keep string value
    if (updateData.afterImage === null || updateData.afterImage === '') {
      updateData.afterImage = null;
    }
    // If it's a string (base64), keep it as is

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