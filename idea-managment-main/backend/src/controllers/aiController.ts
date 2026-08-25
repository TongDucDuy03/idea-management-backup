import { Request, Response } from 'express';
import axios from 'axios';

type OpenAIMessage = {
  role: 'system' | 'user';
  content: string;
};

/**
 * Cấu hình nhà cung cấp LLM.
 *
 * Đọc lazy (trong hàm) để không phụ thuộc thứ tự import, và ưu tiên
 * OPENROUTER_API_KEY — đây là key đang có trong .env. Trước đây code chỉ đọc
 * OPENAI_API_KEY nên tính năng trợ lý AI luôn báo lỗi.
 */
const getAIConfig = () => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const apiKey = openRouterKey || openAIKey;

  if (!apiKey) {
    throw new Error(
      'Thiếu OPENROUTER_API_KEY (hoặc OPENAI_API_KEY) trong biến môi trường'
    );
  }

  // Nếu dùng OpenRouter thì endpoint và model mặc định phải khớp nhà cung cấp đó
  const usingOpenRouter = !!openRouterKey && !openAIKey;

  const endpoint =
    process.env.AI_API_URL ||
    process.env.OPENAI_API_URL ||
    (usingOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions');

  const model =
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    (usingOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');

  return { apiKey, endpoint, model, usingOpenRouter };
};

const callAI = async (messages: OpenAIMessage[]) => {
  const { apiKey, endpoint, model, usingOpenRouter } = getAIConfig();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // OpenRouter khuyến nghị gửi kèm 2 header này để nhận diện ứng dụng
  if (usingOpenRouter) {
    headers['HTTP-Referer'] = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    headers['X-Title'] = 'Idea Management';
  }

  const response = await axios.post(
    endpoint,
    {
      model,
      temperature: 0.6,
      messages,
    },
    { headers, timeout: 30000 }
  );

  return response.data?.choices?.[0]?.message?.content?.trim();
};

/** Giới hạn độ dài input để không gửi cả một quyển sách sang LLM. */
const MAX_INPUT_LENGTH = 4000;

const readIdeaInput = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_INPUT_LENGTH);
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
  const idea = readIdeaInput(req.body?.idea);
  const department = readIdeaInput(req.body?.department) || undefined;

  if (!idea) {
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
  const idea = readIdeaInput(req.body?.idea);
  const department = readIdeaInput(req.body?.department) || undefined;

  if (!idea) {
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
  const idea = readIdeaInput(req.body?.idea);
  const solution = readIdeaInput(req.body?.solution) || undefined;
  const department = readIdeaInput(req.body?.department) || undefined;

  if (!idea) {
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
  const idea = readIdeaInput(req.body?.idea);
  const department = readIdeaInput(req.body?.department) || undefined;

  if (!idea) {
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


