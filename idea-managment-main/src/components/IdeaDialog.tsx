import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
  Typography,
  Paper,
  Chip
} from '@mui/material';
import { Idea, IdeaStatus, IdeaStatusLabels, RewardCalculationMethod, RewardCalculationMethodLabels, RewardStatus, RewardStatusLabels } from '../types';
import ImageLightbox from './ImageLightbox';
import { getDepartmentOptions, isRetiredDepartment } from '../constants/departments';

// Helpers to parse legacy records where "idea" may include lines like
// "Giải pháp: ..." and "Lợi ích: ..."
const parseFieldFromIdea = (
  ideaText: string | undefined,
  key: 'Giải pháp' | 'Lợi ích'
) => {
  if (!ideaText) return '';
  const lines = ideaText.split(/\n+/);
  const line =
    lines.find(l => l.trim().toLowerCase().startsWith(key.toLowerCase())) || '';
  return line.replace(/^.*?:\s*/, '').trim();
};

const getPureIdeaText = (ideaText: string | undefined) => {
  if (!ideaText) return '';
  const lines = ideaText.split(/\n+/);
  const filtered = lines.filter(l => {
    const t = l.trim().toLowerCase();
    return !(t.startsWith('giải pháp:') || t.startsWith('lợi ích:'));
  });
  return filtered.join('\n').trim();
};

interface IdeaDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (idea: Partial<Idea>) => Promise<void>;
  idea?: Idea;
  isEdit?: boolean;
}

