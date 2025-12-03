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
  CardContent,
  Link
} from '@mui/material';
import { ContactSupport, Phone, AutoAwesome } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import api from '../api/config';
import ImageLightbox from './ImageLightbox';

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
    idea: '',
    solution: '',
    benefit: '',
    topicTitle: '',
    beforeImage: '',
    afterImage: ''
  });
  const [errors, setErrors] = useState({
    department: '',
    idea: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ideaCode, setIdeaCode] = useState('');
  
  // AI states
  const [aiLoading, setAiLoading] = useState({
    improveDescription: false,
    suggestSolution: false,
    suggestBenefit: false,
    suggestTopicTitle: false
  });
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  const handleImageClick = (imageUrl: string, title: string) => {
    setLightboxImage(imageUrl);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    setLightboxImage(null);
    setLightboxTitle('');
  };

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

  // Hàm tối ưu hóa hình ảnh với compression mạnh hơn
  const optimizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Tính toán kích thước mới (giảm kích thước tối đa)
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Vẽ hình ảnh đã resize
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Thử nhiều mức quality để đảm bảo kích thước nhỏ
        let optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Nếu vẫn quá lớn (>500KB), giảm quality xuống
        if (optimizedDataUrl.length > 500000) {
          optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
        }
        
        // Nếu vẫn quá lớn (>300KB), giảm kích thước thêm
        if (optimizedDataUrl.length > 300000) {
          const smallerCanvas = document.createElement('canvas');
          const smallerCtx = smallerCanvas.getContext('2d');
          smallerCanvas.width = width * 0.8;
          smallerCanvas.height = height * 0.8;
          smallerCtx?.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
          optimizedDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.3);
        }
        
        console.log(`Image optimized: ${file.size} bytes -> ${optimizedDataUrl.length} bytes (${Math.round((1 - optimizedDataUrl.length / file.size) * 100)}% reduction)`);
        resolve(optimizedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'beforeImage' | 'afterImage'
  ) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    // Kiểm tra kích thước file (giới hạn 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError(`File ${field === 'beforeImage' ? 'hình trước' : 'hình sau'} quá lớn. Vui lòng chọn file nhỏ hơn 15MB.`);
      return;
    }
    
    try {
      // Tối ưu hóa hình ảnh trước khi lưu
      const optimizedDataUrl = await optimizeImage(file);
      setFormData(prev => ({ ...prev, [field]: optimizedDataUrl }));
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error(`Error processing ${field} image:`, error);
      setError(`Lỗi khi xử lý hình ảnh ${field === 'beforeImage' ? 'trước' : 'sau'}. Vui lòng thử lại.`);
    }
  };

  // AI Functions
  const handleImproveDescription = async () => {
    if (!formData.idea.trim()) {
      setError('Vui lòng nhập mô tả ý tưởng trước khi sử dụng AI');
      return;
    }

    setAiLoading(prev => ({ ...prev, improveDescription: true }));
    setError('');

    try {
      const response = await api.post('/ai/improve-description', {
        idea: formData.idea,
        department: formData.department
      });
      setFormData(prev => ({ ...prev, idea: response.data.improvedIdea }));
    } catch (error: any) {
      console.error('AI Error:', error);
      setError(error.response?.data?.message || 'Lỗi khi sử dụng AI. Vui lòng thử lại.');
    } finally {
      setAiLoading(prev => ({ ...prev, improveDescription: false }));
    }
  };

  const handleSuggestSolution = async () => {
    if (!formData.idea.trim()) {
      setError('Vui lòng nhập mô tả ý tưởng trước khi sử dụng AI');
      return;
    }

    setAiLoading(prev => ({ ...prev, suggestSolution: true }));
    setError('');

    try {
      const response = await api.post('/ai/suggest-solution', {
        idea: formData.idea,
        department: formData.department
      });
      setFormData(prev => ({ ...prev, solution: response.data.solution }));
    } catch (error: any) {
      console.error('AI Error:', error);
      setError(error.response?.data?.message || 'Lỗi khi sử dụng AI. Vui lòng thử lại.');
    } finally {
      setAiLoading(prev => ({ ...prev, suggestSolution: false }));
    }
  };

  const handleSuggestBenefit = async () => {
    if (!formData.idea.trim()) {
      setError('Vui lòng nhập mô tả ý tưởng trước khi sử dụng AI');
      return;
    }

    setAiLoading(prev => ({ ...prev, suggestBenefit: true }));
    setError('');

    try {
      const response = await api.post('/ai/suggest-benefit', {
        idea: formData.idea,
        solution: formData.solution,
        department: formData.department
      });
      setFormData(prev => ({ ...prev, benefit: response.data.benefit }));
    } catch (error: any) {
      console.error('AI Error:', error);
      setError(error.response?.data?.message || 'Lỗi khi sử dụng AI. Vui lòng thử lại.');
    } finally {
      setAiLoading(prev => ({ ...prev, suggestBenefit: false }));
    }
  };

  const handleSuggestTopicTitle = async () => {
    if (!formData.idea.trim()) {
      setError('Vui lòng nhập mô tả ý tưởng trước khi sử dụng AI');
      return;
    }

    setAiLoading(prev => ({ ...prev, suggestTopicTitle: true }));
    setError('');

    try {
      const response = await api.post('/ai/suggest-topic-title', {
        idea: formData.idea,
        department: formData.department
      });
      setFormData(prev => ({ ...prev, topicTitle: response.data.topicTitle }));
    } catch (error: any) {
      console.error('AI Error:', error);
      setError(error.response?.data?.message || 'Lỗi khi sử dụng AI. Vui lòng thử lại.');
    } finally {
      setAiLoading(prev => ({ ...prev, suggestTopicTitle: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Prepare data, include all fields
      const submitData: any = {
        fullName: formData.fullName,
        department: formData.department,
        idea: formData.idea,
        solution: formData.solution || null,
        benefit: formData.benefit || null,
        topicTitle: formData.topicTitle || null,
        beforeImage: formData.beforeImage || null,
        afterImage: formData.afterImage || null
      };
      
      console.log('Submitting idea form data:', {
        hasBeforeImage: !!formData.beforeImage,
        beforeImageLength: formData.beforeImage ? formData.beforeImage.length : 0,
        hasAfterImage: !!formData.afterImage,
        afterImageLength: formData.afterImage ? formData.afterImage.length : 0
      });
      
      const response = await api.post('/ideas', submitData);
      setSuccess(true);
      setIdeaCode(response.data.ideaCode);
      setFormData({
        fullName: '',
        department: '',
        idea: '',
        solution: '',
        benefit: '',
        topicTitle: '',
        beforeImage: '',
        afterImage: ''
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
        
        {/* Thông tin người hỗ trợ */}
        <Card 
          sx={{ 
            mb: 3, 
            bgcolor: '#e3f2fd',
            border: '1px solid #90caf9',
            borderRadius: 2,
            '&:hover': {
              boxShadow: 3
            }
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ContactSupport sx={{ color: '#1976d2', fontSize: 32 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Cần hỗ trợ?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Liên hệ người hỗ trợ qua Zalo:
                  </Typography>
                  
                  {/* Link 1 - Dòng 1 */}
                  <Box sx={{ mb: 1 }}>
                    <Link
                      href="https://zalo.me/0943490500"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        color: '#0068ff',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#0052cc'
                        }
                      }}
                    >
                      <Phone sx={{ fontSize: 18 }} />
                      <Typography component="span" variant="body1">
                        0943490500 (Hà - Cải tiến)
                      </Typography>
                    </Link>
                  </Box>
                  
                  {/* Link 2 - Dòng 2 */}
                  <Box>
                    <Link
                      href="https://zalo.me/0947969358"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        color: '#0068ff',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#0052cc'
                        }
                      }}
                    >
                      <Phone sx={{ fontSize: 18 }} />
                      <Typography component="span" variant="body1">
                        0947969358 (Bằng - Cải tiến)
                      </Typography>
                    </Link>
                  </Box>
                  
                </Box>
            </Box>
          </CardContent>
        </Card>

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
              <Box sx={{ position: 'relative' }}>
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
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={aiLoading.improveDescription ? <CircularProgress size={16} /> : <AutoAwesome />}
                  onClick={handleImproveDescription}
                  disabled={aiLoading.improveDescription || !formData.idea.trim()}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    bgcolor: 'white',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    }
                  }}
                >
                  AI Cải thiện
                </Button>
              </Box>
            </Grid>
            
            {/* Tên đề tài với AI */}
            <Grid item xs={12}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  name="topicTitle"
                  label="Tên đề tài"
                  value={formData.topicTitle}
                  onChange={handleChange}
                  fullWidth
                  placeholder="Tên đề tài cho ý tưởng (có thể để AI đề xuất)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={aiLoading.suggestTopicTitle ? <CircularProgress size={16} /> : <AutoAwesome />}
                  onClick={handleSuggestTopicTitle}
                  disabled={aiLoading.suggestTopicTitle || !formData.idea.trim()}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    bgcolor: 'white',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    }
                  }}
                >
                  AI Đề xuất
                </Button>
              </Box>
            </Grid>
            
            {/* Giải pháp với AI */}
            <Grid item xs={12}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  name="solution"
                  label="Giải pháp"
                  value={formData.solution}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Mô tả giải pháp cụ thể (có thể để AI đề xuất)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={aiLoading.suggestSolution ? <CircularProgress size={16} /> : <AutoAwesome />}
                  onClick={handleSuggestSolution}
                  disabled={aiLoading.suggestSolution || !formData.idea.trim()}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    bgcolor: 'white',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    }
                  }}
                >
                  AI Đề xuất
                </Button>
              </Box>
            </Grid>
            
            {/* Lợi ích với AI */}
            <Grid item xs={12}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  name="benefit"
                  label="Lợi ích"
                  value={formData.benefit}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Mô tả lợi ích mang lại (có thể để AI đề xuất)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={aiLoading.suggestBenefit ? <CircularProgress size={16} /> : <AutoAwesome />}
                  onClick={handleSuggestBenefit}
                  disabled={aiLoading.suggestBenefit || !formData.idea.trim()}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    bgcolor: 'white',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    }
                  }}
                >
                  AI Đề xuất
                </Button>
              </Box>
            </Grid>
            {/* Hình ảnh trước và sau */}
            <Grid item xs={12} md={6}>
              <Box>
                <Button 
                  variant="outlined" 
                  component="label" 
                  fullWidth
                  sx={{
                    mb: 1,
                    '&:hover': {
                      borderColor: '#1976d2',
                    },
                  }}
                >
                  Hình ảnh trước cải tiến
                  <input 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={(e) => handleImageChange(e, 'beforeImage')} 
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
                </Typography>
                {formData.beforeImage && (
                  <Box sx={{ mt: 1, width: '100%' }}>
                    <img 
                      src={formData.beforeImage} 
                      alt="Hình ảnh trước" 
                      onClick={() => handleImageClick(formData.beforeImage, 'Hình ảnh trước cải tiến')}
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '250px',
                        objectFit: 'contain',
                        borderRadius: 8,
                        border: '1px solid #e0e0e0',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <Button 
                      size="small" 
                      color="error" 
                      fullWidth 
                      sx={{ mt: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, beforeImage: '' }))}
                    >
                      Xóa hình ảnh
                    </Button>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Button 
                  variant="outlined" 
                  component="label" 
                  fullWidth
                  sx={{
                    mb: 1,
                    '&:hover': {
                      borderColor: '#1976d2',
                    },
                  }}
                >
                  Hình ảnh sau cải tiến
                  <input 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={(e) => handleImageChange(e, 'afterImage')} 
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
                </Typography>
                {formData.afterImage && (
                  <Box sx={{ mt: 1, width: '100%' }}>
                    <img 
                      src={formData.afterImage} 
                      alt="Hình ảnh sau" 
                      onClick={() => handleImageClick(formData.afterImage, 'Hình ảnh sau cải tiến')}
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '250px',
                        objectFit: 'contain',
                        borderRadius: 8,
                        border: '1px solid #e0e0e0',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <Button 
                      size="small" 
                      color="error" 
                      fullWidth 
                      sx={{ mt: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, afterImage: '' }))}
                    >
                      Xóa hình ảnh
                    </Button>
                  </Box>
                )}
              </Box>
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
      <ImageLightbox
        open={lightboxOpen}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        onClose={handleCloseLightbox}
      />
    </Container>
  );
};

export default IdeaForm; 