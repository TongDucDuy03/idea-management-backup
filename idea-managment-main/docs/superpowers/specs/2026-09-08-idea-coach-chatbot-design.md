# Idea Coach Chatbot ("Gemba Detective") — Design

Ngày: 2026-09-08

## 1. Mục tiêu

Thay vì để người dùng tự viết ý tưởng thô rồi tự đi hỏi AI bên ngoài (hiện đang link ra một Gemini Gem thủ công), hệ thống sẽ có một trợ lý AI hội thoại nhiều lượt ("Gemba Detective") sống ngay trong ứng dụng. AI phỏng vấn người dùng theo kịch bản Kaizen cố định (phân loại Muda/Mura/Muri → khảo sát hiện trường → định lượng thiệt hại → đánh giá khả thi → tổng hợp), rồi tự động điền kết quả vào form nộp ý tưởng.

## 2. Phạm vi

**Trong phạm vi:**
- 1 endpoint backend mới, stateless, nhận toàn bộ lịch sử hội thoại mỗi lượt gọi.
- 1 dialog chat mới ở frontend, mở được từ 2 điểm vào (Hero + trong form).
- Parse output cuối cùng của AI (theo format cố định) thành 3 trường form và tự động điền.
- Xoá 4 endpoint AI đơn lẻ hiện có (`improve-description`, `suggest-solution`, `suggest-benefit`, `suggest-topic-title`) vì không còn dùng ở frontend và bị thay thế hoàn toàn về chức năng.

**Ngoài phạm vi:**
- Lưu trữ lịch sử hội thoại phía server (chỉ lưu tạm ở trình duyệt).
- Áp dụng chatbot này cho luồng viết báo cáo A3 (có thể là việc tương lai, không nằm trong spec này).
- Streaming token-by-token (dùng request/response thường, không SSE/WebSocket).

## 3. Kiến trúc & luồng dữ liệu

```
[LandingHero nút "Nhờ AI giúp"]  [IdeaForm nút "Nhờ AI phỏng vấn"]
              \                           /
               v                         v
                 IdeaCoachDialog (mở qua ref.openCoach())
                              |
                 messages: [{role:'user'|'assistant', content}]
                              |
                 mỗi lượt: POST /api/ai/coach-chat { messages }
                              |
        backend: chèn system prompt cố định + giờ hiện tại (Asia/Ho_Chi_Minh)
        + toàn bộ messages đã có -> gọi LLM (OpenRouter/OpenAI, tái dùng
        cấu hình getAIConfig hiện có) -> trả về { reply }
                              |
                 append reply vào messages, render bubble
                              |
        sau mỗi reply: chạy parser text cố định phía FE
        -> nếu khớp format "kết quả cuối" -> hiện thẻ tóm tắt + nút
           "Điền vào form"
                              |
        bấm nút -> map 6 mục -> 3 field -> gọi onComplete(fields)
        -> IdeaForm.setFormData (hỏi xác nhận nếu field đã có nội dung)
```

Không có state hội thoại nào lưu ở server. Không có DB mới.

## 4. Backend

### 4.1 File thay đổi
- `backend/src/controllers/aiController.ts` → xoá 4 hàm cũ, thêm hàm `coachChat`. (Hoặc tách file mới `ideaCoachController.ts` nếu file cũ trở nên lộn xộn — quyết định lúc viết plan.)
- `backend/src/routes/aiRoutes.ts` → xoá 4 route cũ, thêm `router.post('/coach-chat', coachChat)`. Middleware `aiRateLimit` giữ nguyên vị trí (`router.use`) nhưng đổi tham số.
- File constant mới: `backend/src/constants/ideaCoachPrompt.ts` — export nguyên văn system prompt (ROLE, RULES, WORKFLOW, FINAL OUTPUT STRUCTURE, CTA, ADAPTIVE OPENING) do người dùng cung cấp, dạng template string. Giữ y nguyên nội dung tiếng Việt/Anh như đã chốt, không diễn giải lại.

### 4.2 Hợp đồng API

