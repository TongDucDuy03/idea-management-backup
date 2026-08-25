import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPageWithTabs from './components/MainPageWithTabs';
import AdminDashboard from './components/AdminDashboard';
import StatisticsDashboard from './components/StatisticsDashboard';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import PublicLayout from './layouts/PublicLayout';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;