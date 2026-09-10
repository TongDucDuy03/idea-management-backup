# Kiểm tra truy cập dữ liệu không đăng nhập trên website

Website: https://idea.ducthangloi.com/

Thời điểm: khoảng 08:10 ngày 09/09/2026, múi giờ Asia/Bangkok.

## Kết luận

**Đã xác nhận người không đăng nhập có thể đọc dữ liệu ý tưởng nội bộ trên website đang chạy.** Không cần biết API key hoặc token để khai thác các đường đọc dữ liệu được nêu dưới đây. Cần ưu tiên đóng các đường truy cập này.

Kiểm tra này xác nhận khả năng truy cập tại thời điểm kiểm tra; không xác định được đã có bên thứ ba lấy dữ liệu trước đó hay chưa. Muốn xác định lịch sử truy cập cần xem access log của máy chủ/CDN và các nguồn giám sát đang có.

## Phương pháp và giới hạn

- Chỉ dùng HTTPS GET/HEAD, không gửi Cookie hoặc Authorization; không đăng nhập, không thử mật khẩu, không dùng các khóa tìm thấy trong workspace.
- Không gửi yêu cầu tạo/sửa/xóa, không kiểm thử gây tải, không tải toàn bộ danh sách hoặc nội dung ảnh.
- Giới hạn đọc phản hồi danh sách ở 32 KiB trong lần đầu. Lần xác nhận tiếp theo đọc tối đa 8 KiB và phân tích một bản ghi đầu tiên; chỉ dùng mã và đường dẫn ảnh từ bản ghi đó để kiểm tra chi tiết và HEAD ảnh.
- Không lưu nội dung bản ghi, tên người, mã ý tưởng, tên ảnh hoặc giá trị bí mật trong báo cáo.
- Chưa kiểm tra được cấu hình máy chủ có hiệu lực, log lịch sử, phân quyền của tài khoản đã đăng nhập hoặc tính hiệu lực của các khóa từng commit.

## Bằng chứng trên website đang chạy

| Yêu cầu không đăng nhập | Kết quả | Ý nghĩa |
|---|---|---|
| `GET /api/ideas/public?page=1&limit=1` | HTTP 200, JSON; Content-Length 852916 byte | Danh sách có các trường `_id`, `fullName`, `department`, `idea`, `solution`, `benefit`, `ideaCode`, `rewardAmount`, `benefitValue`, trạng thái và đường dẫn ảnh. Bản ghi đầu có họ tên, phòng ban và nội dung ý tưởng không rỗng. Không tải toàn bộ phản hồi; không kết luận tổng số bản ghi. |
| `GET /api/ideas/code/<mã lấy từ bản ghi trên>` | HTTP 200, JSON | Trả cả họ tên, phòng ban, nội dung ý tưởng và các trường nội bộ; không chỉ trạng thái tra cứu. |
| `HEAD /uploads/<ảnh được bản ghi trên tham chiếu>` | HTTP 200, `image/jpeg`, Content-Length 4417, `Cache-Control: max-age=2592000` | Máy chủ chấp nhận truy cập ảnh không đăng nhập và cho phép cache 30 ngày. Chỉ kiểm tra HEAD, không tải nội dung ảnh. |
| `GET /api/ideas?page=1&limit=1` | HTTP 401 | Đường danh sách chính yêu cầu đăng nhập, nhưng đường `/public` vẫn mở. |
| `GET /api/a3-reports?page=1&limit=1` | HTTP 401 | Đường danh sách báo cáo A3 đã chặn yêu cầu không đăng nhập trong lần kiểm tra này. |
| `GET /api/auth/session` | HTTP 404 | Endpoint phiên đăng nhập của bản vá local chưa có trên website đang chạy. |
| `GET /api/make/realtime?limit=1` | HTTP 503 | Không trả dữ liệu trong lần kiểm tra này. Chưa thử với khóa/token. |
| `GET /.env`, `/backend/.env`, `/.git/HEAD`, `/backend/.env.prod.example` | HTTP 200 nhưng là HTML trang frontend | Không phải nội dung env/Git; không xác nhận lộ file bí mật từ các đường này. Không được coi HTTP 200 đơn thuần là bằng chứng lộ file. |
| `HEAD /static/js/main.65b7c1e3.js.map` | HTTP 200, Content-Length 10369020 | File source map được máy chủ phục vụ. Chưa tải hoặc quét nội dung map trên website; không kết luận map chứa khóa. |

