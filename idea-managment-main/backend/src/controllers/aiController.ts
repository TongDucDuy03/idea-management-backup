import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const AI_ENDPOINT =
  process.env.OPENAI_API_URL || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';

type OpenAIMessage = {
  role: 'system' | 'user';
  content: string;
};

const ensureConfig = () => {
  if (!AI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong biến môi trường');
  }
};

const callAI = async (messages: OpenAIMessage[]) => {
  ensureConfig();

  const response = await axios.post(
    AI_ENDPOINT,
    {
      model: AI_MODEL,
      temperature: 0.6,
      messages
    },
    {
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim();
};

const buildContext = (idea: string, department?: string, solution?: string) => {
  let context = `Đây là một ý tưởng cải tiến tại doanh nghiệp sản xuất. Mô tả: ${idea}.`;
  if (department) {
    context += ` Đơn vị thực hiện: ${department}.`;
  }
  if (solution) {
    context += ` Giải pháp dự kiến: ${solution}.`;
  }
  return context;
};

export const improveDescription = async (req: Request, res: Response) => {
  const { idea, department } = req.body;

  if (!idea?.trim()) {
    return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
  }

  try {
    const result = await callAI([
      {
        role: 'system',
        content:
          'Bạn là trợ lý chuyên giúp nhân viên cải tiến diễn đạt ý tưởng rõ ràng, súc tích và có cấu trúc (Vấn đề - Hiện trạng - Giải pháp đề xuất).'
      },
      {
        role: 'user',
        content: `${buildContext(idea, department)} Hãy viết lại mô tả này rõ ràng, dễ hiểu, tối đa 200 từ, giữ nguyên ngôn ngữ gốc.`
      }
    ]);

    if (!result) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    res.json({ improvedIdea: result });
  } catch (error: any) {
    console.error('AI improveDescription error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể cải thiện mô tả. Vui lòng thử lại sau.' });
  }
};

export const suggestSolution = async (req: Request, res: Response) => {
  const { idea, department } = req.body;

  if (!idea?.trim()) {
    return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
  }

  try {
    const result = await callAI([
      {
        role: 'system',
        content:
          'Bạn là chuyên gia cải tiến Kaizen. Hãy đề xuất giải pháp khả thi, có các bước cụ thể, nguồn lực cần thiết và tiêu chí đánh giá thành công.'
      },
      {
        role: 'user',
        content: `${buildContext(
          idea,
          department
        )} Hãy đưa ra 1-2 giải pháp chính, mỗi giải pháp tối đa 120 từ, trình bày dạng gạch đầu dòng.`
      }
    ]);

    if (!result) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    res.json({ solution: result });
  } catch (error: any) {
    console.error('AI suggestSolution error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể đề xuất giải pháp. Vui lòng thử lại sau.' });
  }
};

export const suggestBenefit = async (req: Request, res: Response) => {
  const { idea, solution, department } = req.body;

  if (!idea?.trim()) {
    return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
  }

  try {
    const result = await callAI([
      {
        role: 'system',
        content:
          'Bạn là chuyên gia đánh giá hiệu quả cải tiến. Hãy phân nhóm lợi ích theo các tiêu chí: Năng suất, Chất lượng, Chi phí, An toàn, Tinh thần.'
      },
      {
        role: 'user',
        content: `${buildContext(
          idea,
          department,
          solution
        )} Hãy mô tả các lợi ích định lượng (nếu có) và định tính, tối đa 150 từ, trình bày dạng danh sách rõ ràng.`
      }
    ]);

    if (!result) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    res.json({ benefit: result });
  } catch (error: any) {
    console.error('AI suggestBenefit error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể đề xuất lợi ích. Vui lòng thử lại sau.' });
  }
};

export const suggestTopicTitle = async (req: Request, res: Response) => {
  const { idea, department } = req.body;

  if (!idea?.trim()) {
    return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
  }

  try {
    const result = await callAI([
      {
        role: 'system',
        content:
          'Bạn là chuyên gia đặt tên đề tài súc tích. Tiêu đề cần nêu vấn đề + giải pháp chính + mục tiêu lợi ích, tối đa 15 từ.'
      },
      {
        role: 'user',
        content: `${buildContext(
          idea,
          department
        )} Hãy đề xuất 3 tiêu đề sáng tạo, đánh số 1,2,3 để người dùng dễ chọn.`
      }
    ]);

    if (!result) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    res.json({ topicTitle: result });
  } catch (error: any) {
    console.error('AI suggestTopicTitle error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể đề xuất tên đề tài. Vui lòng thử lại sau.' });
  }
};


