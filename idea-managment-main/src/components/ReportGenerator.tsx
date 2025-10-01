import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  Grid,
  Chip
} from '@mui/material';
import { FileDownload as FileDownloadIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Idea } from '../types';

interface ReportGeneratorProps {
  ideas: Idea[];
  timeRange: string;
  departmentFilter: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ 
  ideas, 
  timeRange, 
  departmentFilter 
}) => {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [generating, setGenerating] = useState(false);

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'week': return '7 ngày qua';
      case 'month': return '30 ngày qua';
      case 'quarter': return '3 tháng qua';
      case 'year': return '1 năm qua';
      default: return 'Tất cả';
    }
  };

  const getStatusLabel = (status: string) => {
    return status; // Trả về trạng thái trực tiếp vì đã là tiếng Việt
  };

  // Filter data based on time range and department
  const getFilteredIdeas = () => {
    let filtered = [...ideas];

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

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(idea => idea.department === departmentFilter);
    }

    return filtered;
  };

  const filteredIdeas = getFilteredIdeas();

  // Calculate statistics
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
  const approvalRate = totalIdeas > 0 ? ((approvedIdeas / totalIdeas) * 100).toFixed(1) : '0';

  // Implementation-based statistics
  const isImplemented = (status?: string) => status === 'Đang triển khai' || status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const isSuccessful = (status?: string) => status === 'Lập báo cáo A3' || status === 'Phê duyệt khen thưởng' || status === 'Đã khen thưởng';
  const implementedCount = filteredIdeas.filter(idea => isImplemented((idea as any).implementationStatus)).length;
  // Success rate per new definition: (A3 + Phê duyệt khen thưởng + Đã khen thưởng) / (A3 + Phê duyệt khen thưởng + Đã khen thưởng + Không đạt)
  const successNumerator = filteredIdeas.filter(i => isSuccessful((i as any).implementationStatus)).length;
  const failedCount = filteredIdeas.filter(i => (i as any).implementationStatus === 'Không đạt').length;
  const successDenominator = successNumerator + failedCount;
  const implementationSuccessRate = successDenominator > 0 ? ((successNumerator / successDenominator) * 100).toFixed(1) : '0';

  // Value-based statistics
  const totalBenefitValue = filteredIdeas.reduce((sum, idea) => sum + ((idea as any).benefitValue || 0), 0);
  const totalRewardAmount = filteredIdeas.reduce((sum, idea) => sum + ((idea as any).rewardAmount || 0), 0);

  // Department statistics
  const departmentStats = filteredIdeas.reduce((acc, idea) => {
    acc[idea.department] = (acc[idea.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDepartments = Object.entries(departmentStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  // Department implementation statistics
  const departmentImplementationStats = filteredIdeas.reduce((acc, idea) => {
    const dept = idea.department || 'Khác';
    if (!acc[dept]) {
      acc[dept] = {
        total: 0,
        implemented: 0,
        successful: 0,
        successRate: 0,
        benefitValue: 0,
        rewardAmount: 0
      };
    }
    acc[dept].total++;
    if (isImplemented((idea as any).implementationStatus)) acc[dept].implemented++;
    if (isSuccessful((idea as any).implementationStatus)) acc[dept].successful++;
    acc[dept].benefitValue += (idea as any).benefitValue || 0;
    acc[dept].rewardAmount += (idea as any).rewardAmount || 0;
    return acc;
  }, {} as Record<string, { total: number; implemented: number; successful: number; successRate: number; benefitValue: number; rewardAmount: number }>);

  // Calculate success rates
  Object.keys(departmentImplementationStats).forEach(dept => {
    const deptData = departmentImplementationStats[dept];
    deptData.successRate = deptData.total > 0 ? (deptData.successful / deptData.total) * 100 : 0;
  });

  // Top departments by benefit value and reward amount
  const topDeptByBenefit = Object.entries(departmentImplementationStats)
    .sort(([,a], [,b]) => b.benefitValue - a.benefitValue)
    .slice(0, 5);
  
  const topDeptByReward = Object.entries(departmentImplementationStats)
    .sort(([,a], [,b]) => b.rewardAmount - a.rewardAmount)
    .slice(0, 5);

  // Top users by reward amount
  const userRewardStats = filteredIdeas.reduce((acc, idea) => {
    const user = idea.fullName || 'Không rõ';
    if (!acc[user]) {
      acc[user] = {
        name: user,
        department: idea.department || 'Khác',
        totalReward: 0,
        totalBenefit: 0,
        ideaCount: 0
      };
    }
    acc[user].totalReward += (idea as any).rewardAmount || 0;
    acc[user].totalBenefit += (idea as any).benefitValue || 0;
    acc[user].ideaCount++;
    return acc;
  }, {} as Record<string, { name: string; department: string; totalReward: number; totalBenefit: number; ideaCount: number }>);

  const topUsersByReward = Object.values(userRewardStats)
    .sort((a, b) => b.totalReward - a.totalReward)
    .slice(0, 5);

  // Generate HTML content for PDF
  const generateHTMLContent = () => {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #2c5aa0;">BÁO CÁO THỐNG KÊ Ý TƯỞNG CẢI TIẾN</h1>
        </div>
        
        <div style="margin-bottom: 20px; font-size: 12px;">
          <p><strong>Ngày tạo báo cáo:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
          <p><strong>Khoảng thời gian:</strong> ${getTimeRangeLabel(timeRange)}</p>
          <p><strong>Phòng ban:</strong> ${departmentFilter === 'all' ? 'Tất cả' : departmentFilter}</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">TỔNG QUAN THỐNG KÊ</h2>
          <div style="font-size: 12px;">
            <p>• Tổng số ý tưởng: <strong>${totalIdeas}</strong></p>
            <p>• Ý tưởng đã triển khai: <strong>${implementedCount}</strong></p>
            <p>• Tỷ lệ triển khai thành công: <strong>${implementationSuccessRate}%</strong></p>
            <p>• Đề xuất mới: <strong>${newIdeas}</strong></p>
            <p>• Không đạt: <strong>${failedIdeas}</strong></p>
            <p>• Tỷ lệ phê duyệt: <strong>${approvalRate}%</strong></p>
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">THỐNG KÊ GIÁ TRỊ</h2>
          <div style="font-size: 12px;">
            <p>• Tổng giá trị làm lợi: <strong>${(totalBenefitValue / 1000000).toFixed(1)}M VNĐ</strong></p>
            <p>• Tổng tiền thưởng: <strong>${(totalRewardAmount / 1000000).toFixed(1)}M VNĐ</strong></p>
          </div>
        </div>

        ${topDepartments.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">THỐNG KÊ THEO PHÒNG BAN</h2>
          <div style="font-size: 12px;">
            ${topDepartments.map(([dept, count], index) => 
              `<p>${index + 1}. ${dept}: <strong>${count} ý tưởng</strong></p>`
            ).join('')}
          </div>
        </div>
        ` : ''}

        ${Object.keys(departmentImplementationStats).length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">THỐNG KÊ TRIỂN KHAI THEO PHÒNG BAN</h2>
          <div style="font-size: 11px;">
            ${Object.entries(departmentImplementationStats).map(([dept, stats]) => `
              <div style="margin-bottom: 12px; padding: 8px; background-color: #f8f9fa; border-left: 3px solid #2c5aa0;">
                <p style="font-weight: bold; margin: 0;">${dept}:</p>
                <p style="margin: 2px 0;">• Tổng: ${stats.total} | Triển khai: ${stats.implemented} | Thành công: ${stats.successful}</p>
                <p style="margin: 2px 0;">• Tỷ lệ thành công: ${stats.successRate.toFixed(1)}%</p>
                <p style="margin: 2px 0;">• Giá trị làm lợi: ${(stats.benefitValue / 1000000).toFixed(1)}M VNĐ</p>
                <p style="margin: 2px 0;">• Tiền thưởng: ${(stats.rewardAmount / 1000000).toFixed(1)}M VNĐ</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${topDeptByBenefit.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">TOP PHÒNG BAN CÓ GIÁ TRỊ LÀM LỢI CAO NHẤT</h2>
          <div style="font-size: 12px;">
            ${topDeptByBenefit.map(([dept, stats], index) => 
              `<p>${index + 1}. ${dept}: <strong>${(stats.benefitValue / 1000000).toFixed(1)}M VNĐ</strong></p>`
            ).join('')}
          </div>
        </div>
        ` : ''}

        ${topDeptByReward.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">TOP PHÒNG BAN CÓ TIỀN THƯỞNG CAO NHẤT</h2>
          <div style="font-size: 12px;">
            ${topDeptByReward.map(([dept, stats], index) => 
              `<p>${index + 1}. ${dept}: <strong>${(stats.rewardAmount / 1000000).toFixed(1)}M VNĐ</strong></p>`
            ).join('')}
          </div>
        </div>
        ` : ''}

        ${topUsersByReward.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">TOP CÁ NHÂN CÓ TIỀN THƯỞNG CAO NHẤT</h2>
          <div style="font-size: 12px;">
            ${topUsersByReward.map((user, index) => `
              <div style="margin-bottom: 10px; padding: 8px; background-color: #f0f7ff; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold;">${index + 1}. ${user.name} (${user.department}): ${(user.totalReward / 1000000).toFixed(1)}M VNĐ</p>
                <p style="margin: 2px 0; font-size: 10px;">Số ý tưởng: ${user.ideaCount} | Giá trị làm lợi: ${(user.totalBenefit / 1000000).toFixed(1)}M VNĐ</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${reportType === 'detailed' ? `
        <div style="margin-bottom: 25px; page-break-before: always;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">DANH SÁCH CHI TIẾT Ý TƯỞNG</h2>
          <div style="font-size: 10px;">
            ${filteredIdeas.map((idea, index) => `
              <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #fafafa;">
                <p style="margin: 0; font-weight: bold;">${index + 1}. Mã: ${idea.ideaCode}</p>
                <p style="margin: 2px 0;"><strong>Tên:</strong> ${idea.fullName}</p>
                <p style="margin: 2px 0;"><strong>Phòng ban:</strong> ${idea.department}</p>
                <p style="margin: 2px 0;"><strong>Quyết định phê duyệt:</strong> ${idea.status}</p>
                <p style="margin: 2px 0;"><strong>Trạng thái triển khai:</strong> ${(idea as any).implementationStatus || 'Đề xuất mới'}</p>
                <p style="margin: 2px 0;"><strong>Phòng ban triển khai:</strong> ${(idea as any).implementationDepartment || 'Chưa xác định'}</p>
                <p style="margin: 2px 0;"><strong>Giá trị làm lợi:</strong> ${((idea as any).benefitValue || 0).toLocaleString('vi-VN')} VNĐ</p>
                <p style="margin: 2px 0;"><strong>Tiền thưởng:</strong> ${((idea as any).rewardAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
                <p style="margin: 2px 0;"><strong>Ngày gửi:</strong> ${new Date(idea.submissionDate).toLocaleDateString('vi-VN')}</p>
                <p style="margin: 2px 0;"><strong>Ý tưởng:</strong> ${idea.idea.substring(0, 150)}${idea.idea.length > 150 ? '...' : ''}</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
    return htmlContent;
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      console.log('Bắt đầu tạo PDF...', { totalIdeas, reportType });
      
      // Create temporary div with isolated styling
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = generateHTMLContent();
      tempDiv.style.cssText = `
        width: 794px;
        position: absolute;
        left: -9999px;
        top: 0;
        background-color: white;
        padding: 20px;
        font-family: Arial, sans-serif;
        color: #333;
        border: none;
        box-shadow: none;
        transform: none;
        opacity: 1;
      `;
      
      // Remove any Material-UI classes that might cause OKLCH issues
      tempDiv.className = '';
      tempDiv.removeAttribute('class');
      
      document.body.appendChild(tempDiv);
      
      // Wait for DOM to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Content height:', tempDiv.scrollHeight);
      console.log('Content width:', tempDiv.scrollWidth);
      
      // Convert to canvas with simple settings
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: tempDiv.scrollHeight,
        logging: false,
        ignoreElements: (element) => {
          // Skip elements that might cause OKLCH color issues
          const htmlElement = element as HTMLElement;
          return htmlElement.style?.color?.includes('oklch') || 
                 htmlElement.style?.backgroundColor?.includes('oklch') ||
                 htmlElement.style?.borderColor?.includes('oklch');
        },
        onclone: (clonedDoc) => {
          // Remove any OKLCH colors from cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              color: #333 !important;
              background-color: white !important;
              border-color: #ddd !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      console.log('Canvas created:', canvas.width, 'x', canvas.height);
      
      document.body.removeChild(tempDiv);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      if (imgHeight <= pageHeight) {
        // Single page
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      
      const fileName = `bao_cao_thong_ke_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('PDF saved:', fileName);
      setOpen(false);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      
      // If OKLCH error occurs, try fallback method
      if ((error as Error).message.includes('oklch') || (error as Error).message.includes('color function')) {
        console.log('OKLCH error detected, trying fallback method...');
        try {
          await generatePDFFallback();
          return;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
        }
      }
      
      alert('Có lỗi xảy ra khi tạo PDF: ' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Fallback method using direct jsPDF without html2canvas
  const generatePDFFallback = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Set font and colors
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.setDrawColor(0, 0, 0);

      // Title
      pdf.setFontSize(20);
      pdf.text('BÁO CÁO THỐNG KÊ Ý TƯỞNG CẢI TIẾN', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Date and filters
      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.text(`Ngày tạo báo cáo: ${new Date().toLocaleDateString('vi-VN')}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Khoảng thời gian: ${getTimeRangeLabel(timeRange)}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Phòng ban: ${departmentFilter === 'all' ? 'Tất cả' : departmentFilter}`, 20, yPosition);
      yPosition += 15;

      // Summary statistics
      pdf.setFontSize(16);
      pdf.setFont('times', 'bold');
      pdf.text('TỔNG QUAN THỐNG KÊ', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.text(`• Tổng số ý tưởng: ${totalIdeas}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`• Ý tưởng đã triển khai: ${implementedCount}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`• Tỷ lệ triển khai thành công: ${implementationSuccessRate}%`, 20, yPosition);
      yPosition += 8;
      pdf.text(`• Đề xuất mới: ${newIdeas}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`• Không đạt: ${failedIdeas}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`• Tỷ lệ phê duyệt: ${approvalRate}%`, 20, yPosition);
      yPosition += 15;

      // Value statistics
      pdf.setFontSize(16);
      pdf.setFont('times', 'bold');
      pdf.text('THỐNG KÊ GIÁ TRỊ', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.text(`• Tổng giá trị làm lợi: ${(totalBenefitValue / 1000000).toFixed(1)}M VND`, 20, yPosition);
      yPosition += 8;
      pdf.text(`• Tổng tiền thưởng: ${(totalRewardAmount / 1000000).toFixed(1)}M VND`, 20, yPosition);
      yPosition += 15;

      // Top departments
      if (topDepartments.length > 0) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('times', 'bold');
        pdf.text('THỐNG KÊ THEO PHÒNG BAN', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(12);
        pdf.setFont('times', 'normal');
        
        topDepartments.forEach(([dept, count], index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${index + 1}. ${dept}: ${count} ý tưởng`, 20, yPosition);
          yPosition += 8;
        });
      }

      const fileName = `bao_cao_thong_ke_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      setOpen(false);
      
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      throw error;
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<PdfIcon />}
        onClick={() => setOpen(true)}
        sx={{
          py: 1.0,
          px: 2.0,
          fontSize: '0.95rem',
          fontWeight: 'bold',
          textTransform: 'none',
          boxShadow: 2,
          '&:hover': {
            boxShadow: 4,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          }
        }}
      >
        Xuất Báo cáo PDF
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Tạo Báo cáo PDF
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Loại báo cáo</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Loại báo cáo"
              >
                <MenuItem value="summary">Tóm tắt thống kê</MenuItem>
                <MenuItem value="detailed">Chi tiết đầy đủ</MenuItem>
              </Select>
            </FormControl>

            <Card sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Thông tin báo cáo:
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2">Khoảng thời gian:</Typography>
                  <Chip label={getTimeRangeLabel(timeRange)} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Phòng ban:</Typography>
                  <Chip label={departmentFilter === 'all' ? 'Tất cả' : departmentFilter} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Tổng ý tưởng:</Typography>
                  <Chip label={totalIdeas} color="primary" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Đã triển khai:</Typography>
                  <Chip label={implementedCount} color="info" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Tỷ lệ thành công:</Typography>
                  <Chip label={`${implementationSuccessRate}%`} color="success" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Tỷ lệ phê duyệt:</Typography>
                  <Chip label={`${approvalRate}%`} color="warning" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Giá trị làm lợi:</Typography>
                  <Chip label={`${(totalBenefitValue / 1000000).toFixed(1)}M VNĐ`} color="secondary" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Tổng tiền thưởng:</Typography>
                  <Chip label={`${(totalRewardAmount / 1000000).toFixed(1)}M VNĐ`} color="error" size="small" />
                </Grid>
              </Grid>
            </Card>

            {generating && (
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                Đang tạo báo cáo PDF... (Quá trình này có thể mất vài giây)
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={generating}>
            Hủy
          </Button>
          <Button 
            onClick={generatePDF} 
            variant="contained" 
            startIcon={<FileDownloadIcon />}
            disabled={generating}
          >
            {generating ? 'Đang tạo...' : 'Tạo PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportGenerator;