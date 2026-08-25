import axios from "axios";

// Luôn ưu tiên URL cấu hình; mặc định dùng đường dẫn tương đối.
// Development: React dev server chuyển /api tới backend qua "proxy" trong package.json.
// Production: Nginx chuyển /api tới backend theo cấu hình triển khai.
// Nhờ đó máy khác trong LAN không gọi nhầm localhost:5000 trên chính máy của họ.
const BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const TOKEN_STORAGE_KEY = 'token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Trình duyệt có thể chặn localStorage (chế độ riêng tư)
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* bỏ qua */
  }
}

// Khởi tạo instance axios
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Tự động gắn token vào mọi request.
 *
 * Trước đây mỗi lời gọi API phải tự đọc localStorage rồi gắn header — lặp lại
 * ở 9 chỗ khác nhau, rất dễ quên một chỗ.
 */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Xử lý token hết hạn tập trung: xóa token khi server trả 401.
 *
 * Việc điều hướng vẫn để component tự quyết (dùng react-router), vì các trang
 * chỉ-xem công khai không cần đăng nhập nên không được đá người dùng ra ngoài.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  }
);

// Hàm GET có fallback
export async function getWithFallback<T = any>(path: string) {
  try {
    return await api.get<T>(path);
  } catch (err: any) {
    console.error(
      `API GET Error for ${BASE_URL}${path}:`,
      err.response?.status,
      err.message
    );
    throw err;
  }
}

// Hàm POST có fallback
export async function postWithFallback<T = any>(path: string, body: any) {
  try {
    return await api.post<T>(path, body);
  } catch (err: any) {
    console.error(
      `API POST Error for ${BASE_URL}${path}:`,
      err.response?.status,
      err.message
    );
    throw err;
  }
}

// Hàm PUT có fallback
export async function putWithFallback<T = any>(path: string, body: any) {
  try {
    return await api.put<T>(path, body);
  } catch (err: any) {
    console.error(
      `API PUT Error for ${BASE_URL}${path}:`,
      err.response?.status,
      err.message
    );
    throw err;
  }
}

// Hàm DELETE có fallback
export async function deleteWithFallback<T = any>(path: string) {
  try {
    return await api.delete<T>(path);
  } catch (err: any) {
    console.error(
      `API DELETE Error for ${BASE_URL}${path}:`,
      err.response?.status,
      err.message
    );
    throw err;
  }
}

export default api;
