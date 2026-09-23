# BỘ QUY CHUẨN KIỂM SOÁT AN TOÀN TRƯỚC KHI PUBLIC DỰ ÁN
*(Pre-Release & Launch Security Checklist for Web Applications)*

> **Triết lý cốt lõi:** *"Vibe code nhanh thì thích, nhưng nhớ khóa cửa. Trước khi public, bắt AI hoặc tự tay rà soát lại toàn bộ hệ thống."*

---

## I. BẢNG CHECKLIST TỔNG HỢP NHANH (QUICK REVIEW)

*Dùng để copy vào Issue, Pull Request hoặc dán vào tài liệu bàn giao trước mỗi đợt Deploy.*

| Nhóm | STT | Hạng mục kiểm tra | Trạng thái |
| :--- | :---: | :--- | :---: |
| **1. Xác thực & Phiên** | 01 | Băm mật khẩu bằng Argon2 / bcrypt (không lưu text thô / MD5 / SHA1) | [ ] |
| | 02 | Đặt Rate Limit cho API Login, Register, Forgot Password | [ ] |
| | 03 | Session / Access Token có thời gian hết hạn (TTL hợp lý) | [ ] |
| **2. Chống Rò Rỉ Bí Mật** | 04 | Xóa bỏ toàn bộ `console.log`, file `.env`, file debug thừa | [ ] |
| | 05 | Secret Key, Database URI, Private API Key nằm 100% ở Backend | [ ] |
| | 06 | Tắt hiển thị chi tiết Stack Trace, lỗi SQL ra ngoài client | [ ] |
| **3. Kiểm Soát Dữ Liệu** | 07 | Giới hạn loại file tải lên (Whitelist MIME type & Extension) | [ ] |
| | 08 | Giới hạn dung lượng tối đa của file tải lên | [ ] |
| | 09 | Luôn thẩm định lại dữ liệu ở Server (Server-side Validation) | [ ] |
| **4. Kiểm Thử Phân Quyền**| 10 | Kiểm tra IDOR: Đổi `/user/123` sang `/user/124` có lộ data không | [ ] |
| | 11 | Thử lấy tài khoản User thường truy cập vào các API / Trang Admin | [ ] |
| | 12 | 100% câu truy vấn Database dùng Parameterized Queries / ORM | [ ] |
| **5. Bảo Mật Trình Duyệt**| 13 | Bắt buộc HTTPS (Redirect toàn bộ HTTP sang HTTPS) | [ ] |
| | 14 | Cấu hình đầy đủ Security Headers (HSTS, CSP, X-Frame-Options...) | [ ] |
| | 15 | Cookie lưu Token bật đủ cờ: `HttpOnly`, `Secure`, `SameSite` | [ ] |
| **6. Hạ Tầng & Database** | 16 | Cấu hình CORS chặt chẽ (chỉ cho phép domain chỉ định gọi API) | [ ] |
| | 17 | Database không mở cổng Public ra Internet (chỉ listen private/VPC) | [ ] |
| | 18 | User kết nối Database chỉ được cấp đúng quyền tối thiểu (Least Privilege) | [ ] |
| **7. Vận Hành & Dự Phòng**| 19 | Bật Cloudflare (ẩn IP máy chủ gốc, bật WAF, chống DDoS) | [ ] |
| | 20 | Đã lên lịch tự động Backup Database và gắn công cụ theo dõi lỗi (Sentry/Logs) | [ ] |

---

## II. HƯỚNG DẪN CHI TIẾT 20 HẠNG MỤC (DEEP DIVE & BEST PRACTICES)

### PHẦN 1: BẢO VỆ TÀI KHOẢN VÀ PHIÊN ĐĂNG NHẬP

#### 1. Hash Password bằng Argon2 hoặc bcrypt
* **Tại sao cần:** Cơ sở dữ liệu luôn có nguy cơ bị rò rỉ. Nếu mật khẩu lưu dạng thô (plain-text) hoặc dùng MD5/SHA256 không có salt, hacker có thể giải mã chỉ trong vài giây.
* **Quy chuẩn:**
  * Khuyến nghị hàng đầu: **Argon2id** (chuẩn mới nhất chống bẻ khóa bằng GPU/ASIC) hoặc **bcrypt** (salt rounds $\ge 10$).
  * Không bao giờ tự chế thuật toán mã hóa mật khẩu.