`POST /api/ai/coach-chat`

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Ở khu đúc 1 hay bị chờ khuôn..." },
    { "role": "assistant", "content": "Mình hiểu rồi..." },
    { "role": "user", "content": "..." }
  ]
}
```

Validate:
- `messages` phải là mảng, độ dài 1–40 phần tử. Vượt quá → `400` `{ message: "Cuộc trò chuyện đã khá dài, bạn hãy chốt ý tưởng với thông tin hiện có nhé." }`.
- Mỗi phần tử: `role` chỉ được là `'user'` hoặc `'assistant'` — **bỏ qua/từ chối** bất kỳ phần tử nào có `role: 'system'` gửi từ client (chặn override system prompt).
- Mỗi `content` là string, trim, cắt tối đa 4000 ký tự (dùng lại hằng số `MAX_INPUT_LENGTH` kiểu cũ).
- Mảng rỗng hoặc phần tử đầu không phải role `'user'` → `400`.

Xử lý:
1. Lấy giờ hiện tại theo `Asia/Ho_Chi_Minh`, format `HH:mm`.
2. Ghép system prompt = `IDEA_COACH_SYSTEM_PROMPT + "\n\nGiờ hiện tại: {HH:mm}."`
3. Gọi LLM với `[{role:'system', content: systemPrompt}, ...messages đã validate]`.
4. Trả `200 { reply: string }`.
5. Lỗi gọi AI → `500 { message: "Trợ lý AI đang bận, vui lòng thử lại." }` (theo đúng pattern lỗi hiện có trong `aiController.ts`).

### 4.3 Rate limit

Middleware `rateLimit` hiện có được tái sử dụng nguyên vẹn (không cần sửa `middleware/rateLimit.ts`):
```
rateLimit({
  scope: 'public-ai-coach',
  windowMs: 60_000,
  max: Number(process.env.AI_COACH_RATE_LIMIT_PER_MINUTE || 20),
  message: 'Bạn đang chat với AI quá nhanh. Vui lòng chờ một chút.'
})
```
Biến `AI_RATE_LIMIT_PER_MINUTE` cũ (dùng cho 4 endpoint bị xoá) cũng xoá khỏi `.env.example`, thay bằng `AI_COACH_RATE_LIMIT_PER_MINUTE`.

Giới hạn 40 tin nhắn/phiên ở §4.2 là chặn cứng độc lập với rate-limit theo phút — bảo vệ chi phí khỏi 1 phiên chat kéo dài bất thường dù vẫn nằm trong hạn mức phút.

### 4.4 Bảo mật
- Endpoint công khai (giống form nộp ý tưởng, không yêu cầu đăng nhập) — đã có rate limit + cap độ dài + cap số lượt.
- System prompt luôn do server chèn, client không thể ghi đè vai trò AI qua `role`.
- Không log nội dung hội thoại người dùng ra console ở mức info (chỉ log lỗi, theo pattern `console.error` hiện có, không kèm nội dung nhạy cảm).

## 5. Frontend

### 5.1 File mới
- `src/components/IdeaCoachDialog.tsx` — component chat, không phụ thuộc `IdeaForm`.
  - Props: `open: boolean`, `onClose: () => void`, `onComplete: (fields: { idea: string; solution: string; benefit: string }) => void`.
  - State nội bộ: `messages`, `input`, `loading`, `error`.
  - Hiển thị dòng chào cố định (câu người dùng cung cấp: "Tôi được chuyên biệt hóa để giúp mọi người...") làm bubble đầu tiên, client-side, không tốn lượt gọi API.
  - Mỗi lần user gửi: thêm vào `messages`, gọi `POST /ai/coach-chat`, thêm `reply` vào `messages`.
  - Sau mỗi `reply` mới: chạy `parseCoachFinalOutput(reply)` (xem 5.2). Nếu có kết quả, hiện khối tóm tắt 6 mục + nút "Điền vào form" ngay dưới bubble đó (không tự đóng dialog, không tự ghi đè form).
  - Lỗi mạng/API: hiện bubble lỗi kèm nút "Thử lại" gửi lại đúng tin nhắn cuối, không mất lịch sử.
  - `Dialog` MUI, `fullScreen` khi `xs` breakpoint (đối tượng dùng chủ yếu trên điện thoại, theo copy hiện có của `LandingHero`).

- `src/utils/parseCoachFinalOutput.ts` — hàm thuần `(text: string) => ParsedCoachFields | null`.
  - Nhận diện khối kết quả cuối bằng cách tìm đủ 6 nhãn cố định: `Tên cải tiến`, `Hiện trạng - Vấn đề`, `Giải pháp`, `Lợi ích mang lại`, `Nguồn lực thực hiện`, `Cơ hội nhân rộng và phát triển` (đúng nhãn trong FINAL OUTPUT STRUCTURE của prompt).
  - Nếu thiếu bất kỳ nhãn nào → trả `null` (coi như AI chưa đến bước tổng hợp, không có gì để điền).
  - Trả về:
    ```ts
    type ParsedCoachFields = {
      topicTitle: string;
      currentProblem: string;
      solution: string;
      benefit: string;
      resources: string;
      scalingOpportunity: string;
    };
    ```
  - Việc **gộp** 6 mục này thành 3 field của form (`idea`/`solution`/`benefit`) được làm ở nơi gọi (`IdeaForm`), không làm trong hàm parse — giữ hàm parse thuần, dễ test độc lập với quyết định UI về mapping.

### 5.2 Mapping 6 → 3 field (thực hiện trong `IdeaForm`)

```
idea     = `${topicTitle}\n\n${currentProblem}`
solution = solution
benefit  = `Lợi ích mang lại:\n${benefit}\n\nNguồn lực thực hiện:\n${resources}\n\nCơ hội nhân rộng và phát triển:\n${scalingOpportunity}`
```

Nếu `formData.idea`, `.solution` hoặc `.benefit` đã có nội dung khác rỗng trước khi bấm "Điền vào form" → hiện `window.confirm`-style xác nhận của MUI (Dialog xác nhận, không dùng `window.confirm` gốc để giữ đồng bộ UI) hỏi "Ghi đè nội dung hiện có bằng bản AI vừa tổng hợp?". Đồng ý → ghi đè cả 3 field cùng lúc; Huỷ → không làm gì, dialog chat vẫn mở để người dùng tiếp tục chỉnh sửa qua chat nếu muốn.

Sau khi điền thành công: đóng `IdeaCoachDialog`, hiện `Snackbar` "Đã điền tự động từ AI — hãy kiểm tra lại trước khi gửi."

### 5.3 File sửa

- `src/components/IdeaForm.tsx`
  - Bọc component bằng `forwardRef`, thêm `useImperativeHandle(ref, () => ({ openCoach: () => setCoachOpen(true) }))`.
  - Thêm state `coachOpen`.
  - Xoá khối nút "Viết lại rõ ràng hơn" (link `gemini.google.com/...`, dòng ~572–600) — thay bằng nút mở `IdeaCoachDialog` (giữ style/icon `AutoAwesome` tương tự cho quen mắt).
  - Render `<IdeaCoachDialog open={coachOpen} onClose={...} onComplete={handleCoachComplete} />`.
  - Thêm hàm `handleCoachComplete` theo §5.2.

- `src/components/MainPageWithTabs.tsx`
  - `const ideaFormRef = useRef<IdeaFormHandle>(null)`.
  - `<IdeaForm ref={ideaFormRef} />`.
  - Thêm hàm `openCoachFromHero = () => { scrollToForm(); ideaFormRef.current?.openCoach(); }`, truyền xuống `LandingHero` qua prop mới `onOpenCoach`.

- `src/components/LandingHero.tsx`
  - Thêm prop `onOpenCoach: () => void`.
  - Thêm nút phụ cạnh "🚀 Gửi ý tưởng ngay", ví dụ "🕵️ Chưa rõ ý tưởng rõ ràng? Nhờ AI phỏng vấn giúp" gọi `onOpenCoach`.

- `src/api/config.ts` — dòng `isPublicWrite` hiện match `path.startsWith('/ai/')`, endpoint mới `/ai/coach-chat` tự động khớp, không cần sửa.

## 6. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| AI backend lỗi/timeout | Bubble lỗi trong chat + nút thử lại, giữ lịch sử |
| Vượt rate limit (429) | Hiện thông báo backend trả về (`message`), không tự động retry |
| Vượt 40 tin nhắn (400) | Hiện thông báo, gợi ý người dùng bấm "Điền vào form" nếu đã có đủ hoặc kết thúc hội thoại |
| `reply` không parse được thành 6 mục dù người dùng nói "chỉ có vậy thôi" | Không có gì hiện thêm — người dùng có thể tiếp tục chat hoặc tự chuyển nội dung cuối cùng bằng tay (không có nút điền, nhưng không mất dữ liệu vì text vẫn hiển thị trong chat) |
| Người dùng đóng dialog giữa chừng | Mất lịch sử (theo quyết định "chỉ lưu tạm ở trình duyệt" — không cảnh báo thêm, chấp nhận đơn giản hoá) |

## 7. Kiểm thử

- **Unit (bắt buộc, vì logic thuần dễ test):**
  - `parseCoachFinalOutput.test.ts`: input là 1 đoạn mẫu đúng format FINAL OUTPUT STRUCTURE → ra đúng 6 field; input thiếu 1 nhãn → `null`; input có nhãn nhưng sai thứ tự → vẫn parse đúng (không phụ thuộc thứ tự xuất hiện).
  - Backend: test cho `coachChat` — validate cắt/từ chối message quá dài, quá nhiều, từ chối `role: 'system'` từ client, mock `axios.post` để không gọi AI thật.
- **Thủ công (bắt buộc trước khi báo hoàn thành, theo quy tắc UI phải test trong browser):**
  - Chạy `npm start` (frontend) + backend dev, thực hiện 1 luồng chat đầy đủ từ cả 2 điểm vào (Hero và trong form), xác nhận điền đúng 3 field, xác nhận cảnh báo ghi đè khi form đã có nội dung, xác nhận rate limit/giới hạn tin nhắn hoạt động (có thể hạ tạm giới hạn để test nhanh).

## 8. Dọn dẹp

- Xoá `improveDescription`, `suggestSolution`, `suggestBenefit`, `suggestTopicTitle` khỏi `aiController.ts` và route tương ứng khỏi `aiRoutes.ts`.
- Xoá biến môi trường `AI_RATE_LIMIT_PER_MINUTE` khỏi `.env.example`, thêm `AI_COACH_RATE_LIMIT_PER_MINUTE`.
- Không đổi `OPENROUTER_API_KEY`/`OPENAI_API_KEY`/`AI_MODEL`/`AI_API_URL` — vẫn dùng chung cấu hình LLM hiện có.
