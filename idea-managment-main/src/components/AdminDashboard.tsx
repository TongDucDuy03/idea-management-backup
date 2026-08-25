import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
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
  FormControlLabel,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  Fab
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  BarChart as BarChartIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarTodayIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon
} from '@mui/icons-material';
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

type TableViewPreset = 'overview' | 'implementation' | 'reward' | 'all' | 'custom';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isViewOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Mobile view mode: 'cards' or 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  // Hồ sơ chi tiết dùng chung cho mobile và desktop
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIdeaForDetail, setSelectedIdeaForDetail] = useState<Idea | null>(null);

  // Mặc định ưu tiên bảng tóm tắt; người dùng vẫn có thể chuyển về bảng đầy đủ.
  const [tableViewPreset, setTableViewPreset] = useState<TableViewPreset>(() => {
    if (isViewOnly) return 'overview';
    const savedPreset = localStorage.getItem('admin_table_view_preset') as TableViewPreset | null;
    return savedPreset && ['overview', 'implementation', 'reward', 'all', 'custom'].includes(savedPreset)
      ? savedPreset
      : 'overview';
  });

  // Filter collapse state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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
  const [implementationStatusFilter, setImplementationStatusFilter] = useState<string>('');
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

  // Mobile pagination
  const [mobilePage, setMobilePage] = useState(0);
  const mobilePageSize = 10; // Hiển thị 1 ý tưởng mỗi trang trên mobile

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
    // 4 trường mới
    'implementationStatus',
    'expectedCompletionDate',
    'netReserveStatus',
    'reasonNote',
    'actions'
  ] as const;

  // Các cột tổng hợp chỉ dùng cho những chế độ xem gọn.
  const groupedColumnFields = [
    'submitterSummary',
    'ideaSummary',
    'implementationSummary',
    'valueSummary'
  ] as const;

  const allGridColumnFields = [...allColumnFields, ...groupedColumnFields];

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

  const presetFields: Record<Exclude<TableViewPreset, 'custom'>, Set<string>> = {
    overview: new Set(
      isViewOnly
        ? ['ideaCode', 'submitterSummary', 'ideaSummary', 'status', 'rewardStatuses']
        : ['ideaCode', 'submitterSummary', 'ideaSummary', 'status', 'implementationSummary', 'valueSummary', 'actions']
    ),
    implementation: new Set([
      'ideaCode',
      'submitterSummary',
      'ideaSummary',
      'status',
      'implementationSummary',
      'note',
      'actions'
    ]),
    reward: new Set([
      'ideaCode',
      'submitterSummary',
      'status',
      'rewardStatuses',
      'valueSummary',
      'rewardCalculationMethod',
      'rewardApprovalDate',
      'actions'
    ]),
    all: new Set(isViewOnly ? Array.from(viewOnlyFields) : Array.from(allColumnFields))
  };

  const buildVisibilityModel = (preset: Exclude<TableViewPreset, 'custom'>) => {
    const visibleFields = presetFields[preset];
    const model: Record<string, boolean> = {};
    allGridColumnFields.forEach(field => {
      model[field] = visibleFields.has(field);
    });
    return model;
  };

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>(() => {
    if (!isViewOnly && tableViewPreset === 'custom') {
      try {
        const saved = localStorage.getItem('admin_column_visibility');
        if (saved) return JSON.parse(saved);
      } catch { }
    }

    const initialPreset = tableViewPreset === 'custom' ? 'overview' : tableViewPreset;
    return buildVisibilityModel(initialPreset);
  });

  useEffect(() => {
    if (isViewOnly) return;
    try {
      localStorage.setItem('admin_column_visibility', JSON.stringify(columnVisibilityModel));
      localStorage.setItem('admin_table_view_preset', tableViewPreset);
    } catch { }
  }, [columnVisibilityModel, tableViewPreset, isViewOnly]);

  const handleTableViewPresetChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextPreset: TableViewPreset | null
  ) => {
    if (!nextPreset || nextPreset === 'custom') return;
    setTableViewPreset(nextPreset);
    setColumnVisibilityModel(buildVisibilityModel(nextPreset));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const isColMenuOpen = Boolean(colMenuAnchor);
  const openColMenu = (e: React.MouseEvent<HTMLElement>) => {
    // Trình quản lý cột làm việc trên các cột dữ liệu đầy đủ, không trộn với cột tổng hợp.
    if (tableViewPreset !== 'all' && tableViewPreset !== 'custom') {
      setTableViewPreset('all');
      setColumnVisibilityModel(buildVisibilityModel('all'));
    }
    setColMenuAnchor(e.currentTarget);
  };
  const closeColMenu = () => setColMenuAnchor(null);
  const handleToggleColumn = (field: string) => {
    setTableViewPreset('custom');
    setColumnVisibilityModel(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSelectAllColumns = () => {
    setTableViewPreset('custom');
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
      const token = localStorage.getItem('token');

      // Nếu đã đăng nhập (có token) -> tải dữ liệu qua endpoint /ideas
      if (token) {
        const response = await api.get('/ideas');
        const rawData = response.data;
        const ideaList = Array.isArray(rawData) ? rawData : (rawData.ideas || rawData.data || []);
        setIdeas(ideaList);
        setLoading(false);
        return;
      }

      // Nếu ở chế độ chỉ xem (public view) -> tải dữ liệu qua /ideas/public
      if (isViewOnly) {
        const response = await api.get('/ideas/public');
        const rawData = response.data;
        const ideaList = Array.isArray(rawData) ? rawData : (rawData.ideas || rawData.data || []);
        setIdeas(ideaList);
        setLoading(false);
        return;
      }

      // Chưa đăng nhập và không phải chế độ chỉ xem
      navigate('/login');
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

    // Reset all filters first to ensure clean state
    setStatusFilter([]);
    setDepartmentFilter([]);
    setImplementationDepartmentFilter([]);
    setRewardStatusesFilter([]);
    setRewardCalculationMethodFilter('');
    setImplementationStatusFilter('');
    setIdeaCodeFilter('');
    setFullNameFilter('');
    setIdeaTextFilter('');
    setSubmissionDateFromFilter('');
    setSubmissionDateToFilter('');
    setRewardApprovalDateFromFilter('');
    setRewardApprovalDateToFilter('');

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

    // Implementation status filter
    const implementationStatus = params.get('implementationStatus');
    if (implementationStatus) {
      setImplementationStatusFilter(implementationStatus);
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
        { rewardCalculationMethod: method || null }
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
    setImplementationStatusFilter('');
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

      await api.put(`/ideas/${id}`, updateData);
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
    implementationStatus: '' | 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'
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
      } as any);
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

        await api.delete(`/ideas/${id}`);
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
        await api.put(`/ideas/${selectedIdea._id}`, ideaData);
      } else {
        await api.post('/ideas', ideaData);
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
      'expectedCompletionDate': 'Hạn dự kiến hoàn thành',
      'netReserveStatus': 'Trạng thái duy trì/mở rộng',
      'reasonNote': 'Ghi chú lý do (Dừng/Hủy)',
      'implementationDepartment': 'Phòng ban triển khai',
      'note': 'Ghi chú',
      'benefitValue': 'Giá trị làm lợi (VND)',
      'rewardAmount': 'Tiền thưởng (VND)',
      'rewardApprovalDate': 'Ngày duyệt khen thưởng',
      'submissionDate': 'Ngày gửi'
    };

    // Get visible columns (default true if not explicitly hidden)
    const visibleGridFields = columns.filter(col => {
      const isVisible = columnVisibilityModel[col.field];
      // Default to true if not in visibility model (meaning column is visible by default)
      return isVisible !== false;
    }).map(col => col.field);

    // Các cột tổng hợp trên UI được bung lại thành các trường dữ liệu thật khi xuất Excel.
    const summaryFieldMapping: Record<string, string[]> = {
      submitterSummary: ['fullName', 'department', 'submissionDate'],
      ideaSummary: ['idea'],
      implementationSummary: ['implementationStatus', 'implementationDepartment', 'expectedCompletionDate'],
      valueSummary: ['benefitValue', 'rewardAmount']
    };
    const visibleFields = Array.from(new Set(
      visibleGridFields.flatMap(field => summaryFieldMapping[field] || [field])
    )).filter(field => field !== 'actions');

    const exportData = filteredIdeas.map(idea => {
      const row: Record<string, any> = {};

      visibleFields.forEach(field => {
        const displayName = fieldDisplayNames[field] || field;

        if (field === 'beforeImage') {
          const hasImg = (idea as any).beforeImageUrl || (idea as any).beforeImagePath || (idea as any).beforeImage;
          row[displayName] = hasImg ? 'Có' : 'Không';
        } else if (field === 'afterImage') {
          const hasImg = (idea as any).afterImageUrl || (idea as any).afterImagePath || (idea as any).afterImage;
          row[displayName] = hasImg ? 'Có' : 'Không';
        } else if (field === 'benefitValue' || field === 'rewardAmount') {
          const value = (idea as any)[field];
          row[displayName] = value ? value.toLocaleString('vi-VN') : '0';
        } else if (field === 'rewardApprovalDate') {
          const date = (idea as any)[field];
          row[displayName] = date ? new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
        } else if (field === 'expectedCompletionDate') {
          const date = (idea as any)[field];
          row[displayName] = date ? new Date(date).toLocaleDateString('vi-VN') : '';
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
  const uniqueImplementationDepartments = Array.from(
    new Set(
      ideas
        .map(i => (i as any).implementationDepartment)
        .filter(Boolean)
        .flatMap((val: any) => {
          if (Array.isArray(val)) return val as string[];
          if (typeof val === 'string') {
            return val.split(',').map(s => s.trim()).filter(Boolean);
          }
          return [];
        })
    )
  ).sort();

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

    // Filter by implementation status
    const matchesImplementationStatus = !implementationStatusFilter || (idea as any).implementationStatus === implementationStatusFilter;

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
      const ideaMethod = (idea as any).rewardCalculationMethod;
      // Chỉ khớp khi idea có phương thức tính thưởng rõ ràng
      matchesRewardCalculationMethod =
        !!ideaMethod && ideaMethod === rewardCalculationMethodFilter;
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
      matchesImplementationStatus &&
      matchesRewardStatuses &&
      matchesRewardCalculationMethod &&
      matchesSubmissionDate &&
      matchesRewardApprovalDate
    );
  });

  const showFullWidthTable = tableViewPreset === 'all' || tableViewPreset === 'custom';

  // Chỉ đồng bộ thanh cuộn ngang trong chế độ toàn bộ/tùy chỉnh.
  useEffect(() => {
    if (!showFullWidthTable) return;
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
      180 + 180 +
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
  }, [filteredIdeas, showFullWidthTable]);

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

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      setAnchorEl(e.currentTarget);
    };
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
      e.stopPropagation();
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

    const rewardStatuses = (row as any).rewardStatuses;
    useEffect(() => {
      setSelectedStatuses(rewardStatuses || []);
    }, [rewardStatuses]);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
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

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      setAnchorEl(e.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);
    const selectImplementationStatus = (
      s: '' | 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'
    ) => {
      handleImplementationStatusChange(row._id, s);
      handleClose();
    };

    // Nếu không có dữ liệu thì hiển thị trống, không lấy giá trị mặc định
    const current = (row as any).implementationStatus || '';

    // Ở chế độ chỉ xem: chỉ hiển thị chip, không mở menu
    if (isViewOnly) {
      // Nếu trống thì hiển thị dấu gạch ngang
      const displayText = current || '-';
      return (
        <Chip
          label={displayText}
          sx={{
            backgroundColor: current ? getImplementationStatusColor(current) : '#e0e0e0',
            color: current ? 'white' : '#757575',
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
          label={current || 'Chọn trạng thái'}
          sx={{
            backgroundColor: current ? getImplementationStatusColor(current) : '#e0e0e0',
            color: current ? 'white' : '#757575',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
          size="small"
          onClick={handleOpen}
        />
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={() => selectImplementationStatus('' as any)}>Xóa/Để trống</MenuItem>
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

  const truncateTextToMaxLines = (text: string | undefined, maxLines = 10, maxChars = 400): string => {
    if (!text) return '';
    const lines = text.split('\n');
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + '...';
    }
    if (text.length > maxChars) {
      return text.slice(0, maxChars) + '...';
    }
    return text;
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

  const openIdeaDetails = (idea: Idea) => {
    setSelectedIdeaForDetail(idea);
    setDetailModalOpen(true);
  };

  const formatCurrency = (value: unknown) => {
    const numericValue = Number(value) || 0;
    return numericValue > 0 ? `${numericValue.toLocaleString('vi-VN')} đ` : '-';
  };

  const columns: GridColDef[] = [
    {
      field: 'ideaCode',
      headerName: 'Mã ý tưởng',
      width: 120,
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
      field: 'submitterSummary',
      headerName: 'Người đề xuất',
      minWidth: 160,
      flex: 0.85,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Box sx={{ width: '100%', py: 0.5, textAlign: 'left' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.35, textAlign: 'left' }}>
            {(params.row as Idea).fullName || 'Chưa cung cấp tên'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#64748b', lineHeight: 1.35, textAlign: 'left' }}>
            {(params.row as Idea).department || 'Chưa có đơn vị'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mt: 0.5, textAlign: 'left' }}>
            {(params.row as Idea).submissionDate
              ? new Date((params.row as Idea).submissionDate).toLocaleDateString('vi-VN')
              : '-'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'ideaSummary',
      headerName: 'Ý tưởng',
      minWidth: 190,
      flex: 1.2,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const rawText = getPureIdeaText((params.row as Idea).idea);
        const text = truncateTextToMaxLines(rawText, 10, 400);
        return (
          <Typography
            variant="body2"
            sx={{
              width: '100%',
              py: 0.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              lineHeight: 1.4,
              maxHeight: '14em',
              color: '#334155',
              display: '-webkit-box',
              WebkitLineClamp: 10,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left',
            }}
          >
            {text || 'Không có nội dung'}
          </Typography>
        );
      }
    },
    {
      field: 'implementationSummary',
      headerName: 'Triển khai',
      minWidth: 170,
      flex: 0.9,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const row = params.row as Idea;
        const implementationDepartment = (row as any).implementationDepartment;
        const expectedDate = (row as any).expectedCompletionDate;
        return (
          <Box sx={{ width: '100%', py: 0.5, textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <ImplementationStatusCell row={row} />
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 0.75, lineHeight: 1.35, textAlign: 'left' }}>
              {implementationDepartment || 'Chưa phân công đơn vị'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: expectedDate ? '#475569' : '#94a3b8', mt: 0.25, textAlign: 'left' }}
            >
              Hạn: {expectedDate ? new Date(expectedDate).toLocaleDateString('vi-VN') : 'Chưa đặt'}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'valueSummary',
      headerName: 'Hiệu quả',
      minWidth: 135,
      flex: 0.7,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const row = params.row as any;
        return (
          <Box sx={{ width: '100%', py: 0.5, textAlign: 'left' }}>
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b', textAlign: 'left' }}>
              Giá trị làm lợi
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d', textAlign: 'left' }}>
              {formatCurrency(row.benefitValue)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 0.5, textAlign: 'left' }}>
              Thưởng: <Box component="span" sx={{ fontWeight: 700, color: '#c2410c' }}>{formatCurrency(row.rewardAmount)}</Box>
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'beforeImage',
      headerName: 'Hình trước',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const row = params.row as any;
        const isBase64Before =
          typeof row.beforeImage === 'string' && row.beforeImage.startsWith('data:image');
        const imageUrl =
          (isBase64Before ? row.beforeImage : null) ||
          row.beforeImageUrl ||
          (row.beforeImagePath ? `${window.location.origin}${row.beforeImagePath}` : null) ||
          row.beforeImage;
        return (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Trước"
                onClick={() => handleImageClick(
                  imageUrl,
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
        );
      }
    },
    {
      field: 'afterImage',
      headerName: 'Hình sau',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const row = params.row as any;
        const isBase64After =
          typeof row.afterImage === 'string' && row.afterImage.startsWith('data:image');
        const imageUrl =
          (isBase64After ? row.afterImage : null) ||
          row.afterImageUrl ||
          (row.afterImagePath ? `${window.location.origin}${row.afterImagePath}` : null) ||
          row.afterImage;
        return (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Sau"
                onClick={() => handleImageClick(
                  imageUrl,
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
        );
      }
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
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.4
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
      renderCell: (params) => {
        const text = truncateTextToMaxLines(params.value, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || '-'}
          </div>
        );
      }
    },
    {
      field: 'solution',
      headerName: 'Thực trạng',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => (params.row as any).solution || parseFieldFromIdea((params.row as any).idea, 'Giải pháp'),
      renderCell: (params) => {
        const text = truncateTextToMaxLines(params.value, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || '-'}
          </div>
        );
      }

    },
    {
      field: 'benefit',
      headerName: 'Giải pháp',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => (params.row as any).benefit || parseFieldFromIdea((params.row as any).idea, 'Lợi ích'),
      renderCell: (params) => {
        const text = truncateTextToMaxLines(params.value, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || '-'}
          </div>
        );
      }

    },
    {
      field: 'benefitOutcome',
      headerName: 'Lợi ích mang lại',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const text = truncateTextToMaxLines((params.row as any).benefitOutcome, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || ''}
          </div>
        );
      }
    },
    {
      field: 'resourcesUsed',
      headerName: 'Nguồn lực sử dụng',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const text = truncateTextToMaxLines((params.row as any).resourcesUsed, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || ''}
          </div>
        );
      }
    },
    {
      field: 'calculationDescription',
      headerName: 'Mô tả cách tính',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const text = truncateTextToMaxLines((params.row as any).calculationDescription, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || ''}
          </div>
        );
      }
    },
    {
      field: 'scalingOpportunity',
      headerName: 'Cơ hội nhân rộng phát triển',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const text = truncateTextToMaxLines((params.row as any).scalingOpportunity, 10, 400);
        return (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            textAlign: 'left',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            maxHeight: '14em',
          }}>
            {text || ''}
          </div>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 160,
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
          textAlign: 'left',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.35
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
    // 4 trường mới theo yêu cầu
    {
      field: 'implementationStatus',
      headerName: 'Trạng thái triển khai',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'left',
          whiteSpace: 'normal',
          wordBreak: 'break-word'
        }}>
          {(params.row as any).implementationStatus || '-'}
        </div>
      )
    },
    {
      field: 'expectedCompletionDate',
      headerName: 'Hạn dự kiến hoàn thành',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString('vi-VN');
      },
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'center'
        }}>
          {(params.row as any).expectedCompletionDate
            ? (() => {
              const date = new Date((params.row as any).expectedCompletionDate);
              return date.toLocaleDateString('vi-VN');
            })()
            : '-'}
        </div>
      )
    },
    {
      field: 'netReserveStatus',
      headerName: 'Trạng thái duy trì/mở rộng',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'left',
          whiteSpace: 'normal',
          wordBreak: 'break-word'
        }}>
          {(params.row as any).netReserveStatus || '-'}
        </div>
      )
    },
    {
      field: 'reasonNote',
      headerName: 'Ghi chú lý do (Dừng/Hủy)',
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{
          width: '100%',
          textAlign: 'left',
          whiteSpace: 'normal',
          wordBreak: 'break-word'
        }}>
          {(params.row as any).reasonNote || '-'}
        </div>
      )
    },
    // Cột thao tác chỉ hiển thị trong chế độ admin đầy đủ
    ...(!isViewOnly
      ? [
        {
          field: 'actions',
          headerName: 'Thao tác',
          width: 124,
          sortable: false,
          renderCell: (params: any) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Xem chi tiết">
                <IconButton
                  color="default"
                  onClick={(event) => {
                    event.stopPropagation();
                    openIdeaDetails(params.row);
                  }}
                  size="small"
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sửa">
                <IconButton
                  color="primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(params.row);
                  }}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Xóa">
                <IconButton
                  color="error"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(params.row._id);
                  }}
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
    <Box sx={{ width: '100%' }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              component="h1"
              sx={{
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.01em',
                mb: 0.5,
              }}
            >
              Quản lý Ý tưởng
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {filteredIdeas.length} ý tưởng {filteredIdeas.length !== ideas.length ? `(lọc từ ${ideas.length})` : 'tổng cộng'}
            </Typography>
          </Box>
          {isMobile && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              startIcon={filtersExpanded ? <ExpandLessIcon /> : <FilterListIcon />}
              sx={{ borderRadius: '10px', fontWeight: 600 }}
            >
              {filtersExpanded ? 'Ẩn lọc' : 'Bộ lọc'}
            </Button>
          )}
        </Box>
      </Box>

      <Card elevation={0} sx={{ mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Divider sx={{ mb: 2, display: 'none' }} />
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', rowGap: 2 }}>
                {/* Mobile Filter Toggle - Always show filter section but collapsible */}
                <Collapse in={!isMobile || filtersExpanded}>
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
                </Collapse>

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
                          Tùy chỉnh cột
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
                                      status: 'Trạng thái',
                                      rewardStatuses: 'Tình trạng khen thưởng',
                                      submissionDate: 'Thời gian nộp',
                                      implementationDepartment: 'Phòng ban triển khai',
                                      note: 'Ghi chú',
                                      benefitValue: 'Giá trị làm lợi (VND)',
                                      rewardAmount: 'Tiền thưởng (VND)',
                                      rewardApprovalDate: 'Ngày duyệt khen thưởng',
                                      rewardCalculationMethod: 'Phương thức tính thưởng',
                                      // 4 trường mới
                                      implementationStatus: 'Trạng thái triển khai',
                                      expectedCompletionDate: 'Hạn dự kiến hoàn thành',
                                      netReserveStatus: 'Trạng thái duy trì/mở rộng',
                                      reasonNote: 'Ghi chú lý do (Dừng/Hủy)',
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
        {/* Bảng tóm tắt không cần thanh cuộn ngang; chỉ giữ cho chế độ đầy đủ. */}
        {showFullWidthTable && (
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
              '&::-webkit-scrollbar': { height: '12px' },
              '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '6px' },
              '&::-webkit-scrollbar-thumb': { background: '#999999', borderRadius: '6px' },
              '&::-webkit-scrollbar-thumb:hover': { background: '#777' }
            }}
          >
            <Box sx={{ width: '100%', minWidth: 'max-content', height: '1px', visibility: 'hidden' }} />
          </Box>
        )}

        {/* Thông tin số lượng kết quả */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 2,
          px: 2,
          backgroundColor: '#f8fafc',
          borderRadius: 2,
          py: 1.5
        }}>
          <Typography variant="body2" color="text.secondary">
            Hiển thị {filteredIdeas.length} / {ideas.length} ý tưởng
            {filteredIdeas.length !== ideas.length && (
              <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
                {' '}(đã lọc)
              </span>
            )}
          </Typography>
          {!isViewOnly && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: '100%', overflowX: 'auto' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Chế độ xem
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={tableViewPreset}
                onChange={handleTableViewPresetChange}
                aria-label="Chế độ hiển thị bảng ý tưởng"
                sx={{
                  backgroundColor: '#fff',
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 1.5,
                    whiteSpace: 'nowrap'
                  }
                }}
              >
                <ToggleButton value="overview">Tổng quan</ToggleButton>
                <ToggleButton value="implementation">Triển khai</ToggleButton>
                <ToggleButton value="reward">Khen thưởng</ToggleButton>
                <ToggleButton value="all">Toàn bộ</ToggleButton>
                {tableViewPreset === 'custom' && (
                  <ToggleButton value="custom" disabled>Tùy chỉnh</ToggleButton>
                )}
              </ToggleButtonGroup>
            </Box>
          )}
        </Box>

        <Box ref={dataGridRef} sx={{ width: '100%', overflow: 'auto' }}>
          {isMobile ? (
            // Mobile View: Card Layout
            <Box sx={{ px: 1, pb: 2 }}>
              {/* View Mode Toggle for Mobile */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Hiển thị {filteredIdeas.length} / {ideas.length} ý tưởng
                  {filteredIdeas.length !== ideas.length && (
                    <span style={{ color: '#1976d2', fontWeight: 'bold' }}> (đã lọc)</span>
                  )}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={mobileViewMode === 'cards' ? 'contained' : 'outlined'}
                    onClick={() => setMobileViewMode('cards')}
                    startIcon={<ViewModuleIcon />}
                  >
                    Cards
                  </Button>
                  <Button
                    size="small"
                    variant={mobileViewMode === 'table' ? 'contained' : 'outlined'}
                    onClick={() => setMobileViewMode('table')}
                    startIcon={<ViewListIcon />}
                  >
                    Table
                  </Button>
                </Box>
              </Box>

              {mobileViewMode === 'cards' ? (
                // Card View for Mobile
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredIdeas.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                      Không có ý tưởng nào
                    </Typography>
                  ) : (
                    filteredIdeas
                      .slice(mobilePage * mobilePageSize, (mobilePage + 1) * mobilePageSize)
                      .map((idea) => (
                      <Card
                        key={idea._id}
                        elevation={2}
                        sx={{
                          borderRadius: 2,
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 4 },
                          transition: 'box-shadow 0.2s'
                        }}
                        onClick={() => {
                          setSelectedIdeaForDetail(idea);
                          setDetailModalOpen(true);
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          {/* Header: Mã ý tưởng + Status */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Chip
                              label={(idea as any).ideaCode || 'N/A'}
                              size="small"
                              sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', color: '#1976d2' }}
                            />
                            <StatusCell row={idea} />
                          </Box>

                          {/* Người đề xuất + Đơn vị */}
                          <Box sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon fontSize="small" color="primary" />
                              {idea.fullName || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon fontSize="small" />
                              {idea.department || 'N/A'}
                            </Typography>
                          </Box>

                          {/* Nội dung ý tưởng */}
                          <Box sx={{ mb: 1.5 }}>
                            <Typography variant="body2" sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.4
                            }}>
                              {(idea as any).idea || 'Không có nội dung'}
                            </Typography>
                          </Box>

                          {/* Thông tin thêm - Chỉ hiển thị Giá trị làm lợi và Tiền thưởng khi status là Hoàn thành */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarTodayIcon fontSize="small" color="action" />
                              <Typography variant="caption" color="text.secondary">
                                {idea.submissionDate ? new Date(idea.submissionDate).toLocaleDateString('vi-VN') : 'N/A'}
                              </Typography>
                            </Box>
                            {idea.status === IdeaStatus.DONE && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {(idea as any).benefitValue > 0 && (
                                <Chip
                                  size="small"
                                  label={`${(idea as any).benefitValue.toLocaleString('vi-VN')} đ`}
                                  sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold', height: 24 }}
                                />
                              )}
                              {(idea as any).rewardAmount > 0 && (
                                <Chip
                                  size="small"
                                  label={`Thưởng: ${(idea as any).rewardAmount.toLocaleString('vi-VN')} đ`}
                                  sx={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 'bold', height: 24 }}
                                />
                              )}
                            </Box>
                            )}
                          </Box>

                          {/* Actions - chỉ hiển thị khi không phải viewOnly */}
                          {!isViewOnly && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1.5, borderTop: '1px solid #eee' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<VisibilityIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIdeaForDetail(idea);
                                  setDetailModalOpen(true);
                                }}
                              >
                                Xem
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={<EditIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(idea);
                                }}
                              >
                                Sửa
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(idea._id);
                                }}
                              >
                                Xóa
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}

                  {/* Mobile Pagination */}
                  {filteredIdeas.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setMobilePage(Math.max(0, mobilePage - 1))}
                        disabled={mobilePage === 0}
                      >
                        Trước
                      </Button>
                      <Typography variant="body2">
                        Trang {mobilePage + 1} / {Math.ceil(filteredIdeas.length / mobilePageSize)}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setMobilePage(Math.min(Math.ceil(filteredIdeas.length / mobilePageSize) - 1, mobilePage + 1))}
                        disabled={mobilePage >= Math.ceil(filteredIdeas.length / mobilePageSize) - 1}
                      >
                        Sau
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                // Table View for Mobile - use columnVisibilityModel
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        {columnVisibilityModel.ideaCode && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Mã</TableCell>
                        )}
                        {columnVisibilityModel.fullName && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Người đề xuất</TableCell>
                        )}
                        {columnVisibilityModel.department && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Đơn vị</TableCell>
                        )}
                        {columnVisibilityModel.status && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Trạng thái</TableCell>
                        )}
                        {columnVisibilityModel.implementationStatus && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>TT Triển khai</TableCell>
                        )}
                        {columnVisibilityModel.benefitValue && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Giá trị lợi</TableCell>
                        )}
                        {columnVisibilityModel.rewardAmount && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Tiền thưởng</TableCell>
                        )}
                        {!isViewOnly && (
                          <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Thao tác</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredIdeas
                        .slice(mobilePage * mobilePageSize, (mobilePage + 1) * mobilePageSize)
                        .map((idea) => (
                        <TableRow
                          key={idea._id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedIdeaForDetail(idea);
                            setDetailModalOpen(true);
                          }}
                        >
                          {columnVisibilityModel.ideaCode && (
                            <TableCell sx={{ py: 1.5 }}>{(idea as any).ideaCode || '-'}</TableCell>
                          )}
                          {columnVisibilityModel.fullName && (
                            <TableCell sx={{ py: 1.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{idea.fullName || '-'}</Typography>
                              {columnVisibilityModel.department && (
                                <Typography variant="caption" color="text.secondary">{idea.department || '-'}</Typography>
                              )}
                            </TableCell>
                          )}
                          {columnVisibilityModel.department && !columnVisibilityModel.fullName && (
                            <TableCell sx={{ py: 1.5 }}>{idea.department || '-'}</TableCell>
                          )}
                          {columnVisibilityModel.status && (
                            <TableCell sx={{ py: 1.5 }}>
                              <StatusCell row={idea} />
                            </TableCell>
                          )}
                          {columnVisibilityModel.implementationStatus && (
                            <TableCell sx={{ py: 1.5 }}>
                              <ImplementationStatusCell row={idea} />
                            </TableCell>
                          )}
                          {columnVisibilityModel.benefitValue && (
                            <TableCell sx={{ py: 1.5 }}>
                              {((idea as any).benefitValue > 0)
                                ? `${(idea as any).benefitValue.toLocaleString('vi-VN')} đ`
                                : '-'}
                            </TableCell>
                          )}
                          {columnVisibilityModel.rewardAmount && (
                            <TableCell sx={{ py: 1.5 }}>
                              {((idea as any).rewardAmount > 0)
                                ? `${(idea as any).rewardAmount.toLocaleString('vi-VN')} đ`
                                : '-'}
                            </TableCell>
                          )}
                          {!isViewOnly && (
                            <TableCell sx={{ py: 1.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(idea);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(idea._id);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Mobile Table Pagination */}
              {mobileViewMode === 'table' && filteredIdeas.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setMobilePage(Math.max(0, mobilePage - 1))}
                    disabled={mobilePage === 0}
                  >
                    Trước
                  </Button>
                  <Typography variant="body2">
                    Trang {mobilePage + 1} / {Math.ceil(filteredIdeas.length / mobilePageSize)}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setMobilePage(Math.min(Math.ceil(filteredIdeas.length / mobilePageSize) - 1, mobilePage + 1))}
                    disabled={mobilePage >= Math.ceil(filteredIdeas.length / mobilePageSize) - 1}
                  >
                    Sau
                  </Button>
                </Box>
              )}

              {/* Mobile FAB for adding new idea */}
              {!isViewOnly && (
                <Fab
                  color="primary"
                  aria-label="add"
                  onClick={handleAdd}
                  sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    zIndex: 1000
                  }}
                >
                  <AddIcon />
                </Fab>
              )}
            </Box>
          ) : (
            // Desktop View: DataGrid
            <DataGrid
              rows={filteredIdeas}
              columns={columns}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(model) => {
                setTableViewPreset('custom');
                setColumnVisibilityModel(model);
              }}
              onRowClick={(params) => openIdeaDetails(params.row as Idea)}
              getRowId={(row) => row._id}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              loading={loading}
              getRowHeight={() => showFullWidthTable ? 200 : 'auto'}
              getEstimatedRowHeight={() => 104}
              sx={{
                width: '100%',
                '& .MuiDataGrid-row': {
                  cursor: 'pointer'
                },
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
                },
                '& .MuiDataGrid-pinnedColumns': {
                  backgroundColor: '#fafafa',
                },
                '& .MuiDataGrid-pinnedColumns-Footer': {
                  backgroundColor: '#fafafa',
                }
              }}
            />
          )}
        </Box>

      </Paper>

      {/* Hồ sơ chi tiết: drawer giúp vừa xem danh sách vừa xem trọn một ý tưởng. */}
      <Drawer
        anchor="right"
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: isSmallMobile ? '100%' : { sm: 620, md: 720 },
            maxWidth: '100vw',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f8fafc'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2.5,
            py: 2,
            backgroundColor: '#fff',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Hồ sơ ý tưởng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Xem toàn bộ thông tin mà không cần kéo ngang bảng
            </Typography>
          </Box>
          <IconButton aria-label="Đóng hồ sơ ý tưởng" onClick={() => setDetailModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers sx={{ flex: 1, px: { xs: 2, sm: 2.5 } }}>
          {selectedIdeaForDetail && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Header Info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Chip
                    label={(selectedIdeaForDetail as any).ideaCode || 'N/A'}
                    sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', color: '#1976d2', mb: 1 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedIdeaForDetail.fullName || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedIdeaForDetail.department || 'N/A'}
                  </Typography>
                </Box>
                <StatusCell row={selectedIdeaForDetail} />
              </Box>

              <Divider />

              {/* Content Sections */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>Nội dung ý tưởng</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {(selectedIdeaForDetail as any).idea || 'Không có'}
                  </Typography>
                  {(selectedIdeaForDetail as any).solution && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>Thực trạng:</Typography>
                      <Typography variant="body2">{(selectedIdeaForDetail as any).solution}</Typography>
                    </Box>
                  )}
                  {(selectedIdeaForDetail as any).benefit && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>Giải pháp:</Typography>
                      <Typography variant="body2">{(selectedIdeaForDetail as any).benefit}</Typography>
                    </Box>
                  )}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                    <Typography variant="caption" color="text.secondary">Ngày nộp:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {selectedIdeaForDetail.submissionDate ? new Date(selectedIdeaForDetail.submissionDate).toLocaleDateString('vi-VN') : '-'}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Images */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>Hình ảnh</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {(() => {
                      const row = selectedIdeaForDetail as any;
                      if (!row) return null;

                      const isBase64Before = typeof row.beforeImage === 'string' && row.beforeImage.startsWith('data:image');
                      const beforeImageUrl = (isBase64Before ? row.beforeImage : null) ||
                        row.beforeImageUrl ||
                        (row.beforeImagePath ? `${window.location.origin}${row.beforeImagePath}` : null) ||
                        row.beforeImage;

                      const isBase64After = typeof row.afterImage === 'string' && row.afterImage.startsWith('data:image');
                      const afterImageUrl = (isBase64After ? row.afterImage : null) ||
                        row.afterImageUrl ||
                        (row.afterImagePath ? `${window.location.origin}${row.afterImagePath}` : null) ||
                        row.afterImage;

                      if (!beforeImageUrl && !afterImageUrl) {
                        return <Typography variant="body2" color="text.secondary">Không có hình ảnh</Typography>;
                      }

                      return (
                        <>
                          {beforeImageUrl && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Hình trước</Typography>
                              <Box
                                component="img"
                                src={beforeImageUrl}
                                alt="Hình trước"
                                sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 1, cursor: 'pointer', border: '1px solid #ddd', objectFit: 'contain' }}
                                onClick={() => handleImageClick(beforeImageUrl, `Hình trước - ${row.ideaCode || 'N/A'}`)}
                              />
                            </Box>
                          )}
                          {afterImageUrl && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Hình sau</Typography>
                              <Box
                                component="img"
                                src={afterImageUrl}
                                alt="Hình sau"
                                sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 1, cursor: 'pointer', border: '1px solid #ddd', objectFit: 'contain' }}
                                onClick={() => handleImageClick(afterImageUrl, `Hình sau - ${row.ideaCode || 'N/A'}`)}
                              />
                            </Box>
                          )}
                        </>
                      );
                    })()}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Reward Info - Luôn hiển thị section, chỉ ẩn Giá trị làm lợi và Tiền thưởng khi không phải Hoàn thành */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>Thông tin khen thưởng</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {selectedIdeaForDetail.status === IdeaStatus.DONE && (
                    <>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Giá trị làm lợi:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {((selectedIdeaForDetail as any).benefitValue || 0).toLocaleString('vi-VN')} đ
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Tiền thưởng:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#e65100' }}>
                        {((selectedIdeaForDetail as any).rewardAmount || 0).toLocaleString('vi-VN')} đ
                      </Typography>
                    </Grid>
                    </>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Tình trạng khen thưởng:</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <RewardStatusCell row={selectedIdeaForDetail} />
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Phương thức tính thưởng:</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <RewardCalculationMethodCell row={selectedIdeaForDetail} />
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Implementation Info */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>Triển khai</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Trạng thái triển khai:</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <ImplementationStatusCell row={selectedIdeaForDetail} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Hạn dự kiến hoàn thành:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        {(selectedIdeaForDetail as any).expectedCompletionDate
                          ? new Date((selectedIdeaForDetail as any).expectedCompletionDate).toLocaleDateString('vi-VN')
                          : '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Trạng thái duy trì/mở rộng:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        {(selectedIdeaForDetail as any).netReserveStatus || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Phòng ban triển khai:</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {(selectedIdeaForDetail as any).implementationDepartment || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Ghi chú lý do (Dừng/Hủy):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {(selectedIdeaForDetail as any).reasonNote || '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Note */}
              {(selectedIdeaForDetail as any).note && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 'bold' }}>Ghi chú</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {(selectedIdeaForDetail as any).note}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        {!isViewOnly && (
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDetailModalOpen(false)} variant="outlined">
              Đóng
            </Button>
            <Button
              onClick={() => {
                setDetailModalOpen(false);
                handleEdit(selectedIdeaForDetail!);
              }}
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
            >
              Sửa
            </Button>
          </DialogActions>
        )}
      </Drawer>

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
    </Box>
  );
};

export default AdminDashboard;
