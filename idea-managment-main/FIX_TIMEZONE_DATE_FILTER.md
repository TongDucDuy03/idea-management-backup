# Sửa lỗi Timezone trong Bộ lọc Thời gian

## Vấn đề

Khi sử dụng `toISOString()` để format date, JavaScript tự động chuyển đổi sang UTC timezone, gây ra lỗi:

- **Tháng 11**: Đáng lẽ `2024-11-01` nhưng lại thành `2024-10-31`
- **Tuần này**: Đáng lẽ Thứ 2 tuần này nhưng lại Chủ nhật tuần trước
- **Quý 4**: Đáng lẽ `2024-10-01` nhưng có thể thành `2024-09-30`
- **Năm 2024**: Đáng lẽ `2024-01-01` nhưng có thể thành `2023-12-31`

### Nguyên nhân

```typescript
// ❌ SAI - Chuyển sang UTC
const date = new Date(2024, 10, 1); // 1/11/2024 local time
const isoString = date.toISOString(); // "2024-10-31T17:00:00.000Z" (UTC)
const dateOnly = isoString.split('T')[0]; // "2024-10-31" ❌ SAI!
```

**Giải thích:**
- Việt Nam là UTC+7
- `2024-11-01 00:00:00` (local) = `2024-10-31 17:00:00` (UTC)
- Khi split lấy phần date, nhận được `2024-10-31` thay vì `2024-11-01`

## Giải pháp

### Helper Function

```typescript
// ✅ ĐÚNG - Format theo local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() trả về 0-11
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**Tại sao hoạt động:**
- `getFullYear()`, `getMonth()`, `getDate()` đều trả về giá trị theo **local timezone**
- Không bị ảnh hưởng bởi UTC conversion
- Format thủ công thành `YYYY-MM-DD`

### Code đã sửa

```typescript
const handleQuickDateFilter = (type: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
  const today = new Date();
  const todayStr = formatLocalDate(today); // ✅ Sử dụng local timezone
  
  switch (type) {
    case 'today':
      setDateFrom(todayStr);
      setDateTo(todayStr);
      break;
      
    case 'week':
      // Tuần này bắt đầu từ Thứ 2
      const weekStart = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(today.getDate() - daysToMonday);
      setDateFrom(formatLocalDate(weekStart)); // ✅ Local timezone
      setDateTo(todayStr);
      break;
      
    case 'month':
      // Tháng này bắt đầu từ ngày 1
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(formatLocalDate(monthStart)); // ✅ Local timezone
      setDateTo(todayStr);
      break;
      
    case 'quarter':
      // Quý này bắt đầu từ ngày 1 của tháng đầu quý
      const currentMonth = today.getMonth(); // 0-11
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, hoặc 9
      const quarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);
      setDateFrom(formatLocalDate(quarterStart)); // ✅ Local timezone
      setDateTo(todayStr);
      break;
      
    case 'year':
      // Năm này bắt đầu từ ngày 1/1
      const yearStart = new Date(today.getFullYear(), 0, 1);
      setDateFrom(formatLocalDate(yearStart)); // ✅ Local timezone
      setDateTo(todayStr);
      break;
  }
};
```

## Test Cases

### Test Case 1: Hôm nay là 24/11/2024 (Chủ nhật)

| Loại | dateFrom mong muốn | dateTo mong muốn | Kết quả |
|------|-------------------|------------------|---------|
| Hôm nay | 2024-11-24 | 2024-11-24 | ✅ |
| Tuần này | 2024-11-18 (Thứ 2) | 2024-11-24 | ✅ |
| Tháng này | 2024-11-01 | 2024-11-24 | ✅ |
| Quý này | 2024-10-01 | 2024-11-24 | ✅ |
| Năm nay | 2024-01-01 | 2024-11-24 | ✅ |

### Test Case 2: Hôm nay là 01/11/2024 (Thứ 6)

| Loại | dateFrom mong muốn | dateTo mong muốn | Kết quả |
|------|-------------------|------------------|---------|
| Hôm nay | 2024-11-01 | 2024-11-01 | ✅ |
| Tuần này | 2024-10-28 (Thứ 2) | 2024-11-01 | ✅ |
| Tháng này | 2024-11-01 | 2024-11-01 | ✅ |
| Quý này | 2024-10-01 | 2024-11-01 | ✅ |
| Năm nay | 2024-01-01 | 2024-11-01 | ✅ |

### Test Case 3: Hôm nay là 01/01/2024 (Thứ 2)

| Loại | dateFrom mong muốn | dateTo mong muốn | Kết quả |
|------|-------------------|------------------|---------|
| Hôm nay | 2024-01-01 | 2024-01-01 | ✅ |
| Tuần này | 2024-01-01 (Thứ 2) | 2024-01-01 | ✅ |
| Tháng này | 2024-01-01 | 2024-01-01 | ✅ |
| Quý này | 2024-01-01 | 2024-01-01 | ✅ |
| Năm nay | 2024-01-01 | 2024-01-01 | ✅ |

## So sánh Trước và Sau

### Trước (SAI)

```typescript
const monthStart = new Date(2024, 10, 1); // 1/11/2024 local
const dateFrom = monthStart.toISOString().split('T')[0];
// Kết quả: "2024-10-31" ❌ (bị lùi 1 ngày do UTC conversion)
```

### Sau (ĐÚNG)

```typescript
const monthStart = new Date(2024, 10, 1); // 1/11/2024 local
const dateFrom = formatLocalDate(monthStart);
// Kết quả: "2024-11-01" ✅ (đúng local timezone)
```

## Lưu ý quan trọng

1. **Luôn dùng `formatLocalDate()`** thay vì `toISOString().split('T')[0]`
2. **Date constructor** (`new Date(year, month, day)`) đã tạo date theo local timezone
3. **Không cần sửa `dateTo`** vì đã đúng (dùng `todayStr` từ `formatLocalDate(today)`)
4. **Tương thích với mọi múi giờ**: UTC+7 (Việt Nam), UTC+8, UTC+9, v.v.

## Các phương pháp khác (không khuyến nghị)

### Phương pháp 1: Dùng `toLocaleDateString()` (phức tạp)

```typescript
// Không khuyến nghị - phụ thuộc vào locale
const dateStr = date.toLocaleDateString('en-CA'); // "2024-11-01"
```

**Vấn đề:** Phụ thuộc vào locale, có thể không hoạt động trên mọi trình duyệt.

### Phương pháp 2: Manual offset (không chính xác)

```typescript
// Không khuyến nghị - hardcode offset
const offset = date.getTimezoneOffset() * 60000;
const localDate = new Date(date.getTime() - offset);
```

**Vấn đề:** Phức tạp và dễ sai.

### Phương pháp 3: Thư viện (overkill)

```typescript
// Không khuyến nghị - thêm dependency không cần thiết
import { format } from 'date-fns';
const dateStr = format(date, 'yyyy-MM-dd');
```

**Vấn đề:** Thêm dependency, tăng bundle size.

## Kết luận

✅ **Giải pháp đơn giản nhất và hiệu quả nhất:**
- Tạo helper function `formatLocalDate()`
- Sử dụng `getFullYear()`, `getMonth()`, `getDate()` (đều trả về local timezone)
- Format thủ công thành `YYYY-MM-DD`

**Code đã được áp dụng trong `StatisticsDashboard.tsx`**

