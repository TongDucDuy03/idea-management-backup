# Hướng dẫn triển khai với Nginx

## Tổng quan
Cấu hình này cho phép:
- Frontend chạy tại `http://172.104.39.94` (port 80)
- Backend chạy tại `127.0.0.1:5000` (local)
- Nginx tự động proxy các request `/api` từ frontend đến backend
- Nginx xử lý `/uploads/*` để trả file ảnh upload (tránh bị SPA fallback trả `index.html`)

## 1. Cài đặt và cấu hình Nginx

### Cài đặt Nginx (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nginx
```

### Cấu hình Nginx
1. Copy file `nginx.conf` vào thư mục cấu hình:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/idea-management
sudo ln -s /etc/nginx/sites-available/idea-management /etc/nginx/sites-enabled/
```

2. Xóa cấu hình default (tùy chọn):
```bash
sudo rm /etc/nginx/sites-enabled/default
```

3. Test cấu hình:
```bash
sudo nginx -t
```

4. Restart Nginx:
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 2. Build và deploy Frontend

### Build React app
```bash
cd idea-managment-main
npm install
npm run build
```

### Copy build files đến web directory
```bash
sudo mkdir -p /var/www/html/idea-management
sudo cp -r build/* /var/www/html/idea-management/
sudo chown -R www-data:www-data /var/www/html/idea-management
```

## 3. Chạy Backend

### Cài đặt dependencies
```bash
cd backend
npm install
```

### Build TypeScript
```bash
npm run build
```

### Chạy backend (production)
```bash
# Sử dụng PM2 để quản lý process
npm install -g pm2
pm2 start dist/index.js --name "idea-management-backend"
pm2 save
pm2 startup
```

### Hoặc chạy trực tiếp
```bash
npm start
```

## 4. Cấu hình Environment Variables

Tạo file `.env` trong thư mục `backend`:
```env
MONGODB_URI=mongodb://localhost:27017/idea-management
JWT_SECRET=your-secret-key-here
NODE_ENV=production
PORT=5000
```

## 5. Kiểm tra hoạt động

1. **Frontend**: Truy cập `http://172.104.39.94`
2. **API**: Test endpoint `http://172.104.39.94/api/ideas`
3. **Uploads**: Test ảnh `http://172.104.39.94/uploads/<file>.jpg` (phải trả Content-Type image/*, không phải HTML)
3. **Backend logs**: `pm2 logs idea-management-backend`

### Kiểm tra headers của ảnh (quan trọng)
```bash
curl -I "https://idea.ducthangloi.com/uploads/<file>.jpg"
```
Kỳ vọng:
- `Content-Type: image/jpeg` (hoặc `image/png`, `image/webp`...)
- `Content-Length` đúng (không quá nhỏ như HTML/index.html)

## 6. Troubleshooting

### Kiểm tra Nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Kiểm tra backend
```bash
# Kiểm tra port 5000 có đang chạy không
netstat -tlnp | grep :5000

# Kiểm tra PM2 status
pm2 status
```

### Restart services
```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart backend
pm2 restart idea-management-backend
```

## 7. Lợi ích của cấu hình này

✅ **Portable**: Frontend build có thể chạy ở bất kỳ đâu mà không cần sửa code
✅ **Secure**: Backend chỉ listen trên localhost
✅ **Performance**: Nginx serve static files hiệu quả
✅ **CORS**: Không cần cấu hình CORS phức tạp
✅ **SSL Ready**: Dễ dàng thêm SSL certificate sau này

## 8. Thêm SSL (HTTPS) - Tùy chọn

```bash
# Cài đặt Certbot
sudo apt install certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Thêm dòng: 0 12 * * * /usr/bin/certbot renew --quiet
```
