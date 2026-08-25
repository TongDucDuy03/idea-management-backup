# Khắc phục sự cố A3 Tab

## 🚨 Lỗi "Không thể kiểm tra mã ý tưởng"

### Nguyên nhân thường gặp:

#### 1. **Lỗi kết nối backend (ERR_CONNECTION_REFUSED)**
```
Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
```

**Giải pháp:**
- ✅ **Đã sửa:** Hệ thống đã được cấu hình để sử dụng API production từ Render
- 🔄 **Refresh trang** để áp dụng cấu hình mới
- 🌐 **Kiểm tra kết nối internet** - đảm bảo có thể truy cập internet

#### 2. **Mã ý tưởng không đúng**
```
Không tìm thấy ý tưởng với mã: [mã]
```

**Giải pháp:**
- ✅ **Kiểm tra mã ý tưởng** - copy đầy đủ từ email
- 📧 **Kiểm tra email** - tìm email thông báo chuyển trạng thái
- 🔍 **Thử lại** - đảm bảo không có khoảng trắng thừa

#### 3. **Ý tưởng chưa ở trạng thái A3**
```
Ý tưởng này chưa ở trạng thái "Lập báo cáo A3"
```

**Giải pháp:**
- ⏳ **Chờ admin chuyển trạng thái** - liên hệ admin hệ thống
- 📧 **Kiểm tra email** - chờ email thông báo trạng thái mới
- 🔄 **Thử lại sau** - khi trạng thái đã được cập nhật

## 🔧 Các bước khắc phục

### Bước 1: Kiểm tra kết nối
1. Mở **Developer Tools** (F12)
2. Vào tab **Network**
3. Thử nhập mã ý tưởng
4. Xem có lỗi kết nối không

### Bước 2: Kiểm tra mã ý tưởng
1. **Copy chính xác** mã từ email
2. **Không có khoảng trắng** đầu/cuối
3. **Đầy đủ ký tự** - thường có dạng: `1757756910185-670`

### Bước 3: Kiểm tra trạng thái
1. **Liên hệ admin** để xác nhận trạng thái ý tưởng
2. **Chờ email thông báo** khi trạng thái thay đổi
3. **Thử lại** sau khi nhận email

## 📞 Hỗ trợ

Nếu vẫn gặp vấn đề:
1. **Chụp màn hình lỗi** 
2. **Ghi lại mã ý tưởng** đang sử dụng
3. **Liên hệ admin** với thông tin trên

## ✅ Kiểm tra nhanh

- ✅ **Internet:** Có kết nối internet không?
- ✅ **Mã ý tưởng:** Copy đúng từ email?
- ✅ **Trạng thái:** Ý tưởng đã chuyển sang "Lập báo cáo A3"?
- ✅ **Browser:** Thử refresh trang (Ctrl+F5)?
