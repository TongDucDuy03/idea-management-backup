import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
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
  Link,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  Chip,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ContactSupport,
  Phone,
  AutoAwesome,
  OpenInNew,
  Person,
  Lightbulb,
  PhotoCamera,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Send,
  Celebration,
  ContentCopy,
  RestartAlt,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import api from '../api/config';
import { departments } from '../constants/departments';
import ImageLightbox from './ImageLightbox';
import { COLORS } from '../theme/theme';

const DRAFT_STORAGE_KEY = 'vico_idea_draft';

type FormMode = 'quick' | 'guided';

const EMPTY_FORM_DATA = {
  fullName: '',
  department: '',
  idea: '',
  solution: '',
  benefit: '',
  beforeImage: '',
  afterImage: ''
};

type IdeaSubmissionForm = typeof EMPTY_FORM_DATA;

const loadDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) {
      return {
        formData: {
          ...EMPTY_FORM_DATA,
          department: localStorage.getItem('vico_last_department') || ''
        },
        activeStep: 0,
        formMode: 'quick' as FormMode
      };
    }
    const parsed = JSON.parse(saved);
    return {
      formData: { ...EMPTY_FORM_DATA, ...(parsed.formData || {}) },
      activeStep: Math.min(Number(parsed.activeStep) || 0, 2),
      formMode: parsed.formMode === 'guided' ? 'guided' as FormMode : 'quick' as FormMode
    };
  } catch {
    return null;
  }
};

// Custom step connector
const CustomConnector = styled(StepConnector)(() => ({
  '&.MuiStepConnector-root': {
    top: 22,
  },
  '& .MuiStepConnector-line': {
    height: 3,
    border: 0,
    backgroundColor: COLORS.slate[200],
    borderRadius: 2,
    transition: 'all 0.3s ease',
  },
  '&.Mui-active .MuiStepConnector-line': {
    backgroundColor: COLORS.blue[500],
  },
  '&.Mui-completed .MuiStepConnector-line': {
    backgroundColor: COLORS.emerald[500],
  },
}));

// Custom step icon
function CustomStepIcon(props: { active?: boolean; completed?: boolean; icon?: React.ReactNode; stepIndex: number }) {
  const { active = false, completed = false } = props;
  const icons: Record<number, React.ReactElement> = {
    0: <Person sx={{ fontSize: 20 }} />,
    1: <Lightbulb sx={{ fontSize: 20 }} />,
    2: <PhotoCamera sx={{ fontSize: 20 }} />,
  };

  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(completed && {
          backgroundColor: COLORS.emerald[500],
          color: '#fff',
          boxShadow: `0 4px 12px ${COLORS.emerald[500]}40`,
        }),
        ...(active && {
          backgroundColor: COLORS.blue[500],
          color: '#fff',
          boxShadow: `0 4px 12px ${COLORS.blue[500]}40`,
          transform: 'scale(1.05)',
        }),
        ...(!active && !completed && {
          backgroundColor: COLORS.slate[100],
          color: COLORS.slate[400],
        }),
      }}
    >
      {completed ? <CheckCircle sx={{ fontSize: 20 }} /> : icons[props.stepIndex]}
    </Box>
  );
}

const steps = [
  'Người đề xuất',
  'Nội dung ý tưởng',
  'Hình ảnh & Gửi',
];

