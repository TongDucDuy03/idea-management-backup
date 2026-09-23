import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import MainPageWithTabs from './components/MainPageWithTabs';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import PublicLayout from './layouts/PublicLayout';
import MainLayout from './layouts/MainLayout';

/**
 * Hai trang quản trị kéo theo phần lớn dung lượng bundle (biểu đồ, DataGrid,
 * xuất Excel/PDF). Tải động để người dùng trang gửi ý tưởng công khai không
 * phải tải số code đó.
 */
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const StatisticsDashboard = lazy(() => import('./components/StatisticsDashboard'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public pages with glass navbar */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <MainPageWithTabs />
              </PublicLayout>
            }
          />
          <Route
            path="/login"
            element={<Login />}
          />

          {/* Admin pages with sidebar layout */}
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <MainLayout>
                  <AdminDashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-view"
            element={
              <MainLayout isViewOnly={true}>
                <AdminDashboard isViewOnly={true} />
              </MainLayout>
            }
          />
          <Route
            path="/statistics"
            element={
              <PrivateRoute>
                <MainLayout>
                  <StatisticsDashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/statistics-view"
            element={
              <MainLayout isViewOnly={true}>
                <StatisticsDashboard isViewOnly={true} />
              </MainLayout>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
