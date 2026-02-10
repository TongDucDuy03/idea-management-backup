import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Snackbar
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line, getElementAtEvent } from 'react-chartjs-2';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CompareArrows as CompareArrowsIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import api from '../api/config';
import { Idea, IdeaStatus, IdeaStatusLabels, RewardStatus } from '../types';
import AdvancedStatistics from './AdvancedStatistics';
import ReportGenerator from './ReportGenerator';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface StatisticsDashboardProps {
  isViewOnly?: boolean;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ isViewOnly = false }) => {
  const navigate = useNavigate();
  const [showLoginMessage, setShowLoginMessage] = React.useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [comparisonType, setComparisonType] = useState<'month' | 'quarter' | 'year' | 'none'>('none');
  const [showComparison, setShowComparison] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Comparison period selections
  const now = new Date();
  const currentYearInit = now.getFullYear();
  const currentMonthInit = now.getMonth() + 1; // 1-12
  const currentQuarterInit = Math.floor(now.getMonth() / 3) + 1; // 1-4 (tháng 0-2=Q1, 3-5=Q2, 6-8=Q3, 9-11=Q4)
  const [yearA, setYearA] = useState<number>(currentYearInit);
  const [yearB, setYearB] = useState<number>(currentYearInit - 1);
  const [quarterA, setQuarterA] = useState<number>(currentQuarterInit);
  const [quarterB, setQuarterB] = useState<number>(currentQuarterInit === 1 ? 4 : currentQuarterInit - 1);
  const [monthA, setMonthA] = useState<number>(currentMonthInit);
  const [monthB, setMonthB] = useState<number>(currentMonthInit === 1 ? 12 : currentMonthInit - 1);

  const fetchIdeas = useCallback(async () => {
    try {
      if (isViewOnly) {
        // Public endpoint không cần authentication
        const response = await api.get('/ideas/public');
        setIdeas(response.data);
        setLoading(false);
      } else {
        // Protected endpoint yêu cầu authentication
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
      }
    } catch (error: any) {
      if (!isViewOnly && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Không thể tải dữ liệu thống kê');
      }
      setLoading(false);
    }
  }, [navigate, isViewOnly]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Đồng bộ timeRange với dateFrom/dateTo: khi chọn timeRange thì tự động cập nhật dateFrom và dateTo
  useEffect(() => {
    // Chỉ cập nhật nếu chưa có dateFrom/dateTo (để không ghi đè lên bộ lọc tùy chỉnh)
    if (!dateFrom && !dateTo && timeRange !== 'all') {
      const today = new Date();
      let from: string | null = null;
      const to = formatLocalDate(today);

      if (timeRange === 'week') {
        // 7 ngày qua: từ 7 ngày trước đến hôm nay
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        from = formatLocalDate(weekAgo);
      } else if (timeRange === 'month') {
        // 30 ngày qua: từ 30 ngày trước đến hôm nay
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        from = formatLocalDate(monthAgo);
      } else if (timeRange === 'quarter') {
        // 3 tháng qua: từ 90 ngày trước đến hôm nay
        const quarterAgo = new Date(today);
        quarterAgo.setDate(today.getDate() - 90);
        from = formatLocalDate(quarterAgo);
      } else if (timeRange === 'year') {
        // 1 năm qua: từ 365 ngày trước đến hôm nay
        const yearAgo = new Date(today);
        yearAgo.setDate(today.getDate() - 365);
        from = formatLocalDate(yearAgo);
      }

      if (from) {
        setDateFrom(from);
        setDateTo(to);
      }
    }
    // Nếu người dùng xóa dateFrom và dateTo bằng tay thì reset timeRange về 'all'
    else if (!dateFrom && !dateTo && timeRange !== 'all') {
      setTimeRange('all');
    }
  }, [timeRange, dateFrom, dateTo]); // Chạy khi timeRange, dateFrom hoặc dateTo thay đổi

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleBackToAdmin = () => {
    // Nếu đang ở chế độ viewOnly (statistics-view) thì chuyển sang admin-view (chỉ xem)
    if (isViewOnly) {
      navigate('/admin-view');
      return;
    }
    navigate('/admin');
  };

  const handleNavigateToAdmin = (query?: string) => {
    // Nếu đang ở chế độ viewOnly (statistics-view) thì chuyển sang admin-view (chỉ xem)
    if (isViewOnly) {
      navigate(`/admin-view${query ? `?${query}` : ''}`);
      return;
    }
    navigate(`/admin${query ? `?${query}` : ''}`);
  };

  // Helper function để format date theo local timezone (không bị ảnh hưởng bởi UTC)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() trả về 0-11
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(event.target.value);
  };

  const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(event.target.value);
  };

  const handleQuickDateFilter = (type: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    const todayStr = formatLocalDate(today); // Sử dụng local timezone

    switch (type) {
      case 'today':
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'week':
        // Tuần này: bắt đầu từ Thứ 2 của tuần hiện tại tới hôm nay
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay(); // 0 = CN, 1 = Thứ 2, ...
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(today.getDate() - daysToMonday);
        setDateFrom(formatLocalDate(weekStart)); // Sử dụng local timezone
        setDateTo(todayStr);
        break;
      case 'month':
        // Tháng này: từ ngày 1 tháng hiện tại đến hôm nay
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(formatLocalDate(monthStart)); // Sử dụng local timezone
        setDateTo(todayStr);
        break;
      case 'quarter':
        // Quý này bắt đầu từ ngày 1 của tháng đầu quý
        // Quý 1: tháng 0-2, Quý 2: tháng 3-5, Quý 3: tháng 6-8, Quý 4: tháng 9-11
        const currentMonth = today.getMonth(); // 0-11
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, hoặc 9
        const quarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);
        setDateFrom(formatLocalDate(quarterStart)); // Sử dụng local timezone
        setDateTo(todayStr);
        break;
      case 'year':
        // Năm này bắt đầu từ ngày 1/1
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setDateFrom(formatLocalDate(yearStart)); // Sử dụng local timezone
        setDateTo(todayStr);
        break;
    }
  };

  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setTimeRange('all'); // Reset timeRange khi xóa bộ lọc tùy chỉnh
  };

  const isDateRangeValid = () => {
    if (!dateFrom || !dateTo) return true;
    return new Date(dateFrom) <= new Date(dateTo);
  };

  // Helper to filter by submission date (thời gian nộp) – dùng chung cho hầu hết thống kê
  const getFilteredIdeasBySubmissionDate = () => {
    let filtered = [...ideas];

    // Filter by custom date range (priority over timeRange)
    if (dateFrom && dateTo) {
      const fromMs = new Date(dateFrom).setHours(0, 0, 0, 0);
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(idea => {
        const submissionMs = new Date(idea.submissionDate).getTime();
        return submissionMs >= fromMs && submissionMs <= toMs;
      });
    } else if (dateFrom) {
      const fromMs = new Date(dateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter(idea => new Date(idea.submissionDate).getTime() >= fromMs);
    } else if (dateTo) {
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(idea => new Date(idea.submissionDate).getTime() <= toMs);
    } else {
      // Filter by time range (only if no custom date range)
      const now = new Date();
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => new Date(idea.submissionDate) >= weekAgo);
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => new Date(idea.submissionDate) >= monthAgo);
      } else if (timeRange === 'quarter') {
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => new Date(idea.submissionDate) >= quarterAgo);
      } else if (timeRange === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => new Date(idea.submissionDate) >= yearAgo);
      }
    }

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(idea => idea.department === departmentFilter);
    }

    return filtered;
  };

  // Helper để lọc theo ngày duyệt khen thưởng (rewardApprovalDate)
  // Dùng chung UI date filter, nhưng áp dụng trên rewardApprovalDate thay vì submissionDate
  const getFilteredIdeasByRewardDate = () => {
    // Chỉ quan tâm các ý tưởng có ngày duyệt khen thưởng
    let filtered = ideas.filter(idea => (idea as any).rewardApprovalDate);

    // Filter by custom date range trên rewardApprovalDate
    if (dateFrom && dateTo) {
      const fromMs = new Date(dateFrom).setHours(0, 0, 0, 0);
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(idea => {
        const rewardDate = (idea as any).rewardApprovalDate;
        if (!rewardDate) return false;
        const rewardMs = new Date(rewardDate).getTime();
        return rewardMs >= fromMs && rewardMs <= toMs;
      });
    } else if (dateFrom) {
      const fromMs = new Date(dateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter(idea => {
        const rewardDate = (idea as any).rewardApprovalDate;
        if (!rewardDate) return false;
        return new Date(rewardDate).getTime() >= fromMs;
      });
    } else if (dateTo) {
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(idea => {
        const rewardDate = (idea as any).rewardApprovalDate;
        if (!rewardDate) return false;
        return new Date(rewardDate).getTime() <= toMs;
      });
    } else {
      // Nếu không chọn khoảng ngày cụ thể, áp dụng timeRange lên rewardApprovalDate
      const now = new Date();
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => {
          const rewardDate = (idea as any).rewardApprovalDate;
          if (!rewardDate) return false;
          return new Date(rewardDate) >= weekAgo;
        });
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => {
          const rewardDate = (idea as any).rewardApprovalDate;
          if (!rewardDate) return false;
          return new Date(rewardDate) >= monthAgo;
        });
      } else if (timeRange === 'quarter') {
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => {
          const rewardDate = (idea as any).rewardApprovalDate;
          if (!rewardDate) return false;
          return new Date(rewardDate) >= quarterAgo;
        });
      } else if (timeRange === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(idea => {
          const rewardDate = (idea as any).rewardApprovalDate;
          if (!rewardDate) return false;
          return new Date(rewardDate) >= yearAgo;
        });
      }
    }

    // Filter by department (giống nhau)
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(idea => idea.department === departmentFilter);
    }

    return filtered;
  };

  const filteredIdeas = getFilteredIdeasBySubmissionDate();
  const rewardDateFilteredIdeas = getFilteredIdeasByRewardDate();

  // Comparison calculation functions
  // Các hàm dưới đây dùng cho phần so sánh (comparison) và các thẻ giá trị.
  // So sánh theo thời gian nộp (submissionDate) thay vì ngày duyệt khen thưởng.
  const getCurrentMonthData = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return ideas.filter(idea => {
      const d = new Date(idea.submissionDate);
      return d >= startOfMonth && d <= endOfMonth;
    });
  };

  const getPreviousMonthData = () => {
    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return ideas.filter(idea => {
      const d = new Date(idea.submissionDate);
      return d >= startOfPrevMonth && d <= endOfPrevMonth;
    });
  };

  const getCurrentYearData = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    return ideas.filter(idea => {
      const d = new Date(idea.submissionDate);
      return d >= startOfYear && d <= endOfYear;
    });
  };

  const getPreviousYearData = () => {
    const now = new Date();
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfPrevYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    return ideas.filter(idea => {
      const d = new Date(idea.submissionDate);
      return d >= startOfPrevYear && d <= endOfPrevYear;
    });
  };

  // Helper để lọc theo department nếu có
  const applyDepartmentFilter = (list: Idea[]) => {
    if (departmentFilter !== 'all') {
      return list.filter(idea => idea.department === departmentFilter);
    }
    return list;
  };

  // Helpers for period filtering based on selections
  // DÙNG submissionDate để phục vụ so sánh & giá trị
  // Áp dụng departmentFilter trước khi lọc theo thời gian
  const filterByYear = (list: Idea[], y: number) => {
    const filtered = applyDepartmentFilter(list);
    return filtered.filter(i => {
      const d = new Date(i.submissionDate);
      return d.getFullYear() === y;
    });
  };
  const filterByQuarter = (list: Idea[], y: number, q: number) => {
    const filtered = applyDepartmentFilter(list);
    return filtered.filter(i => {
      const d = new Date(i.submissionDate);
      const year = d.getFullYear();
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return year === y && quarter === q;
    });
  };
  const filterByMonth = (list: Idea[], y: number, m: number) => {
    const filtered = applyDepartmentFilter(list);
    return filtered.filter(i => {
      const d = new Date(i.submissionDate);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      return year === y && month === m;
    });
  };

  const calculateComparisonData = () => {
    if (comparisonType === 'month') {
      const current = filterByMonth(ideas, yearA, monthA);
      const previous = filterByMonth(ideas, yearB, monthB);
      return {
        current,
        previous,
        period: 'tháng',
        currentLabel: `Tháng ${monthA}/${yearA}`,
        previousLabel: `Tháng ${monthB}/${yearB}`
      };
    } else if (comparisonType === 'quarter') {
      const current = filterByQuarter(ideas, yearA, quarterA);
      const previous = filterByQuarter(ideas, yearB, quarterB);
      return {
        current,
        previous,
        period: 'quý',
        currentLabel: `Q${quarterA}/${yearA}`,
        previousLabel: `Q${quarterB}/${yearB}`
      };
    } else if (comparisonType === 'year') {
      const current = filterByYear(ideas, yearA);
      const previous = filterByYear(ideas, yearB);
      return {
        current,
        previous,
        period: 'năm',
        currentLabel: `Năm ${yearA}`,
        previousLabel: `Năm ${yearB}`
      };
    }
    return null;
  };

  const getComparisonStats = () => {
    const comparisonData = calculateComparisonData();
    if (!comparisonData) return null;

    const { current, previous, period, currentLabel, previousLabel } = comparisonData;

    // Tổng số ý tưởng trong kỳ (có rewardApprovalDate)
    const currentTotal = current.length;
    const previousTotal = previous.length;
    const totalChange = currentTotal - previousTotal;
    const totalChangePercent = previousTotal > 0 ? ((totalChange / previousTotal) * 100) : (currentTotal > 0 ? 100 : 0);

    // Implemented ideas: A3, Reward Approved, Rewarded, Failed (per requirement)
    const implementedStatuses: Array<'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'> = [
      'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'
    ];
    const currentImplemented = current.filter(i => implementedStatuses.includes((i as any).implementationStatus)).length;
    const previousImplemented = previous.filter(i => implementedStatuses.includes((i as any).implementationStatus)).length;
    const implementedChange = currentImplemented - previousImplemented;
    const implementedChangePercent = previousImplemented > 0 ? ((implementedChange / previousImplemented) * 100) : (currentImplemented > 0 ? 100 : 0);

    // Success rate: Phê duyệt khen thưởng / (Phê duyệt khen thưởng + Không đạt)
    const currentSuccessNumerator = current.filter(i => (i as any).implementationStatus === 'Phê duyệt khen thưởng').length;
    const currentFailCount = current.filter(i => (i as any).implementationStatus === 'Không đạt').length;
    const previousSuccessNumerator = previous.filter(i => (i as any).implementationStatus === 'Phê duyệt khen thưởng').length;
    const previousFailCount = previous.filter(i => (i as any).implementationStatus === 'Không đạt').length;
    const currentDenom = currentSuccessNumerator + currentFailCount;
    const previousDenom = previousSuccessNumerator + previousFailCount;
    const currentImplSuccessRate = currentDenom > 0 ? (currentSuccessNumerator / currentDenom) * 100 : 0;
    const previousImplSuccessRate = previousDenom > 0 ? (previousSuccessNumerator / previousDenom) * 100 : 0;
    const implSuccessRateChange = currentImplSuccessRate - previousImplSuccessRate;

    // Calculate benefit value and reward amount (chỉ tính các idea có giá trị)
    const currentBenefitValue = current.reduce((sum, idea) => {
      const value = Number((idea as any).benefitValue) || 0;
      return sum + value;
    }, 0);
    const previousBenefitValue = previous.reduce((sum, idea) => {
      const value = Number((idea as any).benefitValue) || 0;
      return sum + value;
    }, 0);
    const benefitValueChange = currentBenefitValue - previousBenefitValue;
    const benefitValueChangePercent = previousBenefitValue > 0 ? ((benefitValueChange / previousBenefitValue) * 100) : (currentBenefitValue > 0 ? 100 : 0);

    const currentRewardAmount = current.reduce((sum, idea) => {
      const value = Number((idea as any).rewardAmount) || 0;
      return sum + value;
    }, 0);
    const previousRewardAmount = previous.reduce((sum, idea) => {
      const value = Number((idea as any).rewardAmount) || 0;
      return sum + value;
    }, 0);
    const rewardAmountChange = currentRewardAmount - previousRewardAmount;
    const rewardAmountChangePercent = previousRewardAmount > 0 ? ((rewardAmountChange / previousRewardAmount) * 100) : (currentRewardAmount > 0 ? 100 : 0);

    return {
      currentLabel,
      previousLabel,
      period,
      total: {
        current: currentTotal,
        previous: previousTotal,
        change: totalChange,
        changePercent: totalChangePercent
      },
      implemented: {
        current: currentImplemented,
        previous: previousImplemented,
        change: implementedChange,
        changePercent: implementedChangePercent
      },
      implSuccessRate: {
        current: currentImplSuccessRate,
        previous: previousImplSuccessRate,
        change: implSuccessRateChange
      },
      benefitValue: {
        current: currentBenefitValue,
        previous: previousBenefitValue,
        change: benefitValueChange,
        changePercent: benefitValueChangePercent
      },
      rewardAmount: {
        current: currentRewardAmount,
        previous: previousRewardAmount,
        change: rewardAmountChange,
        changePercent: rewardAmountChangePercent
      }
    };
  };

  const handleComparisonTypeChange = (event: React.MouseEvent<HTMLElement>, newType: 'month' | 'quarter' | 'year' | 'none') => {
    if (newType !== null) {
      setComparisonType(newType);
      setShowComparison(newType !== 'none');
    }
  };

  // Helper: build date filter query string từ bộ lọc hiện tại
  const buildDateFilterQuery = (additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams(additionalParams || {});

    // Thêm departmentFilter nếu không phải 'all'
    if (departmentFilter && departmentFilter !== 'all') {
      params.set('department', departmentFilter);
    }

    // Nếu đang dùng custom date range, ưu tiên dùng
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    // Nếu chưa chọn custom date mà có timeRange, chuyển thành khoảng ngày tương ứng
    if (!dateFrom && !dateTo && timeRange !== 'all') {
      const today = new Date();
      let from: string | null = null;
      let to: string | null = formatLocalDate(today); // Sử dụng formatLocalDate để tránh timezone issues

      if (timeRange === 'week') {
        // 7 ngày qua: từ 7 ngày trước đến hôm nay
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        from = formatLocalDate(weekAgo);
      } else if (timeRange === 'month') {
        // 30 ngày qua: từ 30 ngày trước đến hôm nay
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        from = formatLocalDate(monthAgo);
      } else if (timeRange === 'quarter') {
        // 3 tháng qua: từ 90 ngày trước đến hôm nay
        const quarterAgo = new Date(today);
        quarterAgo.setDate(today.getDate() - 90);
        from = formatLocalDate(quarterAgo);
      } else if (timeRange === 'year') {
        // 1 năm qua: từ 365 ngày trước đến hôm nay
        const yearAgo = new Date(today);
        yearAgo.setDate(today.getDate() - 365);
        from = formatLocalDate(yearAgo);
      }

      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
    }

    return params.toString();
  };

  // Helper: build query string để điều hướng sang Admin, giữ nguyên logic lọc theo rewardApprovalDate
  const buildRewardFilterQueryForAdmin = () => {
    const additionalParams = {
      'implementationStatus': 'Đã khen thưởng',
      'filterType': 'reward'
    };
    return buildDateFilterQuery(additionalParams);
  };

  // Calculate statistics (updated per requirements)
  const totalIdeas = filteredIdeas.length;
  // 'approved' legacy status maps to TRIEN_KHAI in new enum
  const approvedForImplementation = filteredIdeas.filter(idea => {
    const status: any = idea.status;
    return status === 'approved' || status === IdeaStatus.TRIEN_KHAI;
  }).length; // Quyết định phê duyệt = Phê duyệt triển khai
  const deployingIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Đang triển khai').length; // Trạng thái triển khai = Đang triển khai
  const a3Ideas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Lập báo cáo A3').length; // Trạng thái triển khai = Lập báo cáo A3
  const rewardDecisionIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Phê duyệt khen thưởng').length; // Phê duyệt khen thưởng
  // Ý tưởng đã khen thưởng: lọc theo rewardApprovalDate (rewardDateFilteredIdeas) thay vì submissionDate (dùng cho success rate và chip hiển thị)
  const rewardedIdeas = rewardDateFilteredIdeas.filter(idea => (idea as any).implementationStatus === 'Đã khen thưởng').length; // Đã khen thưởng (lọc theo ngày duyệt khen thưởng)
  // Tổng giá trị làm lợi ước tính: tính tổng cột giá trị làm lợi (benefitValue)
  const totalBenefitValue = filteredIdeas.reduce((sum, idea) => {
    const value = Number((idea as any).benefitValue) || 0;
    return sum + value;
  }, 0);
  const a3SuccessIdeas = a3Ideas; // Lập báo cáo A3
  const waitingDeployIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Phản hồi phê duyệt').length; // Chờ triển khai
  // 'pending' legacy status maps to DE_NGHI_MOI in new enum
  const waitingApprovalIdeas = filteredIdeas.filter(idea => {
    const status: any = idea.status;
    return status === 'pending' || status === IdeaStatus.DE_NGHI_MOI;
  }).length; // Chờ phê duyệt (quyết định phê duyệt = chưa phê duyệt)
  const failedIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Không đạt').length;
  // Success rate per new definition: (A3 + Phê duyệt khen thưởng + Đã khen thưởng) / (A3 + Phê duyệt khen thưởng + Đã khen thưởng + Không đạt)
  const successNumerator = a3SuccessIdeas + rewardDecisionIdeas + rewardedIdeas;
  const successDenominator = successNumerator + failedIdeas;
  const newSuccessRate = successDenominator > 0 ? ((successNumerator / successDenominator) * 100).toFixed(1) : '0';

  // Reward statistics
  const waitingReward50k = filteredIdeas.filter(idea => {
    const rewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
    return rewardStatuses.includes(RewardStatus.CHO_KHEN_THUONG_50K);
  }).length;
  const rewarded50k = filteredIdeas.filter(idea => {
    const rewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
    return rewardStatuses.includes(RewardStatus.DA_KHEN_THUONG_50K);
  }).length;
  const waitingRewardKaizen = filteredIdeas.filter(idea => {
    const rewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
    return rewardStatuses.includes(RewardStatus.CHO_KHEN_THUONG_20);
  }).length;
  const rewardedKaizen = filteredIdeas.filter(idea => {
    const rewardStatuses: RewardStatus[] = (idea as any).rewardStatuses || [];
    return rewardStatuses.includes(RewardStatus.DA_KHEN_THUONG_20);
  }).length;

  // Implementation-based statistics
  const isImplemented = (status?: string) => status === 'Đang triển khai' || status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const implementedDeployed = (status?: string) => status === 'Đang triển khai' || status === 'Lập báo cáo A3';
  const isSuccessful = (status?: string) => status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const implementedCount = filteredIdeas.filter(idea => isImplemented((idea as any).implementationStatus)).length;
  const implementedCountDeployed = filteredIdeas.filter(idea => implementedDeployed((idea as any).implementationStatus)).length;
  const implementationSuccess = filteredIdeas.filter(idea => isSuccessful((idea as any).implementationStatus)).length;
  const implementationSuccessRate = newSuccessRate; // New success rate definition

  // Department statistics
  const departmentStats = filteredIdeas.reduce((acc, idea) => {
    acc[idea.department] = (acc[idea.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Chỉ giữ các phòng ban có ít nhất 2 ý tưởng
  const topDepartments = Object.entries(departmentStats)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // User ranking statistics
  const userStats = filteredIdeas.reduce((acc, idea) => {
    const userName = idea.fullName || 'Không xác định';
    if (!acc[userName]) {
      acc[userName] = {
        name: userName,
        total: 0,
        'Đề xuất mới': 0,
        'Xem xét': 0,
        'Phê duyệt': 0,
        'Phản hồi phê duyệt': 0,
        'Đang triển khai': 0,
        'Lập báo cáo A3': 0,
        'Phê duyệt khen thưởng': 0,
        'Đã khen thưởng': 0,
        'Không đạt': 0,
        department: idea.department
      };
    }
    acc[userName].total++;
    acc[userName][(idea as any).implementationStatus as keyof typeof acc[typeof userName]]++;
    return acc;
  }, {} as Record<string, { name: string; total: number; 'Đề xuất mới': number; 'Xem xét': number; 'Phê duyệt': number; 'Phản hồi phê duyệt': number; 'Đang triển khai': number; 'Lập báo cáo A3': number; 'Phê duyệt khen thưởng': number; 'Đã khen thưởng': number; 'Không đạt': number; department: string }>);
  // Chỉ giữ những người có ít nhất 2 ý tưởng
  const topUsers = Object.values(userStats)
    .filter(user => user.total > 1)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15); // Top 15 users

  // Monthly trend data (ALL ideas, not filtered by time - shows complete history)
  const monthlyData = ideas.reduce((acc, idea) => {
    const date = new Date(idea.submissionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        total: 0,
        'Đề xuất mới': 0,
        'Xem xét': 0,
        'Phê duyệt': 0,
        'Phản hồi phê duyệt': 0,
        'Đang triển khai': 0,
        'Lập báo cáo A3': 0,
        'Phê duyệt khen thưởng': 0,
        'Đã khen thưởng': 0,
        'Không đạt': 0
      };
    }
    acc[monthKey].total++;
    acc[monthKey][(idea as any).implementationStatus as keyof typeof acc[typeof monthKey]]++;
    return acc;
  }, {} as Record<string, {
    total: number;
    'Đề xuất mới': number;
    'Xem xét': number;
    'Phê duyệt': number;
    'Phản hồi phê duyệt': number;
    'Đang triển khai': number;
    'Lập báo cáo A3': number;
    'Phê duyệt khen thưởng': number;
    'Đã khen thưởng': number;
    'Không đạt': number
  }>);

  const monthlyLabels = Object.keys(monthlyData).sort();
  const monthlyTotals = monthlyLabels.map(label => monthlyData[label].total);
  const monthlyApproved = monthlyLabels.map(label => monthlyData[label]['Phê duyệt']);
  const monthlyRejected = monthlyLabels.map(label => monthlyData[label]['Không đạt']);
  const monthlyNoted = monthlyLabels.map(label => monthlyData[label]['Xem xét']);

  // Chart configurations - tính từ status (IdeaStatus enum) để khớp với AdminDashboard
  const countByStatus = (status: IdeaStatus) => {
    return filteredIdeas.filter(idea => {
      const ideaStatus: any = idea.status;
      // Handle backward compatibility: map old status values to new enum
      if (!Object.values(IdeaStatus).includes(ideaStatus as IdeaStatus)) {
        if (ideaStatus === 'pending' && status === IdeaStatus.DE_NGHI_MOI) return true;
        if (ideaStatus === 'rejected' && status === IdeaStatus.REJECTED) return true;
        if (ideaStatus === 'noted' && status === IdeaStatus.LUU_Y_TUONG) return true;
        if (ideaStatus === 'approved' && status === IdeaStatus.TRIEN_KHAI) return true;
        return false;
      }
      return ideaStatus === status;
    }).length;
  };

  // Lấy tất cả các IdeaStatus theo thứ tự
  const allStatuses = [
    IdeaStatus.DE_NGHI_MOI,
    IdeaStatus.XEM_XET,
    IdeaStatus.CHO_PHE_DUYET,
    IdeaStatus.TRIEN_KHAI,
    IdeaStatus.KHONG_PHU_HOP,
    IdeaStatus.LUU_Y_TUONG,
    IdeaStatus.BAO_CAO_A3,
    IdeaStatus.KHEN_THUONG,
    IdeaStatus.DONE,
    IdeaStatus.REJECTED
  ];

  const statusChartData = {
    labels: allStatuses.map(status => IdeaStatusLabels[status]),
    datasets: [
      {
        data: allStatuses.map(status => countByStatus(status)),
        backgroundColor: [
          '#2196F3', // Đề nghị mới - Blue
          '#FF9800', // Xem xét - Orange
          '#4CAF50', // Chờ phê duyệt - Green
          '#00BCD4', // Triển khai - Cyan
          '#F44336', // Không phù hợp - Red
          '#9C27B0', // Lưu ý tưởng - Purple
          '#795548', // Báo cáo A3 - Brown
          '#607D8B', // Khen thưởng - Grey
          '#2E7D32', // Hoàn thành - Dark Green
          '#D32F2F'  // Không thành công - Dark Red
        ],
        borderColor: [
          '#1976D2', // Đề nghị mới
          '#F57C00', // Xem xét
          '#2E7D32', // Chờ phê duyệt
          '#0097A7', // Triển khai
          '#D32F2F', // Không phù hợp
          '#7B1FA2', // Lưu ý tưởng
          '#5D4037', // Báo cáo A3
          '#455A64', // Khen thưởng
          '#1B5E20', // Hoàn thành
          '#B71C1C'  // Không thành công
        ],
        borderWidth: 2
      }
    ]
  };

  const departmentChartData = {
    labels: topDepartments.map(([dept]) => dept.length > 20 ? dept.substring(0, 20) + '...' : dept),
    datasets: [
      {
        label: 'Số lượng ý tưởng',
        data: topDepartments.map(([, count]) => count),
        backgroundColor: '#1976d2',
        borderColor: '#1565c0',
        borderWidth: 1
      }
    ]
  };

  const trendChartData = {
    labels: monthlyLabels.map(label => {
      const [year, month] = label.split('-');
      return `${month}/${year}`;
    }),
    datasets: [
      {
        label: 'Tổng số ý tưởng',
        data: monthlyTotals,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
        tension: 0.4
      },
      // {
      //   label: 'Đã khen thưởng',
      //   data: monthlyRewarded,
      //   borderColor: '#4CAF50',
      //   backgroundColor: 'rgba(76, 175, 80, 0.1)',
      //   fill: false,
      //   tension: 0.4
      // },
      // {
      //   label: 'Không khen thưởng',
      //   data: monthlyRejected,
      //   borderColor: '#F44336',
      //   backgroundColor: 'rgba(244, 67, 54, 0.1)',
      //   fill: false,
      //   tension: 0.4
      // }
    ]
  };

  // User ranking chart data
  const userRankingChartData = {
    labels: topUsers.map(user => user.name.length > 20 ? user.name.substring(0, 20) + '...' : user.name),
    datasets: [
      {
        label: 'Tổng số ý tưởng',
        data: topUsers.map(user => user.total),
        backgroundColor: '#1976d2',
        borderColor: '#1565c0',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const userRankingOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bar chart
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top 15 Người có nhiều ý tưởng nhất'
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        },
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.1)'
        }
      },
      y: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          align: 'start' as const,
          font: {
            family: 'monospace'
          }
        },
        grid: {
          display: false
        }
      }
    },
    layout: {
      padding: {
        left: 20,
        right: 20
      }
    },
    elements: {
      bar: {
        borderSkipped: false
      }
    }
  };

  // Refs for charts to detect clicked elements
  const departmentBarRef = useRef<any>(null);
  const statusDoughnutRef = useRef<any>(null);
  const trendLineRef = useRef<any>(null);

  // Comparison Card Component
  const ComparisonCard: React.FC<{
    title: string;
    currentValue: number;
    previousValue: number;
    change: number;
    changePercent: number;
    icon: React.ReactNode;
  }> = ({ title, currentValue, previousValue, change, changePercent, icon }) => {
    const isPositive = change >= 0;
    const isSignificant = Math.abs(changePercent) >= 5; // 5% threshold for significant change

    return (
      <Card sx={{
        p: 2,
        height: '100%',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        boxShadow: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', color: '#1976d2' }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
            {currentValue}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isPositive ? (
              <TrendingUpIcon sx={{ color: '#2e7d32', mr: 0.5 }} />
            ) : (
              <TrendingDownIcon sx={{ color: '#d32f2f', mr: 0.5 }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: isPositive ? '#2e7d32' : '#d32f2f',
                fontWeight: 'bold',
                fontSize: isSignificant ? '1rem' : '0.875rem'
              }}
            >
              {change > 0 ? '+' : ''}{change} ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          So với kỳ trước: {previousValue}
        </Typography>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Dashboard Thống kê Ý tưởng Cải tiến
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {!isViewOnly && (
                <Button
                  variant="outlined"
                  onClick={handleBackToAdmin}
                  sx={{ textTransform: 'none' }}
                >
                  Quay lại Admin
                </Button>
              )}
              <Button
                variant={showAdvanced ? "contained" : "outlined"}
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{ textTransform: 'none' }}
              >
                {showAdvanced ? 'Ẩn Thống kê Nâng cao' : 'Hiện Thống kê Nâng cao'}
              </Button>
              {!isViewOnly && (
                <>
                  <ReportGenerator
                    ideas={ideas}
                    timeRange={timeRange}
                    departmentFilter={departmentFilter}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleLogout}
                    sx={{ textTransform: 'none' }}
                  >
                    Đăng xuất
                  </Button>
                </>
              )}
            </Box>
          </Box>
          <Divider />

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Khoảng thời gian</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Khoảng thời gian"
                disabled={!!(dateFrom || dateTo)}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="week">7 ngày qua</MenuItem>
                <MenuItem value="month">30 ngày qua</MenuItem>
                <MenuItem value="quarter">3 tháng qua</MenuItem>
                <MenuItem value="year">1 năm qua</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Phòng ban</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                label="Phòng ban"
              >
                <MenuItem value="all">Tất cả phòng ban</MenuItem>
                {Array.from(new Set(ideas.map(i => i.department))).map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom Date Range Filter */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                Lọc theo ngày tùy chỉnh
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant={dateFrom && dateTo && dateFrom === dateTo && dateFrom === new Date().toISOString().split('T')[0] ? "contained" : "outlined"}
                  onClick={() => handleQuickDateFilter('today')}
                  sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                >
                  Hôm nay
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickDateFilter('week')}
                  sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                >
                  Tuần này
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickDateFilter('month')}
                  sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                >
                  Tháng này
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickDateFilter('quarter')}
                  sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                >
                  Quý này
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickDateFilter('year')}
                  sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                >
                  Năm nay
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={handleClearDateFilter}
                  sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                >
                  Xóa
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Từ ngày"
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                  helperText="Chọn ngày bắt đầu"
                />
                <TextField
                  label="Đến ngày"
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={handleDateToChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                  helperText="Chọn ngày kết thúc"
                  error={!isDateRangeValid()}
                />
              </Box>
            </Box>

            <ToggleButtonGroup
              value={comparisonType}
              exclusive
              onChange={handleComparisonTypeChange}
              size="small"
              sx={{
                border: '1px solid #1976d2',
                borderRadius: 1,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  px: 2,
                  py: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    }
                  }
                }
              }}
            >
              <ToggleButton value="none">
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Không so sánh
                </Typography>
              </ToggleButton>
              <ToggleButton value="month">
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  So sánh tháng
                </Typography>
              </ToggleButton>
              <ToggleButton value="quarter">
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  So sánh quý
                </Typography>
              </ToggleButton>
              <ToggleButton value="year">
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  So sánh năm
                </Typography>
              </ToggleButton>
            </ToggleButtonGroup>
            {showComparison && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {comparisonType === 'year' && (
                  <>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm A</InputLabel>
                      <Select label="Năm A" value={yearA} onChange={(e) => setYearA(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a, b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm B</InputLabel>
                      <Select label="Năm B" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a, b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}
                {comparisonType === 'quarter' && (
                  <>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm A</InputLabel>
                      <Select label="Năm A" value={yearA} onChange={(e) => setYearA(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a, b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Quý A</InputLabel>
                      <Select label="Quý A" value={quarterA} onChange={(e) => setQuarterA(Number(e.target.value))}>
                        {[1, 2, 3, 4].map(q => (<MenuItem key={q} value={q}>{`Q${q}`}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm B</InputLabel>
                      <Select label="Năm B" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a, b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Quý B</InputLabel>
                      <Select label="Quý B" value={quarterB} onChange={(e) => setQuarterB(Number(e.target.value))}>
                        {[1, 2, 3, 4].map(q => (<MenuItem key={q} value={q}>{`Q${q}`}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </>
                )}
                {comparisonType === 'month' && (
                  <>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm A</InputLabel>
                      <Select label="Năm A" value={yearA} onChange={(e) => setYearA(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a, b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Tháng A</InputLabel>
                      <Select label="Tháng A" value={monthA} onChange={(e) => setMonthA(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<MenuItem key={m} value={m}>{m}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm B</InputLabel>
                      <Select label="Năm B" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a, b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Tháng B</InputLabel>
                      <Select label="Tháng B" value={monthB} onChange={(e) => setMonthB(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<MenuItem key={m} value={m}>{m}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Date Filter Information */}
      {(dateFrom || dateTo) && (
        <Card elevation={2} sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                <strong>Bộ lọc ngày tháng đang áp dụng:</strong>
                {dateFrom ? ` Từ ${new Date(dateFrom).toLocaleDateString('vi-VN')}` : ' Từ đầu'}
                {dateTo ? ` đến ${new Date(dateTo).toLocaleDateString('vi-VN')}` : ' đến hiện tại'}
              </Typography>
              <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                Hiển thị {filteredIdeas.length} / {ideas.length} ý tưởng
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Comparison Section */}
      {showComparison && (() => {
        const stats = getComparisonStats();
        if (!stats) return null;

        return (
          <Card elevation={3} sx={{ mb: 4, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CompareArrowsIcon sx={{ color: 'white', mr: 1, fontSize: '2rem' }} />
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                  So sánh {stats.period}: {stats.currentLabel} vs {stats.previousLabel}
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <ComparisonCard
                    title="Tổng số ý tưởng"
                    currentValue={stats.total.current}
                    previousValue={stats.total.previous}
                    change={stats.total.change}
                    changePercent={stats.total.changePercent}
                    icon={<BarChartIcon sx={{ color: '#1976d2', fontSize: '1.5rem' }} />}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <ComparisonCard
                    title="Ý tưởng đã triển khai"
                    currentValue={stats.implemented.current}
                    previousValue={stats.implemented.previous}
                    change={stats.implemented.change}
                    changePercent={stats.implemented.changePercent}
                    icon={<TrendingUpIcon sx={{ color: '#2e7d32', fontSize: '1.5rem' }} />}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{
                    p: 2,
                    height: '100%',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    boxShadow: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TrendingUpIcon sx={{ color: '#1976d2', fontSize: '1.5rem' }} />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', color: '#1976d2' }}>
                        Tỷ lệ triển khai thành công
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {stats.implSuccessRate.current.toFixed(1)}%
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {stats.implSuccessRate.change >= 0 ? (
                          <TrendingUpIcon sx={{ color: '#2e7d32', mr: 0.5 }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: '#d32f2f', mr: 0.5 }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: stats.implSuccessRate.change >= 0 ? '#2e7d32' : '#d32f2f',
                            fontWeight: 'bold'
                          }}
                        >
                          {stats.implSuccessRate.change > 0 ? '+' : ''}{stats.implSuccessRate.change.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      So với kỳ trước: {stats.implSuccessRate.previous.toFixed(1)}%
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{
                    p: 2,
                    height: '100%',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    boxShadow: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TrendingUpIcon sx={{ color: '#FF9800', fontSize: '1.5rem' }} />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', color: '#1976d2' }}>
                        Giá trị làm lợi
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {(stats.benefitValue.current / 1000000).toFixed(1)}M
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {stats.benefitValue.change >= 0 ? (
                          <TrendingUpIcon sx={{ color: '#2e7d32', mr: 0.5 }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: '#d32f2f', mr: 0.5 }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: stats.benefitValue.change >= 0 ? '#2e7d32' : '#d32f2f',
                            fontWeight: 'bold'
                          }}
                        >
                          {stats.benefitValue.change > 0 ? '+' : ''}{(stats.benefitValue.change / 1000000).toFixed(1)}M
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      So với kỳ trước: {(stats.benefitValue.previous / 1000000).toFixed(1)}M VND
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Second row for reward amount */}
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{
                    p: 2,
                    height: '100%',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    boxShadow: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TrendingUpIcon sx={{ color: '#9C27B0', fontSize: '1.5rem' }} />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', color: '#1976d2' }}>
                        Tổng tiền thưởng
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {(stats.rewardAmount.current / 1000000).toFixed(1)}M
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {stats.rewardAmount.change >= 0 ? (
                          <TrendingUpIcon sx={{ color: '#2e7d32', mr: 0.5 }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: '#d32f2f', mr: 0.5 }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: stats.rewardAmount.change >= 0 ? '#2e7d32' : '#d32f2f',
                            fontWeight: 'bold'
                          }}
                        >
                          {stats.rewardAmount.change > 0 ? '+' : ''}{(stats.rewardAmount.change / 1000000).toFixed(1)}M
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      So với kỳ trước: {(stats.rewardAmount.previous / 1000000).toFixed(1)}M VND
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{
                    p: 2,
                    height: '100%',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    boxShadow: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TrendingUpIcon sx={{ color: '#607D8B', fontSize: '1.5rem' }} />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', color: '#1976d2' }}>
                        Tỷ lệ thay đổi tiền thưởng
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {stats.rewardAmount.changePercent.toFixed(1)}%
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {stats.rewardAmount.changePercent >= 0 ? (
                          <TrendingUpIcon sx={{ color: '#2e7d32', mr: 0.5 }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: '#d32f2f', mr: 0.5 }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: stats.rewardAmount.changePercent >= 0 ? '#2e7d32' : '#d32f2f',
                            fontWeight: 'bold'
                          }}
                        >
                          {stats.rewardAmount.changePercent > 0 ? '+' : ''}{stats.rewardAmount.changePercent.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      Thay đổi so với kỳ trước
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })()}

      {/* Statistics Cards (2 rows x 4 columns) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Tổng số ý tưởng */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery();
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>{totalIdeas}</Typography>
              <Typography variant="h6" color="text.secondary">Tổng số ý tưởng</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Tổng giá trị làm lợi ước tính */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery();
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent sx={{ overflow: 'hidden' }}>
              <Typography
                color="error"
                sx={{
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(1.2rem, 4vw, 2.5rem)',
                  lineHeight: 1.2,
                  maxWidth: '100%',
                  display: 'block'
                }}
              >
                {totalBenefitValue.toLocaleString('vi-VN')} đ
              </Typography>
              <Typography variant="h6" color="text.secondary">Tổng giá trị làm lợi ước tính</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Số ý tưởng chờ phê duyệt triển khai (implementationStatus=Phê duyệt) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{ textAlign: 'center', p: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5', transform: 'translateY(-2px)', boxShadow: 6 }, transition: 'all 0.2s' }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'status': IdeaStatus.DE_NGHI_MOI });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>{waitingApprovalIdeas}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng chờ phê duyệt </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Số ý tưởng được duyệt triển khai (status=approved) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'status': IdeaStatus.TRIEN_KHAI });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>{approvedForImplementation}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng được duyệt triển khai</Typography>
            </CardContent>
          </Card>
        </Grid>


        {/* Số ý tưởng chờ triển khai (implementationStatus=Phản hồi phê duyệt) */}{/* Số ý tưởng chờ triển khai (implementationStatus=Phản hồi phê duyệt) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{ textAlign: 'center', p: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5', transform: 'translateY(-2px)', boxShadow: 6 }, transition: 'all 0.2s' }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'implementationStatus': 'Phản hồi phê duyệt' });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>{waitingDeployIdeas}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng chờ triển khai</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Số ý tưởng đang triển khai (implementationStatus=Đang triển khai) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'implementationStatus': 'Đang triển khai' });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>{deployingIdeas}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng đang triển khai</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Số ý tưởng đang lập báo cáo A3 (implementationStatus=Lập báo cáo A3) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'implementationStatus': 'Lập báo cáo A3' });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>{a3Ideas}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng đang lập báo cáo A3</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Tỷ lệ triển khai thành công = Đã lập quyết định / (Đã lập quyết định + Không đạt) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}

          >
            <CardContent>
              <Typography variant="h3" color="success.dark" sx={{ fontWeight: 'bold' }}>{implementationSuccessRate}%</Typography>
              <Typography variant="h6" color="text.secondary">Tỷ lệ triển khai thành công</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reward Statistics Cards (Row 3: 4 columns) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Ý tưởng chờ thưởng 50k */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'rewardStatuses': String(RewardStatus.CHO_KHEN_THUONG_50K) });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>{waitingReward50k}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng chờ thưởng 50k</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Ý tưởng đã thưởng 50k */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'rewardStatuses': String(RewardStatus.DA_KHEN_THUONG_50K) });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>{rewarded50k}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng đã thưởng 50k</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Ý tưởng chờ thưởng kaizen */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'rewardStatuses': String(RewardStatus.CHO_KHEN_THUONG_20) });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>{waitingRewardKaizen}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng chờ thưởng kaizen</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Ý tưởng đã thưởng kaizen */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              textAlign: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const query = buildDateFilterQuery({ 'rewardStatuses': String(RewardStatus.DA_KHEN_THUONG_20) });
              handleNavigateToAdmin(query);
            }}
          >
            <CardContent>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>{rewardedKaizen}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng đã thưởng kaizen</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Bổ sung hai thẻ trạng thái trung gian */}
        {/* <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Trạng thái chờ triển khai / chờ phê duyệt triển khai
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card elevation={1} sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => {
                  const query = buildDateFilterQuery({ 'implementationStatus': 'Phản hồi phê duyệt' });
                  handleNavigateToAdmin(query);
                }}>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>{waitingDeployIdeas}</Typography>
                  <Typography variant="body1" color="text.secondary">Ý tưởng chờ triển khai</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={1} sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => {
                  const query = buildDateFilterQuery({ 'implementationStatus': 'Phê duyệt' });
                  handleNavigateToAdmin(query);
                }}>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>{waitingApprovalIdeas}</Typography>
                  <Typography variant="body1" color="text.secondary">Số ý tưởng chờ phê duyệt triển khai</Typography>
                </Card>
              </Grid>
            </Grid>
          </Card>
        </Grid> */}
        {/* Status Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Phân bố Trạng thái Ý tưởng
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Doughnut
                ref={statusDoughnutRef}
                data={statusChartData}
                options={doughnutOptions}
                onClick={(event) => {
                  const chart = statusDoughnutRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const selectedStatus = allStatuses[index];
                  if (selectedStatus) {
                    const query = buildDateFilterQuery({ 'status': selectedStatus });
                    handleNavigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Top Departments Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Top 10 Phòng ban có nhiều ý tưởng nhất
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar
                ref={departmentBarRef}
                data={departmentChartData}
                options={chartOptions}
                onClick={(event) => {
                  const chart = departmentBarRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = topDepartments[index]?.[0];
                  if (dept) {
                    const query = buildDateFilterQuery({ 'department': dept });
                    handleNavigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Monthly Trend Chart */}
        <Grid item xs={12}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Xu hướng Ý tưởng theo Tháng
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Line
                ref={trendLineRef}
                data={trendChartData}
                options={chartOptions}
                onClick={(event) => {
                  const chart = trendLineRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const monthLabel = monthlyLabels[index];
                  if (monthLabel) {
                    const [year, month] = monthLabel.split('-');
                    const startDate = `${year}-${month}-01`;
                    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
                    const query = buildDateFilterQuery({
                      'filterType': 'dateRange',
                      'dateFrom': startDate,
                      'dateTo': endDate
                    });
                    handleNavigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* User Ranking Chart */}
        {/* <Grid item xs={12}>
          <Card elevation={3} sx={{ p: 3, height: 500 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Xếp hạng Người có nhiều ý tưởng nhất
            </Typography>
            <Box sx={{ height: 400, mt: 2 }}>
              <Bar data={userRankingChartData} options={userRankingOptions} />
            </Box>
          </Card>
        </Grid> */}
      </Grid>

      {/* Additional Statistics */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Thống kê Chi tiết
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Tổng số ý tưởng:</Typography>
                <Chip label={totalIdeas} color="primary" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Đã khen thưởng:</Typography>
                <Chip label={rewardedIdeas} color="success" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Chưa xem xét:</Typography>
                <Chip label={pendingIdeas} color="warning" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Không khen thưởng:</Typography>
                <Chip label={rejectedIdeas} color="error" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Tỷ lệ khen thưởng:</Typography>
                <Chip label={`${rewardRate}%`} color="info" />
              </Box>
            </Box>
          </Card>
        </Grid> */}

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Top Phòng ban
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {topDepartments.slice(0, 10).map(([dept, count], index) => (
                <Box
                  key={dept}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                  onClick={() => {
                    const query = buildDateFilterQuery({ 'department': dept });
                    handleNavigateToAdmin(query);
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1, mr: 1 }}>
                    {index + 1}. {dept.length > 30 ? dept.substring(0, 30) + '...' : dept}
                  </Typography>
                  <Chip label={count} size="small" color="primary" />
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Top 10 Người có nhiều ý tưởng nhất
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 470, overflowY: 'auto' }}>
              {topUsers.slice(0, 10).map((user, index) => (
                <Box
                  key={user.name}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: index < 3 ? '#f5f5f5' : 'transparent',
                    border: index < 3 ? '1px solid #e0e0e0' : 'none',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: index < 3 ? '#eeeeee' : '#f5f5f5'
                    }
                  }}
                  onClick={() => {
                    const query = buildDateFilterQuery({ 'fullName': user.name });
                    handleNavigateToAdmin(query);
                  }}
                >
                  <Box sx={{ flex: 1, mr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>
                      {index + 1}. {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.department}
                    </Typography>
                  </Box>
                  <Chip label={user.total} size="small" color="primary" />
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Advanced Statistics */}
      {showAdvanced && (
        <Box sx={{ mt: 4 }}>
          <AdvancedStatistics
            ideas={ideas}
            timeRange={timeRange}
            departmentFilter={departmentFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            isViewOnly={isViewOnly}
          />
        </Box>
      )}

      {/* Snackbar for login message */}
      {/* Snackbar này hiện không còn dùng để chặn vào Admin khi ở viewOnly,
          nên có thể giữ lại cho mục đích thông báo khác nếu cần */}
    </Container>
  );
};

export default StatisticsDashboard;
