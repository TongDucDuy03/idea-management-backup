# Báo cáo kiểm thử thao tác người dùng

Ngày kiểm tra: 08/09/2026. Phạm vi: mã nguồn hiện tại trong workspace, sau bản sửa bảo mật.

## Môi trường và cách kiểm tra

- Chạy bản build production React cùng Express và MongoDB dùng riêng cho kiểm thử qua Playwright.
- Chrome thực, chạy headless ở kích thước desktop 1440 × 1000 và điện thoại 390 × 844. Kích thước điện thoại là mô phỏng viewport, không phải thiết bị iOS/Android thật.
- Mỗi ca tạo lại tài khoản admin/viewer và dữ liệu giả; không nạp `.env`, không dùng cơ sở dữ liệu nghiệp vụ. Email và nhà cung cấp AI được giả lập tại máy; không gửi thư thật hoặc gọi AI trả phí.
- Trình duyệt áp dụng CSP từ cấu hình nginx, ngoại trừ nâng cấp HTTP lên HTTPS trên localhost.
- Kiểm tra cả thao tác giao diện, phản hồi API, dữ liệu lưu trong MongoDB và tệp tải xuống. Các ca trình duyệt kiểm tra không có lỗi JavaScript chưa được xử lý.

## Kết quả

**49/49 ca kiểm thử đạt**, gồm 16 ca trình duyệt, 12 ca API nghiệp vụ, 16 ca bảo mật backend và 5 ca bảo mật DOM/báo cáo. Mỗi ca có thể bao gồm nhiều thao tác liên tiếp. Không còn ca thất bại trong phạm vi này.

Lượt Playwright cuối: `28 passed (1.2m)`. Backend/frontend build thành công; `git diff --check` không phát hiện lỗi khoảng trắng.

| Nhóm thao tác | Nội dung kiểm tra |
| --- | --- |
| Đăng nhập và phiên | Sai mật khẩu, đăng nhập đúng, tải lại trang, đăng xuất, chuyển hướng khi chưa đăng nhập hoặc phiên bị thu hồi |
| Quyền chỉ xem | Xem danh sách, tải Excel, xem biểu đồ; chuyển khỏi đường dẫn quản trị; API từ chối ghi/xóa/import |
| Gửi ý tưởng công khai | Kiểm tra bắt buộc, đi tới/quay lại các bước, khôi phục bản nháp sau reload, gửi thành công, sao chép mã, tra cứu mã, gửi thêm |
| Lỗi khi gửi công khai | Ảnh hỏng, thay/xóa ảnh, lỗi gửi giả lập, giữ nội dung và gửi lại |
| Quản trị ý tưởng | Tạo qua các tab, lưu trường báo cáo/khen thưởng, sửa ngày và tiền, nhập số 0, hủy sửa, hủy/xác nhận xóa, giữ hộp nhập khi lưu thất bại |
| Ảnh trong quản trị | Tải ảnh, lưu, reload, mở ảnh lớn, sửa trường khác giữ nguyên ảnh, xóa ảnh; API sửa không hợp lệ phải giữ ảnh cũ |
| Danh sách | Lọc theo mã, bỏ lọc, hồ sơ chi tiết và mở ghi chú, lưu chế độ hiển thị bảng và tùy chỉnh cột; API tìm kiếm/phân trang |
| Cập nhật trực tiếp | Đổi trạng thái triển khai, chọn khen thưởng; không giữ đồng thời trạng thái chờ và đã thưởng cùng loại trên giao diện; hủy/xác nhận hộp xét thưởng khi chuyển sang A3 |
| Excel | Đọc XLS/XLSX, preview, lọc lỗi/cảnh báo, tìm mã, Diff, chọn/bỏ chọn, xuất lỗi, commit đúng dòng sau lọc, Patch/ghi đè, số 0, ngày/số/trạng thái sai, phần mở rộng viết hoa, thất bại một phần |
| Báo cáo A3 | Tạo/đọc/sửa/xóa qua API, tìm kiếm có dấu ngoặc; chọn xuất PDF, xem trước và căn chỉnh, tự cân đối, lưu bố cục riêng/mặc định, xuất PDF từ trình chỉnh sửa |
| Thống kê | Lọc tháng, bật/tắt so sánh, biểu đồ nâng cao, chuyển từ số tổng về danh sách có bộ lọc, xuất PDF thống kê |
| Điện thoại | Biểu mẫu công khai và kiểm tra bắt buộc, danh sách quản trị, mở/hủy thêm mới, chuyển tab biểu đồ |
| Trợ lý AI | Bốn endpoint kiểm tra đầu vào trống và phản hồi từ nhà cung cấp giả lập |

PDF được tạo bằng luồng xuất thực của ứng dụng; kiểm tra chữ ký `%PDF-` và dung lượng, đính kèm trong báo cáo Playwright. Excel tải xuống được mở lại bằng SheetJS và kiểm tra dữ liệu. Bộ kiểm thử XSS riêng kiểm tra DOM của báo cáo, nhưng giả lập bước mã hóa PDF.

## Lỗi phát hiện và đã sửa

