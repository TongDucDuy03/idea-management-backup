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
  Checkbox,
  ListItemText
} from '@mui/material';
import { DataGrid, GridColDef, GridRowHeightParams } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon, FileDownload as FileDownloadIcon, BarChart as BarChartIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Idea } from '../types';
import IdeaDialog from './IdeaDialog';
import ExportReportDialog from './ExportReportDialog';
import ImageLightbox from './ImageLightbox';
import api from '../api/config';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Array<'pending' | 'rejected' | 'noted' | 'approved'>>([]);
  const [implementationStatusFilter, setImplementationStatusFilter] = useState<Array<'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'>>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [implementationDepartmentFilter, setImplementationDepartmentFilter] = useState<string[]>([]);
  const [ideaCodeFilter, setIdeaCodeFilter] = useState('');
  const [fullNameFilter, setFullNameFilter] = useState('');
  const [ideaTextFilter, setIdeaTextFilter] = useState('');
  const [submissionDateFromFilter, setSubmissionDateFromFilter] = useState('');
  const [submissionDateToFilter, setSubmissionDateToFilter] = useState('');
  const [rewardApprovalDateFromFilter, setRewardApprovalDateFromFilter] = useState('');
  const [rewardApprovalDateToFilter, setRewardApprovalDateToFilter] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');
  
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
    'topicTitle',
    'scalingOpportunity',
    'beforeImage',
    'afterImage',
    'status',
    'implementationStatus',
    'submissionDate',
    'implementationDepartment',
    'note',
    'benefitValue',
    'rewardAmount',
    'rewardApprovalDate',
    'actions'
  ] as const;

  const defaultVisibleFields = new Set<string>([
    'ideaCode',
    'idea',
    'solution',
    'benefit',
    'topicTitle',
    'beforeImage',
    'afterImage',
    'status',
    'implementationStatus',
    'note',
    'actions'
  ]);

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin_column_visibility');
      if (saved) return JSON.parse(saved);
    } catch {}
    const model: Record<string, boolean> = {};
    allColumnFields.forEach(f => { model[f] = defaultVisibleFields.has(f); });
    return model;
  });

  useEffect(() => {
    try {
      localStorage.setItem('admin_column_visibility', JSON.stringify(columnVisibilityModel));
    } catch {}
  }, [columnVisibilityModel]);

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const isColMenuOpen = Boolean(colMenuAnchor);
  const openColMenu = (e: React.MouseEvent<HTMLElement>) => setColMenuAnchor(e.currentTarget);
  const closeColMenu = () => setColMenuAnchor(null);
  const handleToggleColumn = (field: string) => {
    setColumnVisibilityModel(prev => ({ ...prev, [field]: !prev[field] }));
  };

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
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể tải danh sách ý tưởng');
      }
      setLoading(false);
    }
  }, [navigate]);

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
    if (status && ['pending', 'rejected', 'noted', 'approved'].includes(status)) {
      setStatusFilter([status as 'pending' | 'rejected' | 'noted' | 'approved']);
    }
    
    // Implementation status filter
    const implStatus = params.get('implementationStatus');
    if (implStatus && ['Đề xuất mới', 'Xem xét', 'Phê duyệt', 'Phản hồi phê duyệt', 'Đang triển khai', 'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'].includes(implStatus)) {
      setImplementationStatusFilter([implStatus as 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt']);
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
    const value = event.target.value as Array<'pending' | 'rejected' | 'noted' | 'approved'>;
    setStatusFilter(value);
  };

  const handleImplementationStatusFilterChange = (event: any) => {
    const value = event.target.value as Array<'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'>;
    setImplementationStatusFilter(value);
  };

  const handleDepartmentFilterChange = (event: any) => {
    const value = event.target.value as string[];
    setDepartmentFilter(value);
  };

  const handleImplementationDepartmentFilterChange = (event: any) => {
    const value = event.target.value as string[];
    setImplementationDepartmentFilter(value);
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
    setImplementationStatusFilter([]);
    setDepartmentFilter([]);
    setImplementationDepartmentFilter([]);
    setIdeaCodeFilter('');
    setFullNameFilter('');
    setIdeaTextFilter('');
    setSubmissionDateFromFilter('');
    setSubmissionDateToFilter('');
    setRewardApprovalDateFromFilter('');
    setRewardApprovalDateToFilter('');
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };


  const handleStatusChange = async (id: string, status: 'pending' | 'rejected' | 'noted' | 'approved') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await api.put(`/ideas/${id}`, {
        status
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
        setError('Không thể cập nhật trạng thái');
      }
    }
  };

  const handleImplementationStatusChange = async (
    id: string,
    implementationStatus: 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await api.put(`/ideas/${id}`, {
        implementationStatus
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
        setError('Không thể cập nhật trạng thái triển khai');
      }
    }
  };

  const handleDelete = async (id: string) => {
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
    setSelectedIdea(idea);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedIdea(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleSave = async (ideaData: Partial<Idea>) => {
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
    navigate('/statistics');
  };

  const handleExportExcel = () => {
    // Map field names to display names
    const fieldDisplayNames: Record<string, string> = {
      'ideaCode': 'Mã ý tưởng',
      'beforeImage': 'Hình trước',
      'afterImage': 'Hình sau',
      'fullName': 'Họ và tên',
      'department': 'Đơn vị',
      'topicTitle': 'Tên đề tài',
      'idea': 'Ý tưởng',
      'solution': 'Thực trạng',
      'benefit': 'Giải pháp',
      'benefitOutcome': 'Lợi ích mang lại',
      'resourcesUsed': 'Nguồn lực sử dụng',
      'calculationDescription': 'Mô tả cách tính',
      'scalingOpportunity': 'Cơ hội nhân rộng phát triển',
      'status': 'Quyết định phê duyệt',
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
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes((idea as any).status);
    const matchesImplementationStatus = implementationStatusFilter.length === 0 || implementationStatusFilter.includes(((idea as any).implementationStatus || ''));
    const matchesDepartment = departmentFilter.length === 0 || departmentFilter.includes((idea as any).department);
    const matchesImplementationDepartment = implementationDepartmentFilter.length === 0 || implementationDepartmentFilter.includes(((idea as any).implementationDepartment || ''));

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
      matchesImplementationStatus &&
      matchesDepartment &&
      matchesImplementationDepartment &&
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
    const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
      switch(status) {
        case 'rejected': return 'error';
        case 'noted': return 'warning';
        case 'approved': return 'success';
        case 'pending': 
        default: return 'info';
      }
    };
    const color = getStatusColor(row.status || 'pending');

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'pending': return 'Chưa phê duyệt';
        case 'rejected': return 'Không phù hợp';
        case 'noted': return 'Lưu ý tưởng';
        case 'approved': return 'Phê duyệt triển khai';
        default: return 'Chưa phê duyệt';
      }
    };

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const selectStatus = (s: 'pending' | 'rejected' | 'noted' | 'approved') => {
      handleStatusChange(row._id, s);
      handleClose();
    };

    return (
      <>
        <Chip
          label={getStatusLabel(row.status || 'pending')}
          color={color}
          size="small"
          onClick={handleOpen}
          sx={{ fontWeight: 'bold', cursor: 'pointer' }}
        />
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={() => selectStatus('pending')}>Chưa phê duyệt</MenuItem>
          <MenuItem onClick={() => selectStatus('rejected')}>Không phù hợp</MenuItem>
          <MenuItem onClick={() => selectStatus('noted')}>Lưu ý tưởng</MenuItem>
          <MenuItem onClick={() => selectStatus('approved')}>Phê duyệt triển khai</MenuItem>
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
      field: 'topicTitle',
      headerName: 'Tên đề tài',
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
          {(params.row as any).topicTitle || ''}
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
      headerName: 'Quyết định phê duyệt',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <StatusCell row={params.row} />
        </div>
      ),
      sortable: false
    },
    {
      field: 'implementationStatus',
      headerName: 'Trạng thái',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <ImplementationStatusCell row={params.row as any} />
        </div>
      ),
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
      field: 'actions',
      headerName: 'Thao tác',
      width: 120,
      renderCell: (params) => (
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
    },
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
                      if ((selected as string[]).length === 0) {
                        return 'Lọc quyết định phê duyệt';
                      }
                      return (selected as string[]).join(', ');
                    }}
                    size="small"
                    sx={{ minWidth: 200, maxWidth: 280, flexShrink: 1 }}
                  >
                    {[
                      { value: 'pending', label: 'Chưa phê duyệt' },
                      { value: 'rejected', label: 'Không phù hợp' },
                      { value: 'noted', label: 'Lưu ý tưởng' },
                      { value: 'approved', label: 'Phê duyệt triển khai' }
                    ].map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Checkbox checked={statusFilter.indexOf(opt.value as any) > -1} />
                        <ListItemText primary={opt.label} />
                      </MenuItem>
                    ))}
                  </Select>
                  <Select
                    multiple
                    displayEmpty
                    value={implementationStatusFilter}
                    onChange={handleImplementationStatusFilterChange}
                    renderValue={(selected) => {
                      if ((selected as string[]).length === 0) {
                        return 'Lọc trạng thái triển khai';
                      }
                      return (selected as string[]).join(', ');
                    }}
                    size="small"
                    sx={{ minWidth: 200, maxWidth: 280, flexShrink: 1 }}
                  >
                    {[
                      { value: 'Đề xuất mới', label: 'Đề xuất mới' },
                      { value: 'Xem xét', label: 'Xem xét' },
                      { value: 'Phê duyệt', label: 'Phê duyệt' },
                      { value: 'Phản hồi phê duyệt', label: 'Phản hồi phê duyệt' },
                      { value: 'Đang triển khai', label: 'Đang triển khai' },
                      { value: 'Lập báo cáo A3', label: 'Lập báo cáo A3' },
                      { value: 'Phê duyệt khen thưởng', label: 'Phê duyệt khen thưởng' },
                      { value: 'Đã khen thưởng', label: 'Đã khen thưởng' },
                      { value: 'Không đạt', label: 'Không đạt' }
                    ].map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Checkbox checked={implementationStatusFilter.indexOf(opt.value as any) > -1} />
                        <ListItemText primary={opt.label} />
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
                <Box sx={{ display: 'flex', gap: 2, marginLeft: 'auto', alignItems: 'center' }}>
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
                  <Menu anchorEl={colMenuAnchor} open={isColMenuOpen} onClose={closeColMenu}>
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
                                topicTitle: 'Tên đề tài',
                                scalingOpportunity: 'Cơ hội nhân rộng phát triển',
                                status: 'Quyết định phê duyệt',
                                implementationStatus: 'Trạng thái',
                                submissionDate: 'Thời gian nộp',
                                implementationDepartment: 'Phòng ban triển khai',
                                note: 'Ghi chú',
                                benefitValue: 'Giá trị làm lợi (VND)',
                                rewardAmount: 'Tiền thưởng (VND)',
                                rewardApprovalDate: 'Ngày duyệt khen thưởng',
                                actions: 'Thao tác'
                              } as Record<string, string>
                            )[field]
                          }
                        />
                      </MenuItem>
                    ))}
                  </Menu>
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
                      Dashboard Thống kê
                  </Button>
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
    </Container>
  );
};

export default AdminDashboard; 