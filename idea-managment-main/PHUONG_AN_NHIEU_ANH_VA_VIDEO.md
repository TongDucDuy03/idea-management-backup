# Phương án hỗ trợ nhiều ảnh và video cho ý tưởng

## Tổng quan
Hiện tại hệ thống chỉ hỗ trợ 2 ảnh (beforeImage và afterImage) lưu dưới dạng base64 string trong database. Để hỗ trợ nhiều ảnh và video, cần có các phương án sau:

---

## Phương án 1: Lưu trữ dạng Array trong Database (Đơn giản nhất)

### Ưu điểm:
- ✅ Dễ triển khai, không cần thay đổi nhiều
- ✅ Không cần cơ sở hạ tầng mới (file server, cloud storage)
- ✅ Tương thích ngược với dữ liệu cũ

### Nhược điểm:
- ❌ Giới hạn kích thước document MongoDB (16MB)
- ❌ Không phù hợp cho video lớn
- ❌ Tải chậm khi có nhiều file
- ❌ Tốn bộ nhớ database

### Cách triển khai:
1. **Thay đổi Schema:**
```typescript
// backend/src/models/Idea.ts
beforeImages?: string[];  // Array of base64 strings
afterImages?: string[];  // Array of base64 strings
videos?: string[];       // Array of base64 strings (hoặc URLs)
```

2. **Cập nhật UI:**
- Thay input file đơn thành input multiple
- Hiển thị preview dạng gallery
- Cho phép xóa từng ảnh/video

3. **Giới hạn:**
- Tối đa 5-10 ảnh/ý tưởng
- Video tối đa 5MB/file
- Tổng dung lượng tối đa 10MB/ý tưởng

---

## Phương án 2: Lưu trữ file trên Server (Khuyến nghị)

### Ưu điểm:
- ✅ Hỗ trợ file lớn (video, ảnh chất lượng cao)
- ✅ Database nhẹ, chỉ lưu đường dẫn
- ✅ Dễ quản lý và backup
- ✅ Có thể tối ưu hóa (CDN, compression)

### Nhược điểm:
- ❌ Cần cấu hình file storage
- ❌ Cần quản lý disk space
- ❌ Phức tạp hơn phương án 1

### Cách triển khai:

#### 2.1. Sử dụng thư mục public/uploads (Đơn giản)
```typescript
// backend/src/models/Idea.ts
beforeImages?: string[];  // Array of file paths: ["/uploads/idea-123/img1.jpg"]
afterImages?: string[];   
videos?: string[];        // ["/uploads/idea-123/video1.mp4"]
```

**Cấu trúc thư mục:**
```
backend/
  public/
    uploads/
      ideas/
        {ideaCode}/
          before/
            img1.jpg
            img2.jpg
          after/
            img1.jpg
          videos/
            video1.mp4
```

**API Endpoint:**
```typescript
// POST /api/ideas/:ideaCode/upload
// Upload file và trả về path
```

#### 2.2. Sử dụng Multer (Express middleware)
```bash
npm install multer
npm install @types/multer
```

```typescript
// backend/src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ideaCode = req.params.ideaCode;
    const uploadPath = `public/uploads/ideas/${ideaCode}`;
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif) hoặc video (mp4, mov, avi)'));
    }
  }
});
```

---

## Phương án 3: Lưu trữ trên Cloud Storage (Tốt nhất cho production)

### Ưu điểm:
- ✅ Không giới hạn dung lượng
- ✅ Tự động scale
- ✅ CDN tích hợp (tải nhanh)
- ✅ Backup tự động
- ✅ Không tốn server storage

### Nhược điểm:
- ❌ Có chi phí (nhưng thường rẻ)
- ❌ Cần cấu hình cloud service
- ❌ Phụ thuộc vào bên thứ 3

### Các lựa chọn Cloud Storage:

#### 3.1. AWS S3
```bash
npm install aws-sdk
# hoặc
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### 3.2. Google Cloud Storage
```bash
npm install @google-cloud/storage
```

#### 3.3. Cloudinary (Khuyến nghị - dễ nhất)
```bash
npm install cloudinary
```

**Ưu điểm Cloudinary:**
- ✅ Tự động optimize ảnh/video
- ✅ Transform on-the-fly (resize, crop, format)
- ✅ Free tier: 25GB storage, 25GB bandwidth/tháng
- ✅ Dễ tích hợp

**Ví dụ code:**
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file
const result = await cloudinary.uploader.upload(filePath, {
  folder: `ideas/${ideaCode}`,
  resource_type: 'auto' // Tự động detect image/video
});

// Lưu URL vào database
beforeImages: [result.secure_url]
```

---

## Phương án 4: Hybrid - Ảnh lưu base64, Video lưu file (Cân bằng)

### Ưu điểm:
- ✅ Ảnh nhỏ → lưu base64 (tiện lợi)
- ✅ Video lớn → lưu file (hiệu quả)
- ✅ Dễ migrate từ code hiện tại

### Nhược điểm:
- ❌ Logic phức tạp hơn (2 cách lưu)
- ❌ Vẫn có giới hạn với ảnh

### Cách triển khai:
```typescript
// backend/src/models/Idea.ts
beforeImages?: string[];     // Base64 cho ảnh
afterImages?: string[];     
videoUrls?: string[];        // File paths/URLs cho video
```

---

## So sánh các phương án

