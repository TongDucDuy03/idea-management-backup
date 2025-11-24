# Hướng dẫn xử lý lỗi Build trên Server

## Các lỗi thường gặp và cách khắc phục

### 1. Lỗi TypeScript Compilation

**Triệu chứng:**
```
error TS2307: Cannot find module '...'
error TS2322: Type '...' is not assignable to type '...'
```

**Cách khắc phục:**
```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install

# Hoặc với yarn
rm -rf node_modules yarn.lock
yarn install

# Build lại
npm run build
```

---

### 2. Lỗi Missing Dependencies

**Triệu chứng:**
```
Module not found: Can't resolve '...'
Cannot find module '...'
```

**Cách khắc phục:**
```bash
# Frontend
cd idea-managment-main
npm install

# Backend
cd backend
npm install
```

**Kiểm tra các dependencies cần thiết:**
- Frontend: `react`, `react-dom`, `@mui/material`, `axios`, `html2canvas`, `jspdf`
- Backend: `express`, `mongoose`, `typescript`, `ts-node`

---

### 3. Lỗi Build Script

**Triệu chứng:**
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
```

**Cách khắc phục:**

#### Frontend:
```bash
cd idea-managment-main
npm cache clean --force
rm -rf node_modules build
npm install
npm run build
```

#### Backend:
```bash
cd backend
rm -rf node_modules dist
npm install
npm run build
```

---

### 4. Lỗi TypeScript Strict Mode

**Triệu chứng:**
```
error TS2345: Argument of type '...' is not assignable to parameter of type '...'
```

**Cách khắc phục tạm thời (nếu cần):**
Sửa file `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": false,  // Tạm thời tắt strict mode
    // ... các options khác
  }
}
```

**Hoặc sửa code để đúng type:**
```typescript
// Thêm type assertion nếu cần
const value = someValue as ExpectedType;
```

---

### 5. Lỗi Memory khi Build

**Triệu chứng:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
JavaScript heap out of memory
```

**Cách khắc phục:**
```bash
# Tăng memory limit cho Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Hoặc trên Windows
set NODE_OPTIONS=--max-old-space-size=4096
npm run build
```

---

### 6. Lỗi do File mới (PHUONG_AN_NHIEU_ANH_VA_VIDEO.md)

**Nếu file markdown gây lỗi:**
- File `.md` không nên ảnh hưởng đến build
- Nếu có lỗi, có thể do TypeScript đang include file này

**Kiểm tra `tsconfig.json`:**
```json
{
  "include": ["src"],  // Chỉ include thư mục src
  "exclude": ["**/*.md", "node_modules"]  // Exclude file markdown
}
```

---

### 7. Lỗi do thay đổi code gần đây

**Các file đã thay đổi:**
- `src/components/IdeaForm.tsx` - Đã sửa giới hạn 3MB → 15MB
- `src/components/IdeaDialog.tsx` - Đã sửa giới hạn 3MB → 15MB
- `src/components/A3ReportForm.tsx` - Đã sửa giới hạn 3MB → 15MB

**Kiểm tra syntax:**
```bash
# Frontend - Check TypeScript
cd idea-managment-main
npx tsc --noEmit

# Backend - Check TypeScript
cd backend
npx tsc --noEmit
```

---

## Checklist khi Pull Code mới

### Bước 1: Clean và Reinstall
```bash
# Frontend
cd idea-managment-main
rm -rf node_modules package-lock.json build
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json dist
npm install
```

### Bước 2: Kiểm tra TypeScript
```bash
# Frontend
cd idea-managment-main
npx tsc --noEmit

# Backend
cd backend
npm run build
```

### Bước 3: Build
```bash
# Frontend
cd idea-managment-main
npm run build

# Backend
cd backend
npm run build
```

### Bước 4: Kiểm tra lỗi runtime
```bash
# Backend - Test start
cd backend
npm start

# Frontend - Test start (development)
cd idea-managment-main
npm start
```

---

## Lệnh Debug nhanh

### Xem log chi tiết khi build:
```bash
npm run build -- --verbose
```

### Xem version Node.js và npm:
```bash
node -v
npm -v
```

### Kiểm tra dependencies đã cài:
```bash
npm list --depth=0
```

---

## Các lỗi cụ thể và fix

### Lỗi: "Cannot find name 'React'"
**Fix:** Đảm bảo import React:
```typescript
import React from 'react';
```

### Lỗi: "Property 'X' does not exist on type 'Y'"
**Fix:** Kiểm tra type definition trong `src/types/index.ts`

### Lỗi: "Module not found: Can't resolve '@mui/material'"
**Fix:**
```bash
npm install @mui/material @emotion/react @emotion/styled
```

### Lỗi: "Cannot find module 'html2canvas'"
**Fix:**
```bash
npm install html2canvas jspdf
```

---

## Nếu vẫn không fix được

1. **Xem log đầy đủ:**
   ```bash
   npm run build 2>&1 | tee build-error.log
   ```

2. **Kiểm tra version:**
   - Node.js: >= 14.x
   - npm: >= 6.x
   - TypeScript: >= 4.9.x

3. **Thử build trên môi trường sạch:**
   ```bash
   # Clone lại repo
   git clone <repo-url>
   cd idea-managment-main
   npm install
   npm run build
   ```

4. **Kiểm tra file .gitignore:**
   - Đảm bảo `node_modules`, `build`, `dist` đã được ignore

---

## Liên hệ

Nếu vẫn gặp lỗi, vui lòng cung cấp:
1. Thông báo lỗi đầy đủ (full error message)
2. Version Node.js và npm
3. OS và version
4. Lệnh đã chạy
5. File log (nếu có)


