import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Container,
  useScrollTrigger,
  Slide,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Assessment as AssessmentIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { COLORS } from '../theme/theme';

interface PublicLayoutProps {
  children: React.ReactNode;
}

// Hide navbar on scroll down
function HideOnScroll({ children }: { children: React.ReactElement }) {
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Thống kê công khai', path: '/statistics-view', icon: <AssessmentIcon /> },
    { label: 'Admin', path: '/login', icon: <AdminIcon /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Glass Navbar */}
      <HideOnScroll>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: scrolled
              ? 'rgba(255, 255, 255, 0.85)'
              : 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: scrolled
              ? `1px solid ${COLORS.slate[200]}`
              : '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
          }}
        >
          <Container maxWidth="lg">
            <Toolbar
              disableGutters
              sx={{ minHeight: { xs: 64, md: 72 }, justifyContent: 'space-between' }}
            >
              {/* Logo */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                  transition: 'opacity 0.2s',
                }}
                onClick={() => navigate('/')}
              >
                <Box
                  component="img"
                  src="/vico-logo.png"
                  alt="VICO"
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    objectFit: 'contain',
                  }}
                />
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: COLORS.navy.main,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    VICO
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: COLORS.slate[500],
                      fontSize: '0.6rem',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    Cải tiến liên tục
                  </Typography>
                </Box>
              </Box>

              {/* Desktop Nav */}
              {!isMobile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      variant={location.pathname === item.path ? 'contained' : 'text'}
                      size="small"
                      sx={{
                        color:
                          location.pathname === item.path ? '#fff' : COLORS.slate[600],
                        fontWeight: 600,
                        px: 2,
                        py: 1,
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        ...(location.pathname !== item.path && {
                          '&:hover': {
                            backgroundColor: COLORS.slate[100],
                          },
                        }),
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>
              )}

              {/* Mobile Menu Toggle */}
              {isMobile && (
                <IconButton
                  onClick={() => setMobileMenuOpen(true)}
                  sx={{ color: COLORS.navy.main }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Toolbar>
          </Container>
        </AppBar>
      </HideOnScroll>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            borderRadius: '16px 0 0 16px',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  sx={{
                    borderRadius: '10px',
                    mb: 0.5,
                    backgroundColor:
                      location.pathname === item.path
                        ? `${COLORS.blue[50]}`
                        : 'transparent',
                  }}
                >
                  <ListItemIcon sx={{ color: COLORS.blue[500], minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: location.pathname === item.path ? 700 : 500,
                      fontSize: '0.938rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Spacer for fixed navbar */}
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          pb: { xs: 9, md: 3 }, // Leave space for fixed bottom nav on mobile
          textAlign: 'center',
          borderTop: `1px solid ${COLORS.slate[200]}`,
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} VICO – Hệ thống Quản lý Ý tưởng Cải tiến.
          Phát triển bởi Phòng Cải tiến.
        </Typography>
      </Box>

      {/* Mobile App Bottom Navigation Bar */}
      {isMobile && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderRadius: 0,
            borderTop: `1px solid ${COLORS.slate[200]}`,
          }}
        >
          <BottomNavigation
            value={location.pathname}
            onChange={(_, newValue) => {
              navigate(newValue);
            }}
            showLabels
            sx={{
              height: 60,
              backgroundColor: '#ffffff',
              '& .MuiBottomNavigationAction-root': {
                color: COLORS.slate[500],
                minWidth: 'auto',
                py: 0.75,
                '&.Mui-selected': {
                  color: COLORS.blue[600],
                  fontWeight: 700,
                },
              },
            }}
          >
            <BottomNavigationAction
              label="Trang chủ"
              value="/"
              icon={<HomeIcon />}
            />
            <BottomNavigationAction
              label="Thống kê"
              value="/statistics-view"
              icon={<AssessmentIcon />}
            />
            <BottomNavigationAction
              label="Admin"
              value="/login"
              icon={<AdminIcon />}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default PublicLayout;
