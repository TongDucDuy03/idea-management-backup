import axios from 'axios';

const RENDER_URL = 'https://idea-managment.onrender.com/api';
const LOCAL_URL = 'http://localhost:5000/api';

// Chọn baseURL theo môi trường:
// - Luôn sử dụng RENDER_URL (production) để đồng bộ với backend
// - Chỉ dùng LOCAL_URL khi có biến môi trường cụ thể
const API_URL = RENDER_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper: thử gọi base chính, nếu lỗi thì thử base dự phòng
export async function getWithFallback<T = any>(path: string) {
  const primaryBase = api.defaults.baseURL || RENDER_URL;
  try {
    return await axios.get<T>(`${primaryBase}${path}`);
  } catch (err: any) {
    console.error(`API Error for ${primaryBase}${path}:`, err.response?.status, err.message);
    throw err; // Không fallback về localhost nữa
  }
}

export async function putWithFallback<T = any>(path: string, body: any) {
  const primaryBase = api.defaults.baseURL || RENDER_URL;
  try {
    return await axios.put<T>(`${primaryBase}${path}`, body);
  } catch (err: any) {
    console.error(`API Error for ${primaryBase}${path}:`, err.response?.status, err.message);
    throw err; // Không fallback về localhost nữa
  }
}

export default api;