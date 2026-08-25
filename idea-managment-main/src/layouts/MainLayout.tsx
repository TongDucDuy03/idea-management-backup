import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  isViewOnly?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, isViewOnly = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Sidebar isViewOnly={isViewOnly} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          overflow: 'auto',
          pt: isMobile ? 8 : 0,
          transition: 'padding 0.3s ease',
        }}
      >
        <Box
          className="animate-fadeIn"
          sx={{
            p: { xs: 1.5, sm: 2, md: 2.5 },
            width: '100%',
            maxWidth: 'none',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
