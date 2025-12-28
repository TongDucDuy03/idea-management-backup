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
  SelectChangeEvent
} from '@mui/material';
import { Idea, IdeaStatus, IdeaStatusLabels, RewardCalculationMethod, RewardCalculationMethodLabels } from '../types';
import ImageLightbox from './ImageLightbox';

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
      minHeight: '56px !important'
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
    benefitOutcome: '',
    resourcesUsed: '',
    calculationDescription: '',
    scalingOpportunity: '',
    beforeImage: '',
    afterImage: ''
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
        beforeImage: (idea as any).beforeImage || '',
        afterImage: (idea as any).afterImage || ''
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
        afterImage: ''
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
        <DialogContent sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            <FormControl fullWidth required>
              <InputLabel>Phòng ban</InputLabel>
              <Select
                name="department"
                value={formData.department}
                onChange={handleSelectChange}
                label="Phòng ban"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="idea"
              label="Ý tưởng"
              value={formData.idea}
              onChange={handleTextChange}
              required
              fullWidth
              multiline
              rows={6}
            />
            <TextField
              name="solution"
              label="Thực trạng"
              value={formData.solution}
              onChange={handleTextChange}
              required
              fullWidth
              multiline
              rows={6}
            />
            <TextField
              name="benefit"
              label="Giải pháp"
              value={formData.benefit}
              onChange={handleTextChange}
              required
              fullWidth
              multiline
              rows={6}
            />
            {/* New fields */}
            <TextField
              name="benefitOutcome"
              label="Lợi ích mang lại"
              value={(formData as any).benefitOutcome || ''}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              name="resourcesUsed"
              label="Nguồn lực sử dụng"
              value={(formData as any).resourcesUsed || ''}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              name="calculationDescription"
              label="Mô tả cách tính"
              value={(formData as any).calculationDescription || ''}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              name="scalingOpportunity"
              label="Cơ hội nhân rộng phát triển"
              value={(formData as any).scalingOpportunity || ''}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={4}
            />
            {/* Hình ảnh trước và sau */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Button variant="outlined" component="label" fullWidth>
                  Tải lên Hình ảnh Trước
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'beforeImage')} />
                </Button>
                <Box sx={{ mt: 0.5, color: '#777', fontSize: 12 }}>
                  Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
                </Box>
                {(formData as any).beforeImage && (
                  <Box sx={{ mt: 1, width: '100%' }}>
                    <img 
                      src={(formData as any).beforeImage} 
                      alt="Hình ảnh trước" 
                      onClick={() => handleImageClick((formData as any).beforeImage, 'Hình ảnh trước cải tiến')}
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
                      Xóa hình ảnh trước
                    </Button>
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Button variant="outlined" component="label" fullWidth>
                  Tải lên Hình ảnh Sau
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'afterImage')} />
                </Button>
                <Box sx={{ mt: 0.5, color: '#777', fontSize: 12 }}>
                  Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
                </Box>
                {(formData as any).afterImage && (
                  <Box sx={{ mt: 1, width: '100%' }}>
                    <img 
                      src={(formData as any).afterImage} 
                      alt="Hình ảnh sau" 
                      onClick={() => handleImageClick((formData as any).afterImage, 'Hình ảnh sau cải tiến')}
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
                      Xóa hình ảnh sau
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
            <FormControl fullWidth>
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
            <FormControl fullWidth>
              <InputLabel>Phòng ban triển khai</InputLabel>
              <Select
                name="implementationDepartment"
                value={formData.implementationDepartment || ''}
                onChange={handleSelectChange}
                label="Phòng ban triển khai"
              >
                <MenuItem value="">Chọn phòng ban</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
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
            />
            <TextField
              name="benefitValue"
              label="Giá trị làm lợi (VND)"
              type="number"
              value={formData.benefitValue || 0}
              onChange={handleTextChange}
              fullWidth
              inputProps={{ min: 0, step: 1 }}
              helperText="Ví dụ: 5.000.000"
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
            <FormControl fullWidth>
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
            {isEdit && (
              <FormControl fullWidth>
                {/* Additional edit-only controls can be added here */}
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="contained" color="primary">
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
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