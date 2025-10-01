import { Request, Response } from 'express';
import A3Report from '../models/A3Report';
import Idea from '../models/Idea';

// Tạo báo cáo A3 mới
export const createA3Report = async (req: Request, res: Response) => {
  try {
    const {
      ideaId,
      ideaCode,
      fullName,
      department,
      topicTitle,
      submissionDate,
      problemDescription,
      currentSituation,
      rootCause,
      targetSituation,
      solution,
      implementationPlan,
      resources,
      timeline,
      responsiblePerson,
      expectedResult,
      actualResult,
      benefit,
      cost,
      risk,
      followUpAction,
      lessonsLearned,
      scalingOpportunity,
      implementationDepartment,
      implementationDate,
      completionDate,
      status,
      note,
      createdBy
    } = req.body;

    // Kiểm tra xem ý tưởng có tồn tại không
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
    }

    // Kiểm tra xem đã có báo cáo A3 cho ý tưởng này chưa
    const existingReport = await A3Report.findOne({ ideaId });
    if (existingReport) {
      return res.status(400).json({ message: 'Đã tồn tại báo cáo A3 cho ý tưởng này' });
    }

    const a3Report = new A3Report({
      ideaId,
      ideaCode,
      fullName,
      department,
      topicTitle,
      submissionDate,
      problemDescription,
      currentSituation,
      rootCause,
      targetSituation,
      solution,
      implementationPlan,
      resources,
      timeline,
      responsiblePerson,
      expectedResult,
      actualResult,
      benefit,
      cost,
      risk,
      followUpAction,
      lessonsLearned,
      scalingOpportunity,
      implementationDepartment,
      implementationDate,
      completionDate,
      status: status || 'draft',
      note,
      createdBy
    });

    await a3Report.save();
    res.status(201).json(a3Report);
  } catch (error: any) {
    console.error('Error creating A3 report:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo báo cáo A3' });
  }
};

// Lấy tất cả báo cáo A3
export const getAllA3Reports = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, ideaCode, department } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    if (ideaCode) filter.ideaCode = { $regex: ideaCode, $options: 'i' };
    if (department) filter.department = { $regex: department, $options: 'i' };

    const a3Reports = await A3Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await A3Report.countDocuments(filter);

    res.json({
      a3Reports,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error: any) {
    console.error('Error getting A3 reports:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách báo cáo A3' });
  }
};

// Lấy báo cáo A3 theo ID
export const getA3ReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const a3Report = await A3Report.findById(id);
    
    if (!a3Report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo A3' });
    }

    res.json(a3Report);
  } catch (error: any) {
    console.error('Error getting A3 report:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy báo cáo A3' });
  }
};

// Lấy báo cáo A3 theo ideaId
export const getA3ReportByIdeaId = async (req: Request, res: Response) => {
  try {
    const { ideaId } = req.params;
    const a3Report = await A3Report.findOne({ ideaId });
    
    if (!a3Report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo A3 cho ý tưởng này' });
    }

    res.json(a3Report);
  } catch (error: any) {
    console.error('Error getting A3 report by idea ID:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy báo cáo A3' });
  }
};

// Cập nhật báo cáo A3
export const updateA3Report = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const a3Report = await A3Report.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!a3Report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo A3' });
    }

    res.json(a3Report);
  } catch (error: any) {
    console.error('Error updating A3 report:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật báo cáo A3' });
  }
};

// Xóa báo cáo A3
export const deleteA3Report = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const a3Report = await A3Report.findByIdAndDelete(id);

    if (!a3Report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo A3' });
    }

    res.json({ message: 'Xóa báo cáo A3 thành công' });
  } catch (error: any) {
    console.error('Error deleting A3 report:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa báo cáo A3' });
  }
};

// Lấy báo cáo A3 theo ideaCode
export const getA3ReportByIdeaCode = async (req: Request, res: Response) => {
  try {
    const { ideaCode } = req.params;
    const a3Report = await A3Report.findOne({ ideaCode });
    
    if (!a3Report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo A3 với mã ý tưởng này' });
    }

    res.json(a3Report);
  } catch (error: any) {
    console.error('Error getting A3 report by idea code:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy báo cáo A3' });
  }
};
