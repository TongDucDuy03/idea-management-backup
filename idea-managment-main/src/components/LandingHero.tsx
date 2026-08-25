import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Container, Grid } from '@mui/material';
import {
  Lightbulb,
  TrendingUp,
  EmojiEvents,
  ArrowForward,
} from '@mui/icons-material';
import { COLORS } from '../theme/theme';

// Counter animation hook
function useCountUp(end: number, duration: number = 2000, start: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!start) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start]);

  return { count, ref };
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, suffix = '', color, delay }) => {
  const { count } = useCountUp(value, 2000);

  return (
    <Box
      className="animate-fadeInUp"
      sx={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        textAlign: 'center',
        p: { xs: 1.25, sm: 1.75 },
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        },
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: { xs: 34, sm: 40 },
          height: { xs: 34, sm: 40 },
          borderRadius: '12px',
          backgroundColor: `${color}20`,
          color: color,
          mb: 1,
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          color: '#fff',
          fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.7rem' },
          lineHeight: 1.2,
        }}
      >
        {count}
        {suffix}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: COLORS.slate[400],
          fontWeight: 500,
          mt: 0.5,
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

interface LandingHeroProps {
  onScrollToForm: () => void;
  totalIdeas?: number;
  approvedIdeas?: number;
  rewardedIdeas?: number;
}

const LandingHero: React.FC<LandingHeroProps> = ({
  onScrollToForm,
  totalIdeas = 0,
  approvedIdeas = 0,
  rewardedIdeas = 0,
}) => {
  return (
    <Box
      sx={{
        position: 'relative',
        background: `linear-gradient(135deg, ${COLORS.navy.main} 0%, ${COLORS.slate[800]} 40%, ${COLORS.blue[900]} 100%)`,
        backgroundSize: '200% 200%',
        animation: 'gradientShift 10s ease infinite',
        color: '#fff',
        overflow: 'hidden',
        py: { xs: 3, sm: 4, md: 5 },
      }}
    >
      {/* Background decorative blobs */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.blue[500]}15 0%, transparent 70%)`,
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '5%',
          right: '10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.blue[400]}10 0%, transparent 70%)`,
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box className="animate-fadeInUp" sx={{ opacity: 0 }}>
              {/* Badge */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.75,
                  py: 0.5,
                  borderRadius: '20px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  mb: { xs: 1.5, sm: 2 },
                }}
              >
                <Lightbulb sx={{ fontSize: 14, color: COLORS.blue[400] }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: COLORS.blue[300],
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  }}
                >
                  Cổng sáng kiến VICO
                </Typography>
              </Box>

              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '1.65rem', sm: '2rem', md: '2.4rem' },
                  lineHeight: 1.2,
                  mb: { xs: 1.25, sm: 1.75 },
                  background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #93c5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Sáng tạo không giới hạn,
                <br />
                Cải tiến không ngừng
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: COLORS.slate[400],
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                  lineHeight: 1.7,
                  mb: { xs: 2.5, sm: 3 },
                  maxWidth: 520,
                }}
              >
                Gửi ý tưởng cải tiến dễ dàng ngay trên điện thoại và nhận mã xác nhận
                riêng chỉ trong khoảng hai phút.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  endIcon={<ArrowForward />}
                  onClick={onScrollToForm}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${COLORS.blue[500]} 0%, ${COLORS.blue[600]} 100%)`,
                    boxShadow: `0 4px 20px ${COLORS.blue[500]}40`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${COLORS.blue[400]} 0%, ${COLORS.blue[500]} 100%)`,
                      boxShadow: `0 8px 30px ${COLORS.blue[500]}50`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  🚀 Gửi ý tưởng ngay
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} md={5}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={4}>
                <StatCard
                  icon={<Lightbulb />}
                  value={totalIdeas}
                  label="Ý tưởng đã gửi"
                  color={COLORS.blue[400]}
                  delay={200}
                />
              </Grid>
              <Grid item xs={4}>
                <StatCard
                  icon={<TrendingUp />}
                  value={approvedIdeas}
                  label="Đã triển khai"
                  color={COLORS.emerald[400]}
                  delay={400}
                />
              </Grid>
              <Grid item xs={4}>
                <StatCard
                  icon={<EmojiEvents />}
                  value={rewardedIdeas}
                  label="Được khen thưởng"
                  suffix=""
                  color={COLORS.amber[400]}
                  delay={600}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LandingHero;
