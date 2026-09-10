# Triển khai bản vá bảo mật — 08/09/2026

## Thay đổi trong mã nguồn

| Mục báo cáo | Bản sửa |
|---|---|
| 1 — Stored XSS | Escape mọi trường văn bản trong A3ReportForm, ExportReportDialog và ReportGenerator; kiểm tra URL ảnh, chặn SVG/data không hợp lệ và nguồn ảnh bên ngoài. Dữ liệu cũ được bảo vệ tại lúc xuất HTML, không cần ghi lại database. |
| 2 — Email injection | Escape mã, tên, phòng ban và nội dung trong phần HTML. Giữ văn bản gốc ở phần email plain text. |
| 3 — Dữ liệu công khai | Danh sách, thống kê chi tiết và ảnh yêu cầu đăng nhập. API tra cứu công khai chỉ trả mã, trạng thái và các mốc thời gian. Form gửi ý tưởng và ba số liệu tổng hợp vẫn công khai. |
| 4 — Excel | Cả frontend/backend dùng SheetJS 0.20.3 từ CDN chính thức, khóa phiên bản và integrity trong lockfile. Parser chạy worker với timeout 10 giây, V8 heap 128MB, file 10MB, tối đa 10 sheet và 5000 dòng dữ liệu/100 cột ở sheet đầu tiên. Chỉ nhập sheet đầu như trước. Giới hạn V8 heap không phải giới hạn toàn bộ bộ nhớ hệ điều hành. |
| 5 — Headers/HTTPS | Cấu hình nginx TLS, redirect 308, HSTS, CSP và header dùng chung. Script inline bị chặn; style inline còn cần cho MUI/Emotion và PDF. Chính sách style nghiêm ngặt hơn chạy Report-Only để đánh giá tương thích. Helmet bảo vệ phản hồi backend. |
| 6 — Phiên đăng nhập | Thay JWT phía trình duyệt bằng token phiên ngẫu nhiên 256-bit trong cookie HttpOnly/Secure/SameSite=Strict. Database chỉ lưu SHA-256 của token; phiên hết hạn sau 8 giờ mặc định. Có CSRF, kiểm tra Origin lúc login/logout, thu hồi phiên khi logout/khóa tài khoản/đổi mật khẩu. JWT cũ không được chấp nhận. |
| 7 — Phân quyền | `admin` được ghi/xóa/import; `viewer` chỉ đọc dữ liệu nội bộ. Vai trò kiểm tra từ database mỗi request. Tài khoản cũ chưa có role mặc định chỉ xem; cấp quyền admin cho từng tài khoản đã xác định bằng CLI. |
| 8 — Host injection | URL tài sản lấy từ cấu hình cố định; không dùng Host/X-Forwarded-Host do client gửi. |
| 9 — Lộ thông tin | Tắt X-Powered-By; healthcheck chỉ trả trạng thái và HTTP 200/503. |
| 10 — Rate limit | Production dùng bộ đếm MongoDB atomic, chia sẻ giữa các worker. Giới hạn login theo IP và theo tài khoản; bộ đếm lỗi thì trả 503. Không cần triển khai Redis. |

Bổ sung: endpoint gửi công khai không nhận trạng thái duyệt, tiền thưởng, ghi chú nội bộ hoặc quyền. Quản trị viên tạo ý tưởng qua `POST /api/ideas/admin`. CLI tạo admin không còn mật khẩu mặc định `admin123`.

## Cấu hình cần có trên máy chủ

Triển khai frontend, backend và cấu hình proxy cùng phiên bản. Mẫu mặc định phục vụ frontend, `/api/` và `/uploads/` trên cùng origin HTTPS. Cookie Strict không hỗ trợ mô hình frontend/API ở hai site khác nhau.

```dotenv
NODE_ENV=production
FRONTEND_URL=https://idea.ducthangloi.com
PUBLIC_ASSET_BASE_URL=https://idea.ducthangloi.com
SESSION_TTL_SECONDS=28800
RATE_LIMIT_STORE=mongo
TRUST_PROXY=loopback
BIND_HOST=127.0.0.1
```

Giữ `MONGODB_URI`, thư mục upload và cấu hình email/Make hiện có. `JWT_SECRET` và `JWT_EXPIRES_IN` không còn được dùng. Nếu chạy bằng container, cấu hình địa chỉ bind và dải IP proxy tin cậy theo mạng thực tế; không công khai trực tiếp cổng backend. Người dùng và vai trò chỉ quản lý bằng CLI, không có endpoint tự đăng ký quản trị.

Development dùng `src/setupProxy.js` để chuyển cả `/api` và `/uploads` tới backend, đồng thời giữ nguyên Origin cho CSRF. Khởi động lại `npm start` sau khi cập nhật; có thể đặt `DEV_API_TARGET` nếu backend không ở `http://127.0.0.1:5000`.

## Trình tự triển khai

