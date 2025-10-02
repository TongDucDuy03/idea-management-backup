import axios from "axios";

// Base URL cho API - sử dụng relative path để Nginx proxy tự động xử lý
const BASE_URL = "/api";

// Khởi tạo instance axios
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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

