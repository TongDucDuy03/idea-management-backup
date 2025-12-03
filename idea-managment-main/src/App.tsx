import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import MainPageWithTabs from './components/MainPageWithTabs';
import AdminDashboard from './components/AdminDashboard';
import StatisticsDashboard from './components/StatisticsDashboard';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<MainPageWithTabs />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          {/* Admin chỉ xem, dùng cho điều hướng từ statistics-view */}
          <Route
            path="/admin-view"
            element={<AdminDashboard isViewOnly={true} />}
          />
          <Route
            path="/statistics"
            element={
              <PrivateRoute>
                <StatisticsDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/statistics-view"
            element={<StatisticsDashboard isViewOnly={true} />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 