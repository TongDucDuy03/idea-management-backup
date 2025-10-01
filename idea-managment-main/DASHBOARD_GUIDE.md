# Hướng dẫn sử dụng Dashboard Thống kê

## Tổng quan
Dashboard Thống kê là một trang web mới được thêm vào hệ thống quản lý ý tưởng cải tiến, cung cấp các biểu đồ và thống kê chi tiết để phân tích dữ liệu ý tưởng.

## Tính năng chính

### 1. Thống kê cơ bản
- **Tổng số ý tưởng**: Hiển thị tổng số ý tưởng trong khoảng thời gian được chọn
- **Đã khen thưởng**: Số lượng ý tưởng đã được khen thưởng
- **Chưa xem xét**: Số lượng ý tưởng đang chờ xem xét
- **Tỷ lệ khen thưởng**: Phần trăm ý tưởng được khen thưởng

### 2. Biểu đồ trực quan
- **Biểu đồ tròn**: Phân bố trạng thái ý tưởng (Chưa xem xét, Đã khen thưởng, Không khen thưởng)
- **Biểu đồ cột**: Top 10 phòng ban có nhiều ý tưởng nhất
- **Biểu đồ đường**: Xu hướng ý tưởng theo tháng

### 3. Bộ lọc dữ liệu
- **Khoảng thời gian**: Tất cả, 7 ngày qua, 30 ngày qua, 3 tháng qua, 1 năm qua
- **Phòng ban**: Lọc theo phòng ban cụ thể hoặc tất cả phòng ban

### 4. Thống kê nâng cao
- **Hiệu suất phòng ban**: Bảng xếp hạng phòng ban theo tỷ lệ khen thưởng
- **Xu hướng theo tuần**: Biểu đồ xu hướng ý tưởng theo tuần
- **Tỷ lệ khen thưởng theo tháng**: Biểu đồ tỷ lệ khen thưởng theo tháng
- **Bảng xếp hạng chi tiết**: Bảng thống kê chi tiết với thanh tiến độ

### 5. Xuất báo cáo PDF
- **Báo cáo tóm tắt**: Chỉ bao gồm thống kê cơ bản
- **Báo cáo chi tiết**: Bao gồm danh sách đầy đủ các ý tưởng
- **Tùy chỉnh**: Có thể chọn khoảng thời gian và phòng ban

## Cách sử dụng

### Truy cập Dashboard
1. Đăng nhập vào hệ thống với tài khoản admin
2. Trong trang Admin Dashboard, nhấn nút "Dashboard Thống kê"
3. Hoặc truy cập trực tiếp qua URL: `/statistics`

### Sử dụng bộ lọc
1. Chọn khoảng thời gian từ dropdown "Khoảng thời gian"
2. Chọn phòng ban từ dropdown "Phòng ban"
3. Dữ liệu sẽ được cập nhật tự động

### Xem thống kê nâng cao
1. Nhấn nút "Hiện Thống kê Nâng cao"
2. Xem các biểu đồ và bảng thống kê chi tiết hơn
3. Nhấn "Ẩn Thống kê Nâng cao" để ẩn phần này

### Xuất báo cáo PDF
1. Nhấn nút "Xuất Báo cáo PDF"
2. Chọn loại báo cáo (Tóm tắt hoặc Chi tiết)
3. Xem thông tin báo cáo trong hộp thoại
4. Nhấn "Tạo PDF" để tải xuống

## Các loại biểu đồ

### 1. Biểu đồ tròn (Doughnut Chart)
- Hiển thị phân bố trạng thái ý tưởng
- Màu sắc: Cam (Chưa xem xét), Xanh lá (Đã khen thưởng), Đỏ (Không khen thưởng)

### 2. Biểu đồ cột (Bar Chart)
- Hiển thị top phòng ban có nhiều ý tưởng nhất
- Màu xanh dương cho tất cả cột

### 3. Biểu đồ đường (Line Chart)
- Hiển thị xu hướng ý tưởng theo tháng
- 3 đường: Tổng số ý tưởng, Đã khen thưởng, Không khen thưởng

### 4. Biểu đồ tròn (Pie Chart)
- Phân bố trạng thái trong thống kê nâng cao
- Tương tự biểu đồ tròn cơ bản

## Lưu ý quan trọng

1. **Quyền truy cập**: Chỉ admin mới có thể truy cập dashboard thống kê
2. **Dữ liệu thời gian thực**: Dữ liệu được cập nhật theo thời gian thực từ database
3. **Hiệu suất**: Với lượng dữ liệu lớn, việc tải có thể mất thời gian
4. **Xuất PDF**: Quá trình tạo PDF có thể mất vài giây, vui lòng chờ

## Khắc phục sự cố

### Lỗi không tải được dữ liệu
- Kiểm tra kết nối internet
- Đảm bảo đã đăng nhập với tài khoản admin
- Thử refresh trang

### Lỗi xuất PDF
- Đảm bảo trình duyệt hỗ trợ tải file
- Kiểm tra không có popup blocker
- Thử lại sau vài giây

### Biểu đồ không hiển thị
- Kiểm tra dữ liệu có tồn tại không
- Thử thay đổi bộ lọc thời gian/phòng ban
- Refresh trang

## Công nghệ sử dụng

- **Frontend**: React, TypeScript, Material-UI
- **Biểu đồ**: Chart.js, react-chartjs-2
- **Xuất PDF**: jsPDF, html2canvas
- **Styling**: Material-UI với custom theme

## Hỗ trợ

Nếu gặp vấn đề hoặc cần hỗ trợ, vui lòng liên hệ với team phát triển hoặc tạo ticket trong hệ thống quản lý dự án.