#### 2. Rate Limit cho luồng Login / Nhạy cảm
* **Tại sao cần:** Kẻ tấn công có thể dùng bot chạy hàng triệu lượt thử mật khẩu (Brute-force) hoặc nhồi tài khoản đánh cắp được (Credential Stuffing).
* **Quy chuẩn:**
  * Giới hạn tối đa 5 - 10 lần đăng nhập sai trong vòng 5 - 15 phút cho mỗi IP hoặc tài khoản.
  * Thêm CAPTCHA (Cloudflare Turnstile, reCAPTCHA) nếu phát hiện hành vi bất thường.

#### 3. Session / Token phải có hạn sử dụng (Expiration)
* **Tại sao cần:** Nếu JWT Token hoặc Session Cookie tồn tại vĩnh viễn, kẻ xấu chỉ cần lấy cắp token một lần là có thể truy cập tài khoản mãi mãi.
* **Quy chuẩn:**
  * `accessToken`: Thời gian sống ngắn (15 phút - 1 giờ).
  * `refreshToken`: Lưu ở storage bảo mật, thu hồi được (Revocable), hết hạn sau 7 - 30 ngày.
  * Khi người dùng đổi mật khẩu, phải vô hiệu hóa toàn bộ session cũ.

---

### PHẦN 2: CHỐNG RÒ RỈ THÔNG TIN VÀ KHÓA BÍ MẬT (SECRETS)

#### 4. Xóa bỏ debug log thừa
* **Tại sao cần:** Các lệnh `console.log(user)`, in payload, token hay thông tin request ra client console hoặc log server dễ bị lộ thông tin nhạy cảm.
* **Quy chuẩn:**
  * Dùng thư viện logger (Winston, Pino, Bunyan) có phân cấp log level (`debug`, `info`, `warn`, `error`).
  * Tự động xóa `console.log` ở môi trường Production khi build (VD: `terser` hoặc babel plugin).

#### 5. Secret Key tuyệt đối không để ở Frontend
* **Tại sao cần:** Bất kỳ thứ gì đưa vào code Frontend (React, Vue, HTML/JS) đều có thể được đọc dễ dàng qua DevTools (F12) hoặc Inspect Bundle JS.
* **Quy chuẩn:**
  * Biến môi trường Frontend (như `VITE_...`, `NEXT_PUBLIC_...`) chỉ chứa cấu hình công khai (URL API, Public Key, Firebase Client Config).
  * OpenAI API Key, AWS Secret Key, Database Connection String, Stripe Secret Key **bắt buộc 100%** nằm tại Backend server.

#### 6. Không hiển thị chi tiết lỗi kỹ thuật cho người dùng
* **Tại sao cần:** Màn hình lỗi chứa Stack Trace, câu truy vấn SQL (SQL Error), đường dẫn file trên server là nguồn tài nguyên vàng để hacker thăm dò cấu trúc hệ thống.
* **Quy chuẩn:**
  * Ở môi trường Production: Bắt lỗi tập trung (Global Exception Filter) và chỉ trả về thông báo chung: `{"message": "Đã có lỗi xảy ra. Vui lòng thử lại sau."}` cùng một `trackingId` để tra cứu trong log nội bộ.

---

### PHẦN 3: KIỂM SOÁT VÀ THẨM ĐỊNH DỮ LIỆU ĐẦU VÀO

#### 7. Giới hạn loại file Upload (File Whitelist)
* **Tại sao cần:** Nếu hacker tải lên được file mã nguồn thực thi như `.php`, `.jsp`, `.sh`, `.exe`, `.html` (chứa script XSS) lên máy chủ, họ có thể chiếm quyền kiểm soát server (RCE).
* **Quy chuẩn:**
  * Chỉ cho phép danh sách trắng (Whitelist): ví dụ ảnh (`image/jpeg`, `image/png`), tài liệu (`application/pdf`).
  * Kiểm tra cả đuôi file (extension) và Magic Bytes (đọc nội dung byte đầu của file), không chỉ tin cậy `Content-Type` do client gửi lên.

