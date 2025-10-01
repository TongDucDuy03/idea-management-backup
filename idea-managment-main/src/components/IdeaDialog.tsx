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
import { Idea } from '../types';

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
    fullName: '',
    department: '',
    idea: '',
    solution: '',
    benefit: '',
    implementationDepartment: '',
    note: '',
    status: 'pending',
    implementationStatus: 'Đề xuất mới',
    benefitValue: 0,
    rewardAmount: 0,
    benefitOutcome: '',
    resourcesUsed: '',
    calculationDescription: '',
    topicTitle: '',
    scalingOpportunity: '',
    beforeImage: '',
    afterImage: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (idea) {
      setFormData({
        ...idea,
        // Ensure problem text is pure, without solution/benefit lines
        idea: getPureIdeaText(idea.idea),
        // Prefer explicit fields; fall back to parsing from legacy combined text
        solution: idea.solution || parseFieldFromIdea(idea.idea, 'Giải pháp'),
        benefit: idea.benefit || parseFieldFromIdea(idea.idea, 'Lợi ích'),
        implementationDepartment: idea.implementationDepartment || '',
        note: idea.note || '',
        status: idea.status || 'pending',
        implementationStatus: idea.implementationStatus || 'Đề xuất mới',
        benefitValue: idea.benefitValue || 0,
        rewardAmount: idea.rewardAmount || 0,
        benefitOutcome: (idea as any).benefitOutcome || '',
        resourcesUsed: (idea as any).resourcesUsed || '',
        calculationDescription: (idea as any).calculationDescription || '',
        topicTitle: (idea as any).topicTitle || '',
        scalingOpportunity: (idea as any).scalingOpportunity || '',
        beforeImage: (idea as any).beforeImage || '',
        afterImage: (idea as any).afterImage || ''
      });
    } else {
      setFormData({
        fullName: '',
        department: '',
        idea: '',
        solution: '',
        benefit: '',
        implementationDepartment: '',
        note: '',
        status: 'pending',
        implementationStatus: 'Đề xuất mới',
        benefitValue: 0,
        rewardAmount: 0,
        benefitOutcome: '',
        resourcesUsed: '',
        calculationDescription: '',
        topicTitle: '',
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
      [name]: value
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
    
    // Kiểm tra kích thước file (giới hạn 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setError(`File ${field} quá lớn. Vui lòng chọn file nhỏ hơn 3MB.`);
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
      await onSave(formData);
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
              label="mã ý tưởng"
              value={formData.ideaCode}
              onChange={handleTextChange}
              required
              fullWidth
              sx={textFieldStyle}
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
            {/* Mã ý tưởng được tạo tự động ở backend; không cần nhập ở đây */}
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
              name="topicTitle"
              label="Tên đề tài"
              value={(formData as any).topicTitle || ''}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={2}
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
                  Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 3MB (sẽ được tối ưu hóa tự động)
                </Box>
                {(formData as any).beforeImage && (
                  <Box sx={{ mt: 1, width: '100%' }}>
                    <img 
                      src={(formData as any).beforeImage} 
                      alt="Hình ảnh trước" 
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '250px',
                        objectFit: 'contain',
                        borderRadius: 8,
                        border: '1px solid #e0e0e0'
                      }} 
                    />
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Button variant="outlined" component="label" fullWidth>
                  Tải lên Hình ảnh Sau
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'afterImage')} />
                </Button>
                <Box sx={{ mt: 0.5, color: '#777', fontSize: 12 }}>
                  Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 3MB (sẽ được tối ưu hóa tự động)
                </Box>
                {(formData as any).afterImage && (
                  <Box sx={{ mt: 1, width: '100%' }}>
                    <img 
                      src={(formData as any).afterImage} 
                      alt="Hình ảnh sau" 
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '250px',
                        objectFit: 'contain',
                        borderRadius: 8,
                        border: '1px solid #e0e0e0'
                      }} 
                    />
                  </Box>
                )}
              </Box>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Quyết định phê duyệt</InputLabel>
              <Select
                name="status"
                value={formData.status || 'pending'}
                onChange={handleSelectChange}
                label="Quyết định phê duyệt"
              >
                <MenuItem value="pending">Chưa phê duyệt</MenuItem>
                <MenuItem value="rejected">Không phù hợp</MenuItem>
                <MenuItem value="noted">Lưu ý tưởng</MenuItem>
                <MenuItem value="approved">Phê duyệt triển khai</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Trạng thái triển khai</InputLabel>
              <Select
                name="implementationStatus"
                value={formData.implementationStatus || 'Đề xuất mới'}
                onChange={handleSelectChange}
                label="Trạng thái triển khai"
              >
                <MenuItem value="Đề xuất mới">Đề xuất mới</MenuItem>
                <MenuItem value="Xem xét">Xem xét</MenuItem>
                <MenuItem value="Phê duyệt">Phê duyệt</MenuItem>
                <MenuItem value="Phản hồi phê duyệt">Phản hồi phê duyệt</MenuItem>
                <MenuItem value="Đang triển khai">Đang triển khai</MenuItem>
                <MenuItem value="Lập báo cáo A3">Lập báo cáo A3</MenuItem>
                <MenuItem value="Phê duyệt khen thưởng">Phê duyệt khen thưởng</MenuItem>
                <MenuItem value="Đã khen thưởng">Đã khen thưởng</MenuItem>
                <MenuItem value="Không đạt">Không đạt</MenuItem>
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
    </Dialog>
  );
};

export default IdeaDialog; 