import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as DescriptionIcon,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import api from '../api/config';
import { Idea } from '../types';
import A3ReportForm from './A3ReportForm';
import { COLORS } from '../theme/theme';

const A3ReportTab: React.FC = () => {
  const [ideaCode, setIdeaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [idea, setIdea] = useState<Idea | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleCheckIdea = async () => {
    const trimmedCode = ideaCode.trim();
    
    if (!trimmedCode) {
      setError('Vui lòng nhập mã ý tưởng');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setIdea(null);
    setShowForm(false);

    try {
      const { data } = await api.get(`/ideas/code/${encodeURIComponent(trimmedCode)}`);
      
      if (!data) {
        setError('Không tìm thấy ý tưởng với mã: ' + trimmedCode);
        return;
      }

      if (data.implementationStatus !== 'Lập báo cáo A3') {
        setError(
          `Ý tưởng này chưa ở trạng thái "Lập báo cáo A3".\nTrạng thái hiện tại: ${data.implementationStatus || 'Chưa xác định'}`
        );
        return;
      }

      setIdea(data);
      setSuccess('✓ Tìm thấy ý tưởng phù hợp. Bạn có thể nhập báo cáo A3.');
      setShowForm(true);
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        setError('Không tìm thấy ý tưởng với mã: ' + trimmedCode);
      } else if (error.response?.status === 401) {
        setError('Lỗi xác thực. Vui lòng liên hệ quản trị viên.');
      } else {
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
        setError('Không thể kiểm tra mã ý tưởng. Chi tiết: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIdea(null);
    setIdeaCode('');
    setError('');
    setSuccess('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleCheckIdea();
    }
  };

  if (showForm && idea) {
    return <A3ReportForm idea={idea} onClose={handleCloseForm} />;
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box className="animate-fadeIn" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '16px',
              backgroundColor: COLORS.blue[50],
              color: COLORS.blue[500],
              mb: 2,
            }}
          >
            <DescriptionIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.navy.main, mb: 1 }}>
            Nhập báo cáo A3
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
            Nhập mã ý tưởng để kiểm tra trạng thái và tạo báo cáo A3
          </Typography>
        </Box>

        {/* Error / Success */}
        {error && (
          <Alert severity="error" sx={{ borderRadius: '12px', whiteSpace: 'pre-wrap' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ borderRadius: '12px' }}
            icon={<CheckCircle />}
          >
            {success}
          </Alert>
        )}

        {/* Search */}
        <Card
          sx={{
            borderRadius: '16px',
            border: `1px solid ${COLORS.slate[200]}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'stretch' }}>
              <TextField
                fullWidth
                label="Mã ý tưởng"
                value={ideaCode}
                onChange={(e) => setIdeaCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ví dụ: 1234567890-123"
                disabled={loading}
                helperText="Nhập chính xác mã ý tưởng từ email thông báo"
                InputProps={{
                  style: { fontSize: '16px' },
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: COLORS.slate[400] }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleCheckIdea}
                disabled={loading || !ideaCode.trim()}
                sx={{
                  minWidth: { xs: '100%', sm: 130 },
                  height: 56,
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: `0 4px 14px ${COLORS.blue[500]}30`,
                }}
              >
                {loading ? (
                  <CircularProgress size={22} sx={{ color: '#fff' }} />
                ) : (
                  'Kiểm tra'
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Guide */}
        <Card
          sx={{
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${COLORS.slate[50]} 0%, #ffffff 100%)`,
            border: `1px solid ${COLORS.slate[200]}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Info sx={{ color: COLORS.blue[500], fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.navy.main }}>
                Hướng dẫn sử dụng
              </Typography>
            </Box>
            <Box sx={{ pl: 4.5 }}>
              {[
                { step: 1, text: 'Copy mã ý tưởng từ email thông báo và dán vào ô trên' },
                { step: 2, text: 'Nhấn nút "Kiểm tra" hoặc phím Enter' },
                { step: 3, text: 'Hệ thống kiểm tra trạng thái "Lập báo cáo A3"' },
                { step: 4, text: 'Form sẽ hiển thị để bạn điền thông tin' },
                { step: 5, text: 'Hoàn thành và nhấn "Lưu và Export PDF"' },
              ].map(({ step, text }) => (
                <Box key={step} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '8px',
                      backgroundColor: COLORS.blue[50],
                      color: COLORS.blue[600],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}
                  >
                    {step}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {text}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Alert
              severity="info"
              sx={{
                mt: 2,
                borderRadius: '10px',
                backgroundColor: COLORS.blue[50],
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                💡 Chỉ ý tưởng ở trạng thái "Lập báo cáo A3" mới có thể nhập báo cáo.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default A3ReportTab;