| Tiêu chí | Phương án 1 (Array Base64) | Phương án 2 (File Server) | Phương án 3 (Cloud) | Phương án 4 (Hybrid) |
|----------|---------------------------|---------------------------|---------------------|---------------------|
| **Độ phức tạp** | ⭐ Dễ | ⭐⭐ Trung bình | ⭐⭐⭐ Khó | ⭐⭐ Trung bình |
| **Chi phí** | ⭐⭐⭐ Miễn phí | ⭐⭐⭐ Miễn phí | ⭐⭐ Có phí | ⭐⭐⭐ Miễn phí |
| **Hiệu năng** | ⭐⭐ Trung bình | ⭐⭐⭐ Tốt | ⭐⭐⭐ Rất tốt | ⭐⭐⭐ Tốt |
| **Khả năng mở rộng** | ⭐ Hạn chế | ⭐⭐ Tốt | ⭐⭐⭐ Rất tốt | ⭐⭐ Tốt |
| **Phù hợp video** | ❌ Không | ✅ Có | ✅✅ Rất tốt | ✅ Có |
| **Thời gian triển khai** | 1-2 ngày | 3-5 ngày | 5-7 ngày | 3-4 ngày |

---

## Khuyến nghị

### Cho giai đoạn hiện tại (MVP):
**Phương án 2 (File Server)** - Cân bằng giữa độ phức tạp và hiệu quả

### Cho production lâu dài:
**Phương án 3 (Cloudinary)** - Dễ dùng, có free tier, tự động optimize

---

## Chi tiết triển khai Phương án 2 (File Server)

### Bước 1: Cài đặt dependencies
```bash
cd backend
npm install multer
npm install @types/multer
```

### Bước 2: Tạo upload middleware
File: `backend/src/middleware/upload.ts` (xem code ở trên)

### Bước 3: Tạo upload route
```typescript
// backend/src/routes/uploadRoutes.ts
import express from 'express';
import { upload } from '../middleware/upload';
import path from 'path';

const router = express.Router();

router.post('/ideas/:ideaCode/upload', upload.array('files', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];
  const ideaCode = req.params.ideaCode;
  
  const filePaths = files.map(file => 
    `/uploads/ideas/${ideaCode}/${file.filename}`
  );
  
  res.json({ 
    success: true, 
    files: filePaths 
  });
});

export default router;
```

### Bước 4: Cập nhật Model
```typescript
// backend/src/models/Idea.ts
beforeImages?: string[];  // ["/uploads/ideas/IDEA001/img1.jpg"]
afterImages?: string[];
videos?: string[];
```

### Bước 5: Cập nhật Frontend
```typescript
// src/components/IdeaForm.tsx
const [beforeImages, setBeforeImages] = useState<string[]>([]);
const [afterImages, setAfterImages] = useState<string[]>([]);
const [videos, setVideos] = useState<string[]>([]);

const handleFileUpload = async (files: FileList, type: 'before' | 'after' | 'video') => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });
  
  const response = await api.post(
    `/upload/ideas/${ideaCode}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  // Cập nhật state với URLs
  if (type === 'before') setBeforeImages([...beforeImages, ...response.data.files]);
  // ...
};
```

### Bước 6: UI Component cho nhiều file
```tsx
<Box>
  <Button variant="outlined" component="label">
    Tải lên nhiều ảnh trước
    <input 
      type="file" 
      accept="image/*" 
      multiple 
      hidden 
      onChange={(e) => handleFileUpload(e.target.files, 'before')} 
    />
  </Button>
  
  {/* Gallery preview */}
  <Grid container spacing={2} sx={{ mt: 2 }}>
    {beforeImages.map((img, idx) => (
      <Grid item xs={4} key={idx}>
        <Box position="relative">
          <img src={img} alt={`Before ${idx + 1}`} style={{ width: '100%' }} />
          <IconButton 
            onClick={() => removeImage('before', idx)}
            sx={{ position: 'absolute', top: 0, right: 0 }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Grid>
    ))}
  </Grid>
</Box>
```

---

## Migration từ code hiện tại

### Bước 1: Giữ tương thích ngược
```typescript
// Hỗ trợ cả beforeImage (cũ) và beforeImages (mới)
if (idea.beforeImage) {
  // Convert sang array
  idea.beforeImages = [idea.beforeImage];
}
```

### Bước 2: Script migrate
```typescript
// backend/src/scripts/migrateImages.ts
// Convert base64 images sang file storage
```

---

## Giới hạn đề xuất

- **Số lượng file:**
  - Ảnh: Tối đa 10 ảnh/loại (before/after) = 20 ảnh/ý tưởng
  - Video: Tối đa 3 video/ý tưởng

- **Kích thước file:**
  - Ảnh: 15MB/file (đã cập nhật)
  - Video: 50MB/file

- **Tổng dung lượng:**
  - Tối đa 100MB/ý tưởng

---

## Kết luận

**Khuyến nghị triển khai theo thứ tự:**
1. ✅ **Ngay lập tức:** Phương án 2 (File Server) - Đơn giản, hiệu quả
2. 🔄 **Sau đó:** Nâng cấp lên Phương án 3 (Cloudinary) khi cần scale

**Lý do:**
- Phương án 2 dễ triển khai, không cần thay đổi nhiều
- Có thể migrate dễ dàng lên Cloudinary sau này
- Đáp ứng được nhu cầu hiện tại và tương lai gần

