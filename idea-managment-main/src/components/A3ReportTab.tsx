import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import api from '../api/config';
import { Idea } from '../types';
import A3ReportForm from './A3ReportForm';

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

    console.log('Checking idea with code:', trimmedCode);

    try {
      // Gọi endpoint public /ideas/code/:ideaCode
      const { data } = await api.get(`/ideas/code/${encodeURIComponent(trimmedCode)}`);
      
      console.log('Received idea:', data);
      
      if (!data) {
        setError('Không tìm thấy ý tưởng với mã: ' + trimmedCode);
        return;
      }

      // Kiểm tra trạng thái
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
      console.error('Error checking idea:', error);
      
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card elevation={3} sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{ color: '#1976d2', fontWeight: 'bold' }}
          >
            Nhập báo cáo A3
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Typography
            variant="body1"
            gutterBottom
            sx={{ mb: 3, textAlign: 'center' }}
          >
            Nhập mã ý tưởng để kiểm tra và tạo báo cáo A3
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Hướng dẫn:</strong> Nhập mã ý tưởng bạn nhận được từ email thông báo vào ô bên dưới.
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <TextField
              fullWidth
              label="Mã ý tưởng"
              value={ideaCode}
              onChange={(e) => setIdeaCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ví dụ: 1234567890-123"
              variant="outlined"
              disabled={loading}
              helperText="Nhập chính xác mã ý tưởng từ email"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleCheckIdea}
              disabled={loading || !ideaCode.trim()}
              startIcon={
                loading ? <CircularProgress size={20} /> : <SearchIcon />
              }
              sx={{ minWidth: 140, height: 56 }}
            >
              {loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
            </Button>
          </Box>

          <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: '#1976d2', fontWeight: 'bold' }}
            >
              Hướng dẫn sử dụng:
            </Typography>
            <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
              <ol>
                <li><strong>Nhập mã ý tưởng:</strong> Copy mã từ email thông báo và dán vào ô trên</li>
                <li><strong>Kiểm tra mã:</strong> Nhấn nút "Kiểm tra" hoặc phím Enter</li>
                <li><strong>Xác nhận trạng thái:</strong> Hệ thống kiểm tra trạng thái "Lập báo cáo A3"</li>
                <li><strong>Nhập báo cáo:</strong> Form sẽ hiển thị với dữ liệu có sẵn</li>
                <li><strong>Hoàn thành:</strong> Điền thông tin và nhấn "Lưu và Export PDF"</li>
              </ol>
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  💡 Lưu ý: Chỉ ý tưởng đã được phê duyệt và ở trạng thái "Lập báo cáo A3" mới có thể nhập báo cáo.
                </Typography>
              </Box>
            </Typography>
          </Paper>
        </CardContent>
      </Card>
    </Container>
  );
};

export default A3ReportTab;