1. Sao lưu MongoDB, uploads, bản frontend/backend đang chạy và cấu hình nginx đang có hiệu lực. Kiểm tra hệ thống có proxy/CDN kết thúc TLS ở tầng khác không; nếu có, đặt redirect/header ở đúng tầng đó, không tạo vòng redirect.
2. Cài dependency theo lockfile và build trên máy triển khai hoặc CI:

   ```sh
   npm ci
   npm run build
   cd backend
   npm ci
   npm run build
   npm run test:security
   ```

   Trên PowerShell 5.1, dùng `npm.cmd` khi cần truyền tham số sau `--`. Kiểm thử bảo mật dùng MongoDB tạm riêng, không nạp `.env` ứng dụng; lần đầu tải binary MongoDB để chạy test.

3. Cấp quyền cho đúng tài khoản quản trị hiện có, từ thư mục backend, với môi trường production đã cấu hình:

   ```sh
   node dist/scripts/manageUser.js TEN_TAI_KHOAN admin
   ```

   Những tài khoản chưa được cấp quyền chỉ xem được dữ liệu. Muốn đặt role rõ ràng, dùng `viewer`. Các thao tác `disable`, `enable`, `revoke` đều thu hồi phiên cũ. Nếu từng sử dụng mật khẩu mặc định, đặt `ADMIN_PASSWORD` qua môi trường an toàn rồi chạy:

   ```sh
   node dist/scripts/manageUser.js TEN_TAI_KHOAN reset-password
   ```

   Tạo tài khoản mới bằng `node dist/scripts/createAdmin.js`, với `ADMIN_USERNAME` và `ADMIN_PASSWORD` được cấp qua môi trường. Không đặt mật khẩu trong dòng lệnh hay commit vào Git.

4. Cài `nginx-security-headers.conf` vào `/etc/nginx/snippets/idea-security-headers.conf`. Đối chiếu root của frontend, hostname và đường dẫn chứng chỉ trong `nginx.conf`. Không dùng `alias` hoặc CDN public để phục vụ uploads, vì sẽ bỏ qua kiểm tra quyền backend. Không thêm `add_header` riêng trong các location mà thiếu bộ header bảo mật chung.
5. Kiểm tra bằng `nginx -t` trên máy chủ, sau đó cập nhật frontend/backend và reload cấu hình nginx đã kiểm tra. Mọi người dùng phải đăng nhập lại. Xóa cache cũ của `/uploads/` và API nhạy cảm trên CDN/proxy nếu trước đây đã bật cache; `no-store` mới không tự xóa bản cache cũ.
6. Xác nhận HTTP chuyển sang HTTPS; kiểm tra header ở trang chủ, tài nguyên JS, API, uploads và phản hồi 404. CSP Report-Only chưa có endpoint thu thập; xem cảnh báo trong DevTools để đánh giá inline style.
7. Kiểm tra form gửi ý tưởng, tra cứu tiến độ, login/logout, role viewer/admin, sửa trạng thái, import và xuất báo cáo có ảnh. Tích hợp Make đọc ảnh phải gửi `X-API-KEY` hoặc Bearer credential của Make trong header; không nhúng khóa vào URL.

## Kiểm thử và giới hạn xác nhận

- Kết quả tại workspace ngày 08/09/2026: **16/16 kiểm thử backend, 5/5 kiểm thử frontend đạt**; build cả hai phía và kiểm tra TypeScript frontend đạt. Parser cũng đã được chạy thử qua ts-node ở development. `git diff --check` không có lỗi khoảng trắng.
- Build frontend còn cảnh báo biến/import chưa sử dụng và kích thước bundle. Workspace Windows hiện không có nginx, nên chưa chạy `nginx -t` hoặc xác minh header trên máy chủ production.
- Backend: `npm run test:security` kiểm tra HTTP với MongoDB tạm, bao gồm phân quyền, CSRF, dữ liệu công khai, thu hồi phiên, bộ đếm chia sẻ, email và Excel.
- Frontend: `node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --testPathPattern=securityReports` kiểm tra DOM tạo ra bởi ba thao tác xuất PDF và cách xử lý ảnh/văn bản không tin cậy. Bước raster hóa/ghi PDF được mock; vẫn cần kiểm tra trực quan PDF trên trình duyệt triển khai.
- Build frontend/backend phải đạt. Các cảnh báo lint có sẵn và kích thước bundle không phải chứng cứ rằng mọi dependency khác đã hết lỗ hổng.
- Cấu hình nginx trong repo là mẫu triển khai. Thay đổi file tại máy phát triển không làm thay đổi cấu hình hay header trên website đang chạy; cần kiểm tra lại sau khi cài lên máy chủ.

## Khôi phục khi triển khai gặp lỗi

Giữ một bản phát hành dự phòng đã có vá XSS và hạn chế API công khai. Nếu cần khôi phục bản cũ chưa vá, tạm chặn các chức năng xuất HTML/PDF và API danh sách nhạy cảm tại proxy trong thời gian xử lý; không mở lại lỗ hổng chỉ để khôi phục giao diện. Các trường role/isActive/sessionVersion và collection sessions/ratebuckets không xóa dữ liệu ý tưởng. Không phục hồi database nếu không có thay đổi dữ liệu cần hoàn tác.
