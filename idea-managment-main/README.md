# Hệ thống Quản lý Ý tưởng Cải tiến

Hệ thống cho phép người dùng gửi ý tưởng cải tiến và quản trị viên theo dõi, quản lý các ý tưởng đã gửi.

## Tính năng

### Trang người dùng
- Form nhập ý tưởng cải tiến với các trường:
  - Họ và tên
  - Đơn vị làm việc
  - Ý tưởng cải tiến
  - Giải pháp đề xuất
- Tự động sinh mã ý tưởng duy nhất
- Hiển thị thông báo thành công và mã ý tưởng

### Trang quản trị
- Xem danh sách tất cả ý tưởng đã gửi
- Tìm kiếm theo tên hoặc mã ý tưởng
- Lọc theo trạng thái thanh toán
- Xuất dữ liệu ra file Excel
- Cập nhật trạng thái thanh toán

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd idea-management-system
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Khởi động ứng dụng:
```bash
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000

## Công nghệ sử dụng

- React
- TypeScript
- Material-UI
- React Router
- XLSX

## Cấu trúc dự án

```
src/
  ├── components/
  │   ├── IdeaForm.tsx
  │   └── AdminDashboard.tsx
  ├── types/
  │   └── index.ts
  ├── App.tsx
  └── index.tsx
```

## Phát triển

1. Tạo branch mới:
```bash
git checkout -b feature/ten-tinh-nang
```

2. Commit thay đổi:
```bash
git commit -m "Thêm tính năng mới"
```

3. Push lên repository:
```bash
git push origin feature/ten-tinh-nang
```

## Đóng góp

Mọi đóng góp đều được hoan nghênh. Vui lòng tạo issue hoặc pull request để đóng góp. 