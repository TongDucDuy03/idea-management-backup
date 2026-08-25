import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import IdeaForm from './IdeaForm';
import LandingHero from './LandingHero';
import { COLORS } from '../theme/theme';
import api from '../api/config';

const MainPageWithTabs: React.FC = () => {
  const formRef = useRef<HTMLDivElement>(null);

  // Stats for hero
  const [stats, setStats] = useState({ total: 0, approved: 0, rewarded: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Dùng endpoint đếm sẵn ở server thay vì tải toàn bộ danh sách ý tưởng
        // (kèm ảnh base64) chỉ để lấy 3 con số.
        const response = await api.get('/ideas/stats');
        const { total = 0, approved = 0, rewarded = 0 } = response.data || {};
        setStats({ total, approved, rewarded });
      } catch {
        // Silently fail – hero will show 0s
      }
    };
    fetchStats();
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <LandingHero
        onScrollToForm={scrollToForm}
        totalIdeas={stats.total}
        approvedIdeas={stats.approved}
        rewardedIdeas={stats.rewarded}
      />

      {/* Form Section */}
      <Box ref={formRef} sx={{ backgroundColor: COLORS.slate[50] }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          {/* Section Header */}
          <Box
            className="animate-fadeInUp"
            sx={{
              textAlign: 'center',
              mb: 4,
              opacity: 0,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: COLORS.navy.main,
                mb: 1.5,
                fontSize: { xs: '1.5rem', md: '1.8rem' },
              }}
            >
              Bắt đầu đề xuất ý tưởng
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              Chia sẻ sáng kiến của bạn để cùng xây dựng môi trường làm việc tốt hơn mỗi ngày.
            </Typography>
          </Box>

          {/* Idea submission card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: '20px',
              border: `1px solid ${COLORS.slate[200]}`,
              overflow: 'visible',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Box className="animate-fadeIn" sx={{ px: { xs: 0, md: 2 }, py: 4 }}>
                <IdeaForm />
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
};

export default MainPageWithTabs;
