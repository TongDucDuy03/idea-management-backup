# Hướng dẫn sửa lỗi CORS

## Lỗi gặp phải

```
Access to XMLHttpRequest at 'http://localhost:5000/api/ideas' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' 
when the request's credentials mode is 'include'.
```

## Nguyên nhân

1. **Frontend** đang gửi request với `withCredentials: true` (trong `src/api/config.ts`)
2. **Backend** đang dùng CORS mặc định với `Access-Control-Allow-Origin: *` (wildcard)
3. **Browser security**: Khi request có credentials, không được dùng wildcard `*`, phải chỉ định origin cụ thể

## Giải pháp đã áp dụng

### 1. Sửa cấu hình CORS trong Backend (`backend/src/index.ts`)

**Trước:**
```typescript
app.use(cors()); // Mặc định dùng wildcard *
```

**Sau:**
```typescript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://172.104.39.94'
    : 'http://localhost:3000', // Development origin
  credentials: true, // Cho phép gửi cookies và credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(cors(corsOptions));
```

### 2. Rebuild Backend

Sau khi sửa, cần rebuild backend:

```bash
cd backend
npm run build
npm start
# hoặc nếu đang dùng nodemon
npm run dev
```

## Các tùy chọn khác (nếu vẫn gặp lỗi)

### Tùy chọn 1: Bỏ `withCredentials` nếu không cần

Nếu không cần gửi cookies/credentials, có thể bỏ `withCredentials: true` trong `src/api/config.ts`:

```typescript
const api = axios.create({
  baseURL: BASE_URL,
  // withCredentials: true, // Bỏ dòng này
  headers: {
    "Content-Type": "application/json",
  },
});
```

**Lưu ý:** Nếu dùng JWT token trong header thì không cần `withCredentials`.

### Tùy chọn 2: Cho phép nhiều origins

Nếu cần hỗ trợ nhiều origins:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://172.104.39.94',
  // Thêm các origins khác
];

const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
```

### Tùy chọn 3: Dùng environment variable

Tạo file `.env` trong `backend/`:

```env
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Sau đó trong code:

```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  // ...
};
```

## Kiểm tra sau khi sửa

1. **Restart backend server**
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Kiểm tra Network tab** trong DevTools:
   - Request headers có `Origin: http://localhost:3000`
   - Response headers có:
     - `Access-Control-Allow-Origin: http://localhost:3000` (không phải `*`)
     - `Access-Control-Allow-Credentials: true`

## Lưu ý quan trọng

- ✅ **Development**: Dùng `http://localhost:3000`
- ✅ **Production**: Dùng domain/IP cụ thể (không dùng wildcard)
- ✅ **Credentials**: Khi có `withCredentials: true`, phải chỉ định origin cụ thể
- ❌ **Không được**: Dùng `*` khi có credentials

## Troubleshooting

### Vẫn gặp lỗi sau khi sửa?

1. **Kiểm tra backend đã restart chưa:**
   ```bash
   # Dừng server cũ (Ctrl+C)
   # Rebuild và start lại
   cd backend
   npm run build
   npm start
   ```

2. **Kiểm tra port:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

3. **Kiểm tra console log:**
   - Backend có log "Server is running on port 5000"?
   - Có lỗi nào khác không?

4. **Test với Postman/curl:**
   ```bash
   curl -X GET http://localhost:5000/api/ideas \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -v
   ```

5. **Kiểm tra browser console:**
   - Xem Network tab → chọn request → Headers
   - Kiểm tra Request Headers và Response Headers

## Tham khảo

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Axios withCredentials](https://axios-http.com/docs/config_defaults)

