import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  PersonOutline,
} from '@mui/icons-material';
import { COLORS } from '../theme/theme';
import api from '../api/config';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });
      localStorage.setItem('token', response.data.token);
      navigate('/admin');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Left Panel – Branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          background: `linear-gradient(135deg, ${COLORS.navy.main} 0%, ${COLORS.slate[800]} 40%, ${COLORS.blue[900]} 100%)`,
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease infinite',
          color: '#fff',
          p: 6,
          overflow: 'hidden',
        }}
      >
        {/* Background decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.blue[500]}22 0%, transparent 70%)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-15%',
            left: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.blue[400]}15 0%, transparent 70%)`,
          }}
        />

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            maxWidth: 420,
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="/vico-logo.png"
            alt="VICO"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              objectFit: 'contain',
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              p: 1,
              mb: 4,
              animation: 'float 3s ease-in-out infinite',
            }}
          />

          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 2,
              lineHeight: 1.2,
              background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Hệ thống Quản lý
            <br />
            Ý tưởng Cải tiến
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: COLORS.slate[400],
              lineHeight: 1.8,
              fontSize: '1.05rem',
            }}
          >
            Nền tảng số hóa quy trình tiếp nhận, đánh giá
            <br />
            và khen thưởng ý tưởng cải tiến toàn doanh nghiệp
          </Typography>

          {/* Stats */}
          <Box
            sx={{
              display: 'flex',
              gap: 4,
              mt: 5,
              justifyContent: 'center',
            }}
          >
            {[
              { label: 'Phòng ban', value: '20+' },
              { label: 'Nhanh hơn', value: '10x' },
              { label: 'Bảo mật', value: '100%' },
            ].map((stat) => (
              <Box key={stat.label} sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: COLORS.blue[400],
                    mb: 0.5,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: COLORS.slate[500],
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right Panel – Login Form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 480px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6 },
          py: 4,
          backgroundColor: '#fff',
        }}
      >
        <Box
          className="animate-fadeInUp"
          sx={{ width: '100%', maxWidth: 380 }}
        >
          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              gap: 1.5,
              mb: 4,
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src="/vico-logo.png"
              alt="VICO"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                objectFit: 'contain',
              }}
            />
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: COLORS.navy.main }}
            >
              VICO
            </Typography>
          </Box>

          {/* Welcome text */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: COLORS.navy.main,
                mb: 1,
              }}
            >
              Đăng nhập
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Chào mừng trở lại! Vui lòng nhập thông tin để tiếp tục.
            </Typography>
          </Box>

          {/* Error */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                animation: 'scaleIn 0.3s ease-out',
              }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: COLORS.slate[400] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <TextField
              fullWidth
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ color: COLORS.slate[400] }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: COLORS.slate[400] }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !username || !password}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${COLORS.blue[500]} 0%, ${COLORS.blue[600]} 100%)`,
                boxShadow: `0 4px 14px 0 ${COLORS.blue[500]}40`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${COLORS.blue[600]} 0%, ${COLORS.blue[700]} 100%)`,
                  boxShadow: `0 6px 20px 0 ${COLORS.blue[500]}50`,
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&.Mui-disabled': {
                  background: COLORS.slate[200],
                  color: COLORS.slate[400],
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </Box>

          {/* Back to home */}
          <Button
            onClick={() => navigate('/')}
            sx={{
              mt: 3,
              color: COLORS.slate[500],
              fontSize: '0.875rem',
              '&:hover': {
                color: COLORS.blue[500],
                backgroundColor: 'transparent',
              },
            }}
          >
            ← Quay lại trang chủ
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;