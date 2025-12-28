import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  IconButton,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  Select,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  FormControlLabel
} from '@mui/material';
import { DataGrid, GridColDef, GridRowHeightParams } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon, FileDownload as FileDownloadIcon, BarChart as BarChartIcon, Upload as UploadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Idea, IdeaStatus, IdeaStatusLabels, RewardStatus, RewardStatusLabels, RewardCalculationMethod, RewardCalculationMethodLabels } from '../types';
import IdeaDialog from './IdeaDialog';
import ExportReportDialog from './ExportReportDialog';
import ImageLightbox from './ImageLightbox';
import RewardStatusDialog from './RewardStatusDialog';
import ImportDialog from './ImportDialog';
import api from '../api/config';

interface AdminDashboardProps {
  // Chế độ chỉ xem (dùng cho /admin-view từ statistics-view)
  isViewOnly?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isViewOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [implementationDepartmentFilter, setImplementationDepartmentFilter] = useState<string[]>([]);
  const [rewardStatusesFilter, setRewardStatusesFilter] = useState<RewardStatus[]>([]);
  const [rewardCalculationMethodFilter, setRewardCalculationMethodFilter] = useState<RewardCalculationMethod | ''>('');
  const [ideaCodeFilter, setIdeaCodeFilter] = useState('');
  const [fullNameFilter, setFullNameFilter] = useState('');
  const [ideaTextFilter, setIdeaTextFilter] = useState('');
  const [submissionDateFromFilter, setSubmissionDateFromFilter] = useState('');
  const [submissionDateToFilter, setSubmissionDateToFilter] = useState('');
  const [rewardApprovalDateFromFilter, setRewardApprovalDateFromFilter] = useState('');
  const [rewardApprovalDateToFilter, setRewardApprovalDateToFilter] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');
  
  // Reward status dialog state
  const [isRewardStatusDialogOpen, setIsRewardStatusDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ ideaId: string; newStatus: IdeaStatus; oldStatus: IdeaStatus } | null>(null);
  
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const topScrollRef = useRef<HTMLDivElement>(null);
  const dataGridRef = useRef<HTMLDivElement>(null);

  // Column visibility management
  const allColumnFields = [
    'ideaCode',
    'fullName',
    'department',
    'idea',
    'solution',
    'benefit',
    'benefitOutcome',
    'resourcesUsed',
    'calculationDescription',
    'scalingOpportunity',
    'beforeImage',
    'afterImage',
    'status',
    'rewardStatuses',
    'submissionDate',
    'implementationDepartment',
    'note',
    'benefitValue',
    'rewardAmount',
    'rewardApprovalDate',
    'rewardCalculationMethod',
    'actions'
  ] as const;

  // Các cột được phép hiển thị trong chế độ chỉ xem (admin-view)
  const viewOnlyFields = new Set<string>([
    'ideaCode',          // Mã ý tưởng
    'fullName',          // Tên người đề nghị
    'department',        // Phòng ban
    'idea',              // Ý tưởng
    'status',            // Trạng thái
    'rewardStatuses',    // Tình trạng khen thưởng
    'rewardCalculationMethod', // Phương thức tính thưởng
    'beforeImage',       // Ảnh trước
    'afterImage',        // Ảnh sau
    'note'               // Ghi chú
  ]);

  const defaultVisibleFields = new Set<string>(
    isViewOnly
      ? Array.from(viewOnlyFields)
      : [
          'ideaCode',
          'idea',
          'solution',
          'benefit',
          'beforeImage',
          'afterImage',
          'status',
          'note',
          'actions'
        ]
  );

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>(() => {
    // Với chế độ chỉ xem, luôn cố định bộ cột, không dùng cấu hình lưu trong localStorage
    if (isViewOnly) {
      const model: Record<string, boolean> = {};
      allColumnFields.forEach(f => {
        model[f] = viewOnlyFields.has(f);
      });
      return model;
    }

    try {
      const saved = localStorage.getItem('admin_column_visibility');
      if (saved) return JSON.parse(saved);
    } catch {}
    const model: Record<string, boolean> = {};
    allColumnFields.forEach(f => { model[f] = defaultVisibleFields.has(f); });
    return model;
  });