const IdeaForm: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const initialDraft = loadDraft();
  const [activeStep, setActiveStep] = useState(initialDraft?.activeStep || 0);
  const [formMode, setFormMode] = useState<FormMode>(initialDraft?.formMode || 'quick');
  const [formData, setFormData] = useState<IdeaSubmissionForm>(initialDraft?.formData || EMPTY_FORM_DATA);
  const [errors, setErrors] = useState({
    department: '',
    idea: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ideaCode, setIdeaCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Tự lưu phần văn bản; không lưu ảnh base64 để tránh làm đầy localStorage.
  useEffect(() => {
    if (success) return;
    const timer = window.setTimeout(() => {
      try {
        const { beforeImage: _beforeImage, afterImage: _afterImage, ...textData } = formData;
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
          formData: textData,
          activeStep,
          formMode
        }));
      } catch {
        // Trình duyệt có thể chặn localStorage; form vẫn hoạt động bình thường.
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [formData, activeStep, formMode, success]);

  const handleFormModeChange = (_event: React.MouseEvent<HTMLElement>, nextMode: FormMode | null) => {
    if (nextMode) setFormMode(nextMode);
  };

  const handleCopyIdeaCode = async () => {
    try {
      await navigator.clipboard.writeText(ideaCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Không thể tự động sao chép. Vui lòng nhấn giữ mã để sao chép.');
    }
  };

  const handleCreateAnother = () => {
    setSuccess(false);
    setIdeaCode('');
    setCopied(false);
    setActiveStep(0);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.department.trim()) {
          setErrors(prev => ({ ...prev, department: 'Vui lòng chọn đơn vị làm việc' }));
          return false;
        }
        return true;
      case 1:
        if (!formData.idea.trim()) {
          setErrors(prev => ({ ...prev, idea: 'Vui lòng nhập ý tưởng' }));
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Image optimization
  const optimizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
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
        ctx?.drawImage(img, 0, 0, width, height);

        let optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

        if (optimizedDataUrl.length > 500000) {
          optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
        }

        if (optimizedDataUrl.length > 300000) {
          const smallerCanvas = document.createElement('canvas');
          const smallerCtx = smallerCanvas.getContext('2d');
          smallerCanvas.width = width * 0.8;
          smallerCanvas.height = height * 0.8;
          smallerCtx?.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
          optimizedDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.3);
        }

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

    if (file.size > 15 * 1024 * 1024) {
      setError(`File ${field === 'beforeImage' ? 'hình trước' : 'hình sau'} quá lớn. Vui lòng chọn file nhỏ hơn 15MB.`);
      return;
    }

    try {
      const optimizedDataUrl = await optimizeImage(file);
      setFormData(prev => ({ ...prev, [field]: optimizedDataUrl }));
      setError('');
    } catch (error) {
      setError(`Lỗi khi xử lý hình ảnh. Vui lòng thử lại.`);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.department.trim() || !formData.idea.trim()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const submitData: any = {
        fullName: formData.fullName,
        department: formData.department,
        idea: formData.idea,
        solution: formData.solution || null,
        benefit: formData.benefit || null,
        beforeImage: formData.beforeImage || null,
        afterImage: formData.afterImage || null
      };

      const response = await api.post('/ideas', submitData);
      setSuccess(true);
      setIdeaCode(response.data.ideaCode);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.setItem('vico_last_department', formData.department);
      setFormData({ ...EMPTY_FORM_DATA, department: formData.department });
      setActiveStep(0);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  // Step content renderers
  const renderStep0 = () => (
    <Box className="animate-fadeIn" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ textAlign: { xs: 'left', sm: 'center' }, mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.navy.main, mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          1. Thông tin cá nhân
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          Nhập họ tên (tùy chọn) và chọn phòng/xưởng làm việc của bạn
        </Typography>
      </Box>

      <TextField
        name="fullName"
        label="Họ và tên người đề xuất"
        value={formData.fullName}
        onChange={handleChange}
        fullWidth
        placeholder="Nhập họ và tên (không bắt buộc)"
        InputProps={{
          style: { fontSize: '16px' }, // Prevent iOS zoom
          startAdornment: (
            <Box sx={{ mr: 1, color: COLORS.slate[400], display: 'flex' }}>
              <Person fontSize="small" />
            </Box>
          ),
        }}
      />

      <FormControl fullWidth error={!!errors.department} required>
        <InputLabel style={{ fontSize: '16px' }}>Đơn vị / Phòng / Xưởng làm việc *</InputLabel>
        <Select
          name="department"
          value={formData.department}
          onChange={handleSelectChange}
          label="Đơn vị / Phòng / Xưởng làm việc *"
          style={{ fontSize: '16px' }}
          sx={{ borderRadius: '10px', minHeight: 52 }}
        >
          {departments.map((dept) => (
            <MenuItem key={dept} value={dept} style={{ fontSize: '15px' }}>
              {dept}
            </MenuItem>
          ))}
        </Select>
        {errors.department && (
          <Typography color="error" variant="caption" sx={{ mt: 0.5, ml: 1 }}>
            {errors.department}
          </Typography>
        )}
      </FormControl>

      {/* Mobile-friendly Support Card */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${COLORS.blue[50]} 0%, #ffffff 100%)`,
          border: `1px solid ${COLORS.blue[100]}`,
          borderRadius: '14px',
          mt: 1,
        }}
      >
        <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: '12px',
                backgroundColor: COLORS.blue[100],
                color: COLORS.blue[600],
                flexShrink: 0,
              }}
            >
              <ContactSupport fontSize="small" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.navy.main, fontSize: '0.875rem' }}>
                Cần người hỗ trợ điền form?
              </Typography>
              <Link
                href="https://zalo.me/0943490500"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: COLORS.blue[600],
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  mt: 0.25,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                <Phone sx={{ fontSize: 16 }} />
                Zalo: 0943 490 500 (Hà - Cải tiến)
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderStep1 = () => (
    <Box className="animate-fadeIn" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ textAlign: { xs: 'left', sm: 'center' }, mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.navy.main, mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          2. Mô tả ý tưởng cải tiến
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          Trình bày thực trạng hiện tại, vấn đề cần giải quyết hoặc cách làm mới
        </Typography>
      </Box>

      <ToggleButtonGroup
        value={formMode}
        exclusive
        onChange={handleFormModeChange}
        fullWidth
        size="small"
        aria-label="Chọn cách nhập ý tưởng"
        sx={{
          borderRadius: '12px',
          backgroundColor: COLORS.slate[100],
          p: 0.5,
          '& .MuiToggleButton-root': {
            border: 0,
            borderRadius: '9px !important',
            textTransform: 'none',
            fontWeight: 700,
            py: 1,
            color: COLORS.slate[600],
            '&.Mui-selected': {
              backgroundColor: '#fff',
              color: COLORS.blue[600],
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.1)'
            }
          },
        }}
      >
        <ToggleButton value="quick">Gửi nhanh</ToggleButton>
        <ToggleButton value="guided">Được hướng dẫn</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        name="idea"
        label={formMode === 'quick' ? 'Bạn muốn cải tiến điều gì? *' : 'Vấn đề hoặc cơ hội muốn cải tiến *'}
        value={formData.idea}
        onChange={handleChange}
        required
        fullWidth
        multiline
        rows={formMode === 'quick' ? 7 : 4}
        error={!!errors.idea}
        helperText={errors.idea || 'Hãy mô tả bằng ngôn ngữ tự nhiên, chưa cần viết thật hoàn chỉnh'}
        placeholder="Ví dụ: Tại công đoạn đúc 1, tôi nhận thấy thời gian chờ đang kéo dài do..."
        InputProps={{
          style: { fontSize: '16px', lineHeight: 1.6 },
        }}
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          component="a"
          href="https://gemini.google.com/gem/1u21g1gYbXuBE8-VjgonT-art3DvXZjFX?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          startIcon={<AutoAwesome sx={{ color: '#8b5cf6' }} />}
          endIcon={<OpenInNew sx={{ fontSize: '15px !important' }} />}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 700,
            borderColor: '#c4b5fd',
            color: '#6d28d9',
            backgroundColor: '#f5f3ff',
            '&:hover': {
              borderColor: '#8b5cf6',
              backgroundColor: '#ede9fe',
            },
          }}
        >
          Viết lại rõ ràng hơn
        </Button>
        <Typography variant="caption" sx={{ color: COLORS.slate[500] }}>
          Mở trợ lý Gemini để được hướng dẫn hoàn thiện ý tưởng rõ ràng, súc tích hơn.
        </Typography>
      </Box>

      {formMode === 'guided' && (
        <Box className="animate-fadeIn" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            name="solution"
            label="Thực trạng hiện tại"
            value={formData.solution}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            placeholder="Hiện tại công việc đang được thực hiện như thế nào? Khó khăn nằm ở đâu?"
            InputProps={{ style: { fontSize: '16px', lineHeight: 1.6 } }}
          />
          <TextField
            name="benefit"
            label="Giải pháp đề xuất"
            value={formData.benefit}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            placeholder="Bạn đề xuất thay đổi cách làm, thiết bị hoặc quy trình như thế nào?"
            InputProps={{ style: { fontSize: '16px', lineHeight: 1.6 } }}
          />
        </Box>
      )}
    </Box>
  );

  const renderStep2 = () => (
    <Box className="animate-fadeIn" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ textAlign: { xs: 'left', sm: 'center' }, mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.navy.main, mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          3. Hình ảnh & gửi ý tưởng
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          Thêm ảnh hiện trạng hoặc ảnh minh họa giải pháp nếu có
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Trước cải tiến */}
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              borderRadius: '14px',
              border: formData.beforeImage
                ? `2px solid ${COLORS.emerald[500]}`
                : `2px dashed ${COLORS.slate[300]}`,
              backgroundColor: formData.beforeImage ? COLORS.emerald[50] : '#ffffff',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              {formData.beforeImage ? (
                <Box>
                  <img
                    src={formData.beforeImage}
                    alt="Hình ảnh trước"
                    onClick={() => handleImageClick(formData.beforeImage, 'Hình ảnh trước cải tiến')}
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Chip label="✓ Ảnh trước" color="success" size="small" sx={{ fontWeight: 700 }} />
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setFormData(prev => ({ ...prev, beforeImage: '' }))}
                      sx={{ fontWeight: 600 }}
                    >
                      Xóa ảnh
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box component="label" sx={{ cursor: 'pointer', display: 'block', py: 1 }}>
                  <PhotoCamera sx={{ fontSize: 44, color: COLORS.blue[500], mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.navy.main, mb: 0.5 }}>
                    Ảnh hiện trạng
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Chụp trực tiếp hoặc chọn từ thư viện ảnh
                  </Typography>
                  <Button variant="outlined" component="span" fullWidth sx={{ borderRadius: '10px', minHeight: 44, fontWeight: 600 }}>
                    📷 Chọn / Chụp ảnh
                  </Button>
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'beforeImage')} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sau cải tiến */}
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              borderRadius: '14px',
              border: formData.afterImage
                ? `2px solid ${COLORS.emerald[500]}`
                : `2px dashed ${COLORS.slate[300]}`,
              backgroundColor: formData.afterImage ? COLORS.emerald[50] : '#ffffff',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              {formData.afterImage ? (
                <Box>
                  <img
                    src={formData.afterImage}
                    alt="Hình ảnh sau"
                    onClick={() => handleImageClick(formData.afterImage, 'Hình ảnh sau cải tiến')}
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Chip label="✓ Ảnh sau" color="success" size="small" sx={{ fontWeight: 700 }} />
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setFormData(prev => ({ ...prev, afterImage: '' }))}
                      sx={{ fontWeight: 600 }}
                    >
                      Xóa ảnh
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box component="label" sx={{ cursor: 'pointer', display: 'block', py: 1 }}>
                  <PhotoCamera sx={{ fontSize: 44, color: COLORS.emerald[500], mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.navy.main, mb: 0.5 }}>
                    Ảnh giải pháp / kết quả
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Có thể bổ sung ảnh kết quả sau khi ý tưởng được triển khai
                  </Typography>
                  <Button variant="outlined" component="span" fullWidth color="success" sx={{ borderRadius: '10px', minHeight: 44, fontWeight: 600 }}>
                    📷 Chọn / Chụp ảnh
                  </Button>
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, 'afterImage')} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '0.875rem' }}>
        Hình ảnh là tùy chọn. Sau khi gửi, hệ thống sẽ cấp một mã riêng để bạn theo dõi ý tưởng.
      </Alert>

      {isMobile && renderSummary()}
    </Box>
  );

  const renderSummary = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card sx={{ borderRadius: '16px', border: `1px solid ${COLORS.slate[200]}`, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: COLORS.navy.main, mb: 2 }}>
            Tóm tắt đề xuất
          </Typography>
          <Grid container spacing={2}>
            {formData.fullName && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Họ và tên
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.25, color: COLORS.navy.main }}>
                  {formData.fullName}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12} sm={formData.fullName ? 6 : 12}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Đơn vị / Phòng ban
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.25, color: COLORS.navy.main }}>
                {formData.department}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Nội dung ý tưởng
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: COLORS.slate[800], fontSize: '0.938rem' }}>
                {formData.idea}
              </Typography>
            </Grid>
            {formData.solution && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Thực trạng
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {formData.solution}
                </Typography>
              </Grid>
            )}
            {formData.benefit && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Giải pháp đề xuất
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {formData.benefit}
                </Typography>
              </Grid>
            )}
            {(formData.beforeImage || formData.afterImage) && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', mb: 1 }}>
                  Hình ảnh đính kèm
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.beforeImage && (
                    <Chip label="✓ Đã kèm ảnh trước" color="success" size="small" sx={{ fontWeight: 600 }} />
                  )}
                  {formData.afterImage && (
                    <Chip label="✓ Đã kèm ảnh sau" color="success" size="small" sx={{ fontWeight: 600 }} />
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      default: return null;
    }
  };

  return (
    <Container maxWidth="lg" disableGutters={isMobile} sx={{ px: { xs: 1.5, sm: 3 }, py: 1 }}>
      {/* Success Banner */}
      {success && (
        <Card
          className="animate-scaleIn"
          sx={{
            mb: 3,
            background: `linear-gradient(135deg, ${COLORS.emerald[50]} 0%, #ffffff 100%)`,
            border: `2px solid ${COLORS.emerald[400]}`,
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <CardContent sx={{ py: 3, px: 2 }}>
            <Celebration sx={{ fontSize: 44, color: COLORS.emerald[500], mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.emerald[700], mb: 1 }}>
              Gửi ý tưởng thành công! 🎉
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: COLORS.slate[700] }}>
              Mã ý tưởng của bạn là:
            </Typography>
            <Chip
              label={ideaCode}
              color="primary"
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 800,
                py: 2.5,
                px: 2,
                borderRadius: '12px',
                boxShadow: `0 4px 14px ${COLORS.blue[500]}30`,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Hãy lưu mã này để đối chiếu với Phòng Cải tiến khi cần.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mt: 2.5 }}>
              <Button
                variant="contained"
                startIcon={copied ? <CheckCircle /> : <ContentCopy />}
                onClick={handleCopyIdeaCode}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                {copied ? 'Đã sao chép' : 'Sao chép mã'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={handleCreateAnother}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                Gửi thêm ý tưởng
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {!success && (
        <>
          {/* Error Banner */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Mobile Stepper Header: Compact Progress bar for phones */}
          {isMobile ? (
            <Box sx={{ mb: 3, px: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: COLORS.blue[600] }}>
                  Bước {activeStep + 1} / {steps.length}: {steps[activeStep]}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.slate[500] }}>
                  {Math.round(((activeStep + 1) / steps.length) * 100)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={((activeStep + 1) / steps.length) * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: COLORS.slate[200],
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: COLORS.blue[500],
                  },
                }}
              />
            </Box>
          ) : (
            /* Desktop Stepper */
            <Box sx={{ mb: 4 }}>
              <Stepper
                activeStep={activeStep}
                alternativeLabel
                connector={<CustomConnector />}
                sx={{ px: 2 }}
              >
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconComponent={(props) => (
                        <CustomStepIcon
                          {...props}
                          stepIndex={index}
                        />
                      )}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: activeStep === index ? 700 : 500,
                          color: activeStep === index ? COLORS.blue[600] : COLORS.slate[500],
                          fontSize: '0.8rem',
                        }}
                      >
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          <Grid container spacing={{ xs: 0, sm: 3 }} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              {/* Step Content */}
              <Box sx={{ minHeight: 280 }}>
                {getStepContent(activeStep)}
              </Box>

              {/* Navigation Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  justifyContent: 'space-between',
                  mt: 4,
                  pt: 2.5,
                  borderTop: `1px solid ${COLORS.slate[200]}`,
                }}
              >
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  startIcon={<ArrowBack />}
                  variant="outlined"
                  sx={{
                    visibility: activeStep === 0 ? 'hidden' : 'visible',
                    color: COLORS.slate[700],
                    fontWeight: 700,
                    borderRadius: '12px',
                    minHeight: 48,
                    px: { xs: 2, sm: 3 },
                    fontSize: '0.9rem',
                  }}
                >
                  Quay lại
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth={isMobile}
                    endIcon={<Send />}
                    disabled={submitting}
                    onClick={() => handleSubmit()}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontWeight: 800,
                      borderRadius: '12px',
                      fontSize: '1rem',
                      background: `linear-gradient(135deg, ${COLORS.blue[500]} 0%, ${COLORS.blue[600]} 100%)`,
                      boxShadow: `0 4px 14px ${COLORS.blue[500]}40`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${COLORS.blue[500]}50`,
                      },
                    }}
                  >
                    {submitting ? 'Đang gửi ý tưởng...' : '🚀 Gửi ý tưởng ngay'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth={isMobile}
                    endIcon={<ArrowForward />}
                    onClick={handleNext}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontWeight: 700,
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      minHeight: 48,
                    }}
                  >
                    Tiếp theo
                  </Button>
                )}
              </Box>
            </Grid>

            {!isMobile && (
              <Grid item xs={12} md={4}>
                <Box sx={{ position: { md: 'sticky' }, top: { md: 92 } }}>
                  {renderSummary()}
                  <Typography variant="caption" sx={{ display: 'block', color: COLORS.slate[500], mt: 1.5, textAlign: 'center' }}>
                    Bản nháp được tự động lưu trên thiết bị này.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </>
      )}

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
