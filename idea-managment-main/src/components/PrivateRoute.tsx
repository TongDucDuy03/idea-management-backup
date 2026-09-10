import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { loadSession, SessionInfo } from '../api/config';

interface PrivateRouteProps { children: React.ReactNode; allowViewer?: boolean; }
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowViewer = false }) => {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'anonymous' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    loadSession(true).then(value => {
      if (active) { setSession(value); setState('ready'); }
    }).catch(error => {
      if (active) setState(error.response?.status === 401 ? 'anonymous' : 'error');
    });
    return () => { active = false; };
  }, []);
  if (state === 'loading') return <Box sx={{ p: 4 }}><CircularProgress aria-label="Đang kiểm tra đăng nhập" /></Box>;
  if (state === 'error') return <Alert severity="error">Không thể kiểm tra phiên đăng nhập. Vui lòng tải lại trang.</Alert>;
  if (state === 'anonymous') return <Navigate to="/login" replace />;
  if (!allowViewer && session?.user.role !== 'admin') return <Navigate to="/admin-view" replace />;
  return <>{children}</>;
};
export default PrivateRoute;