const IdeaDialog: React.FC<IdeaDialogProps> = ({
  open,
  onClose,
  onSave,
  idea,
  isEdit = false
}) => {
  // State cho tabs
  const [activeTab, setActiveTab] = useState(0);

  // Style cố định cho TextField để không bị thu nhỏ
  const textFieldStyle = {
    '& .MuiInputBase-input': {
      fontSize: '16px !important',
      minHeight: '1.4375em !important',
      padding: '16.5px 14px !important'
    },
    '& .MuiInputLabel-root': {
      fontSize: '16px !important'
    },
    '& .MuiOutlinedInput-root': {
      minHeight: '56px !important',
      borderRadius: '12px !important',
      transition: 'all 0.3s ease',
      '&:hover': {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#1976d2 !important',
          borderWidth: '2px !important',
        }
      },
      '&.Mui-focused': {
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px !important',
        }
      }
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#1976d2 !important',
      fontWeight: 600
    }
  };

  // Style cho Select/FormControl
  const selectStyle = {
    borderRadius: '12px !important',
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px !important',
      transition: 'all 0.3s ease',
      '&:hover': {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#1976d2 !important',
          borderWidth: '2px !important',
        }
      },
      '&.Mui-focused': {
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px !important',
        }
      }
    }
  };

  // Style cho Paper (card hình ảnh)
  const cardStyle = {
    borderRadius: '16px !important',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12) !important',
      transform: 'translateY(-2px)'
    }
  };

  const [formData, setFormData] = useState<Partial<Idea>>({
    ideaCode: '',
    fullName: '',
    department: '',
    idea: '',
    solution: '',
    benefit: '',
    implementationDepartment: '',
    note: '',
    status: IdeaStatus.DE_NGHI_MOI,
    benefitValue: 0,
    rewardAmount: 0,
    rewardApprovalDate: undefined,
    rewardCalculationMethod: undefined,
    rewardStatuses: [],
    benefitOutcome: '',
    resourcesUsed: '',
    calculationDescription: '',
    scalingOpportunity: '',
    beforeImage: '',
    afterImage: '',
    // 4 trường mới theo yêu cầu
    implementationStatus: '',
    expectedCompletionDate: undefined,
    netReserveStatus: '',
    reasonNote: ''
  });
  const [error, setError] = useState('');
  
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

  useEffect(() => {
    if (idea) {
      // Handle legacy status values (backward compatibility)
      let statusValue = idea.status || IdeaStatus.DE_NGHI_MOI;
      
      // If status is old value, try to migrate
      if (!Object.values(IdeaStatus).includes(statusValue as IdeaStatus)) {
        // Legacy compatibility: map old status to new
        const oldStatus = statusValue as string;
        if (oldStatus === 'pending') {
          statusValue = IdeaStatus.DE_NGHI_MOI;
        } else if (oldStatus === 'rejected') {
          statusValue = IdeaStatus.REJECTED;
        } else if (oldStatus === 'noted') {
          statusValue = IdeaStatus.LUU_Y_TUONG;
        } else if (oldStatus === 'approved') {
          statusValue = IdeaStatus.TRIEN_KHAI;
        } else {
          statusValue = IdeaStatus.DE_NGHI_MOI;
        }
      }

      const anyIdea = idea as any;
      const isBase64Before =
        typeof anyIdea.beforeImage === 'string' &&
        anyIdea.beforeImage.startsWith('data:image');
      const isBase64After =
        typeof anyIdea.afterImage === 'string' &&
        anyIdea.afterImage.startsWith('data:image');

      const beforeImageUrl =
        (isBase64Before ? anyIdea.beforeImage : null) ||
        anyIdea.beforeImageUrl ||
        (anyIdea.beforeImagePath
          ? `${window.location.origin}${anyIdea.beforeImagePath}`
          : null) ||
        anyIdea.beforeImage ||
        '';

      const afterImageUrl =
        (isBase64After ? anyIdea.afterImage : null) ||
        anyIdea.afterImageUrl ||
        (anyIdea.afterImagePath
          ? `${window.location.origin}${anyIdea.afterImagePath}`
          : null) ||
        anyIdea.afterImage ||
        '';

      setFormData({
        ...idea,
        // Ensure problem text is pure, without solution/benefit lines
        idea: getPureIdeaText(idea.idea),
        // Prefer explicit fields; fall back to parsing from legacy combined text
        solution: idea.solution || parseFieldFromIdea(idea.idea, 'Giải pháp'),
        benefit: idea.benefit || parseFieldFromIdea(idea.idea, 'Lợi ích'),
        implementationDepartment: idea.implementationDepartment || '',
        note: idea.note || '',
        status: statusValue as IdeaStatus,
        benefitValue: idea.benefitValue || 0,
        rewardAmount: idea.rewardAmount || 0,
        rewardApprovalDate: (idea as any).rewardApprovalDate ? (() => {
          // Adjust for GMT+7 timezone when loading
          const date = new Date((idea as any).rewardApprovalDate);
          return date;
        })() : undefined,
        rewardCalculationMethod: (idea as any).rewardCalculationMethod || undefined,
        benefitOutcome: (idea as any).benefitOutcome || '',
        resourcesUsed: (idea as any).resourcesUsed || '',
        calculationDescription: (idea as any).calculationDescription || '',
        scalingOpportunity: (idea as any).scalingOpportunity || '',
        beforeImage: beforeImageUrl,
        afterImage: afterImageUrl,
        // 4 trường mới
        implementationStatus: (idea as any).implementationStatus || '',
        expectedCompletionDate: (idea as any).expectedCompletionDate ? (() => {
          const date = new Date((idea as any).expectedCompletionDate);
          return date;
        })() : undefined,
        netReserveStatus: (idea as any).netReserveStatus || '',
        reasonNote: (idea as any).reasonNote || ''
      });
    } else {
      setFormData({
        ideaCode: '',
        fullName: '',
        department: '',
        idea: '',
        solution: '',
        benefit: '',
        implementationDepartment: '',
        note: '',
        status: IdeaStatus.DE_NGHI_MOI,
        benefitValue: 0,
        rewardAmount: 0,
        rewardApprovalDate: undefined,
        rewardCalculationMethod: undefined,
        benefitOutcome: '',
        resourcesUsed: '',
        calculationDescription: '',
        scalingOpportunity: '',
        beforeImage: '',
        afterImage: '',
        // 4 trường mới
        implementationStatus: '',
        expectedCompletionDate: undefined,
        netReserveStatus: '',
        reasonNote: ''
      });
    }
  }, [idea]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
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
      setError(`File ${field} quá lớn. Vui lòng chọn file nhỏ hơn 15MB.`);
      return;
    }
    
    try {
      // Tối ưu hóa hình ảnh trước khi lưu
      const optimizedDataUrl = await optimizeImage(file);
      setFormData(prev => ({ ...prev, [field]: optimizedDataUrl }));
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error(`Error processing ${field} image:`, error);
      setError(`Lỗi khi xử lý hình ảnh ${field}. Vui lòng thử lại.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare data with proper formatting
      const submitData: any = { ...formData };
      
      // Convert rewardApprovalDate to ISO string if it exists
      if (submitData.rewardApprovalDate) {
        if (submitData.rewardApprovalDate instanceof Date) {
          // Convert to ISO string (will be in UTC)
          submitData.rewardApprovalDate = submitData.rewardApprovalDate.toISOString();
        } else if (typeof submitData.rewardApprovalDate === 'string') {
          // If it's already a string (from input), convert to Date then to ISO
          const dateObj = new Date(submitData.rewardApprovalDate);
          submitData.rewardApprovalDate = dateObj.toISOString();
        }
      } else {
        // Explicitly set to null if it was cleared
        submitData.rewardApprovalDate = null;
      }

      // Convert expectedCompletionDate to ISO string if it exists
      if (submitData.expectedCompletionDate) {
        if (submitData.expectedCompletionDate instanceof Date) {
          // Convert to ISO string (will be in UTC)
          submitData.expectedCompletionDate = submitData.expectedCompletionDate.toISOString();
        } else if (typeof submitData.expectedCompletionDate === 'string') {
          // If it's already a string (from input), convert to Date then to ISO
          const dateObj = new Date(submitData.expectedCompletionDate);
          submitData.expectedCompletionDate = dateObj.toISOString();
        }
      } else {
        // Explicitly set to null if it was cleared
        submitData.expectedCompletionDate = null;
      }
      
      // Handle images - always include them (null or base64)
      if (submitData.beforeImage === '') {
        submitData.beforeImage = null;
      }
      if (submitData.afterImage === '') {
        submitData.afterImage = null;
      }
      
      console.log('Submitting dialog data:', {
        rewardApprovalDate: submitData.rewardApprovalDate,
        hasBeforeImage: !!submitData.beforeImage,
        hasAfterImage: !!submitData.afterImage
      });
      
      await onSave(submitData);
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {isEdit ? 'Sửa Ý tưởng' : 'Thêm Ý tưởng Mới'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ maxHeight: '80vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column', p: 0 }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  minHeight: 48,
                  borderRadius: '8px 8px 0 0',
                  margin: '8px 4px 0',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    fontWeight: 600,
                    bgcolor: 'white',
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
                  },
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                  }
                },
                '& .MuiTabs-indicator': {
                  display: 'none'
                }
              }}
            >
              <Tab label="Thông tin cơ bản" />
              <Tab label="Nội dung ý tưởng" />
              <Tab label="Hình ảnh" />
              <Tab label="Triển khai" />
              <Tab label="Khen thưởng" />
              <Tab label="Bổ sung" />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
            {/* Tab 1: Thông tin cơ bản */}
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600, mx: 'auto' }}>
                <TextField
                  name="ideaCode"
                  label="Mã ý tưởng"
                  value={formData.ideaCode || ''}
                  onChange={handleTextChange}
                  disabled={isEdit}
                  fullWidth
                  sx={textFieldStyle}
                  helperText={isEdit ? 'Mã ý tưởng không thể thay đổi' : ''}
                />
                <TextField
                  name="fullName"
                  label="Họ và tên"
                  value={formData.fullName}
                  onChange={handleTextChange}
                  required
                  fullWidth
                  sx={textFieldStyle}
                />
                <FormControl fullWidth required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                  <InputLabel>Phòng ban</InputLabel>
                  <Select
                    name="department"
                    value={formData.department}
                    onChange={handleSelectChange}
                    label="Phòng ban"
                  >
                    {getDepartmentOptions(formData.department).map((dept) => (
                      <MenuItem
                        key={dept}
                        value={dept}
                        disabled={isRetiredDepartment(dept)}
                      >
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    name="status"
                    value={formData.status || IdeaStatus.DE_NGHI_MOI}
                    onChange={handleSelectChange}
                    label="Trạng thái"
                  >
                    {Object.values(IdeaStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {IdeaStatusLabels[status]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  name="note"
                  label="Ghi chú"
                  value={formData.note}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Hãy để lại ghi chú..."
                  sx={textFieldStyle}
                />
              </Box>
            )}

            {/* Tab 2: Nội dung ý tưởng */}
            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 800, mx: 'auto' }}>
                <TextField
                  name="idea"
                  label="Ý tưởng"
                  value={formData.idea}
                  onChange={handleTextChange}
                  required
                  fullWidth
                  multiline
                  rows={5}
                  sx={textFieldStyle}
                />
                <TextField
                  name="solution"
                  label="Thực trạng"
                  value={formData.solution}
                  onChange={handleTextChange}
                  required
                  fullWidth
                  multiline
                  rows={5}
                  sx={textFieldStyle}
                />
                <TextField
                  name="benefit"
                  label="Giải pháp"
                  value={formData.benefit}
                  onChange={handleTextChange}
                  required
                  fullWidth
                  multiline
                  rows={5}
                  sx={textFieldStyle}
                />
                <TextField
                  name="benefitOutcome"
                  label="Lợi ích mang lại"
                  value={(formData as any).benefitOutcome || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={4}
                  sx={textFieldStyle}
                />
              </Box>
            )}

            {/* Tab 3: Hình ảnh */}
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Paper elevation={2} sx={cardStyle}>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                        Hình ảnh trước cải tiến
                      </Typography>
                      <Button variant="outlined" component="label" fullWidth sx={{ mb: 1, borderRadius: '10px', py: 1.5 }}>
                        Tải lên Hình ảnh Trước
                        <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'beforeImage')} />
                      </Button>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                        Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
                      </Typography>
                      {(formData as any).beforeImage && (
                        <Box sx={{ mt: 1 }}>
                          <img
                            src={(formData as any).beforeImage}
                            alt="Hình ảnh trước"
                            onClick={() => handleImageClick((formData as any).beforeImage, 'Hình ảnh trước cải tiến')}
                            style={{
                              width: '100%',
                              height: 'auto',
                              maxHeight: '250px',
                              objectFit: 'contain',
                              borderRadius: '12px',
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
                            sx={{ mt: 1, borderRadius: '8px' }}
                            onClick={() => setFormData(prev => ({ ...prev, beforeImage: '' }))}
                          >
                            Xóa hình ảnh
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                  <Paper elevation={2} sx={cardStyle}>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                        Hình ảnh sau cải tiến
                      </Typography>
                      <Button variant="outlined" component="label" fullWidth sx={{ mb: 1, borderRadius: '10px', py: 1.5 }}>
                        Tải lên Hình ảnh Sau
                        <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'afterImage')} />
                      </Button>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                        Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
                      </Typography>
                      {(formData as any).afterImage && (
                        <Box sx={{ mt: 1 }}>
                          <img
                            src={(formData as any).afterImage}
                            alt="Hình ảnh sau"
                            onClick={() => handleImageClick((formData as any).afterImage, 'Hình ảnh sau cải tiến')}
                            style={{
                              width: '100%',
                              height: 'auto',
                              maxHeight: '250px',
                              objectFit: 'contain',
                              borderRadius: '12px',
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
                            sx={{ mt: 1, borderRadius: '8px' }}
                            onClick={() => setFormData(prev => ({ ...prev, afterImage: '' }))}
                          >
                            Xóa hình ảnh
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Box>
            )}

            {/* Tab 4: Triển khai */}
            {activeTab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600, mx: 'auto' }}>
                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                  <InputLabel>Phòng ban triển khai</InputLabel>
                  <Select
                    multiple
                    name="implementationDepartment"
                    value={
                      (formData.implementationDepartment
                        ? (formData.implementationDepartment as string)
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean)
                        : []) as any
                    }
                    onChange={(e) => {
                      const value = e.target.value as string[] | string;
                      const valuesArray = Array.isArray(value) ? value : [value];
                      const joined = valuesArray.join(', ');
                      setFormData(prev => ({
                        ...prev,
                        implementationDepartment: joined
                      }));
                    }}
                    renderValue={(selected) => {
                      const list = (Array.isArray(selected) ? selected : [selected]) as string[];
                      return (
                        <Box sx={{ whiteSpace: 'normal', wordBreak: 'break-word', display: 'block' }}>
                          {list.join(', ')}
                        </Box>
                      );
                    }}
                    sx={{
                      '& .MuiSelect-select': {
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        display: 'block',
                        alignItems: 'flex-start'
                      }
                    }}
                    label="Phòng ban triển khai"
                  >
                    <MenuItem value="">
                      <em>Chọn phòng ban</em>
                    </MenuItem>
                    {getDepartmentOptions(
                      (formData.implementationDepartment
                        ? (formData.implementationDepartment as string)
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : []) as string[]
                    ).map((dept) => (
                      <MenuItem
                        key={dept}
                        value={dept}
                        disabled={isRetiredDepartment(dept)}
                      >
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  name="implementationStatus"
                  label="Trạng thái triển khai"
                  value={(formData as any).implementationStatus || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={2}
                  sx={textFieldStyle}
                />
                <TextField
                  name="expectedCompletionDate"
                  label="Hạn dự kiến hoàn thành"
                  type="date"
                  value={(formData as any).expectedCompletionDate ? (() => {
                    let date: Date;
                    if ((formData as any).expectedCompletionDate instanceof Date) {
                      date = new Date((formData as any).expectedCompletionDate);
                    } else if (typeof (formData as any).expectedCompletionDate === 'string') {
                      date = new Date((formData as any).expectedCompletionDate);
                    } else {
                      return '';
                    }
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })() : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const date = new Date(value);
                      setFormData(prev => ({
                        ...prev,
                        expectedCompletionDate: date
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        expectedCompletionDate: undefined
                      }));
                    }
                  }}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={textFieldStyle}
                />
                <TextField
                  name="netReserveStatus"
                  label="Trạng thái duy trì/mở rộng"
                  value={(formData as any).netReserveStatus || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={2}
                  sx={textFieldStyle}
                />
                <TextField
                  name="reasonNote"
                  label="Ghi chú lý do (Dừng/Hủy)"
                  value={(formData as any).reasonNote || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={2}
                  sx={textFieldStyle}
                />
              </Box>
            )}

            {/* Tab 5: Khen thưởng */}
            {activeTab === 4 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 500, mx: 'auto' }}>
                {/* Tình trạng khen thưởng - Multi-select với giới hạn */}
                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                  <InputLabel>Tình trạng khen thưởng</InputLabel>
                  <Select
                    multiple
                    name="rewardStatuses"
                    value={(formData.rewardStatuses || []).map((s: any) => s)}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      // Logic giới hạn: chỉ chọn được 1 trong mỗi nhóm (50k hoặc 20%)
                      let newValue: string[] = [];

                      if (Array.isArray(value)) {
                        // Lọc các giá trị 50k
                        const selected50k = value.filter((v: string) =>
                          v === 'CHO_KHEN_THUONG_50K' || v === 'DA_KHEN_THUONG_50K'
                        );
                        // Lọc các giá trị 20%
                        const selected20 = value.filter((v: string) =>
                          v === 'CHO_KHEN_THUONG_20' || v === 'DA_KHEN_THUONG_20'
                        );

                        // Chỉ giữ lại tối đa 1 giá trị từ mỗi nhóm
                        newValue = [...selected50k.slice(0, 1), ...selected20.slice(0, 1)];
                      }

                      setFormData(prev => ({
                        ...prev,
                        rewardStatuses: newValue as any
                      }));
                    }}
                    label="Tình trạng khen thưởng"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {((selected as string[]) || []).map((value) => (
                          <Chip
                            key={value}
                            label={RewardStatusLabels[value as RewardStatus] || value}
                            size="small"
                            sx={{ height: 24 }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(RewardStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {RewardStatusLabels[status]}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    * Chỉ chọn được 1 trong nhóm 50.000đ và 1 trong nhóm 20%
                  </Typography>
                </FormControl>
                <TextField
                  name="benefitValue"
                  label="Giá trị làm lợi (VND)"
                  type="number"
                  value={formData.benefitValue || 0}
                  onChange={handleTextChange}
                  fullWidth
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Ví dụ: 5.000.000"
                  sx={textFieldStyle}
                />
                <TextField
                  name="rewardAmount"
                  label="Tiền thưởng (VND)"
                  type="number"
                  value={formData.rewardAmount || 0}
                  onChange={handleTextChange}
                  fullWidth
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Ví dụ: 1.000.000"
                  sx={textFieldStyle}
                />
                <TextField
                  name="rewardApprovalDate"
                  label="Ngày duyệt khen thưởng"
                  type="datetime-local"
                  value={formData.rewardApprovalDate ? (() => {
                    let date: Date;
                    if (formData.rewardApprovalDate instanceof Date) {
                      date = new Date(formData.rewardApprovalDate);
                    } else if (typeof formData.rewardApprovalDate === 'string') {
                      date = new Date(formData.rewardApprovalDate);
                    } else {
                      return '';
                    }

                    // Format as datetime-local (YYYY-MM-DDTHH:mm)
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                  })() : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      // datetime-local input gives local time, convert to Date
                      const date = new Date(value);
                      setFormData(prev => ({
                        ...prev,
                        rewardApprovalDate: date
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        rewardApprovalDate: undefined
                      }));
                    }
                  }}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={textFieldStyle}
                />
                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                  <InputLabel>Phương thức tính thưởng</InputLabel>
                  <Select
                    name="rewardCalculationMethod"
                    value={formData.rewardCalculationMethod || ''}
                    onChange={handleSelectChange}
                    label="Phương thức tính thưởng"
                  >
                    <MenuItem value="">
                      <em>Chọn phương thức (để trống)</em>
                    </MenuItem>
                    {Object.values(RewardCalculationMethod).map((method) => (
                      <MenuItem key={method} value={method}>
                        {RewardCalculationMethodLabels[method]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Tab 6: Bổ sung */}
            {activeTab === 5 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 800, mx: 'auto' }}>
                <TextField
                  name="resourcesUsed"
                  label="Nguồn lực sử dụng"
                  value={(formData as any).resourcesUsed || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={3}
                  sx={textFieldStyle}
                />
                <TextField
                  name="calculationDescription"
                  label="Mô tả cách tính"
                  value={(formData as any).calculationDescription || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={3}
                  sx={textFieldStyle}
                />
                <TextField
                  name="scalingOpportunity"
                  label="Cơ hội nhân rộng phát triển"
                  value={(formData as any).scalingOpportunity || ''}
                  onChange={handleTextChange}
                  fullWidth
                  multiline
                  rows={3}
                  sx={textFieldStyle}
                />
              </Box>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              onClick={onClose}
              color="primary"
              variant="outlined"
              sx={{ borderRadius: '10px', px: 3, textTransform: 'none', fontWeight: 500 }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ borderRadius: '10px', px: 4, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)' }}
            >
              {isEdit ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </Box>
        </DialogContent>
      </form>
      <ImageLightbox
        open={lightboxOpen}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        onClose={handleCloseLightbox}
      />
    </Dialog>
  );
};

export default IdeaDialog; 