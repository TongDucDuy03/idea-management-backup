"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestTopicTitle = exports.suggestBenefit = exports.suggestSolution = exports.improveDescription = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const AI_ENDPOINT = process.env.OPENAI_API_URL || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const ensureConfig = () => {
    if (!AI_API_KEY) {
        throw new Error('Thiếu OPENAI_API_KEY trong biến môi trường');
    }
};
const callAI = (messages) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    ensureConfig();
    const response = yield axios_1.default.post(AI_ENDPOINT, {
        model: AI_MODEL,
        temperature: 0.6,
        messages
    }, {
        headers: {
            Authorization: `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    return (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim();
});
const buildContext = (idea, department, solution) => {
    let context = `Đây là một ý tưởng cải tiến tại doanh nghiệp sản xuất. Mô tả: ${idea}.`;
    if (department) {
        context += ` Đơn vị thực hiện: ${department}.`;
    }
    if (solution) {
        context += ` Giải pháp dự kiến: ${solution}.`;
    }
    return context;
};
const improveDescription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { idea, department } = req.body;
    if (!(idea === null || idea === void 0 ? void 0 : idea.trim())) {
        return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
    }
    try {
        const result = yield callAI([
            {
                role: 'system',
                content: 'Bạn là trợ lý chuyên giúp nhân viên cải tiến diễn đạt ý tưởng rõ ràng, súc tích và có cấu trúc (Vấn đề - Hiện trạng - Giải pháp đề xuất).'
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
    }
    catch (error) {
        console.error('AI improveDescription error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ message: 'Không thể cải thiện mô tả. Vui lòng thử lại sau.' });
    }
});
exports.improveDescription = improveDescription;
const suggestSolution = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { idea, department } = req.body;
    if (!(idea === null || idea === void 0 ? void 0 : idea.trim())) {
        return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
    }
    try {
        const result = yield callAI([
            {
                role: 'system',
                content: 'Bạn là chuyên gia cải tiến Kaizen. Hãy đề xuất giải pháp khả thi, có các bước cụ thể, nguồn lực cần thiết và tiêu chí đánh giá thành công.'
            },
            {
                role: 'user',
                content: `${buildContext(idea, department)} Hãy đưa ra 1-2 giải pháp chính, mỗi giải pháp tối đa 120 từ, trình bày dạng gạch đầu dòng.`
            }
        ]);
        if (!result) {
            throw new Error('Không nhận được phản hồi từ AI');
        }
        res.json({ solution: result });
    }
    catch (error) {
        console.error('AI suggestSolution error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ message: 'Không thể đề xuất giải pháp. Vui lòng thử lại sau.' });
    }
});
exports.suggestSolution = suggestSolution;
const suggestBenefit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { idea, solution, department } = req.body;
    if (!(idea === null || idea === void 0 ? void 0 : idea.trim())) {
        return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
    }
    try {
        const result = yield callAI([
            {
                role: 'system',
                content: 'Bạn là chuyên gia đánh giá hiệu quả cải tiến. Hãy phân nhóm lợi ích theo các tiêu chí: Năng suất, Chất lượng, Chi phí, An toàn, Tinh thần.'
            },
            {
                role: 'user',
                content: `${buildContext(idea, department, solution)} Hãy mô tả các lợi ích định lượng (nếu có) và định tính, tối đa 150 từ, trình bày dạng danh sách rõ ràng.`
            }
        ]);
        if (!result) {
            throw new Error('Không nhận được phản hồi từ AI');
        }
        res.json({ benefit: result });
    }
    catch (error) {
        console.error('AI suggestBenefit error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ message: 'Không thể đề xuất lợi ích. Vui lòng thử lại sau.' });
    }
});
exports.suggestBenefit = suggestBenefit;
const suggestTopicTitle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { idea, department } = req.body;
    if (!(idea === null || idea === void 0 ? void 0 : idea.trim())) {
        return res.status(400).json({ message: 'Thiếu mô tả ý tưởng' });
    }
    try {
        const result = yield callAI([
            {
                role: 'system',
                content: 'Bạn là chuyên gia đặt tên đề tài súc tích. Tiêu đề cần nêu vấn đề + giải pháp chính + mục tiêu lợi ích, tối đa 15 từ.'
            },
            {
                role: 'user',
                content: `${buildContext(idea, department)} Hãy đề xuất 3 tiêu đề sáng tạo, đánh số 1,2,3 để người dùng dễ chọn.`
            }
        ]);
        if (!result) {
            throw new Error('Không nhận được phản hồi từ AI');
        }
        res.json({ topicTitle: result });
    }
    catch (error) {
        console.error('AI suggestTopicTitle error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ message: 'Không thể đề xuất tên đề tài. Vui lòng thử lại sau.' });
    }
});
exports.suggestTopicTitle = suggestTopicTitle;
