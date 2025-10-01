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
  TextField
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
import axios from 'axios';
import api from '../api/config';
import { Idea } from '../types';
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

const StatisticsDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const currentQuarterInit = Math.floor((now.getMonth()) / 3) + 1; // 1-4
  const [yearA, setYearA] = useState<number>(currentYearInit);
  const [yearB, setYearB] = useState<number>(currentYearInit - 1);
  const [quarterA, setQuarterA] = useState<number>(currentQuarterInit);
  const [quarterB, setQuarterB] = useState<number>(currentQuarterInit === 1 ? 4 : currentQuarterInit - 1);
  const [monthA, setMonthA] = useState<number>(currentMonthInit);
  const [monthB, setMonthB] = useState<number>(currentMonthInit === 1 ? 12 : currentMonthInit - 1);

  const fetchIdeas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('https://idea-managment.onrender.com/api/ideas', {
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
        setError('Không thể tải dữ liệu thống kê');
      }
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleBackToAdmin = () => {
    navigate('/admin');
  };

  const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(event.target.value);
  };

  const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(event.target.value);
  };

  const handleQuickDateFilter = (type: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'today':
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setDateFrom(weekStart.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(monthStart.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        setDateFrom(quarterStart.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setDateFrom(yearStart.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
    }
  };

  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const isDateRangeValid = () => {
    if (!dateFrom || !dateTo) return true;
    return new Date(dateFrom) <= new Date(dateTo);
  };

  // Filter data based on time range, department, and custom date range
  const getFilteredIdeas = () => {
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

  const filteredIdeas = getFilteredIdeas();

  // Comparison calculation functions
  const getCurrentMonthData = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return ideas.filter(idea => {
      const submissionDate = new Date(idea.submissionDate);
      return submissionDate >= startOfMonth && submissionDate <= endOfMonth;
    });
  };

  const getPreviousMonthData = () => {
    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    return ideas.filter(idea => {
      const submissionDate = new Date(idea.submissionDate);
      return submissionDate >= startOfPrevMonth && submissionDate <= endOfPrevMonth;
    });
  };

  const getCurrentYearData = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return ideas.filter(idea => {
      const submissionDate = new Date(idea.submissionDate);
      return submissionDate >= startOfYear && submissionDate <= endOfYear;
    });
  };

  const getPreviousYearData = () => {
    const now = new Date();
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfPrevYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    
    return ideas.filter(idea => {
      const submissionDate = new Date(idea.submissionDate);
      return submissionDate >= startOfPrevYear && submissionDate <= endOfPrevYear;
    });
  };

  // Helpers for period filtering based on selections
  const filterByYear = (list: Idea[], y: number) => list.filter(i => {
    const d = new Date(i.submissionDate);
    return d.getFullYear() === y;
  });
  const filterByQuarter = (list: Idea[], y: number, q: number) => list.filter(i => {
    const d = new Date(i.submissionDate);
    const year = d.getFullYear();
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    return year === y && quarter === q;
  });
  const filterByMonth = (list: Idea[], y: number, m: number) => list.filter(i => {
    const d = new Date(i.submissionDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return year === y && month === m;
  });

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

    const currentTotal = current.length;
    const previousTotal = previous.length;
    const totalChange = currentTotal - previousTotal;
    const totalChangePercent = previousTotal > 0 ? ((totalChange / previousTotal) * 100) : 0;

    // Implemented ideas: A3, Reward Approved, Rewarded, Failed (per requirement)
    const implementedStatuses: Array<'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt'> = [
      'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'
    ];
    const currentImplemented = current.filter(i => implementedStatuses.includes((i as any).implementationStatus)).length;
    const previousImplemented = previous.filter(i => implementedStatuses.includes((i as any).implementationStatus)).length;
    const implementedChange = currentImplemented - previousImplemented;
    const implementedChangePercent = previousImplemented > 0 ? ((implementedChange / previousImplemented) * 100) : 0;

    // Success rate: Reward decision / (Reward decision + Failed)
    const currentSuccessNumerator = current.filter(i => (i as any).implementationStatus === 'Phê duyệt khen thưởng').length;
    const currentFailCount = current.filter(i => (i as any).implementationStatus === 'Không đạt').length;
    const previousSuccessNumerator = previous.filter(i => (i as any).implementationStatus === 'Phê duyệt khen thưởng').length;
    const previousFailCount = previous.filter(i => (i as any).implementationStatus === 'Không đạt').length;
    const currentDenom = currentSuccessNumerator + currentFailCount;
    const previousDenom = previousSuccessNumerator + previousFailCount;
    const currentImplSuccessRate = currentDenom > 0 ? (currentSuccessNumerator / currentDenom) * 100 : 0;
    const previousImplSuccessRate = previousDenom > 0 ? (previousSuccessNumerator / previousDenom) * 100 : 0;
    const implSuccessRateChange = currentImplSuccessRate - previousImplSuccessRate;

    // Calculate benefit value and reward amount
    const currentBenefitValue = current.reduce((sum, idea) => sum + ((idea as any).benefitValue || 0), 0);
    const previousBenefitValue = previous.reduce((sum, idea) => sum + ((idea as any).benefitValue || 0), 0);
    const benefitValueChange = currentBenefitValue - previousBenefitValue;
    const benefitValueChangePercent = previousBenefitValue > 0 ? ((benefitValueChange / previousBenefitValue) * 100) : 0;

    const currentRewardAmount = current.reduce((sum, idea) => sum + ((idea as any).rewardAmount || 0), 0);
    const previousRewardAmount = previous.reduce((sum, idea) => sum + ((idea as any).rewardAmount || 0), 0);
    const rewardAmountChange = currentRewardAmount - previousRewardAmount;
    const rewardAmountChangePercent = previousRewardAmount > 0 ? ((rewardAmountChange / previousRewardAmount) * 100) : 0;

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

  // Calculate statistics (updated per requirements)
  const totalIdeas = filteredIdeas.length;
  const approvedForImplementation = filteredIdeas.filter(idea => idea.status === 'approved').length; // Quyết định phê duyệt = Phê duyệt triển khai
  const deployingIdeas = filteredIdeas.filter(idea => idea.implementationStatus === 'Đang triển khai').length; // Trạng thái triển khai = Đang triển khai
  const a3Ideas = filteredIdeas.filter(idea => idea.implementationStatus === 'Lập báo cáo A3').length; // Trạng thái triển khai = Lập báo cáo A3
  const rewardDecisionIdeas = filteredIdeas.filter(idea => idea.implementationStatus === 'Phê duyệt khen thưởng').length; // Phê duyệt khen thưởng
  const rewardedIdeas = filteredIdeas.filter(idea => idea.implementationStatus === 'Đã khen thưởng').length; // Đã khen thưởng
  const a3SuccessIdeas = a3Ideas; // Lập báo cáo A3
  const waitingDeployIdeas = filteredIdeas.filter(idea => idea.implementationStatus === 'Phản hồi phê duyệt').length; // Chờ triển khai
  const waitingApprovalIdeas = filteredIdeas.filter(idea => idea.status === 'pending').length; // Chờ phê duyệt (quyết định phê duyệt = chưa phê duyệt)
  const failedIdeas = filteredIdeas.filter(idea => idea.implementationStatus === 'Không đạt').length;
  // Success rate per new definition: (A3 + Phê duyệt khen thưởng + Đã khen thưởng) / (A3 + Phê duyệt khen thưởng + Đã khen thưởng + Không đạt)
  const successNumerator = a3SuccessIdeas + rewardDecisionIdeas + rewardedIdeas;
  const successDenominator = successNumerator + failedIdeas;
  const newSuccessRate = successDenominator > 0 ? ((successNumerator / successDenominator) * 100).toFixed(1) : '0';

  // Implementation-based statistics
  const isImplemented = (status?: string) => status === 'Đang triển khai' || status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const implementedDeployed = (status?: string) => status === 'Đang triển khai' || status === 'Lập báo cáo A3';
  const isSuccessful = (status?: string) => status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const implementedCount = filteredIdeas.filter(idea => isImplemented(idea.implementationStatus)).length;
  const implementedCountDeployed = filteredIdeas.filter(idea => implementedDeployed(idea.implementationStatus)).length;
  const implementationSuccess = filteredIdeas.filter(idea => isSuccessful(idea.implementationStatus)).length;
  const implementationSuccessRate = newSuccessRate; // New success rate definition

  // Department statistics
  const departmentStats = filteredIdeas.reduce((acc, idea) => {
    acc[idea.department] = (acc[idea.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDepartments = Object.entries(departmentStats)
    .sort(([,a], [,b]) => b - a)
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
    acc[userName][idea.implementationStatus as keyof typeof acc[typeof userName]]++;
    return acc;
  }, {} as Record<string, { name: string; total: number; 'Đề xuất mới': number; 'Xem xét': number; 'Phê duyệt': number; 'Phản hồi phê duyệt': number; 'Đang triển khai': number; 'Lập báo cáo A3': number; 'Phê duyệt khen thưởng': number; 'Đã khen thưởng': number; 'Không đạt': number; department: string }>);

  const topUsers = Object.values(userStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15); // Top 15 users

  // Monthly trend data
  const monthlyData = filteredIdeas.reduce((acc, idea) => {
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
    acc[monthKey][idea.implementationStatus as keyof typeof acc[typeof monthKey]]++;
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

  // Chart configurations
  const countByImplementationStatus = (status: 'Đề xuất mới' | 'Xem xét' | 'Phê duyệt' | 'Phản hồi phê duyệt' | 'Đang triển khai' | 'Lập báo cáo A3' | 'Phê duyệt khen thưởng' | 'Đã khen thưởng' | 'Không đạt') =>
    filteredIdeas.filter(i => i.implementationStatus === status).length;

  const statusChartData = {
    labels: ['Đề xuất mới', 'Xem xét', 'Phê duyệt', 'Phản hồi phê duyệt', 'Đang triển khai', 'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'],
    datasets: [
      {
        data: [
          countByImplementationStatus('Đề xuất mới'),
          countByImplementationStatus('Xem xét'),
          countByImplementationStatus('Phê duyệt'),
          countByImplementationStatus('Phản hồi phê duyệt'),
          deployingIdeas,
          a3Ideas,
          rewardDecisionIdeas,
          countByImplementationStatus('Đã khen thưởng'),
          failedIdeas
        ],
        backgroundColor: [
          '#2196F3',
          '#FF9800',
          '#4CAF50',
          '#9C27B0',
          '#00BCD4',
          '#795548',
          '#607D8B',
          '#2E7D32',
          '#F44336'
        ],
        borderColor: [
          '#1976D2',
          '#F57C00',
          '#2E7D32',
          '#7B1FA2',
          '#0097A7',
          '#5D4037',
          '#455A64',
          '#1B5E20',
          '#D32F2F'
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
              <Button
                variant="outlined"
                onClick={handleBackToAdmin}
                sx={{ textTransform: 'none' }}
              >
                Quay lại Admin
              </Button>
              <Button
                variant={showAdvanced ? "contained" : "outlined"}
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{ textTransform: 'none' }}
              >
                {showAdvanced ? 'Ẩn Thống kê Nâng cao' : 'Hiện Thống kê Nâng cao'}
              </Button>
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
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a,b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm B</InputLabel>
                      <Select label="Năm B" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a,b) => a - b).map(y => (
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
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a,b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Quý A</InputLabel>
                      <Select label="Quý A" value={quarterA} onChange={(e) => setQuarterA(Number(e.target.value))}>
                        {[1,2,3,4].map(q => (<MenuItem key={q} value={q}>{`Q${q}`}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm B</InputLabel>
                      <Select label="Năm B" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a,b) => a - b).map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Quý B</InputLabel>
                      <Select label="Quý B" value={quarterB} onChange={(e) => setQuarterB(Number(e.target.value))}>
                        {[1,2,3,4].map(q => (<MenuItem key={q} value={q}>{`Q${q}`}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </>
                )}
                {comparisonType === 'month' && (
                  <>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Năm A</InputLabel>
                      <Select label="Năm A" value={yearA} onChange={(e) => setYearA(Number(e.target.value))}>
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a,b) => a - b).map(y => (
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
                        {Array.from(new Set(ideas.map(i => new Date(i.submissionDate).getFullYear()))).sort((a,b) => a - b).map(y => (
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
            onClick={() => navigate('/admin')}
          >
            <CardContent>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>{totalIdeas}</Typography>
              <Typography variant="h6" color="text.secondary">Tổng số ý tưởng</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Số ý tưởng chờ phê duyệt triển khai (implementationStatus=Phê duyệt) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={3} 
            sx={{ textAlign: 'center', p: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5', transform: 'translateY(-2px)', boxShadow: 6 }, transition: 'all 0.2s' }}
            onClick={() => navigate('/admin?status=pending')}
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
            onClick={() => navigate('/admin?status=approved')}
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
            onClick={() => navigate('/admin?implementationStatus=Phản hồi phê duyệt')}
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
            onClick={() => navigate('/admin?implementationStatus=Đang triển khai')}
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
            onClick={() => navigate('/admin?implementationStatus=Lập báo cáo A3')}
          >
            <CardContent>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>{a3Ideas}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng đang lập báo cáo A3</Typography>
            </CardContent>
          </Card>
        </Grid>


        {/* Số ý tưởng đã khen thưởng (implementationStatus=Đã khen thưởng) */}
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
            onClick={() => navigate('/admin?implementationStatus=Đã khen thưởng')}
          >
            <CardContent>
              <Typography variant="h3" color="secondary" sx={{ fontWeight: 'bold' }}>{rewardedIdeas}</Typography>
              <Typography variant="h6" color="text.secondary">Ý tưởng đã khen thưởng</Typography>
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
                <Card elevation={1} sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/admin?implementationStatus=Phản hồi phê duyệt')}>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>{waitingDeployIdeas}</Typography>
                  <Typography variant="body1" color="text.secondary">Ý tưởng chờ triển khai</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={1} sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/admin?implementationStatus=Phê duyệt')}>
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
                  const statusMap = ['Đề xuất mới', 'Xem xét', 'Phê duyệt', 'Phản hồi phê duyệt', 'Đang triển khai', 'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'];
                  const status = statusMap[index];
                  if (status) {
                    navigate(`/admin?status=${encodeURIComponent(status)}`);
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
                    navigate(`/admin?department=${encodeURIComponent(dept)}`);
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
                    navigate(`/admin?dateFrom=${startDate}&dateTo=${endDate}`);
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
                  onClick={() => navigate(`/admin?department=${encodeURIComponent(dept)}`)}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflowY: 'auto' }}>
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
                  onClick={() => navigate(`/admin?fullName=${encodeURIComponent(user.name)}`)}
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
          />
        </Box>
      )}
    </Container>
  );
};

export default StatisticsDashboard;