#### 8. Giới hạn dung lượng File Upload
* **Tại sao cần:** Tải file quá lớn làm tràn RAM, đầy dung lượng ổ cứng hoặc nghẽn băng thông dẫn đến tê liệt máy chủ (Denial of Service - DoS).
* **Quy chuẩn:**
  * Giới hạn tối đa tại Reverse Proxy (Nginx `client_max_body_size`) và tại Backend framework (Express/Multer, NestJS, FastAPI).

#### 9. Validate lại dữ liệu tại Server (Server-side Validation)
* **Tại sao cần:** Mọi ràng buộc kiểm tra trên giao diện (Frontend) đều có thể bị vượt qua dễ dàng bằng Postman, cURL hoặc sửa code client.
* **Quy chuẩn:**
  * Dùng các thư viện schema validation (Zod, Joi, Yup, Pydantic) ở mỗi endpoint backend.
  * Kiểm tra kiểu dữ liệu, độ dài chuỗi, định dạng email, khoảng giá trị số.

---

### PHẦN 4: KIỂM THỬ PHÂN QUYỀN VÀ TRUY VẤN DỮ LIỆU

#### 10. Kiểm tra IDOR (Insecure Direct Object References)
* **Tại sao cần:** Người dùng A có thể xem trộm hoặc sửa hóa đơn, bài viết, thông tin của người dùng B chỉ bằng cách sửa ID trên URL: `/api/orders/123` $\rightarrow$ `/api/orders/124`.
* **Quy chuẩn:**
  * Mỗi câu truy vấn dữ liệu chi tiết phải luôn đi kèm điều kiện sở hữu:
    `WHERE id = :targetId AND user_id = :currentLoggedInUserId`.
  * Không dùng ID tự tăng (1, 2, 3...) cho các tài nguyên nhạy cảm; cân nhắc dùng UUIDv4 hoặc CUID/NanoID.

#### 11. Kiểm tra phân quyền truy cập (Role-Based Access Control)
* **Tại sao cần:** Ẩn nút trên màn hình không có nghĩa là API được an toàn. User thường vẫn có thể gọi trực tiếp API `/api/admin/users/delete`.
* **Quy chuẩn:**
  * Luôn có Middleware / Guard kiểm tra quyền (`requireAdmin`, `checkPermission`) ở từng Controller/Endpoint Backend.

#### 12. 100% câu truy vấn Database phải dùng Parameterized Queries
* **Tại sao cần:** Ghép chuỗi truy vấn trực tiếp (`"SELECT * FROM users WHERE name = '" + name + "'"` ) gây ra lỗ hổng kinh điển **SQL Injection**, làm mất toàn bộ database.
* **Quy chuẩn:**
  * Sử dụng Prepared Statements với placeholder (`?`, `$1`) hoặc sử dụng các ORM chuẩn (Prisma, TypeORM, Drizzle, SQLAlchemy, Hibernate).

---

### PHẦN 5: BẢO MẬT PHÍA TRÌNH DUYỆT VÀ ĐƯỜNG TRUYỀN

