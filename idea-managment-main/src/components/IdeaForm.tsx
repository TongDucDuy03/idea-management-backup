import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Container,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';
import api from '../api/config';

const departments = [
  'Phòng Hành chính nhân sự',
  'Phòng Nghiên cứu thí nghiệm',
  'Phòng Kinh doanh quốc tế',
  'Phòng Kinh tế kế toán',
  'Phòng Kỹ thuật công nghệ',
  'Phòng Kiểm soát chất lượng',
  'Phòng Kế hoạch',
  'Phòng Vật tư',
  'Phòng Thiết bị',
  'Phòng Cải tiến',
  'PX Mẫu Xốp',
  'PX Khuôn',
  'PX Đúc 1',
  'PX Hoàn thiện',
  'PX Nhiệt luyện',
  'PX Cơ điện',
  'PX GCCK',
  'Nhà máy DISA',
  'Thư ký ISO',
  'Thư ký An toàn 5S'
];

const IdeaForm: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    department: '',
    idea: ''
  });
  const [errors, setErrors] = useState({
    department: '',
    idea: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ideaCode, setIdeaCode] = useState('');

  const validateForm = () => {
    const newErrors = {
      department: '',
      idea: ''
    } as any;
    let isValid = true;

    if (!formData.department.trim()) {
      newErrors.department = 'Vui lòng chọn đơn vị làm việc';
      isValid = false;
    }
    if (!formData.idea.trim()) {
      newErrors.idea = 'Vui lòng nhập ý tưởng';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
    // Clear error when user selects an option
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await axios.post('https://idea-managment.onrender.com/api/ideas', {
        ...formData
      });
      setSuccess(true);
      setIdeaCode(response.data.ideaCode);
      setFormData({
        fullName: '',
        department: '',
        idea: ''
      });
      setTimeout(() => {
        setSuccess(false);
        setIdeaCode('');
      }, 10000); // Hiển thị trong 10 giây
    } catch (error: any) {
      setError(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2,
          background: 'linear-gradient(to bottom right, #ffffff, #f5f5f5)'
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            color: '#1976d2',
            fontWeight: 'bold',
            mb: 4
          }}
        >
          Đề xuất ý tưởng Cải tiến
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Card sx={{ mb: 3, bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Gửi ý tưởng thành công!
              </Typography>
              <Typography variant="body1">
                Mã ý tưởng của bạn là: <strong style={{ color: '#1976d2' }}>{ideaCode}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Vui lòng lưu lại mã này để nhận thưởng.
              </Typography>
            </CardContent>
          </Card>
        )}
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 3 
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="fullName"
                label="Họ và tên"
                value={formData.fullName}
                onChange={handleChange}
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.department}>
                <InputLabel>Đơn vị làm việc</InputLabel>
                <Select
                  name="department"
                  value={formData.department}
                  onChange={handleSelectChange}
                  label="Đơn vị làm việc"
                  sx={{ 
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: errors.department ? 'error.main' : 'inherit',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  }}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
                {errors.department && (
                  <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                    {errors.department}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="idea"
                label="Ý tưởng"
                value={formData.idea}
                onChange={handleChange}
                required
                fullWidth
                multiline
                rows={6}
                error={!!errors.idea}
                helperText={errors.idea}
                placeholder="Mô tả chi tiết ý tưởng cải tiến của bạn..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />
            </Grid>
          </Grid>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            size="large"
            sx={{ 
              mt: 2,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textTransform: 'none',
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s'
              }
            }}
          >
            Gửi ý tưởng
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default IdeaForm; 