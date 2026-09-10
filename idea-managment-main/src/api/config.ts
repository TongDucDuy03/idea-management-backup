import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface SessionInfo {
  user: { userId: string; role: 'admin' | 'viewer' };
  csrfToken: string;
}
let session: SessionInfo | null = null;
let pendingSession: Promise<SessionInfo> | null = null;
// Remove credentials left by the previous release; never read or send them.
try { localStorage.removeItem('token'); } catch { /* storage may be disabled */ }
export function clearSession(): void { session = null; }
export function setSession(value: SessionInfo): void { session = value; }

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });
export async function loadSession(force = false): Promise<SessionInfo> {
  if (session && !force) return session;
  if (!pendingSession) {
    pendingSession = api.get<SessionInfo>('/auth/session').then(({ data }) => {
      session = data;
      return data;
    }).finally(() => { pendingSession = null; });
  }
  return pendingSession;
}
api.interceptors.request.use(async config => {
  const method = (config.method || 'get').toLowerCase();
  const path = (config.url || '').split('?')[0].replace(/\/$/, '');
  const isPublicWrite = method === 'post' && (path === '/auth/login' || path === '/ideas' || path.startsWith('/ai/'));
  if (!['get', 'head', 'options'].includes(method) && !isPublicWrite) {
    const current = await loadSession();
    config.headers['X-CSRF-Token'] = current.csrfToken;
  }
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) clearSession();
  return Promise.reject(error);
});
export async function logout(): Promise<void> {
  try { await api.post('/auth/logout'); }
  catch (error: any) { if (error.response?.status !== 401) throw error; }
  clearSession();
}

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
