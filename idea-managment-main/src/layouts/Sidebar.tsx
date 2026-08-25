import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { COLORS } from '../theme/theme';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;

interface SidebarProps {
  isViewOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isViewOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    {
      label: 'Tổng quan',
      icon: <DashboardIcon />,
      path: isViewOnly ? '/admin-view' : '/admin',
    },
    {
      label: 'Thống kê',
      icon: <AssessmentIcon />,
      path: isViewOnly ? '/statistics-view' : '/statistics',
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: `linear-gradient(180deg, ${COLORS.navy.main} 0%, ${COLORS.slate[800]} 100%)`,
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Logo Area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          px: collapsed && !isMobile ? 1 : 2.5,
          py: 2.5,
          minHeight: 72,
        }}
      >
        {(!collapsed || isMobile) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/vico-logo.png"
              alt="VICO"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                objectFit: 'contain',
                backgroundColor: 'rgba(255,255,255,0.1)',
                p: 0.5,
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  background: 'linear-gradient(135deg, #fff 0%, #93c5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                VICO
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: COLORS.slate[400],
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Ý tưởng Cải tiến
              </Typography>
            </Box>
          </Box>
        )}
        {!isMobile && (
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{
              color: COLORS.slate[400],
              '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {/* Home link */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Tooltip title={collapsed && !isMobile ? 'Trang chủ' : ''} placement="right" arrow>
            <ListItemButton
              onClick={() => navigate('/')}
              sx={{
                borderRadius: '10px',
                minHeight: 44,
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                px: collapsed && !isMobile ? 1.5 : 2,
                color: COLORS.slate[400],
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed && !isMobile ? 0 : 40,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                <HomeIcon fontSize="small" />
              </ListItemIcon>
              {(!collapsed || isMobile) && (
                <ListItemText
                  primary="Trang chủ"
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1, mx: 1 }} />

        {(!collapsed || isMobile) && (
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 1,
              display: 'block',
              color: COLORS.slate[500],
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: '0.65rem',
              fontWeight: 700,
            }}
          >
            Quản lý
          </Typography>
        )}

        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed && !isMobile ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: '10px',
                    minHeight: 44,
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    px: collapsed && !isMobile ? 1.5 : 2,
                    backgroundColor: active
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                    color: active ? '#fff' : COLORS.slate[400],
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: active
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                    },
                    ...(active && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 20,
                        borderRadius: '0 3px 3px 0',
                        backgroundColor: COLORS.blue[400],
                      },
                    }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed && !isMobile ? 0 : 40,
                      color: active ? COLORS.blue[400] : 'inherit',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {(!collapsed || isMobile) && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Footer / Logout */}
      <Box sx={{ px: 1.5, pb: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
        {!isViewOnly && (
          <Tooltip title={collapsed && !isMobile ? 'Đăng xuất' : ''} placement="right" arrow>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: '10px',
                minHeight: 44,
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                px: collapsed && !isMobile ? 1.5 : 2,
                color: COLORS.slate[400],
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: COLORS.red[400],
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed && !isMobile ? 0 : 40,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {(!collapsed || isMobile) && (
                <ListItemText
                  primary="Đăng xuất"
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        )}

        {/* Admin avatar */}
        {(!collapsed || isMobile) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              mt: 1,
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                backgroundColor: COLORS.blue[500],
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {isViewOnly ? 'V' : 'A'}
            </Avatar>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }}
              >
                {isViewOnly ? 'Xem công khai' : 'Admin'}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: COLORS.slate[500], fontSize: '0.7rem' }}
              >
                {isViewOnly ? 'Chế độ xem' : 'Quản trị viên'}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  // Mobile: hamburger menu button
  const mobileMenuButton = isMobile ? (
    <IconButton
      onClick={() => setMobileOpen(true)}
      sx={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1300,
        backgroundColor: COLORS.navy.main,
        color: '#fff',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        '&:hover': {
          backgroundColor: COLORS.slate[800],
        },
      }}
    >
      <MenuIcon />
    </IconButton>
  ) : null;

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <>
      {mobileMenuButton}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Drawer
            variant="permanent"
            sx={{
              width: sidebarWidth,
              '& .MuiDrawer-paper': {
                width: sidebarWidth,
                boxSizing: 'border-box',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                borderRight: 'none',
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}
    </>
  );
};

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };
export default Sidebar;