  useEffect(() => {
    if (isViewOnly) return;
    try {
      localStorage.setItem('admin_column_visibility', JSON.stringify(columnVisibilityModel));
    } catch {}
  }, [columnVisibilityModel, isViewOnly]);

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const isColMenuOpen = Boolean(colMenuAnchor);
  const openColMenu = (e: React.MouseEvent<HTMLElement>) => setColMenuAnchor(e.currentTarget);
  const closeColMenu = () => setColMenuAnchor(null);
  const handleToggleColumn = (field: string) => {
    setColumnVisibilityModel(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSelectAllColumns = () => {
    const allSelected = allColumnFields.every(field => columnVisibilityModel[field]);
    const newModel: Record<string, boolean> = {};
    allColumnFields.forEach(field => {
      newModel[field] = !allSelected; // Nếu tất cả đã chọn thì bỏ chọn tất cả, ngược lại chọn tất cả
    });
    setColumnVisibilityModel(newModel);
  };

  const allColumnsSelected = allColumnFields.every(field => columnVisibilityModel[field]);

  // Function to approximate row height based on content length
  // const calculateRowHeight = (params: GridRowHeightParams) => {
  //   const ideaLength = params.model.idea ? params.model.idea.length : 0;
  //   const solutionLength = params.model.solution ? params.model.solution.length : 0;
  //   const benefitLength = (params as any).model.benefit ? (params as any).model.benefit.length : 0;
    
  //   // Approximate characters per line for 'idea' and 'solution' columns
  //   // width: 300px, font-size: default (around 14px), assume ~40 characters per line for 300px width
  //   const charsPerLineIdea = 40; 
  //   const charsPerLineSolution = 40;
  //   const charsPerLineBenefit = 40;

  //   const linesIdea = Math.ceil(ideaLength / charsPerLineIdea);
  //   const linesSolution = Math.ceil(solutionLength / charsPerLineSolution);
  //   const linesBenefit = Math.ceil(benefitLength / charsPerLineBenefit);

  //   const maxLines = Math.max(linesIdea, linesSolution, linesBenefit);

  //   // Base height for a single line (e.g., 50px as initial min height for rows)
  //   const baseHeight = 50; 
  //   // Height per additional line (e.g., 20px per line)
  //   const lineHeight = 20; 

  //   // Ensure a minimum height and scale based on content
  //   return Math.max(baseHeight, baseHeight + (maxLines - 1) * lineHeight);
  // };

  const fetchIdeas = useCallback(async () => {
    try {
      if (isViewOnly) {
        // Chế độ chỉ xem: dùng endpoint public, không cần token
        const response = await api.get('/ideas/public');
        setIdeas(response.data);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get('/ideas', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setIdeas(response.data);
      setLoading(false);
    } catch (error: any) {
      if (!isViewOnly && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể tải danh sách ý tưởng');
      }
      setLoading(false);
    }
  }, [navigate, isViewOnly]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Apply filters from query params if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Department filter
    const dept = params.get('department');
    if (dept) {
      setDepartmentFilter([dept]);
    }
    
    // Status filter
    const status = params.get('status');
    if (status && Object.values(IdeaStatus).includes(status as IdeaStatus)) {
      setStatusFilter([status as IdeaStatus]);
    }
    
    // Reward statuses filter
    const rewardStatusesParam = params.get('rewardStatuses');
    if (rewardStatusesParam && Object.values(RewardStatus).includes(rewardStatusesParam as RewardStatus)) {
      setRewardStatusesFilter([rewardStatusesParam as RewardStatus]);
    }
    
    // Date filters from query params
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');
    const filterType = params.get('filterType'); // 'reward' => lọc theo rewardApprovalDate, mặc định: submissionDate

    if (dateFrom || dateTo) {
      if (filterType === 'reward') {
        // Lọc theo ngày duyệt khen thưởng
        if (dateFrom) setRewardApprovalDateFromFilter(dateFrom);
        if (dateTo) setRewardApprovalDateToFilter(dateTo);
      } else {
        // Mặc định: lọc theo thời gian nộp
        if (dateFrom) setSubmissionDateFromFilter(dateFrom);
        if (dateTo) setSubmissionDateToFilter(dateTo);
      }
    }
    
    
    // Full name filter
    const fullName = params.get('fullName');
    if (fullName) setFullNameFilter(fullName);
    
    
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [location.search]);
  

  const handleStatusFilterChange = (event: any) => {
    const value = event.target.value as IdeaStatus[];
    setStatusFilter(value);
  };

  const handleDepartmentFilterChange = (event: any) => {
    const value = event.target.value as string[];
    setDepartmentFilter(value);
  };

  const handleImplementationDepartmentFilterChange = (event: any) => {
    const value = event.target.value as string[];
    setImplementationDepartmentFilter(value);
  };

  const handleRewardStatusesFilterChange = (event: any) => {
    const value = event.target.value as RewardStatus[];
    setRewardStatusesFilter(value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleRewardCalculationMethodFilterChange = (event: SelectChangeEvent<RewardCalculationMethod | ''>) => {
    setRewardCalculationMethodFilter(event.target.value as RewardCalculationMethod | '');
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleRewardCalculationMethodChange = async (id: string, method: RewardCalculationMethod | undefined) => {
    if (isViewOnly) return; // Không cho sửa ở chế độ chỉ xem
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await api.put(
        `/ideas/${id}`,
        { rewardCalculationMethod: method || null },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Refresh ideas from server
      fetchIdeas();
    } catch (error: any) {
      console.error('Error updating reward calculation method:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể cập nhật phương thức tính thưởng');
      }
    }
  };

  const handleIdeaCodeFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIdeaCodeFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleFullNameFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFullNameFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleIdeaTextFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIdeaTextFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleSubmissionDateFromFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionDateFromFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleSubmissionDateToFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionDateToFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleRewardApprovalDateFromFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRewardApprovalDateFromFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleRewardApprovalDateToFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRewardApprovalDateToFilter(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  
  const handleClearAllFilters = () => {
    setStatusFilter([]);
    setDepartmentFilter([]);
    setImplementationDepartmentFilter([]);
    setRewardStatusesFilter([]);
    setRewardCalculationMethodFilter('');
    setIdeaCodeFilter('');
    setFullNameFilter('');
    setIdeaTextFilter('');
    setSubmissionDateFromFilter('');
    setSubmissionDateToFilter('');
    setRewardApprovalDateFromFilter('');
    setRewardApprovalDateToFilter('');
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };


  const handleStatusChange = async (id: string, status: IdeaStatus) => {
    if (isViewOnly) return; // Không cho sửa ở chế độ chỉ xem
    
    // Tìm idea hiện tại để lấy status cũ
    const currentIdea = ideas.find(i => i._id === id);
    if (!currentIdea) return;

    const oldStatus: any = currentIdea.status;
    let normalizedOldStatus: IdeaStatus;
    
    // Normalize old status
    if (!Object.values(IdeaStatus).includes(oldStatus as IdeaStatus)) {
      const statusStr = String(oldStatus);
      if (statusStr === 'pending') {
        normalizedOldStatus = IdeaStatus.DE_NGHI_MOI;
      } else if (statusStr === 'rejected') {
        normalizedOldStatus = IdeaStatus.REJECTED;
      } else if (statusStr === 'noted') {
        normalizedOldStatus = IdeaStatus.LUU_Y_TUONG;
      } else if (statusStr === 'approved') {
        normalizedOldStatus = IdeaStatus.TRIEN_KHAI;
      } else {
        normalizedOldStatus = IdeaStatus.DE_NGHI_MOI;
      }
    } else {
      normalizedOldStatus = oldStatus as IdeaStatus;
    }

    // Các trạng thái giai đoạn đầu
    const earlyStageStatuses = [
      IdeaStatus.DE_NGHI_MOI,
      IdeaStatus.XEM_XET,
      IdeaStatus.CHO_PHE_DUYET
    ];

    // Các trạng thái giai đoạn sau
    const laterStageStatuses = [
      IdeaStatus.TRIEN_KHAI,
      IdeaStatus.KHONG_PHU_HOP,
      IdeaStatus.LUU_Y_TUONG,
      IdeaStatus.BAO_CAO_A3,
      IdeaStatus.KHEN_THUONG,
      IdeaStatus.DONE,
      IdeaStatus.REJECTED
    ];

    // Kiểm tra xem có cần hiển thị popup không
    if (earlyStageStatuses.includes(normalizedOldStatus) && laterStageStatuses.includes(status)) {
      // Hiển thị popup xét khen thưởng
      setPendingStatusChange({ ideaId: id, newStatus: status, oldStatus: normalizedOldStatus });
      setIsRewardStatusDialogOpen(true);
      return;
    }

    // Nếu không cần popup, cập nhật trực tiếp
    await updateStatus(id, status);
  };

  const updateStatus = async (id: string, status: IdeaStatus, rewardStatuses?: RewardStatus[]) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const updateData: any = { status };
      if (rewardStatuses !== undefined) {
        updateData.rewardStatuses = rewardStatuses;
      }

      await api.put(`/ideas/${id}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchIdeas();
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể cập nhật trạng thái');
      }
    }
  };

  const handleRewardStatusConfirm = async (selectedStatuses: RewardStatus[]) => {
    if (!pendingStatusChange) return;

    // Áp dụng quy tắc: không được tồn tại đồng thời CHO và DA của cùng một loại
    let validStatuses = [...selectedStatuses];
    
    // Loại bỏ xung đột nếu có
    if (validStatuses.includes(RewardStatus.CHO_KHEN_THUONG_50K) && 
        validStatuses.includes(RewardStatus.DA_KHEN_THUONG_50K)) {
      // Giữ lại CHO nếu cả hai đều có
      validStatuses = validStatuses.filter(s => s !== RewardStatus.DA_KHEN_THUONG_50K);
    }
    
    if (validStatuses.includes(RewardStatus.CHO_KHEN_THUONG_20) && 
        validStatuses.includes(RewardStatus.DA_KHEN_THUONG_20)) {
      validStatuses = validStatuses.filter(s => s !== RewardStatus.DA_KHEN_THUONG_20);
    }

    // Cập nhật status và rewardStatuses
    await updateStatus(pendingStatusChange.ideaId, pendingStatusChange.newStatus, validStatuses);
    
    // Reset state
    setPendingStatusChange(null);
    setIsRewardStatusDialogOpen(false);
  };

  const handleRewardStatusDialogClose = () => {
    setPendingStatusChange(null);
    setIsRewardStatusDialogOpen(false);
  };

  const handleRewardStatusesChange = async (id: string, rewardStatuses: RewardStatus[]) => {
    if (isViewOnly) return; // Không cho sửa ở chế độ chỉ xem
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Áp dụng quy tắc: không được tồn tại đồng thời CHO và DA của cùng một loại
      let validStatuses = [...rewardStatuses];
      
      // Loại bỏ xung đột nếu có
      if (validStatuses.includes(RewardStatus.CHO_KHEN_THUONG_50K) && 
          validStatuses.includes(RewardStatus.DA_KHEN_THUONG_50K)) {
        // Giữ lại DA nếu cả hai đều có (ưu tiên đã chi)
        validStatuses = validStatuses.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_50K);
      }
      
      if (validStatuses.includes(RewardStatus.CHO_KHEN_THUONG_20) && 
          validStatuses.includes(RewardStatus.DA_KHEN_THUONG_20)) {
        validStatuses = validStatuses.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_20);
      }

      await api.put(`/ideas/${id}`, {
        rewardStatuses: validStatuses
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchIdeas();
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể cập nhật tình trạng khen thưởng');
      }
    }
  };

  const handleImplementationStatusChange = async (
    id: string, 
    implementationStatus: 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'
  ) => {
    if (isViewOnly) return; // Không cho sửa ở chế độ chỉ xem
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Note: implementationStatus is not in the Idea type but may exist in database
      await api.put(`/ideas/${id}`, {
        implementationStatus
      } as any, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchIdeas();
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể cập nhật trạng thái triển khai');
      }
    }
  };


  const handleDelete = async (id: string) => {
    if (isViewOnly) return; // Không cho xóa ở chế độ chỉ xem
    if (window.confirm('Bạn có chắc chắn muốn xóa ý tưởng này?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        await api.delete(`/ideas/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        fetchIdeas();
      } catch (error: any) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Không thể xóa ý tưởng');
        }
      }
    }
  };

  const handleEdit = (idea: Idea) => {
    if (isViewOnly) return; // Không cho sửa ở chế độ chỉ xem
    setSelectedIdea(idea);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    if (isViewOnly) return; // Không cho thêm mới ở chế độ chỉ xem
    setSelectedIdea(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleSave = async (ideaData: Partial<Idea>) => {
    if (isViewOnly) return; // Không lưu ở chế độ chỉ xem
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (isEditMode && selectedIdea) {
        await api.put(`/ideas/${selectedIdea._id}`, ideaData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        await api.post('/ideas', ideaData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      fetchIdeas();
      setIsDialogOpen(false);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể lưu ý tưởng');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleGoToStatistics = () => {
    // Nếu đang ở admin-view (chỉ xem) thì quay về statistics-view,
    // còn admin thường quay về dashboard thống kê chuẩn
    if (isViewOnly) {
      navigate('/statistics-view');
    } else {
      navigate('/statistics');
    }
  };

  const handleExportExcel = () => {
    // Map field names to display names
    const fieldDisplayNames: Record<string, string> = {
      'ideaCode': 'Mã ý tưởng',
      'beforeImage': 'Hình trước',
      'afterImage': 'Hình sau',
      'fullName': 'Họ và tên',
      'department': 'Đơn vị',
      'idea': 'Ý tưởng',
      'solution': 'Thực trạng',
      'benefit': 'Giải pháp',
      'benefitOutcome': 'Lợi ích mang lại',
      'resourcesUsed': 'Nguồn lực sử dụng',
      'calculationDescription': 'Mô tả cách tính',
      'scalingOpportunity': 'Cơ hội nhân rộng phát triển',
        'status': 'Trạng thái',
        'rewardStatuses': 'Tình trạng khen thưởng',
        'rewardCalculationMethod': 'Phương thức tính thưởng',
        'implementationStatus': 'Trạng thái triển khai',
      'implementationDepartment': 'Phòng ban triển khai',
      'note': 'Ghi chú',
      'benefitValue': 'Giá trị làm lợi (VND)',
      'rewardAmount': 'Tiền thưởng (VND)',
      'rewardApprovalDate': 'Ngày duyệt khen thưởng',
      'submissionDate': 'Ngày gửi'
    };

    // Get visible columns (default true if not explicitly hidden)
    const visibleFields = columns.filter(col => {
      const isVisible = columnVisibilityModel[col.field];
      // Default to true if not in visibility model (meaning column is visible by default)
      return isVisible !== false;
    }).map(col => col.field);

    const exportData = filteredIdeas.map(idea => {
      const row: Record<string, any> = {};
      
      visibleFields.forEach(field => {
        const displayName = fieldDisplayNames[field] || field;
        
        if (field === 'beforeImage' || field === 'afterImage') {
          row[displayName] = (idea as any)[field] ? 'Có' : 'Không';
        } else if (field === 'benefitValue' || field === 'rewardAmount') {
          const value = (idea as any)[field];
          row[displayName] = value ? value.toLocaleString('vi-VN') : '0';
        } else if (field === 'rewardApprovalDate') {
          const date = (idea as any)[field];
          row[displayName] = date ? new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
        } else if (field === 'submissionDate') {
          row[displayName] = new Date((idea as any)[field]).toLocaleDateString('vi-VN');
        } else if (field === 'idea') {
          row[displayName] = (idea as any)[field] || '-';
        } else if (field === 'status') {
          // Handle status enum
          const ideaStatus: any = idea.status;
          let normalizedStatus: IdeaStatus;
          if (!Object.values(IdeaStatus).includes(ideaStatus as IdeaStatus)) {
            const statusStr = String(ideaStatus);
            if (statusStr === 'pending') {
              normalizedStatus = IdeaStatus.DE_NGHI_MOI;
            } else if (statusStr === 'rejected') {
              normalizedStatus = IdeaStatus.REJECTED;
            } else if (statusStr === 'noted') {
              normalizedStatus = IdeaStatus.LUU_Y_TUONG;
            } else if (statusStr === 'approved') {
              normalizedStatus = IdeaStatus.TRIEN_KHAI;
            } else {
              normalizedStatus = IdeaStatus.DE_NGHI_MOI;
            }
          } else {
            normalizedStatus = ideaStatus as IdeaStatus;
          }
          row[displayName] = IdeaStatusLabels[normalizedStatus];
        } else if (field === 'rewardStatuses') {
          const rewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
          if (rewardStatuses.length > 0) {
            row[displayName] = rewardStatuses.map(s => RewardStatusLabels[s]).join(', ');
          } else {
            row[displayName] = '';
          }
        } else if (field === 'rewardCalculationMethod') {
          const method = (idea as any)[field] as RewardCalculationMethod | undefined;
          row[displayName] = method ? RewardCalculationMethodLabels[method] : '';
        } else {
          row[displayName] = (idea as any)[field] || '-';
        }
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ý tưởng cải tiến');
    XLSX.writeFile(wb, 'danh_sach_y_tuong.xlsx');
  };

  const handleExportExcelViewOnly = () => {
    // Map field names to display names for viewOnly mode
    const fieldDisplayNames: Record<string, string> = {
      'ideaCode': 'Mã ý tưởng',
      'fullName': 'Họ và tên',
      'department': 'Đơn vị',
      'idea': 'Ý tưởng',
      'status': 'Trạng thái',
      'rewardStatuses': 'Tình trạng khen thưởng',
      'rewardCalculationMethod': 'Phương thức tính thưởng',
      'beforeImage': 'Hình trước',
      'afterImage': 'Hình sau',
      'note': 'Ghi chú'
    };

    // Only export fields visible in viewOnly mode
    const visibleFields = Array.from(viewOnlyFields).filter(field => field !== 'actions');

    const exportData = filteredIdeas.map(idea => {
      const row: Record<string, any> = {};
      
      visibleFields.forEach(field => {
        const displayName = fieldDisplayNames[field] || field;
        
        if (field === 'beforeImage' || field === 'afterImage') {
          row[displayName] = (idea as any)[field] ? 'Có' : 'Không';
        } else if (field === 'status') {
          // Handle status enum
          const ideaStatus: any = idea.status;
          let normalizedStatus: IdeaStatus;
          if (!Object.values(IdeaStatus).includes(ideaStatus as IdeaStatus)) {
            const statusStr = String(ideaStatus);
            if (statusStr === 'pending') {
              normalizedStatus = IdeaStatus.DE_NGHI_MOI;
            } else if (statusStr === 'rejected') {
              normalizedStatus = IdeaStatus.REJECTED;
            } else if (statusStr === 'noted') {
              normalizedStatus = IdeaStatus.LUU_Y_TUONG;
            } else if (statusStr === 'approved') {
              normalizedStatus = IdeaStatus.TRIEN_KHAI;
            } else {
              normalizedStatus = IdeaStatus.DE_NGHI_MOI;
            }
          } else {
            normalizedStatus = ideaStatus as IdeaStatus;
          }
          row[displayName] = IdeaStatusLabels[normalizedStatus];
        } else if (field === 'rewardStatuses') {
          const rewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
          if (rewardStatuses.length > 0) {
            row[displayName] = rewardStatuses.map(s => RewardStatusLabels[s]).join(', ');
          } else {
            row[displayName] = '';
          }
        } else if (field === 'rewardCalculationMethod') {
          const method = (idea as any)[field] as RewardCalculationMethod | undefined;
          row[displayName] = method ? RewardCalculationMethodLabels[method] : '';
        } else if (field === 'idea') {
          row[displayName] = (idea as any)[field] || '-';
        } else {
          row[displayName] = (idea as any)[field] || '-';
        }
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ý tưởng cải tiến');
    XLSX.writeFile(wb, 'danh_sach_y_tuong.xlsx');
  };

  const uniqueDepartments = Array.from(new Set(ideas.map(i => i.department))).filter(Boolean).sort();
  const uniqueImplementationDepartments = Array.from(new Set(ideas.map(i => (i as any).implementationDepartment))).filter(Boolean).sort();

  const normalizeText = (text: string) =>
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filteredIdeas = ideas.filter(idea => {
    const matchesIdeaCode = normalizeText(ideaCodeFilter) === '' || normalizeText((idea as any).ideaCode || '').includes(normalizeText(ideaCodeFilter));
    const matchesFullName = normalizeText(fullNameFilter) === '' || normalizeText((idea as any).fullName || '').includes(normalizeText(fullNameFilter));
    const matchesIdeaText = normalizeText(ideaTextFilter) === '' || normalizeText((idea as any).idea || '').includes(normalizeText(ideaTextFilter));
    // Handle backward compatibility: check if idea.status is old value or new enum
    const ideaStatus = (idea as any).status;
    let normalizedStatus: IdeaStatus;
    
    // Map old status values to new enum
    if (!Object.values(IdeaStatus).includes(ideaStatus as IdeaStatus)) {
      // Legacy status mapping
      if (ideaStatus === 'pending') {
        normalizedStatus = IdeaStatus.DE_NGHI_MOI;
      } else if (ideaStatus === 'rejected') {
        normalizedStatus = IdeaStatus.REJECTED;
      } else if (ideaStatus === 'noted') {
        normalizedStatus = IdeaStatus.LUU_Y_TUONG;
      } else if (ideaStatus === 'approved') {
        normalizedStatus = IdeaStatus.TRIEN_KHAI;
      } else {
        normalizedStatus = IdeaStatus.DE_NGHI_MOI;
      }
    } else {
      normalizedStatus = ideaStatus as IdeaStatus;
    }
    
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(normalizedStatus);
    const matchesDepartment = departmentFilter.length === 0 || departmentFilter.includes((idea as any).department);
    const matchesImplementationDepartment = implementationDepartmentFilter.length === 0 || implementationDepartmentFilter.includes(((idea as any).implementationDepartment || ''));

    // Filter by reward statuses - lọc các idea có TẤT CẢ các status được chọn (AND logic)
    // Idea có thể có thêm status khác, nhưng phải có đủ tất cả các status trong filter
    let matchesRewardStatuses = true;
    if (rewardStatusesFilter.length > 0) {
      const ideaRewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
      // Kiểm tra xem idea có TẤT CẢ các rewardStatus trong filter không (AND logic)
      // Ví dụ: chọn "Chờ 50k" và "Đã 50k" -> chỉ lọc các idea có CẢ HAI (có thể có thêm status khác)
      matchesRewardStatuses = rewardStatusesFilter.every(filterStatus => 
        ideaRewardStatuses.includes(filterStatus)
      );
    }

    // Filter by reward calculation method
    let matchesRewardCalculationMethod = true;
    if (rewardCalculationMethodFilter) {
      const ideaMethod = (idea as any).rewardCalculationMethod || RewardCalculationMethod.TOOL_BASED;
      matchesRewardCalculationMethod = ideaMethod === rewardCalculationMethodFilter;
    }

    // Filter by submission date
    let matchesSubmissionDate = true;
    if (submissionDateFromFilter || submissionDateToFilter) {
      const submissionDate = new Date(idea.submissionDate);
      const submissionDateOnly = new Date(submissionDate.getFullYear(), submissionDate.getMonth(), submissionDate.getDate());
      
      if (submissionDateFromFilter) {
        const fromDate = new Date(submissionDateFromFilter);
        fromDate.setHours(0, 0, 0, 0);
        if (submissionDateOnly < fromDate) {
          matchesSubmissionDate = false;
        }
      }
      
      if (submissionDateToFilter && matchesSubmissionDate) {
        const toDate = new Date(submissionDateToFilter);
        toDate.setHours(23, 59, 59, 999);
        if (submissionDateOnly > toDate) {
          matchesSubmissionDate = false;
        }
      }
    }

    // Filter by reward approval date
    let matchesRewardApprovalDate = true;
    if (rewardApprovalDateFromFilter || rewardApprovalDateToFilter) {
      const rewardDate = (idea as any).rewardApprovalDate;
      if (!rewardDate) {
        // If filter is set but idea has no reward approval date, exclude it
        matchesRewardApprovalDate = false;
      } else {
        const rewardDateObj = new Date(rewardDate);
        // Adjust for timezone (GMT+7)
        const adjustedDate = new Date(rewardDateObj.getTime() + (7 * 60 * 60 * 1000));
        const rewardDateOnly = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth(), adjustedDate.getDate());
        
        if (rewardApprovalDateFromFilter) {
          const fromDate = new Date(rewardApprovalDateFromFilter);
          fromDate.setHours(0, 0, 0, 0);
          if (rewardDateOnly < fromDate) {
            matchesRewardApprovalDate = false;
          }
        }
        
        if (rewardApprovalDateToFilter && matchesRewardApprovalDate) {
          const toDate = new Date(rewardApprovalDateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (rewardDateOnly > toDate) {
            matchesRewardApprovalDate = false;
          }
        }
      }
    }

    return (
      matchesIdeaCode &&
      matchesFullName &&
      matchesIdeaText &&
      matchesStatus &&
      matchesDepartment &&
      matchesImplementationDepartment &&
      matchesRewardStatuses &&
      matchesSubmissionDate &&
      matchesRewardApprovalDate
    );
  });

  // Sync horizontal scroll between top scroll bar and DataGrid
  useEffect(() => {
    const topScrollElement = topScrollRef.current;
    const dataGridElement = dataGridRef.current?.querySelector('.MuiDataGrid-virtualScroller');

    if (!topScrollElement || !dataGridElement) return;

    // Tính tổng chiều rộng của các cột (hardcode để tránh lỗi dependency)
    const totalWidth = 
  150 + 200 + 200 + 
  300 + 300 + 300 + 300 + 300 + 300 + 300 + 300 + 
  180 + 180 + 
  180 + 180 + 
  180 + 180 + 
  200 + 200 + 
  180 + 180 + 
  120; // Tổng chiều rộng các cột (bao gồm cột hình ảnh)
    
    // Cập nhật chiều rộng của thanh cuộn trên
    const invisibleContent = topScrollElement.querySelector('div');
    if (invisibleContent) {
      invisibleContent.style.width = `${totalWidth}px`;
    }

    const handleTopScroll = () => {
      if (dataGridElement) {
        dataGridElement.scrollLeft = topScrollElement.scrollLeft;
      }
    };

    const handleDataGridScroll = () => {
      if (topScrollElement) {
        topScrollElement.scrollLeft = dataGridElement.scrollLeft;
      }
    };

    topScrollElement.addEventListener('scroll', handleTopScroll);
    dataGridElement.addEventListener('scroll', handleDataGridScroll);

    return () => {
      topScrollElement.removeEventListener('scroll', handleTopScroll);
      dataGridElement.removeEventListener('scroll', handleDataGridScroll);
    };
  }, [filteredIdeas]);

  const StatusCell: React.FC<{ row: Idea }> = ({ row }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    
    // Handle backward compatibility
    const ideaStatus: any = row.status;
    let normalizedStatus: IdeaStatus;
    
    // Type guard to check if ideaStatus is a string (legacy) or IdeaStatus enum
    if (!Object.values(IdeaStatus).includes(ideaStatus as IdeaStatus)) {
      // Legacy status mapping - handle old string values
      const statusStr = String(ideaStatus);
      if (statusStr === 'pending') {
        normalizedStatus = IdeaStatus.DE_NGHI_MOI;
      } else if (statusStr === 'rejected') {
        normalizedStatus = IdeaStatus.REJECTED;
      } else if (statusStr === 'noted') {
        normalizedStatus = IdeaStatus.LUU_Y_TUONG;
      } else if (statusStr === 'approved') {
        normalizedStatus = IdeaStatus.TRIEN_KHAI;
      } else {
        normalizedStatus = IdeaStatus.DE_NGHI_MOI;
      }
    } else {
      normalizedStatus = ideaStatus as IdeaStatus;
    }

    const statusColors: Record<IdeaStatus, string> = {
      [IdeaStatus.DE_NGHI_MOI]: '#2196F3',
      [IdeaStatus.XEM_XET]: '#FF9800',
      [IdeaStatus.CHO_PHE_DUYET]: '#9C27B0',
      [IdeaStatus.TRIEN_KHAI]: '#4CAF50',
      [IdeaStatus.KHONG_PHU_HOP]: '#F44336',
      [IdeaStatus.LUU_Y_TUONG]: '#FFC107',
      [IdeaStatus.BAO_CAO_A3]: '#00BCD4',
      [IdeaStatus.KHEN_THUONG]: '#8BC34A',
      [IdeaStatus.DONE]: '#009688',
      [IdeaStatus.REJECTED]: '#E91E63'
    };

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const selectStatus = (s: IdeaStatus) => {
      handleStatusChange(row._id, s);
      handleClose();
    };

    // Ở chế độ chỉ xem: chỉ hiển thị chip, không mở menu
    if (isViewOnly) {
      return (
        <Chip
          label={IdeaStatusLabels[normalizedStatus]}
          sx={{
            backgroundColor: statusColors[normalizedStatus] || '#757575',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}
          size="small"
        />
      );
    }

    return (
      <>
        <Chip
          label={IdeaStatusLabels[normalizedStatus]}
          sx={{
            backgroundColor: statusColors[normalizedStatus] || '#757575',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
          size="small"
          onClick={handleOpen}
        />
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          {Object.values(IdeaStatus).map(status => (
            <MenuItem key={status} onClick={() => selectStatus(status)}>
              {IdeaStatusLabels[status]}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

  const RewardCalculationMethodCell: React.FC<{ row: Idea }> = ({ row }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const currentMethod = (row as any).rewardCalculationMethod as RewardCalculationMethod | undefined;

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
      if (isViewOnly) return; // Không cho mở menu ở chế độ chỉ xem
      setAnchorEl(e.currentTarget);
    };

    const handleClose = () => setAnchorEl(null);

    const handleSelectMethod = (method: RewardCalculationMethod | '') => {
      handleRewardCalculationMethodChange(row._id, method || undefined);
      handleClose();
    };

    // Ở chế độ chỉ xem: chỉ hiển thị chip, không mở menu
    if (isViewOnly) {
      if (!currentMethod) {
        return <Typography variant="body2" color="text.secondary">-</Typography>;
      }
      return (
        <Chip
          label={RewardCalculationMethodLabels[currentMethod]}
          size="small"
          sx={{
            backgroundColor: currentMethod === RewardCalculationMethod.PERCENT_20 ? '#FF9800' : '#2196F3',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}
        />
      );
    }

    // Ở chế độ edit: hiển thị chip có thể click
    return (
      <>
        <Chip
          label={currentMethod ? RewardCalculationMethodLabels[currentMethod] : '-'}
          size="small"
          sx={{
            backgroundColor: currentMethod 
              ? (currentMethod === RewardCalculationMethod.PERCENT_20 ? '#FF9800' : '#2196F3')
              : '#9E9E9E',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
          onClick={handleOpen}
        />
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={() => handleSelectMethod('')}>
            <em>Xóa (để trống)</em>
          </MenuItem>
          {Object.values(RewardCalculationMethod).map((method) => (
            <MenuItem key={method} onClick={() => handleSelectMethod(method)}>
              {RewardCalculationMethodLabels[method]}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

  const RewardStatusCell: React.FC<{ row: Idea }> = ({ row }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [selectedStatuses, setSelectedStatuses] = useState<RewardStatus[]>(
      (row as any).rewardStatuses || []
    );

    useEffect(() => {
      setSelectedStatuses((row as any).rewardStatuses || []);
    }, [(row as any).rewardStatuses]);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
      if (isViewOnly) return; // Không cho mở menu ở chế độ chỉ xem
      setAnchorEl(e.currentTarget);
      setSelectedStatuses((row as any).rewardStatuses || []);
    };

    const handleClose = () => setAnchorEl(null);

    const handleToggleStatus = (status: RewardStatus) => {
      setSelectedStatuses(prev => {
        // Nếu đang chọn status này thì bỏ chọn
        if (prev.includes(status)) {
          return prev.filter(s => s !== status);
        }
        // Nếu đang thêm status mới
        let newStatuses = [...prev, status];
        
        // Áp dụng quy tắc: không được tồn tại đồng thời CHO và DA của cùng một loại
        if (status === RewardStatus.CHO_KHEN_THUONG_50K) {
          newStatuses = newStatuses.filter(s => s !== RewardStatus.DA_KHEN_THUONG_50K);
        } else if (status === RewardStatus.DA_KHEN_THUONG_50K) {
          newStatuses = newStatuses.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_50K);
        } else if (status === RewardStatus.CHO_KHEN_THUONG_20) {
          newStatuses = newStatuses.filter(s => s !== RewardStatus.DA_KHEN_THUONG_20);
        } else if (status === RewardStatus.DA_KHEN_THUONG_20) {
          newStatuses = newStatuses.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_20);
        }
        
        return newStatuses;
      });
    };

    const handleConfirm = () => {
      handleRewardStatusesChange(row._id, selectedStatuses);
      handleClose();
    };

    const currentStatuses: RewardStatus[] = (row as any).rewardStatuses || [];

    // Ở chế độ chỉ xem: chỉ hiển thị chip, không mở menu
    if (isViewOnly) {
      if (currentStatuses.length === 0) {
        return <Typography variant="body2" color="text.secondary">-</Typography>;
      }
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          {currentStatuses.map((status) => (
            <Chip
              key={status}
              label={RewardStatusLabels[status]}
              size="small"
              sx={{
                backgroundColor: 
                  status === RewardStatus.CHO_KHEN_THUONG_50K || status === RewardStatus.CHO_KHEN_THUONG_20
                    ? '#FF9800' // Màu cam cho "Chờ"
                    : '#4CAF50', // Màu xanh cho "Đã"
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: '20px'
              }}
            />
          ))}
        </Box>
      );
    }

    // Ở chế độ edit: hiển thị chip có thể click
    return (
      <>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 0.5, 
            alignItems: 'center',
            cursor: 'pointer',
            width: '100%'
          }}
          onClick={handleOpen}
        >
          {currentStatuses.length === 0 ? (
            <Typography variant="body2" color="text.secondary">-</Typography>
          ) : (
            currentStatuses.map((status) => (
              <Chip
                key={status}
                label={RewardStatusLabels[status]}
                size="small"
                sx={{
                  backgroundColor: 
                    status === RewardStatus.CHO_KHEN_THUONG_50K || status === RewardStatus.CHO_KHEN_THUONG_20
                      ? '#FF9800' // Màu cam cho "Chờ"
                      : '#4CAF50', // Màu xanh cho "Đã"
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: '20px'
                }}
              />
            ))
          )}
        </Box>
        <Menu 
          anchorEl={anchorEl} 
          open={open} 
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 250 }
          }}
        >
          <Box sx={{ p: 1 }}>
            {Object.values(RewardStatus).map((status) => (
              <FormControlLabel
                key={status}
                control={
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onChange={() => handleToggleStatus(status)}
                  />
                }
                label={RewardStatusLabels[status]}
                sx={{ display: 'block', mb: 0.5 }}
              />
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button size="small" onClick={handleClose}>
                Hủy
              </Button>
              <Button size="small" variant="contained" onClick={handleConfirm}>
                Xác nhận
              </Button>
            </Box>
          </Box>
        </Menu>
      </>
    );
  };

  const ImplementationStatusCell: React.FC<{ row: Idea }> = ({ row }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const getImplementationStatusColor = (status: string) => {
      switch (status) {
        case 'Đề xuất mới': return '#2196F3';
        case 'Xem xét': return '#FF9800';
        case 'Phê duyệt': return '#4CAF50';
        case 'Phản hồi phê duyệt': return '#9C27B0';
        case 'Đang triển khai': return '#00BCD4';
        case 'Lập báo cáo A3': return '#795548';
        case 'Phê duyệt khen thưởng': return '#607D8B';
        case 'Đã khen thưởng': return '#2E7D32';
        case 'Không đạt': return '#F44336';
        default: return '#757575';
      }
    };

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const selectImplementationStatus = (
      s: 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'
    ) => {
      handleImplementationStatusChange(row._id, s);
      handleClose();
    };

    const current = (row as any).implementationStatus || 'Đề xuất mới';

    // Ở chế độ chỉ xem: chỉ hiển thị chip, không mở menu
    if (isViewOnly) {
      return (
        <Chip
          label={current}
          sx={{
            backgroundColor: getImplementationStatusColor(current),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}
          size="small"
        />
      );
    }

    return (
      <>
        <Chip
          label={current}
          sx={{
            backgroundColor: getImplementationStatusColor(current),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
          size="small"
          onClick={handleOpen}
        />
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={() => selectImplementationStatus('Đề xuất mới')}>Đề xuất mới</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Xem xét')}>Xem xét</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Phê duyệt')}>Phê duyệt</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Phản hồi phê duyệt')}>Phản hồi phê duyệt</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Đang triển khai')}>Đang triển khai</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Lập báo cáo A3')}>Lập báo cáo A3</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Phê duyệt khen thưởng')}>Phê duyệt khen thưởng</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Đã khen thưởng')}>Đã khen thưởng</MenuItem>
          <MenuItem onClick={() => selectImplementationStatus('Không đạt')}>Không đạt</MenuItem>
        </Menu>
      </>
    );
  };

  const parseFieldFromIdea = (ideaText: string | undefined, key: 'Giải pháp' | 'Lợi ích') => {
    if (!ideaText) return '';
    const lines = ideaText.split(/\n+/);
    const line = lines.find(l => l.trim().toLowerCase().startsWith(key.toLowerCase())) || '';
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

  // Handler for opening lightbox
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

  const columns: GridColDef[] = [
    { 
      field: 'ideaCode', 
      headerName: 'Mã ý tưởng', 
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div
        style={{
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          width: '100%',
          textAlign: 'center'
        }}
      >
          {params.value || '-'}
        </div>
      )

    },
    {
      field: 'beforeImage',
      headerName: 'Hình trước',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {(params.row as any).beforeImage ? (
            <img
              src={(params.row as any).beforeImage}
              alt="Trước"
              onClick={() => handleImageClick(
                (params.row as any).beforeImage,
                `Hình trước - ${(params.row as any).ideaCode || 'N/A'}`
              )}
              style={{
                maxWidth: 160,
                maxHeight: 100,
                objectFit: 'contain',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          ) : (
            <span style={{ color: '#999' }}>—</span>
          )}
        </div>
      )
    },
    {
      field: 'afterImage',
      headerName: 'Hình sau',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {(params.row as any).afterImage ? (
            <img
              src={(params.row as any).afterImage}
              alt="Sau"
              onClick={() => handleImageClick(
                (params.row as any).afterImage,
                `Hình sau - ${(params.row as any).ideaCode || 'N/A'}`
              )}
              style={{
                maxWidth: 160,
                maxHeight: 100,
                objectFit: 'contain',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          ) : (
            <span style={{ color: '#999' }}>—</span>
          )}
        </div>
      )
    },
    { 
      field: 'fullName', 
      headerName: 'Họ và tên', 
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {params.value || '-'}
        </div>
      )

    },
    { 
      field: 'department', 
      headerName: 'Đơn vị', 
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {params.value || '-'}
        </div>
      )

    },
    {
      field: 'idea',
      headerName: 'Ý tưởng ',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => getPureIdeaText((params.row as any).idea),
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',      // 👈 chiều cao tối đa cố định
          overflowY: 'auto',       // 👈 text dài thì có scroll
          paddingRight: '8px',
          scrollbarWidth: 'thin',  // 👈 scrollbar mỏng hơn
          scrollbarColor: '#ccc transparent' // 👈 màu scrollbar
        }}>
          {params.value || '-'}
        </div>
      )
    },
    {
      field: 'solution',
      headerName: 'Thực trạng',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => (params.row as any).solution || parseFieldFromIdea((params.row as any).idea, 'Giải pháp'),
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          display: 'block',
          maxHeight: '180px',      // 👈 chiều cao tối đa cố định
          overflowY: 'auto',       // 👈 text dài thì có scroll
          paddingRight: '8px',
          scrollbarWidth: 'thin',  // 👈 scrollbar mỏng hơn
          scrollbarColor: '#ccc transparent' // 👈 màu scrollbar
        }}>
          {params.value || '-'}
        </div>
      )

    },
    {
      field: 'benefit',
      headerName: 'Giải pháp',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => (params.row as any).benefit || parseFieldFromIdea((params.row as any).idea, 'Lợi ích'),
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',      // 👈 chiều cao tối đa cố định
          overflowY: 'auto',       // 👈 text dài thì có scroll
          paddingRight: '8px',
          scrollbarWidth: 'thin',  // 👈 scrollbar mỏng hơn
          scrollbarColor: '#ccc transparent' // 👈 màu scrollbar
        }}>
          {params.value || '-'}
        </div>
      )

    },
    {
      field: 'benefitOutcome',
      headerName: 'Lợi ích mang lại',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',
          overflowY: 'auto',
          paddingRight: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ccc transparent'
        }}>
          {(params.row as any).benefitOutcome || ''}
        </div>
      )
    },
    {
      field: 'resourcesUsed',
      headerName: 'Nguồn lực sử dụng',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',
          overflowY: 'auto',
          paddingRight: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ccc transparent'
        }}>
          {(params.row as any).resourcesUsed || ''}
        </div>
      )
    },
    {
      field: 'calculationDescription',
      headerName: 'Mô tả cách tính',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',
          overflowY: 'auto',
          paddingRight: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ccc transparent'
        }}>
          {(params.row as any).calculationDescription || ''}
        </div>
      )
    },
    {
      field: 'scalingOpportunity',
      headerName: 'Cơ hội nhân rộng phát triển',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',
          overflowY: 'auto',
          paddingRight: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ccc transparent'
        }}>
          {(params.row as any).scalingOpportunity || ''}
        </div>
      )
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <StatusCell row={params.row} />,
      sortable: true
    },
    {
      field: 'rewardStatuses',
      headerName: 'Tình trạng khen thưởng',
      width: 250,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <RewardStatusCell row={params.row} />,
      sortable: false
    },
    {
      field: 'submissionDate',
      headerName: 'Thời gian nộp',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString('vi-VN');
      },
    },
    
    {
      field: 'implementationDepartment',
      headerName: 'Phòng ban triển khai',
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {params.value || '-'}
        </div>
      )
    },
    {
      field: 'note',
      headerName: 'Ghi chú',
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          width: '100%',
          textAlign: 'left',
          maxHeight: '180px',
          overflowY: 'auto',
          paddingRight: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ccc transparent'
        }}>
          {params.value || ''}
        </div>
      )
    },
    {
      field: 'benefitValue',
      headerName: 'Giá trị làm lợi (VND)',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'right',
          fontWeight: 'bold',
          color: '#2E7D32'
        }}>
          {params.value ? params.value.toLocaleString('vi-VN') : '0'}
        </div>
      )
    },
    {
      field: 'rewardAmount',
      headerName: 'Tiền thưởng (VND)',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'right',
          fontWeight: 'bold',
          color: '#1976D2'
        }}>
          {params.value ? params.value.toLocaleString('vi-VN') : '0'}
        </div>
      )
    },
    {
      field: 'rewardApprovalDate',
      headerName: 'Ngày duyệt khen thưởng',
      width: 200,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => {
        if (!params.value) return '';
        // Date is stored in UTC, toLocaleString will convert to local timezone
        const date = new Date(params.value);
        return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      },
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'center'
        }}>
          {(params.row as any).rewardApprovalDate 
            ? (() => {
                // Date is stored in UTC, convert to Vietnam timezone (GMT+7)
                const date = new Date((params.row as any).rewardApprovalDate);
                return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
              })()
            : '-'}
        </div>
      )
    },
    {
      field: 'rewardCalculationMethod',
      headerName: 'Phương thức tính thưởng',
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <RewardCalculationMethodCell row={params.row as Idea} />
    },
    // Cột thao tác chỉ hiển thị trong chế độ admin đầy đủ
    ...(!isViewOnly
      ? [
          {
            field: 'actions',
            headerName: 'Thao tác',
            width: 120,
            renderCell: (params: any) => (
              <Box>
                <Tooltip title="Sửa">
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(params.row)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Xóa">
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(params.row._id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            ),
          } as GridColDef
        ]
      : [])
  ];

  return (
    <Container maxWidth={false} sx={{ py: 2, px: 1, width: '100%' }}>
      <Card elevation={3} sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            Quản lý Ý tưởng Cải tiến
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', rowGap: 2 }}>
                {/* Hàng 1 */}
                <Box sx={{ display: 'flex', columnGap: 2, rowGap: 1.5, flexWrap: 'wrap' }}>
                  <TextField
                    label="Mã ý tưởng"
                    size="small"
                    value={ideaCodeFilter}
                    onChange={handleIdeaCodeFilter}
                    sx={{ minWidth: 200, flex: '1 1 200px' }}
                  />
                  <TextField
                    label="Họ và tên"
                    size="small"
                    value={fullNameFilter}
                    onChange={handleFullNameFilter}
                    sx={{ minWidth: 200, flex: '1 1 200px' }}
                  />
                  <TextField
                    label="Ý tưởng"
                    size="small"
                    value={ideaTextFilter}
                    onChange={handleIdeaTextFilter}
                    sx={{ minWidth: 200, flex: '1 1 200px' }}
                  />
                </Box>

                {/* Hàng 1.5 - Date Filters */}
                <Box sx={{ display: 'flex', columnGap: 2, rowGap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#666', minWidth: 'fit-content' }}>
                    Lọc theo thời gian nộp:
                  </Typography>
                  <TextField
                    label="Từ ngày"
                    type="date"
                    size="small"
                    value={submissionDateFromFilter}
                    onChange={handleSubmissionDateFromFilter}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label="Đến ngày"
                    type="date"
                    size="small"
                    value={submissionDateToFilter}
                    onChange={handleSubmissionDateToFilter}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ minWidth: 180 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#666', minWidth: 'fit-content', ml: 2 }}>
                    Lọc theo ngày duyệt khen thưởng:
                  </Typography>
                  <TextField
                    label="Từ ngày"
                    type="date"
                    size="small"
                    value={rewardApprovalDateFromFilter}
                    onChange={handleRewardApprovalDateFromFilter}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label="Đến ngày"
                    type="date"
                    size="small"
                    value={rewardApprovalDateToFilter}
                    onChange={handleRewardApprovalDateToFilter}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ minWidth: 180 }}
                  />
                </Box>

                {/* Hàng 2 */}
                <Box sx={{ display: 'flex', columnGap: 2, rowGap: 1.5, flexWrap: 'wrap' }}>
                  <Select
                    multiple
                    displayEmpty
                    value={departmentFilter}
                    onChange={handleDepartmentFilterChange}
                    renderValue={(selected) => {
                      if ((selected as string[]).length === 0) {
                        return 'Lọc đơn vị';
                      }
                      return (selected as string[]).join(', ');
                    }}
                    size="small"
                    sx={{ minWidth: 200, maxWidth: 280, flexShrink: 1 }}
                  >
                    {uniqueDepartments.map(dep => (
                      <MenuItem key={dep} value={dep}>
                        <Checkbox checked={departmentFilter.indexOf(dep) > -1} />
                        <ListItemText primary={dep} />
                      </MenuItem>
                    ))}
                  </Select>
                  <Select
                    multiple
                    displayEmpty
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    renderValue={(selected) => {
                      if ((selected as IdeaStatus[]).length === 0) {
                        return 'Lọc trạng thái';
                      }
                      return (selected as IdeaStatus[]).map(s => IdeaStatusLabels[s]).join(', ');
                    }}
                    size="small"
                    sx={{ minWidth: 200, maxWidth: 280, flexShrink: 1 }}
                  >
                    {Object.values(IdeaStatus).map(status => (
                      <MenuItem key={status} value={status}>
                        <Checkbox checked={statusFilter.indexOf(status) > -1} />
                        <ListItemText primary={IdeaStatusLabels[status]} />
                      </MenuItem>
                    ))}
                  </Select>

                  <Select
                    multiple
                    displayEmpty
                    value={rewardStatusesFilter}
                    onChange={handleRewardStatusesFilterChange}
                    renderValue={(selected) => {
                      if ((selected as RewardStatus[]).length === 0) {
                        return 'Lọc tình trạng khen thưởng';
                      }
                      return (selected as RewardStatus[]).map(s => RewardStatusLabels[s]).join(', ');
                    }}
                    size="small"
                    sx={{ minWidth: 240, maxWidth: 340, flexShrink: 1 }}
                  >
                    {Object.values(RewardStatus).map(status => (
                      <MenuItem key={status} value={status}>
                        <Checkbox checked={rewardStatusesFilter.indexOf(status) > -1} />
                        <ListItemText primary={RewardStatusLabels[status]} />
                      </MenuItem>
                    ))}
                  </Select>

                  <Select
                    displayEmpty
                    value={rewardCalculationMethodFilter}
                    onChange={handleRewardCalculationMethodFilterChange}
                    renderValue={(selected) => {
                      if (!selected) {
                        return 'Lọc phương thức tính thưởng';
                      }
                      return RewardCalculationMethodLabels[selected as RewardCalculationMethod];
                    }}
                    size="small"
                    sx={{ minWidth: 240, maxWidth: 340, flexShrink: 1 }}
                  >
                    <MenuItem value="">
                      <em>Tất cả</em>
                    </MenuItem>
                    {Object.values(RewardCalculationMethod).map((method) => (
                      <MenuItem key={method} value={method}>
                        {RewardCalculationMethodLabels[method]}
                      </MenuItem>
                    ))}
                  </Select>

                  <Select
                    multiple
                    displayEmpty
                    value={implementationDepartmentFilter}
                    onChange={handleImplementationDepartmentFilterChange}
                    renderValue={(selected) => {
                      if ((selected as string[]).length === 0) {
                        return 'Lọc phòng ban triển khai';
                      }
                      return (selected as string[]).join(', ');
                    }}
                    size="small"
                    sx={{ minWidth: 240, maxWidth: 340, flexShrink: 1 }}
                  >
                    {uniqueImplementationDepartments.map(dep => (
                      <MenuItem key={dep} value={dep}>
                        <Checkbox checked={implementationDepartmentFilter.indexOf(dep) > -1} />
                        <ListItemText primary={dep} />
                      </MenuItem>
                    ))}
                  </Select>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleClearAllFilters}
                    sx={{
                      py: 1.0,
                      px: 2.0,
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      minWidth: 'max-content',
                      borderColor: '#f44336',
                      color: '#f44336',
                      '&:hover': {
                        borderColor: '#d32f2f',
                        backgroundColor: '#ffebee'
                      }
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                </Box>

                {/* Hàng 3 */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  {/* Box chứa 2 nút bên trái - chỉ hiển thị khi không phải chế độ chỉ xem */}
                  {!isViewOnly && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      {/* Nút Tính thưởng - link tới Google Form */}
                      <Button
                        variant="contained"
                        color="warning"
                        href="https://docs.google.com/forms/d/e/1FAIpQLScTqJZj1hTAM8WfUBgDOpeRjeowezkSnkM6PZB3l8MxmIidIw/viewform"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content',
                          boxShadow: 2,
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s'
                          }
                        }}
                      >
                        Tính thưởng
                      </Button>
                      
                      {/* Nút Kết quả - link tới Google Sheets - màu tím */}
                      <Button
                        variant="contained"
                        href="https://docs.google.com/spreadsheets/d/1rRjAAa-mq4txuOYFD3rbTDB-eMJx4wJcpop0uG0OtN8/edit?gid=1257837877#gid=1257837877"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content',
                          boxShadow: 2,
                          backgroundColor: '#9c27b0', // Màu tím
                          color: 'white',
                          '&:hover': {
                            backgroundColor: '#7b1fa2', // Màu tím đậm hơn khi hover
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s'
                          }
                        }}
                      >
                        Kết quả
                      </Button>
                    </Box>
                  )}
                  
                  {/* Box chứa các nút bên phải */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* Quản lý cột chỉ dùng cho admin đầy đủ, không dùng trong chế độ chỉ xem */}
                    {!isViewOnly && (
                    <>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={openColMenu}
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content'
                        }}
                      >
                        Quản lý cột
                      </Button>
                      <Menu anchorEl={colMenuAnchor} open={isColMenuOpen} onClose={closeColMenu} PaperProps={{ sx: { maxHeight: 500 } }}>
                        <MenuItem onClick={handleSelectAllColumns} sx={{ borderBottom: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                          <Checkbox 
                            checked={allColumnsSelected} 
                            indeterminate={!allColumnsSelected && allColumnFields.some(field => columnVisibilityModel[field])}
                          />
                          <ListItemText primary="Chọn tất cả" />
                        </MenuItem>
                        <Divider />
                        {allColumnFields.map((field) => (
                          <MenuItem key={field} onClick={() => handleToggleColumn(field)}>
                            <Checkbox checked={!!columnVisibilityModel[field]} />
                            <ListItemText
                              primary={
                                (
                                  {
                                    ideaCode: 'Mã ý tưởng',
                                    fullName: 'Họ và tên',
                                    department: 'Đơn vị',
                                    idea: 'Ý tưởng',
                                    solution: 'Thực trạng',
                                    benefit: 'Giải pháp',
                                    benefitOutcome: 'Lợi ích mang lại',
                                    resourcesUsed: 'Nguồn lực sử dụng',
                                    calculationDescription: 'Mô tả cách tính',
                                    scalingOpportunity: 'Cơ hội nhân rộng phát triển',
                                    beforeImage: 'Hình ảnh trước',
                                    afterImage: 'Hình ảnh sau',
                                    status: 'Quyết định phê duyệt',
                                    rewardStatuses: 'Tình trạng khen thưởng',
                                    implementationStatus: 'Trạng thái',
                                    submissionDate: 'Thời gian nộp',
                                    implementationDepartment: 'Phòng ban triển khai',
                                    note: 'Ghi chú',
                                    benefitValue: 'Giá trị làm lợi (VND)',
                                    rewardAmount: 'Tiền thưởng (VND)',
                                    rewardApprovalDate: 'Ngày duyệt khen thưởng',
                                    rewardCalculationMethod: 'Phương thức tính thưởng',
                                    actions: 'Thao tác'
                                  } as Record<string, string>
                                )[field]
                              }
                            />
                          </MenuItem>
                        ))}
                      </Menu>
                    </>
                  )}
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<BarChartIcon />}
                    onClick={handleGoToStatistics}
                    sx={{
                      py: 1.0,
                      px: 2.0,
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      boxShadow: 2,
                      whiteSpace: 'nowrap',
                      minWidth: 'max-content',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s'
                      }
                    }}
                  >
                    {isViewOnly ? 'Quay lại Thống kê' : 'Dashboard Thống kê'}
                  </Button>
                  {isViewOnly && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<FileDownloadIcon />}
                      onClick={handleExportExcelViewOnly}
                      sx={{
                        py: 1.0,
                        px: 2.0,
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        textTransform: 'none',
                        boxShadow: 2,
                        whiteSpace: 'nowrap',
                        minWidth: 'max-content',
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s'
                        }
                      }}
                    >
                      Xuất Excel
                    </Button>
                  )}
                  {!isViewOnly && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportExcel}
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          boxShadow: 2,
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s'
                          }
                        }}
                      >
                        Xuất Excel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => setIsExportDialogOpen(true)}
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          boxShadow: 2,
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s'
                          }
                        }}
                      >
                        Export Báo Cáo
                      </Button>
                      <Button
                        variant="contained"
                        color="info"
                        startIcon={<UploadIcon />}
                        onClick={() => setIsImportDialogOpen(true)}
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          boxShadow: 2,
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s'
                          }
                        }}
                      >
                        Import
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleLogout}
                        sx={{
                          py: 1.0,
                          px: 2.0,
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content'
                        }}
                      >
                        Đăng xuất
                      </Button>
                    </>
                  )}
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>

        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper 
        elevation={3} 
        sx={{ 
          width: '100%',
          borderRadius: 2,
          height: 'auto', // Ensure Paper expands
          position: 'relative',
          '& .MuiDataGrid-root': {
            border: 'none',
          },
          '& .MuiDataGrid-cell': {
            borderColor: 'rgba(224, 224, 224, 1)',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            padding: '8px',
            display: 'block',
            justifyContent: 'flex-start',     // căn ngang giữa
            alignItems: 'flex-start !important',        // căn dọc giữa
            textAlign: 'center',
            wordBreak: 'break-word',
          },

          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
            borderBottom: '2px solid #e0e0e0',
          },
          '& .MuiDataGrid-row': {
            alignItems: 'center',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f5f5f5',
          },
          // Custom scrollbar styling
          '& .MuiDataGrid-cell div::-webkit-scrollbar': {
            width: '6px',
          },
          '& .MuiDataGrid-cell div::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '3px',
          },
          '& .MuiDataGrid-cell div::-webkit-scrollbar-thumb': {
            background: '#ccc',
            borderRadius: '3px',
          },
          '& .MuiDataGrid-cell div::-webkit-scrollbar-thumb:hover': {
            background: '#999',
          }
        }}
      >
        {/* Top horizontal scroll bar - chỉ là thanh cuộn ngang */}
        <Box
          ref={topScrollRef}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'transparent',
            borderBottom: '1px solid #e0e0e0',
            height: '12px',
            overflowX: 'auto',
            overflowY: 'hidden',
            '&::-webkit-scrollbar': {
              height: '12px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#999999',
              borderRadius: '6px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#999',
            }
          }}
        >
          {/* Invisible content để tạo scrollbar với chiều rộng đúng */}
          <Box
            sx={{
              width: '100%',
              minWidth: 'max-content',
              height: '1px',
              visibility: 'hidden'
            }}
          />
        </Box>
        
        {/* Thông tin số lượng kết quả */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2, 
          px: 1,
          backgroundColor: '#f8f9fa',
          borderRadius: 1,
          py: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            Hiển thị {filteredIdeas.length} / {ideas.length} ý tưởng
            {filteredIdeas.length !== ideas.length && (
              <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
                {' '}(đã lọc)
              </span>
            )}
          </Typography>
        </Box>
        
        <Box ref={dataGridRef} sx={{ width: '100%', overflow: 'auto' }}>
          <DataGrid
            rows={filteredIdeas}
            columns={columns}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(model) => setColumnVisibilityModel(model)}
            getRowId={(row) => row._id}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            loading={loading}
            getRowHeight={() => 200}
            sx={{
              width: '100%',
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: '#f5f5f5',
              },
              '& .MuiDataGrid-cell': {
                overflow: 'hidden',
                whiteSpace: 'normal',
                wordWrap: 'break-word'
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                whiteSpace: 'normal',
                wordWrap: 'break-word'
              }
            }}
          />
        </Box>

      </Paper>

      <IdeaDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        idea={selectedIdea || undefined}
        isEdit={isEditMode}
      />
      <ExportReportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        ideas={filteredIdeas}
      />
      <ImageLightbox
        open={lightboxOpen}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        onClose={handleCloseLightbox}
      />
      <RewardStatusDialog
        open={isRewardStatusDialogOpen}
        onClose={handleRewardStatusDialogClose}
        onConfirm={handleRewardStatusConfirm}
        currentStatuses={(ideas.find(i => i._id === pendingStatusChange?.ideaId) as any)?.rewardStatuses || []}
        targetStatus={pendingStatusChange?.newStatus || ''}
      />
      <ImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          fetchIdeas();
          setIsImportDialogOpen(false);
        }}
      />
    </Container>
  );
};

export default AdminDashboard; 