| Lỗi | Hành vi sau sửa |
| --- | --- |
| Desktop thiếu nút thêm ý tưởng | Có nút **Thêm ý tưởng** cho admin |
| Tạo từ quản trị làm rơi trường báo cáo/khen thưởng | Backend nhận các trường quản trị trong whitelist và lưu đầy đủ |
| Lưu thất bại nhưng hộp nhập đóng | Giữ hộp nhập, nội dung chưa lưu và thông báo lỗi |
| Sửa không hợp lệ có thể xóa ảnh cũ trước khi DB từ chối | Kiểm tra dữ liệu trước; xóa ảnh cũ sau khi lưu thành công; dọn ảnh mới nếu lưu thất bại |
| Lọc preview Excel làm lệch chỉ số dòng được chọn | Giữ chỉ số gốc xuyên suốt lọc, Diff, checkbox và commit |
| Import số 0 bị coi là ô trống | Giá trị 0 được lưu đúng |
| Patch/ghi đè xử lý ô trống sai, kể cả danh sách khen thưởng | Patch giữ dữ liệu ở ô trống; ghi đè cho phép xóa trường tùy chọn đã cung cấp |
| Ngày không tồn tại bị tự chuyển sang tháng khác | Báo lỗi dòng với ngày không hợp lệ như `31/02/2026` |
| Tiền như `123abc` bị đọc thành `123` | Báo lỗi đầu vào số thay vì cắt lấy tiền tố |
| Trạng thái thưởng không hợp lệ/mâu thuẫn bị chấp nhận; merge gây mâu thuẫn | Báo lỗi preview hoặc lỗi dòng khi merge, giữ dữ liệu cũ |
| Phương thức tính thưởng trong Excel bị bỏ qua | Nhận enum và nhãn tiếng Việt từ tệp xuất |
| Dòng thiếu mã gây lỗi 500 cho toàn bộ preview | Lưu dòng lỗi để người dùng xem và tải danh sách lỗi |
| Import báo thành công theo số dòng chọn, không theo kết quả thật | Hiển thị số dòng thành công/thất bại từ server và chi tiết lỗi |
| Hộp kết quả import tự đóng ngay khi tải lại danh sách | Giữ kết quả để người dùng đọc; bấm Đóng rồi mở lại sẽ bắt đầu lượt import mới |
| Tệp `.XLSX` viết hoa bị từ chối | Chấp nhận phần mở rộng Excel không phân biệt hoa/thường |
| Tìm A3 với `(` gây lỗi regex; ID/kiểu dữ liệu sai trả lỗi server | Escape chuỗi tìm kiếm; trả lỗi 400 với ID/dữ liệu không hợp lệ |
| Google Fonts bị CSP chặn | Đóng gói font Inter cùng ứng dụng và tải từ cùng origin |
| Ảnh hỏng ở form công khai không báo lỗi | Bắt lỗi giải mã ảnh, thông báo và cho phép chọn ảnh khác; giải phóng object URL |
| Đường dẫn ảnh đã xóa có thể rơi vào HTML fallback khi ghép SPA | `/uploads` trả 404 rõ ràng khi không tìm thấy ảnh |

Các bản vá bảo mật của đợt trước cũng được kiểm tra hồi quy: XSS trong PDF/email, bảo vệ dữ liệu và ảnh, cookie HttpOnly/Secure, CSRF, vai trò, thu hồi phiên, rate limit chung, parser Excel và proxy development.

## Chạy lại và xem bằng chứng

Cần cài dependencies ở thư mục gốc và `backend`, có Google Chrome. MongoMemoryServer có thể tải MongoDB binary ở lần chạy đầu.

```powershell
npm.cmd run test:e2e
npm.cmd --prefix backend run test:security
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --testPathPattern=securityReports
node node_modules/@playwright/test/cli.js show-report
```

Nếu đã build và chỉ muốn chạy lại bộ nghiệp vụ: `node node_modules/@playwright/test/cli.js test`.

- Cấu hình: [playwright.config.js](../playwright.config.js).
- Kịch bản trình duyệt: [user-flows.spec.js](../tests/e2e/user-flows.spec.js).
- Kịch bản API nghiệp vụ: [api-flows.spec.js](../tests/e2e/api-flows.spec.js).
- Server và dữ liệu giả: [server.cjs](../tests/e2e/server.cjs).
- Báo cáo HTML sau khi chạy: `playwright-report/index.html`, chứa PDF mẫu và ảnh màn hình. Khi thất bại có thêm screenshot/trace. Các tệp sinh ra được bỏ qua bởi Git.

## Giới hạn cần lưu ý

Đây là kiểm thử hồi quy các luồng đã liệt kê, không phải bằng chứng mọi tổ hợp dữ liệu/thao tác đều không có lỗi. Chưa chạy Safari/Firefox, thiết bị di động thật, kiểm thử tải cao hoặc dữ liệu production. PDF chưa được đối chiếu bố cục bằng mắt với mọi mẫu nội dung dài.

SMTP và AI thật chưa được kiểm tra đầu cuối. Các liên kết **Tính thưởng/Kết quả** được kiểm tra URL, cách mở tab và `noopener`; chưa kiểm tra quyền truy cập/nội dung Google Forms/Sheets bên ngoài. Chưa triển khai lên production hoặc xác nhận TLS/nginx trên máy chủ thật. Build frontend còn cảnh báo biến/import chưa dùng và bundle lớn; không có lỗi biên dịch trong lượt kiểm tra này.
