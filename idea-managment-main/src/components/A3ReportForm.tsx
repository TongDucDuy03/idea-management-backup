import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import api from '../api/config';
import { Idea } from '../types';
import A3LayoutEditor from './A3LayoutEditor';

interface A3ReportFormProps {
  idea: Idea | null;
  onClose: () => void;
}

const A3ReportForm: React.FC<A3ReportFormProps> = ({ idea, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [reportData, setReportData] = useState<Partial<Idea>>(idea || {});

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

  useEffect(() => {
    const fetchByCode = async () => {
      if (!idea?.ideaCode) return;
      try {
        const { data } = await api.get(`/ideas/detail/code/${encodeURIComponent(idea.ideaCode)}`);
        setReportData(data);
        console.log('Loaded idea data by code:', {
          _id: (data as any)._id,
          ideaCode: (data as any).ideaCode,
          hasBeforeImage: 'beforeImage' in (data as any),
          hasAfterImage: 'afterImage' in (data as any),
          beforeImageLength: (data as any).beforeImage ? (data as any).beforeImage.length : 0,
          afterImageLength: (data as any).afterImage ? (data as any).afterImage.length : 0
        });
      } catch {
        // fallback to prop
        setReportData(idea);
      }
    };
    if (idea) {
      fetchByCode();
    }
  }, [idea]);


  const handleInputChange = (field: keyof Idea, value: string) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
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
    
    console.log(`Handling ${field} image:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    try {
      // Tối ưu hóa hình ảnh trước khi lưu
      const optimizedDataUrl = await optimizeImage(file);
      
      console.log(`${field} optimized data URL length:`, optimizedDataUrl.length);
      setReportData(prev => {
        const newData = { ...prev, [field]: optimizedDataUrl };
        console.log(`Updated reportData with ${field}:`, {
          [field]: optimizedDataUrl ? 'Present' : 'Missing',
          allFields: Object.keys(newData)
        });
        return newData;
      });
      
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error(`Error processing ${field} image:`, error);
      setError(`Lỗi khi xử lý hình ảnh ${field}. Vui lòng thử lại.`);
    }
  };

  const handleSave = async () => {
    if (!idea) return;
    
    setSaving(true);
    setError('');
    
    try {

      // Log dữ liệu trước khi gửi
      console.log('Saving A3 report data:', {
        ideaId: idea._id,
        beforeImage: (reportData as any).beforeImage ? 'Present' : 'Missing',
        afterImage: (reportData as any).afterImage ? 'Present' : 'Missing',
        beforeImageLength: (reportData as any).beforeImage ? (reportData as any).beforeImage.length : 0,
        afterImageLength: (reportData as any).afterImage ? (reportData as any).afterImage.length : 0,
        reportData: reportData
      });

      // Cập nhật qua endpoint có xác thực. Endpoint công khai theo mã ý tưởng
      // (PUT /ideas/code/:ideaCode) đã bị gỡ vì cho phép sửa nội dung mà không
      // cần đăng nhập.
      const response = await api.put(`/ideas/${idea._id}`, reportData);

      console.log('Save response:', {
        _id: response.data._id,
        ideaCode: response.data.ideaCode,
        hasBeforeImage: 'beforeImage' in response.data,
        hasAfterImage: 'afterImage' in response.data,
        beforeImageLength: response.data.beforeImage ? response.data.beforeImage.length : 0,
        afterImageLength: response.data.afterImage ? response.data.afterImage.length : 0
      });

      setSuccess('Báo cáo A3 đã được lưu thành công!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error saving A3 report:', error);
      setError('Không thể lưu báo cáo A3. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExport = async () => {
    await handleSave();
    if (!error) {
      setTimeout(() => {
        setLayoutEditorOpen(true);
      }, 300);
    }
  };

  if (!idea) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Không tìm thấy thông tin ý tưởng
        </Alert>
      </Container>
    );
  }

  return (
    <>
    <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
      <Card elevation={3} sx={{ borderRadius: 2, minHeight: 'fit-content', width: '100%' }}>
        <CardContent sx={{ p: 3, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            Báo cáo A3 - {idea.ideaCode}
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={3} sx={{ width: '100%' }}>
            {/* Hình ảnh trước/sau */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                Hình ảnh minh họa
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', minHeight: 'fit-content' }}>
              <Button variant="outlined" component="label" fullWidth sx={{ minHeight: '56px' }}>
                Tải lên Hình ảnh Trước
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'beforeImage')} />
              </Button>
              <Box sx={{ mt: 0.5, color: '#777', fontSize: 12 }}>
                Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
              </Box>
              {(reportData as any).beforeImage && (
                <Box sx={{ mt: 1, width: '100%', flex: '0 0 auto' }}>
                  <img 
                    src={(reportData as any).beforeImage} 
                    alt="Hình ảnh trước" 
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      maxHeight: '300px',
                      objectFit: 'contain',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0'
                    }} 
                  />
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', minHeight: 'fit-content' }}>
              <Button variant="outlined" component="label" fullWidth sx={{ minHeight: '56px' }}>
                Tải lên Hình ảnh Sau
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'afterImage')} />
              </Button>
              <Box sx={{ mt: 0.5, color: '#777', fontSize: 12 }}>
                Gợi ý: ảnh ngang ~800×600px, dung lượng nhỏ hơn 15MB (sẽ được tối ưu hóa tự động)
              </Box>
              {(reportData as any).afterImage && (
                <Box sx={{ mt: 1, width: '100%', flex: '0 0 auto' }}>
                  <img 
                    src={(reportData as any).afterImage} 
                    alt="Hình ảnh sau" 
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      maxHeight: '300px',
                      objectFit: 'contain',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0'
                    }} 
                  />
                </Box>
              )}
            </Grid>
            {/* Thông tin cơ bản */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                Thông tin cơ bản
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mã ý tưởng"
                value={reportData.ideaCode || ''}
                disabled
                variant="outlined"
                sx={textFieldStyle}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={reportData.fullName || ''}
                disabled
                variant="outlined"
                sx={textFieldStyle}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Đơn vị"
                value={reportData.department || ''}
                disabled
                variant="outlined"
                sx={textFieldStyle}
              />
            </Grid>

            {/* Các trường chính cho báo cáo A3 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold', mt: 2 }}>
                Nội dung báo cáo A3
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thực trạng (Solution)"
                value={reportData.solution || ''}
                onChange={(e) => handleInputChange('solution', e.target.value)}
                multiline
                rows={4}
                variant="outlined"
                placeholder="Mô tả thực trạng hiện tại..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Đối sách (Benefit)"
                value={reportData.benefit || ''}
                onChange={(e) => handleInputChange('benefit', e.target.value)}
                multiline
                rows={4}
                variant="outlined"
                placeholder="Đối sách đề xuất..."
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lợi ích đạt được "
                value={reportData.benefitOutcome || ''}
                onChange={(e) => handleInputChange('benefitOutcome', e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                placeholder="Lợi ích đạt được..."
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cơ hội nhân rộng "
                value={reportData.scalingOpportunity || ''}
                onChange={(e) => handleInputChange('scalingOpportunity', e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                placeholder="Cơ hội nhân rộng..."
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nguồn lực sử dụng "
                value={reportData.resourcesUsed || ''}
                onChange={(e) => handleInputChange('resourcesUsed', e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                placeholder="Nguồn lực sử dụng..."
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mô tả tính toán "
                value={reportData.calculationDescription || ''}
                onChange={(e) => handleInputChange('calculationDescription', e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                placeholder="Mô tả tính toán khen thưởng..."
              />
            </Grid>
          </Grid>

          {/* Nút hành động */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ minWidth: 120 }}
            >
              Đóng
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{ minWidth: 150 }}
            >
              {saving ? 'Đang lưu...' : 'Lưu báo cáo'}
            </Button>
            
            <Button
              variant="contained"
              color="success"
              onClick={() => setLayoutEditorOpen(true)}
              disabled={saving}
              startIcon={<TuneIcon />}
              sx={{ minWidth: 200 }}
            >
              Xem trước & căn chỉnh
            </Button>

            <Button
              variant="contained"
              color="info"
              onClick={handleSaveAndExport}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              sx={{ minWidth: 200 }}
            >
              {saving ? 'Đang xử lý...' : 'Lưu và xuất PDF'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
      <A3LayoutEditor
        open={layoutEditorOpen}
        idea={{ ...idea, ...reportData } as Idea}
        filename={undefined}
        onClose={() => setLayoutEditorOpen(false)}
      />
    </>
  );
};

export default A3ReportForm;
