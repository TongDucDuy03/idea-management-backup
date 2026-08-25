# Cấu hình API cho hệ thống ý tưởng

## 🎯 Vấn đề đã được giải quyết

**Trước đây:** Frontend cố gắng kết nối đến `localhost:5000` (backend local)
**Bây giờ:** Frontend luôn kết nối đến `https://idea-managment.onrender.com/api` (backend production)

## 🔧 Thay đổi cấu hình

### File: `src/api/config.ts`

```typescript
// Trước đây (có vấn đề):
const API_URL = process.env.REACT_APP_API_URL || RENDER_URL;

// Bây giờ (đã sửa):
const API_URL = RENDER_URL; // Luôn sử dụng Render production
```

### Lợi ích:

1. **Đồng bộ dữ liệu:** Frontend và backend cùng sử dụng database production
2. **Không cần chạy backend local:** Tiết kiệm tài nguyên
3. **Ổn định hơn:** Render server có uptime cao
4. **Dễ deploy:** Không cần cấu hình phức tạp

## 🚀 Cách sử dụng

### Cho người dùng thường:
- **Không cần làm gì** - hệ thống tự động sử dụng production API
- **Refresh trang** để áp dụng cấu hình mới

### Cho developer:
- **Muốn dùng local backend:** Sửa `API_URL = LOCAL_URL` trong `config.ts`
- **Muốn dùng custom API:** Thêm biến môi trường `REACT_APP_API_URL`

## ✅ Kiểm tra cấu hình

1. **Mở Developer Tools** (F12)
2. **Vào tab Network**
3. **Thử chức năng A3 tab**
4. **Xem requests** - phải gọi đến `idea-managment.onrender.com`

## 🔍 Troubleshooting

### Nếu vẫn lỗi ERR_CONNECTION_REFUSED:
1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5)
3. **Kiểm tra internet** - đảm bảo có thể truy cập Render

### Nếu muốn dùng local backend:
1. **Chạy backend local:** `cd backend && npm run build && npm start`
2. **Sửa config.ts:** `const API_URL = LOCAL_URL;`
3. **Restart frontend:** `npm start`

## 📝 Ghi chú

- **Production API:** `https://idea-managment.onrender.com/api`
- **Local API:** `http://localhost:5000/api`
- **Database:** MongoDB Atlas (shared giữa production và local)