#### 13. Bắt buộc HTTPS
* **Tại sao cần:** Kết nối HTTP thông thường gửi dữ liệu dạng rõ (plain-text), dễ bị nghe lén và đánh cắp thông tin đăng nhập trên mạng công cộng (Man-In-The-Middle attack).
* **Quy chuẩn:**
  * Cài đặt SSL/TLS (Let's Encrypt hoặc Cloudflare SSL).
  * Cấu hình Nginx/Cloudflare tự động chuyển hướng toàn bộ request HTTP (port 80) sang HTTPS (port 443).

#### 14. Bổ sung các HTTP Security Headers
* **Tại sao cần:** Giúp trình duyệt chủ động chặn các cuộc tấn công Clickjacking, XSS, MIME-sniffing.
* **Quy chuẩn:**
  * Với Node.js/Express: Cài đặt và gọi ngay thư viện `helmet()`.
  * Các header quan trọng:
    * `Strict-Transport-Security` (HSTS): Bắt buộc trình duyệt chỉ kết nối HTTPS.
    * `X-Frame-Options: DENY` hoặc `SAMEORIGIN`: Chống nhúng iframe lừa click (Clickjacking).
    * `X-Content-Type-Options: nosniff`: Ngăn trình duyệt đoán định dạng MIME.
    * `Content-Security-Policy` (CSP): Giới hạn nguồn tải script, ảnh, stylesheet.

#### 15. Cấu hình Cookie an toàn (`HttpOnly` + `Secure` + `SameSite`)
* **Tại sao cần:** Ngăn chặn kẻ tấn công đánh cắp Cookie phiên làm việc qua lỗi XSS hoặc giả mạo yêu cầu qua CSRF.
* **Quy chuẩn:**
  * `httpOnly: true`: JavaScript client không thể đọc được cookie thông qua `document.cookie`.
  * `secure: true`: Cookie chỉ được truyền tải qua kênh bảo mật HTTPS.
  * `sameSite: 'lax'` hoặc `'strict'`: Chống tấn công giả mạo yêu cầu chéo trang (CSRF).

---

### PHẦN 6: HẠ TẦNG MẠNG VÀ CƠ SỞ DỮ LIỆU

#### 16. Giới hạn cấu hình CORS (Cross-Origin Resource Sharing)
* **Tại sao cần:** Cấu hình `Access-Control-Allow-Origin: *` cho phép bất kỳ trang web độc hại nào cũng có thể gửi yêu cầu lấy dữ liệu từ API của bạn.
* **Quy chuẩn:**
  * Chỉ thêm các domain chính xác của dự án vào whitelist:
    `origin: ['https://myapp.com', 'https://admin.myapp.com']`.
  * Tuyệt đối không dùng wildcard `*` kèm với `credentials: true`.

#### 17. Không mở cổng Database trực tiếp ra Internet
* **Tại sao cần:** Các cổng mặc định như MySQL (3306), PostgreSQL (5432), MongoDB (27017), Redis (6379) luôn là mục tiêu quét tự động 24/7 của hàng triệu bot trên mạng.
* **Quy chuẩn:**
  * Cấu hình firewall (UFW / AWS Security Group) đóng toàn bộ cổng DB với mạng Internet (`0.0.0.0/0`).
  * Chỉ cho phép kết nối nội bộ (Localhost / VPC Network) hoặc thông qua SSH Tunnel / VPN bảo mật khi cần quản trị.

#### 18. User Database áp dụng nguyên tắc Đặc quyền tối thiểu (Least Privilege)
* **Tại sao cần:** Nếu ứng dụng web dùng quyền `root` / `superuser` để kết nối database, khi ứng dụng bị lỗi SQLi, hacker có thể xóa sạch database hoặc ghi file đè vào hệ điều hành.
* **Quy chuẩn:**
  * Tạo riêng một user database chỉ dành cho web app.
  * Chỉ cấp các quyền cần thiết: `SELECT`, `INSERT`, `UPDATE`, `DELETE` trên schema cụ thể. Không cấp quyền `DROP TABLE`, `ALTER TABLE` hay quyền quản trị hệ thống cho user vận hành hàng ngày.

---

### PHẦN 7: PHÒNG THỦ NGOẠI VI VÀ VẬN HÀNH DỰ PHÒNG

#### 19. Đưa Website qua Cloudflare
* **Tại sao cần:** Giấu IP gốc của máy chủ (Origin Server), cung cấp mạng phân phối nội dung (CDN) tăng tốc tải trang, lọc bot xấu và giảm thiểu tấn công từ chối dịch vụ (DDoS).
* **Quy chuẩn:**
  * Bật đám mây màu cam (Proxied) trên DNS Cloudflare.
  * Bật SSL/TLS chế độ **Full (Strict)**.
  * Thiết lập Web Application Firewall (WAF) để chặn IP từ các quốc gia/vùng không liên quan nếu chỉ phục vụ nội địa.

#### 20. Sao lưu dữ liệu tự động & Giám sát lỗi (Backup & Monitoring)
* **Tại sao cần:** Sự cố có thể xảy ra bất cứ lúc nào (lỗi code, sập ổ cứng, người dùng xóa nhầm). Nếu không có backup và log, việc khôi phục là bất khả thi.
* **Quy chuẩn:**
  * **Backup:** Thiết lập Cronjob sao lưu database tự động hàng ngày, đẩy file backup lên lưu trữ đám mây tách biệt (AWS S3, Google Cloud Storage, Cloudflare R2). Thử nghiệm quy trình khôi phục định kỳ.
  * **Monitoring:** Gắn công cụ cảnh báo lỗi runtime (như Sentry, GlitchTip) và công cụ giám sát uptime (Uptime Kuma, Better Uptime) để xử lý ngay khi hệ thống có sự cố.

---

## III. PROMPT MẪU YÊU CẦU AI AUDIT DỰ ÁN TRƯỚC KHI PUBLIC

*Copy đoạn prompt dưới đây gửi cho AI (Claude, ChatGPT, Cursor...) kèm theo file cấu hình hoặc code cần kiểm tra:*

```markdown
Bạn là chuyên gia an toàn thông tin và kiến trúc sư phần mềm cấp cao (Senior AppSec Engineer).
Hãy đóng vai trò Hacker mũ trắng (White-hat hacker) và Security Auditor để rà soát toàn bộ dự án này trước khi chúng tôi Public ra môi trường Internet.

Dưới đây là 20 tiêu chí bạn bắt buộc phải kiểm tra kỹ lưỡng:
1. Cơ chế băm mật khẩu (Argon2 / bcrypt)?
2. Đã có Rate limit cho các route login/register/reset-password chưa?
3. Thời hạn Session / JWT Token (Access Token vs Refresh Token)?
4. Còn sót console.log, file debug, dữ liệu test thừa nào không?
5. Có bất kỳ API Key, Secret Token, DB URI nào bị lộ ở phía Frontend không?
6. Xử lý Exception: Có để lộ Stack Trace hoặc lỗi DB ra ngoài client không?
7. File Upload: Có kiểm tra Whitelist định dạng (MIME & extension) chặt chẽ không?
8. File Upload: Đã giới hạn dung lượng file tối đa chưa?
9. Dữ liệu gửi lên: Đã được Validate chặt chẽ ở phía Server chưa?
10. Kiểm tra lỗ hổng IDOR: Có route nào truy cập theo ID mà thiếu điều kiện kiểm tra chủ sở hữu không?
11. Phân quyền: User thường có cách nào gọi được các API Admin/Manager không?
12. Database Queries: 100% câu query đã parameterized chưa? Có nguy cơ SQL Injection không?
13. Đã cấu hình bắt buộc HTTPS chưa?
14. Đã có đầy đủ Security Headers (HSTS, CSP, X-Frame-Options...) chưa?
15. Cookie chứa Token có đủ cờ: HttpOnly, Secure, SameSite không?
16. Cấu hình CORS: Có bị mở toang wildcard (*) không?
17. Database có mở cổng Public ra Internet không?
18. Tài khoản kết nối DB có tuân thủ đặc quyền tối thiểu (Least Privilege) không?
19. Kế hoạch đưa qua Cloudflare (ẩn IP origin, chống DDoS, WAF)?
20. Đã có cơ chế Backup tự động và Logging/Error Tracking (Sentry...) chưa?

YÊU CẦU ĐẦU RA:
- Báo cáo rõ ràng: [ĐẠT] / [NGUY CƠ CAO] / [CẦN KHẮC PHỤC].
- Đối với mỗi nguy cơ, chỉ ra file/dòng code cụ thể và cung cấp đoạn code sửa chữa mẫu.
```