Trang chủ và các phản hồi API đã kiểm tra chưa có HSTS, CSP, X-Content-Type-Options hoặc X-Frame-Options. API vẫn gửi `X-Powered-By: Express`; healthcheck trả các trường `status`, `db`, `uptimeSeconds`. Đây là các điểm bổ sung, không phải nguyên nhân chính làm lộ dữ liệu ở trên.

## Khác biệt với workspace hiện tại

Trong workspace, `backend/src/routes/ideaRoutes.ts` đã đặt `/public` sau middleware `auth`; tra cứu theo mã đã giới hạn trường trả về. `backend/src/app.ts` cũng đã yêu cầu xác thực khi phục vụ uploads và đặt `no-store`.

Website đang chạy chưa thể hiện các bảo vệ đó. Bundle JS của website là `main.65b7c1e3.js`, trong khi bản build local được kiểm tra trước đó là `main.598e68fd.js`. Các dấu hiệu này xác nhận website không có cùng hành vi bảo mật với mã local đã kiểm tra; chưa xác định commit hoặc cấu hình thực tế trên server.

## Thứ tự xử lý đề nghị

1. **Ngăn truy cập công khai ngay** tại ứng dụng/proxy: danh sách `/api/ideas/public`, chi tiết tra cứu đang trả thông tin nội bộ và `/uploads/`. Tra cứu công khai chỉ nên trả mã/trạng thái/mốc thời gian; dữ liệu nội bộ và ảnh phải kiểm tra phiên hoặc quyền tích hợp. Chặn tạm các đường này có thể ảnh hưởng chức năng tra cứu và hiển thị ảnh cho đến khi triển khai bản vá đồng bộ.
2. Triển khai frontend, backend và Nginx cùng bản đã vá. Không dùng Nginx `alias` hoặc CDN public để phục vụ uploads bỏ qua xác thực của backend. Kiểm tra `NODE_ENV=production`, HTTPS, origin và thư mục web root.
3. Xóa cache cũ của uploads và dữ liệu API tại các proxy/CDN có sử dụng. `no-store` chỉ áp dụng cho phản hồi mới, không thu hồi bản sao đã tải về hoặc cache nằm ngoài quyền quản lý.
4. Kiểm tra lại không đăng nhập: danh sách nội bộ, chi tiết nội bộ và ảnh phải trả 401/403; tra cứu công khai không trả họ tên/nội dung/tiền thưởng/đường dẫn ảnh. Sau đó kiểm tra chức năng đăng nhập, quyền viewer/admin và ảnh cho người có quyền.
5. Thu hồi/thay khóa OpenRouter, khóa Make và mật khẩu MongoDB đã xuất hiện trong Git theo kết quả kiểm tra workspace trước đó. Thay credential trong file mẫu bằng placeholder và xử lý lịch sử Git phù hợp. Việc website không phục vụ trực tiếp `.env` không xóa được rủi ro từ Git.
6. Rà soát và bảo toàn access log: tập trung các đường `/api/ideas/public`, `/api/ideas/code/`, `/api/ideas/search`, `/uploads/`, thời điểm truy cập, IP và lượng phản hồi. Không đưa log chứa dữ liệu hoặc credential lên nơi công khai. Kiểm tra `/api/ideas/search` trong bản triển khai khi vá vì mã local dùng chung logic tra cứu; endpoint này chưa được gọi trong lần kiểm tra website này.

Không thực hiện thay đổi hoặc triển khai lên website trong lần kiểm tra này.
