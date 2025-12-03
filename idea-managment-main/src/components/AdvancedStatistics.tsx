import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  TableSortLabel,
  Button
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
import { Bar, Doughnut, Line, Pie, getElementAtEvent } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { Idea } from '../types';

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

interface AdvancedStatisticsProps {
  ideas: Idea[];
  timeRange: string;
  departmentFilter: string;
  dateFrom?: string;
  dateTo?: string;
  isViewOnly?: boolean; // Thêm prop để biết có phải chế độ chỉ xem không
}

const AdvancedStatistics: React.FC<AdvancedStatisticsProps> = ({ 
  ideas, 
  timeRange, 
  departmentFilter,
  dateFrom,
  dateTo,
  isViewOnly = false
}) => {
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState('ideas');

  // Helper function để điều hướng sang admin hoặc admin-view tùy theo isViewOnly
  const navigateToAdmin = (query?: string) => {
    const basePath = isViewOnly ? '/admin-view' : '/admin';
    navigate(`${basePath}${query ? `?${query}` : ''}`);
  };

  // Helper function to build query string with date filters, department, và timeRange
  const buildQuery = (additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    
    // Thêm dateFrom và dateTo nếu có
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (dateFrom || dateTo) params.append('filterType', 'dateRange');
    
    // Thêm departmentFilter nếu không phải 'all'
    if (departmentFilter && departmentFilter !== 'all') {
      params.append('department', departmentFilter);
    }
    
    // Thêm timeRange nếu không có dateFrom/dateTo và không phải 'all'
    if (!dateFrom && !dateTo && timeRange && timeRange !== 'all') {
      // Chuyển timeRange thành khoảng ngày tương ứng
      const today = new Date();
      let from: string | null = null;
      const to = today.toISOString().split('T')[0];

      if (timeRange === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        from = weekStart.toISOString().split('T')[0];
      } else if (timeRange === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        from = monthStart.toISOString().split('T')[0];
      } else if (timeRange === 'quarter') {
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        from = quarterStart.toISOString().split('T')[0];
      } else if (timeRange === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        from = yearStart.toISOString().split('T')[0];
      }

      if (from) params.append('dateFrom', from);
      params.append('dateTo', to);
    }
    
    // Thêm các tham số bổ sung
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
    
    return params.toString();
  };
  
  // Refs for charts to detect clicked elements
  const monthlyCountBarRef = useRef<any>(null);
  const departmentTotalCountRef = useRef<any>(null);
  const departmentBenefitRef = useRef<any>(null);
  const departmentRewardRef = useRef<any>(null);
  const userRewardRef = useRef<any>(null);
  const monthlyRewardRef = useRef<any>(null);
  const departmentPerformanceRef = useRef<any>(null);
  const monthlySuccessRateRef = useRef<any>(null);
  const departmentApprovalRateRef = useRef<any>(null);
  const departmentImplementedPerApprovedRef = useRef<any>(null);
  const departmentIdeaShareRef = useRef<any>(null);

  // Filter data based on time range and department
  const getFilteredIdeas = () => {
    let filtered = [...ideas];

    // Filter by custom date range first (if provided)
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(idea => {
        const ideaDate = new Date(idea.submissionDate);
        return ideaDate >= from && ideaDate <= to;
      });
    } else {
      // Filter by time range
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

  // Calculate advanced statistics
  const totalIdeas = filteredIdeas.length;
  const newIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Đề xuất mới').length;
  const reviewingIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Xem xét').length;
  const approvedIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Phê duyệt').length;
  const feedbackIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Phản hồi phê duyệt').length;
  const implementingIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Đang triển khai').length;
  const a3Ideas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Lập báo cáo A3').length;
  const rewardApprovedIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Phê duyệt khen thưởng').length;
  const rewardedIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Đã khen thưởng').length;
  const failedIdeas = filteredIdeas.filter(idea => (idea as any).implementationStatus === 'Không đạt').length;

  // Helpers for implementation status (defined early for reuse)
  const isImplemented = (status?: string) =>  status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng' || status === 'Không đạt';
  const isSuccessful = (status?: string) => status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const isImplementedFinal = (status?: string) => status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng' || status === 'Không đạt';
  const isDeploying = (status?: string) => status === 'Đang triển khai';

  // Department performance analysis (quality-focused) - based on ALL ideas (not filtered by time)
  const departmentPerformance = ideas.reduce((acc, idea) => {
    const dept = idea.department || 'Khác';
    if (!acc[dept]) {
      acc[dept] = {
        total: 0,
        implemented: 0,
        successful: 0,
        successRate: 0
      } as any;
    }
    acc[dept].total++;
    if (isImplemented((idea as any).implementationStatus)) acc[dept].implemented++;
    if (isSuccessful((idea as any).implementationStatus)) acc[dept].successful++;
    return acc;
  }, {} as Record<string, { total: number; implemented: number; successful: number; successRate: number }>);

  // Calculate implementation success rates
  Object.keys(departmentPerformance).forEach(dept => {
    const deptData = departmentPerformance[dept];
    deptData.successRate = deptData.total > 0 ? (deptData.successful / deptData.total) * 100 : 0;
  });

  // Sort departments by performance
  const sortedDepartments = Object.entries(departmentPerformance)
    .sort(([,a], [,b]) => b.successRate - a.successRate);

  // Weekly trend data
  const weeklyData = filteredIdeas.reduce((acc, idea) => {
    const date = new Date(idea.submissionDate);
    const weekKey = `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`;
    if (!acc[weekKey]) {
      acc[weekKey] = { 
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
    acc[weekKey].total++;
    acc[weekKey][(idea as any).implementationStatus as keyof typeof acc[typeof weekKey]]++;
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

  const weeklyLabels = Object.keys(weeklyData).sort();
  const weeklyTotals = weeklyLabels.map(label => weeklyData[label].total);

  // Monthly implementation success comparison
  const monthlyPerformance = filteredIdeas.reduce((acc, idea) => {
    const date = new Date(idea.submissionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = { successful: 0, failed: 0 } as any;
    }
    if (isSuccessful((idea as any).implementationStatus)) acc[monthKey].successful++;
    if ((idea as any).implementationStatus === 'Không đạt') acc[monthKey].failed++;
    return acc;
  }, {} as Record<string, { successful: number; failed: number }>);

  const monthlyLabels = Object.keys(monthlyPerformance).sort();
  const monthlySuccessRates = monthlyLabels.map(label => {
    const data = monthlyPerformance[label];
    const numerator = data.successful;
    const denominator = data.successful + data.failed;
    return denominator > 0 ? (numerator / denominator) * 100 : 0;
  });

  // Derived implementation aggregates for rankings and rates (using ALL ideas, not filtered by time)
  type ImplStats = { total: number; approved: number; deploying: number; implemented: number; implementedFinal: number; successful: number };

  const deptImplStats: Record<string, ImplStats> = ideas.reduce((acc, idea) => {
    const key = idea.department || 'Khác';
    if (!acc[key]) acc[key] = { total: 0, approved: 0, deploying: 0, implemented: 0, implementedFinal: 0, successful: 0 } as ImplStats;
    acc[key].total += 1;
    if (idea.status === 'approved') acc[key].approved += 1;
    if (isDeploying((idea as any).implementationStatus)) acc[key].deploying += 1;
    if (isImplemented((idea as any).implementationStatus)) acc[key].implemented += 1;
    if (isImplementedFinal((idea as any).implementationStatus)) acc[key].implementedFinal += 1;
    if (isSuccessful((idea as any).implementationStatus)) acc[key].successful += 1;
    return acc;
  }, {} as Record<string, ImplStats>);

  const userImplStats: Record<string, ImplStats> = filteredIdeas.reduce((acc, idea) => {
    const key = idea.fullName || 'Không rõ';
    if (!acc[key]) acc[key] = { total: 0, approved: 0, deploying: 0, implemented: 0, implementedFinal: 0, successful: 0 } as ImplStats;
    acc[key].total += 1;
    if (idea.status === 'approved') acc[key].approved += 1;
    if (isDeploying((idea as any).implementationStatus)) acc[key].deploying += 1;
    if (isImplemented((idea as any).implementationStatus)) acc[key].implemented += 1;
    if (isImplementedFinal((idea as any).implementationStatus)) acc[key].implementedFinal += 1;
    if (isSuccessful((idea as any).implementationStatus)) acc[key].successful += 1;
    return acc;
  }, {} as Record<string, ImplStats>);

  // Department implementation stats for ranking table (using filtered ideas - affected by time filter)
  const deptImplStatsFiltered: Record<string, ImplStats> = filteredIdeas.reduce((acc, idea) => {
    const key = idea.department || 'Khác';
    if (!acc[key]) acc[key] = { total: 0, approved: 0, deploying: 0, implemented: 0, implementedFinal: 0, successful: 0 } as ImplStats;
    acc[key].total += 1;
    if (idea.status === 'approved') acc[key].approved += 1;
    if (isDeploying((idea as any).implementationStatus)) acc[key].deploying += 1;
    if (isImplemented((idea as any).implementationStatus)) acc[key].implemented += 1;
    if (isImplementedFinal((idea as any).implementationStatus)) acc[key].implementedFinal += 1;
    if (isSuccessful((idea as any).implementationStatus)) acc[key].successful += 1;
    return acc;
  }, {} as Record<string, ImplStats>);

  const topDeptImpl: Array<[string, ImplStats]> = (Object.entries(deptImplStats) as Array<[string, ImplStats]>)
    .sort(([,a],[,b]) => b.implementedFinal - a.implementedFinal)
    .slice(0, 10);
  // Removed topUserImpl; sorting and slicing handled dynamically in render

  // Chart configurations (Quality section)
  // 1) Department Approval Rate = approved / total (sorted by rate desc)
  const departmentsForApprovalRate = (Object.entries(deptImplStats) as Array<[string, ImplStats]>)
    .sort(([,a],[,b]) => {
      const rateA = (a.total || 0) > 0 ? a.approved / a.total : 0;
      const rateB = (b.total || 0) > 0 ? b.approved / b.total : 0;
      return rateB - rateA; // desc by rate
    })
    .slice(0, 8);
  const departmentApprovalRateData = {
    labels: departmentsForApprovalRate.map(([dept]) => 
      dept.length > 15 ? dept.substring(0, 15) + '...' : dept
    ),
    datasets: [
      {
        label: 'Tỷ lệ ý tưởng được triển khai (%)',
        data: departmentsForApprovalRate.map(([, d]) => {
          const total = (d as any).total || 0;
          const approved = (d as any).approved || 0;
          return total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
        }),
        backgroundColor: '#1976d2',
        borderColor: '#1565c0',
        borderWidth: 1
      }
    ]
  };

  // 2) Department Implemented per Approved Rate = implementedFinal / approved (sorted by rate desc)
  const departmentsForImplPerApproved = (Object.entries(deptImplStats) as Array<[string, ImplStats]>)
    .sort(([,a],[,b]) => {
      const rateA = (a.approved || 0) > 0 ? a.implementedFinal / a.approved : 0;
      const rateB = (b.approved || 0) > 0 ? b.implementedFinal / b.approved : 0;
      return rateB - rateA; // desc by rate
    })
    .slice(0, 8);
  const departmentImplementedPerApprovedRateData = {
    labels: departmentsForImplPerApproved.map(([dept]) => 
      dept.length > 15 ? dept.substring(0, 15) + '...' : dept
    ),
    datasets: [
      {
        label: 'Tỷ lệ ý tưởng đang triển khai (%)',
        data: departmentsForImplPerApproved.map(([, d]) => {
          const approved = (d as any).approved || 0;
          const implementedFinal = (d as any).implementedFinal || 0;
          return approved > 0 ? ((implementedFinal / approved) * 100).toFixed(1) : '0.0';
        }),
        backgroundColor: '#43A047',
        borderColor: '#2E7D32',
        borderWidth: 1
      }
    ]
  };

  // Department total counts (quantity-focused) - using FILTERED ideas (affected by time filter)
  const departmentPerformanceFiltered = filteredIdeas.reduce((acc, idea) => {
    const dept = idea.department || 'Khác';
    if (!acc[dept]) {
      acc[dept] = {
        total: 0,
        implemented: 0,
        successful: 0,
        successRate: 0
      } as any;
    }
    acc[dept].total++;
    if (isImplemented((idea as any).implementationStatus)) acc[dept].implemented++;
    if (isSuccessful((idea as any).implementationStatus)) acc[dept].successful++;
    return acc;
  }, {} as Record<string, { total: number; implemented: number; successful: number; successRate: number }>);

  const sortedDepartmentsByTotal = Object.entries(departmentPerformanceFiltered)
    .sort(([,a], [,b]) => b.total - a.total);

  const departmentTotalCountData = {
    labels: sortedDepartmentsByTotal.slice(0, 8).map(([dept]) =>
      dept.length > 15 ? dept.substring(0, 15) + '...' : dept
    ),
    datasets: [
      {
        label: 'Tổng số ý tưởng',
        data: sortedDepartmentsByTotal.slice(0, 8).map(([, data]) => data.total),
        backgroundColor: '#42A5F5',
        borderColor: '#1E88E5',
        borderWidth: 1
      }
    ]
  };

  // Department idea share over total company ideas (percentage)
  const departmentsByIdeaShare = Object.entries(departmentPerformance)
    .map(([dept, data]) => ({ dept, share: totalIdeas > 0 ? (data.total / totalIdeas) * 100 : 0 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 8);

  const departmentIdeaShareData = {
    labels: departmentsByIdeaShare.map(({ dept }) =>
      dept.length > 15 ? dept.substring(0, 15) + '...' : dept
    ),
    datasets: [
      {
        label: 'Tỷ lệ đóng góp ý tưởng (%)',
        data: departmentsByIdeaShare.map(({ share }) => Number(share.toFixed(1))),
        backgroundColor: '#7E57C2',
        borderColor: '#5E35B1',
        borderWidth: 1
      }
    ]
  };

  const weeklyTrendData = {
    labels: weeklyLabels.map(label => `Tuần ${label.split('-W')[1]}`),
    datasets: [
      {
        label: 'Số ý tưởng',
        data: weeklyTotals,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const monthlySuccessRateData = {
    labels: monthlyLabels.map(label => {
      const [year, month] = label.split('-');
      return `${month}/${year}`;
    }),
    datasets: [
      {
        label: 'Tỷ lệ triển khai thành công (%)',
        data: monthlySuccessRates,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const statusDistributionData = {
    labels: ['Đề xuất mới', 'Xem xét', 'Phê duyệt', 'Phản hồi phê duyệt', 'Đang triển khai', 'Lập báo cáo A3', 'Phê duyệt khen thưởng', 'Đã khen thưởng', 'Không đạt'],
    datasets: [
      {
        data: [newIdeas, reviewingIdeas, approvedIdeas, feedbackIdeas, implementingIdeas, a3Ideas, rewardApprovedIdeas, rewardedIdeas, failedIdeas],
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

  // Yearly distribution and monthly counts (current year ONLY - always filter by current year, not time range)
  const now = new Date();
  const currentYear = now.getFullYear();
  const ideasThisYear = ideas.filter(i => {
    const d = new Date(i.submissionDate);
    return d.getFullYear() === currentYear;
  });

  const monthlyCounts = Array.from({ length: 12 }, () => 0);
  ideasThisYear.forEach(i => {
    const d = new Date(i.submissionDate);
    const m = d.getMonth();
    monthlyCounts[m] += 1;
  });

  const monthLabels = ['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => `${m}/${currentYear}`);

  const monthlyCountBarData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Số ý tưởng theo tháng',
        data: monthlyCounts,
        backgroundColor: '#42A5F5',
        borderColor: '#1E88E5',
        borderWidth: 1
      }
    ]
  };

  const yearlyDistributionPie = {
    labels: monthLabels,
    datasets: [
      {
        data: monthlyCounts,
        backgroundColor: [
          '#1E88E5','#43A047','#FB8C00','#8E24AA','#F4511E','#3949AB',
          '#00ACC1','#7CB342','#FDD835','#5E35B1','#039BE5','#8D6E63'
        ],
        borderWidth: 1
      }
    ]
  };

  // Value-based statistics
  const departmentBenefitValue = filteredIdeas.reduce((acc, idea) => {
    const dept = idea.department || 'Khác';
    if (!acc[dept]) {
      acc[dept] = 0;
    }
    acc[dept] += (idea as any).benefitValue || 0;
    return acc;
  }, {} as Record<string, number>);

  const departmentRewardAmount = filteredIdeas.reduce((acc, idea) => {
    const dept = idea.department || 'Khác';
    if (!acc[dept]) {
      acc[dept] = 0;
    }
    acc[dept] += (idea as any).rewardAmount || 0;
    return acc;
  }, {} as Record<string, number>);

  const userRewardAmount = filteredIdeas.reduce((acc, idea) => {
    const user = idea.fullName || 'Không rõ';
    if (!acc[user]) {
      acc[user] = {
        name: user,
        department: idea.department || 'Khác',
        totalReward: 0,
        totalBenefit: 0
      };
    }
    acc[user].totalReward += (idea as any).rewardAmount || 0;
    acc[user].totalBenefit += (idea as any).benefitValue || 0;
    return acc;
  }, {} as Record<string, { name: string; department: string; totalReward: number; totalBenefit: number }>);

  // Top departments by benefit value
  const topDeptByBenefit = Object.entries(departmentBenefitValue)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8);

  const topDeptByReward = Object.entries(departmentRewardAmount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8);

  const topUsersByReward = Object.values(userRewardAmount)
    .sort((a, b) => b.totalReward - a.totalReward)
    .slice(0, 10);

  // Monthly reward amount data
  const monthlyRewardData = filteredIdeas.reduce((acc, idea) => {
    const date = new Date(idea.submissionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = 0;
    }
    acc[monthKey] += (idea as any).rewardAmount || 0;
    return acc;
  }, {} as Record<string, number>);

  const monthlyRewardLabels = Object.keys(monthlyRewardData).sort();
  const monthlyRewardAmounts = monthlyRewardLabels.map(label => monthlyRewardData[label]);

  // Chart data for value-based charts
  const departmentBenefitChartData = {
    labels: topDeptByBenefit.map(([dept]) => 
      dept.length > 15 ? dept.substring(0, 15) + '...' : dept
    ),
    datasets: [
      {
        label: 'Giá trị làm lợi (VND)',
        data: topDeptByBenefit.map(([, value]) => value / 1000000), // Convert to millions
        backgroundColor: '#4CAF50',
        borderColor: '#2E7D32',
        borderWidth: 1
      }
    ]
  };

  const departmentRewardChartData = {
    labels: topDeptByReward.map(([dept]) => 
      dept.length > 15 ? dept.substring(0, 15) + '...' : dept
    ),
    datasets: [
      {
        label: 'Tiền thưởng (VND)',
        data: topDeptByReward.map(([, value]) => value / 1000000), // Convert to millions
        backgroundColor: '#FF9800',
        borderColor: '#F57C00',
        borderWidth: 1
      }
    ]
  };

  const userRewardChartData = {
    labels: topUsersByReward.map(user => 
      user.name.length > 20 ? user.name.substring(0, 20) + '...' : user.name
    ),
    datasets: [
      {
        label: 'Tiền thưởng (VND)',
        data: topUsersByReward.map(user => user.totalReward / 1000000), // Convert to millions
        backgroundColor: '#9C27B0',
        borderColor: '#7B1FA2',
        borderWidth: 1
      }
    ]
  };

  const monthlyRewardChartData = {
    labels: monthlyRewardLabels.map(label => {
      const [year, month] = label.split('-');
      return `${month}/${year}`;
    }),
    datasets: [
      {
        label: 'Tổng tiền thưởng (VND)',
        data: monthlyRewardAmounts.map(amount => amount / 1000000), // Convert to millions
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
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

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  // Sort state for Department Ranking Table (default: by total desc)
  type DeptSortKey = 'department' | 'total' | 'approved' | 'deploying' | 'implemented' | 'successful' | 'rate';
  const [deptOrderBy, setDeptOrderBy] = useState<DeptSortKey>('total');
  const [deptOrder, setDeptOrder] = useState<'asc' | 'desc'>('desc');

  const handleDeptSort = (key: DeptSortKey) => {
    if (deptOrderBy === key) {
      setDeptOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDeptOrderBy(key);
      setDeptOrder('asc');
    }
  };

  const getDeptComparator = (key: DeptSortKey) => (a: [string, ImplStats], b: [string, ImplStats]) => {
    const [deptA, dataA] = a;
    const [deptB, dataB] = b;
    switch (key) {
      case 'department':
        return deptA.localeCompare(deptB);
      case 'total':
        return (dataA.total || 0) - (dataB.total || 0);
      case 'approved':
        return (dataA.approved || 0) - (dataB.approved || 0);
      case 'deploying':
        return (dataA.deploying || 0) - (dataB.deploying || 0);
      case 'implemented':
        return (dataA.implemented || 0) - (dataB.implemented || 0);
      case 'successful':
        return (dataA.successful || 0) - (dataB.successful || 0);
      case 'rate': {
        const rateA = (dataA.approved > 0 ? dataA.implementedFinal / dataA.approved : 0);
        const rateB = (dataB.approved > 0 ? dataB.implementedFinal / dataB.approved : 0);
        return rateA - rateB;
      }
    }
  };

  // Sort state for User Ranking Table (default: by success rate desc)
  type UserSortKey = 'name' | 'total' | 'approved' | 'deploying' | 'implemented' | 'successful' | 'rate';
  const [userOrderBy, setUserOrderBy] = useState<UserSortKey>('total');
  const [userOrder, setUserOrder] = useState<'asc' | 'desc'>('desc');

  const handleUserSort = (key: UserSortKey) => {
    if (userOrderBy === key) {
      setUserOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserOrderBy(key);
      setUserOrder('asc');
    }
  };

  const getUserComparator = (key: UserSortKey) => (a: [string, ImplStats], b: [string, ImplStats]) => {
    const [nameA, dataA] = a;
    const [nameB, dataB] = b;
    switch (key) {
      case 'name':
        return nameA.localeCompare(nameB);
      case 'total':
        return (dataA.total || 0) - (dataB.total || 0);
      case 'approved':
        return (dataA.approved || 0) - (dataB.approved || 0);
      case 'deploying':
        return (dataA.deploying || 0) - (dataB.deploying || 0);
      case 'implemented':
        return (dataA.implemented || 0) - (dataB.implemented || 0);
      case 'successful':
        return (dataA.successful || 0) - (dataB.successful || 0);
      case 'rate': {
        const rateA = (dataA.approved > 0 ? dataA.implementedFinal / dataA.approved : 0);
        const rateB = (dataB.approved > 0 ? dataB.implementedFinal / dataB.approved : 0);
        return rateA - rateB;
      }
    }
  };

  // Toggle to expand/collapse personal ranking list
  const [showAllUsers, setShowAllUsers] = useState(false);

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Grid container spacing={3}>
        {/* SECTION: Số lượng */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>Số lượng</Typography>
        </Grid>

        {/* Monthly Counts (Bar) */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Số ý tưởng theo từng tháng
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={monthlyCountBarRef}
                data={monthlyCountBarData} 
                options={chartOptions}
                onClick={(event) => {
                  const chart = monthlyCountBarRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const monthLabel = monthLabels[index];
                  if (monthLabel) {
                    const [month, year] = monthLabel.split('/');
                    const startDate = `${year}-${month}-01`;
                    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
                    const query = buildQuery({ dateFrom: startDate, dateTo: endDate });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Yearly Distribution (Pie) */}
        {/* <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Phân bố ý tưởng trong năm (Theo tháng)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Doughnut data={yearlyDistributionPie} options={pieOptions} />
            </Box>
          </Card>
        </Grid> */}

        {/* Weekly Trend Chart */}
        {/* <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Xu hướng Theo Tuần
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Line data={weeklyTrendData} options={chartOptions} />
            </Box>
          </Card>
        </Grid> */}

        {/* Department Total Counts */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Số lượng theo Phòng ban 
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={departmentTotalCountRef}
                data={departmentTotalCountData} 
                options={chartOptions}
                onClick={(event) => {
                  const chart = departmentTotalCountRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = sortedDepartmentsByTotal[index]?.[0];
                  if (dept) {
                    const query = buildQuery({ department: dept });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Rankings by Department (Implementation) */}
        {/* <Grid item xs={12} md={12}>
          <Card elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Xếp hạng Phòng ban theo triển khai
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Xếp hạng</strong></TableCell>
                    <TableCell><strong>Phòng ban</strong></TableCell>
                    <TableCell align="center"><strong>Tổng số ý tưởng</strong></TableCell>
                    <TableCell align="center"><strong>Được duyệt triển khai</strong></TableCell>
                    <TableCell align="center"><strong>Đang triển khai</strong></TableCell>
                    <TableCell align="center"><strong>Đã triển khai</strong></TableCell>
                    <TableCell align="center"><strong>Triển khai thành công</strong></TableCell>
                    <TableCell align="center"><strong>Tỷ lệ triển khai thành công</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topDeptImpl.map(([dept, data], index) => (
                    <TableRow 
                      key={dept}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                      onClick={() => {
                        const query = buildQuery({ department: dept });
                        navigateToAdmin(query);
                      }}
                    >
                      <TableCell>
                        <Chip label={index + 1} color={index < 3 ? 'primary' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dept.length > 40 ? dept.substring(0, 40) + '...' : dept}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).total} color="default" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).approved} color="warning" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).deploying} color="info" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).implemented} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).successful} color="success" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {((data as any).approved > 0 ? ((data as any).implementedFinal / (data as any).approved) * 100 : 0).toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid> */}
        
        {/* Department Performance Table (sorted by total ideas desc) */}
        <Grid item xs={12}>
          <Card elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Bảng Xếp hạng Phòng ban 
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Xếp hạng</strong></TableCell>
                    <TableCell sortDirection={deptOrderBy === 'department' ? deptOrder : false as any}>
                      <TableSortLabel
                        active={deptOrderBy === 'department'}
                        direction={deptOrderBy === 'department' ? deptOrder : 'asc'}
                        onClick={() => handleDeptSort('department')}
                      >
                        <strong>Phòng ban</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={deptOrderBy === 'total' ? deptOrder : false as any}>
                      <TableSortLabel
                        active={deptOrderBy === 'total'}
                        direction={deptOrderBy === 'total' ? deptOrder : 'asc'}
                        onClick={() => handleDeptSort('total')}
                      >
                        <strong>Tổng số ý tưởng</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={deptOrderBy === 'approved' ? deptOrder : false as any}>
                      <TableSortLabel
                        active={deptOrderBy === 'approved'}
                        direction={deptOrderBy === 'approved' ? deptOrder : 'asc'}
                        onClick={() => handleDeptSort('approved')}
                      >
                        <strong>Được duyệt triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={deptOrderBy === 'deploying' ? deptOrder : false as any}>
                      <TableSortLabel
                        active={deptOrderBy === 'deploying'}
                        direction={deptOrderBy === 'deploying' ? deptOrder : 'asc'}
                        onClick={() => handleDeptSort('deploying')}
                      >
                        <strong>Đang triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={deptOrderBy === 'implemented' ? deptOrder : false as any}>
                      <TableSortLabel
                        active={deptOrderBy === 'implemented'}
                        direction={deptOrderBy === 'implemented' ? deptOrder : 'asc'}
                        onClick={() => handleDeptSort('implemented')}
                      >
                        <strong>Đã triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={deptOrderBy === 'successful' ? deptOrder : false as any}>
                      <TableSortLabel
                        active={deptOrderBy === 'successful'}
                        direction={deptOrderBy === 'successful' ? deptOrder : 'asc'}
                        onClick={() => handleDeptSort('successful')}
                      >
                        <strong>Triển khai thành công</strong>
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Object.entries(deptImplStatsFiltered) as Array<[string, ImplStats]>)
                    .sort((a,b) => {
                      const cmp = getDeptComparator(deptOrderBy)(a,b);
                      return deptOrder === 'asc' ? cmp : -cmp;
                    })
                    .map(([dept, data], index) => (
                    <TableRow 
                      key={dept}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                      onClick={() => {
                        const query = buildQuery({ 'department': dept });
                        navigateToAdmin(query);
                      }}
                    >
                      <TableCell>
                        <Chip 
                          label={index + 1} 
                          color={index < 3 ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dept.length > 40 ? dept.substring(0, 40) + '...' : dept}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={data.total} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={data.approved} color="warning" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={data.deploying} color="info" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={data.implemented} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={data.successful} color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Rankings by Individual (Implementation) */}
        <Grid item xs={12} md={12}>
          <Card elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Xếp hạng Cá nhân theo triển khai
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Xếp hạng</strong></TableCell>
                    <TableCell sortDirection={userOrderBy === 'name' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'name'}
                        direction={userOrderBy === 'name' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('name')}
                      >
                        <strong>Họ và tên</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={userOrderBy === 'total' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'total'}
                        direction={userOrderBy === 'total' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('total')}
                      >
                        <strong>Tổng số ý tưởng</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={userOrderBy === 'approved' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'approved'}
                        direction={userOrderBy === 'approved' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('approved')}
                      >
                        <strong>Được duyệt triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={userOrderBy === 'deploying' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'deploying'}
                        direction={userOrderBy === 'deploying' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('deploying')}
                      >
                        <strong>Đang triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={userOrderBy === 'implemented' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'implemented'}
                        direction={userOrderBy === 'implemented' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('implemented')}
                      >
                        <strong>Đã triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={userOrderBy === 'successful' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'successful'}
                        direction={userOrderBy === 'successful' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('successful')}
                      >
                        <strong>Triển khai thành công</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sortDirection={userOrderBy === 'rate' ? userOrder : false as any}>
                      <TableSortLabel
                        active={userOrderBy === 'rate'}
                        direction={userOrderBy === 'rate' ? userOrder : 'asc'}
                        onClick={() => handleUserSort('rate')}
                      >
                        <strong>Tỷ lệ triển khai</strong>
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Object.entries(userImplStats) as Array<[string, ImplStats]>)
                    .sort((a,b) => {
                      const cmp = getUserComparator(userOrderBy)(a,b);
                      return userOrder === 'asc' ? cmp : -cmp;
                    })
                    .slice(0, showAllUsers ? undefined : 15)
                    .map(([name, data], index) => (
                    <TableRow 
                      key={name}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                      onClick={() => {
                        const query = buildQuery({ fullName: name });
                        navigateToAdmin(query);
                      }}
                    >
                      <TableCell>
                        <Chip label={index + 1} color={index < 3 ? 'primary' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {name.length > 40 ? name.substring(0, 40) + '...' : name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).total} color="default" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).approved} color="warning" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).deploying} color="info" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).implemented} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={(data as any).successful} color="success" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {((data as any).approved > 0 ? ((data as any).implementedFinal / (data as any).approved) * 100 : 0).toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setShowAllUsers(prev => !prev)}
              >
                {showAllUsers ? 'Thu gọn' : 'Xem thêm'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* SECTION: Giá trị */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 3 }}>Giá trị</Typography>
        </Grid>

        {/* Top Departments by Benefit Value */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Top Phòng ban có Giá trị Làm lợi Cao nhất
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={departmentBenefitRef}
                data={departmentBenefitChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${((context.parsed.y ?? 0) * 1000000).toLocaleString('vi-VN')} VND`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value + 'M VND';
                        }
                      }
                    }
                  }
                }}
                onClick={(event) => {
                  const chart = departmentBenefitRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = topDeptByBenefit[index]?.[0];
                  if (dept) {
                    const query = buildQuery({ department: dept });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Top Departments by Reward Amount */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Top Phòng ban có Tiền thưởng Cao nhất
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={departmentRewardRef}
                data={departmentRewardChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${((context.parsed.y ?? 0) * 1000000).toLocaleString('vi-VN')} VND`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value + 'M VND';
                        }
                      }
                    }
                  }
                }}
                onClick={(event) => {
                  const chart = departmentRewardRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = topDeptByReward[index]?.[0];
                  if (dept) {
                    const query = buildQuery({ department: dept });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Top Individuals by Reward Amount */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Top Cá nhân có Tiền thưởng Cao nhất
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={userRewardRef}
                data={userRewardChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${((context.parsed.y ?? 0) * 1000000).toLocaleString('vi-VN')} VND`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value + 'M VND';
                        }
                      }
                    }
                  }
                }}
                onClick={(event) => {
                  const chart = userRewardRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const user = topUsersByReward[index];
                  if (user) {
                    const query = buildQuery({ fullName: user.name });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Monthly Reward Amount Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Số tiền thưởng theo từng tháng
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={monthlyRewardRef}
                data={monthlyRewardChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${((context.parsed.y ?? 0) * 1000000).toLocaleString('vi-VN')} VND`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value + 'M VND';
                        }
                      }
                    }
                  }
                }}
                onClick={(event) => {
                  const chart = monthlyRewardRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const monthLabel = monthlyRewardLabels[index];
                  if (monthLabel) {
                    const [year, month] = monthLabel.split('-');
                    const startDate = `${year}-${month}-01`;
                    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
                    const query = buildQuery({ dateFrom: startDate, dateTo: endDate });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* SECTION: Chất lượng */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 3 }}>Chất lượng</Typography>
        </Grid>

        {/* Department Approval Rate Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Tỷ lệ Ý tưởng được triển khai theo Phòng ban (Top 8)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={departmentApprovalRateRef}
                data={departmentApprovalRateData} 
                options={chartOptions}
                onClick={(event) => {
                  const chart = departmentApprovalRateRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = departmentsForApprovalRate[index]?.[0];
                  if (dept) {
                    const query = buildQuery({ department: dept });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Department Implemented per Approved Rate Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Tỷ lệ Ý tưởng đang triển khai theo Phòng ban (Top 8)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={departmentImplementedPerApprovedRef}
                data={departmentImplementedPerApprovedRateData} 
                options={chartOptions}
                onClick={(event) => {
                  const chart = departmentImplementedPerApprovedRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = departmentsForImplPerApproved[index]?.[0];
                  if (dept) {
                    const query = buildQuery({ department: dept });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Department Idea Share Percentage Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Tỷ lệ % số ý tưởng theo Phòng ban (Top 8)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar 
                ref={departmentIdeaShareRef}
                data={departmentIdeaShareData} 
                options={{
                  ...chartOptions,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }}
                onClick={(event) => {
                  const chart = departmentIdeaShareRef.current;
                  if (!chart) return;
                  const elements = getElementAtEvent(chart, event);
                  if (!elements || elements.length === 0) return;
                  const index = (elements[0] as any).index as number;
                  const dept = departmentsByIdeaShare[index]?.dept;
                  if (dept) {
                    const query = buildQuery({ department: dept });
                    navigateToAdmin(query);
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Status Distribution Pie Chart */}
        {/* <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Phân bố Trạng thái
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <Pie data={statusDistributionData} options={pieOptions} />
            </Box>
          </Card>
        </Grid> */}

        
      </Grid>
    </Container>
  );
};

export default AdvancedStatistics;
