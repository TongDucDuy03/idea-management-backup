import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { FileDownload as FileDownloadIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import api from '../api/config';
import { Idea } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface A3ReportFormProps {
  idea: Idea | null;
  onClose: () => void;
}

const A3ReportForm: React.FC<A3ReportFormProps> = ({ idea, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Partial<Idea>>({});

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
        const { data } = await api.get(`/ideas/code/${encodeURIComponent(idea.ideaCode)}`);
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

  // Load logo from public folder
  useEffect(() => {
    let cancelled = false;
    const loadLogo = async () => {
      try {
        const res = await fetch('/vico-logo.png', { cache: 'no-store' });
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setLogoDataUrl(typeof reader.result === 'string' ? reader.result : null);
        };
        reader.readAsDataURL(blob);
      } catch {}
    };
    loadLogo();
    return () => { cancelled = true; };
  }, []);

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

      // Cập nhật ý tưởng theo mã (public, không cần token)
      const response = await api.put(`/ideas/code/${encodeURIComponent(idea.ideaCode)}`, reportData);

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

  const generateHTMLReport = (idea: Idea): string => {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('vi-VN');
    };

    const getContentStyle = (content: string) => {
      const length = (content || '').length;
      if (length > 500) return 'font-size: 11px; line-height: 1.3;';
      if (length > 300) return 'font-size: 12px; line-height: 1.35;';
      if (length > 200) return 'font-size: 13px; line-height: 1.45;';
      return 'font-size: 14px; line-height: 1.45;';
    };

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form Báo Cáo Cải Tiến A3 - ${idea.topicTitle || idea.ideaCode || 'N/A'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            background: #ffffff;
            padding: 0;
            margin: 0;
        }
        
        .a3-container {
            width: 420mm; 
            min-height: 297mm;
            background: white;
            border: 2px solid #000;
            position: relative;
            page-break-inside: avoid;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            display: flex;
            height: 80px;
            border-bottom: 2px solid #000;
            flex-shrink: 0;
        }
        
        .logo-section {
            width: 120px;
            border-right: 2px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
        }
        
        .title-section {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 10px;
        }
        
        .title-section h1 {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
        }
        
        .info-sections {
            width: 400px;
            border-left: 2px solid #000;
            display: flex;
            height: 80px;
            border-right: 2px solid #000;
        }
        
        .info-section {
            flex: 1;
            padding: 4px;
            font-size: 10px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            border-bottom: 2px solid #000;
            border-right: 2px solid #000;
        }
        
        .info-section:first-child {
            border-right: 2px solid #000;
        }
        
        .info-row {
            display: flex;
            align-items: flex-start;
            margin-bottom: 2px;
            flex-wrap: wrap;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .info-label {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 2px;
            display: block;
            width: 100%;
        }
        
        .info-value {
            width: 100%;
            font-size: 10px;
            padding: 1px 0;
            border-bottom: 1px dotted #ccc;
            min-height: 16px;
            word-wrap: break-word;
            overflow: hidden;
        }
        
        .main-content {
            display: flex;
            flex: 1;
            min-height: 0;
        }
        
        .left-sidebar {
            width: 120px;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }
        
        .sidebar-section {
            flex: 1;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            padding: 5px;
            min-height: 25%;
            border-right: 2px solid #000;
            border-bottom: 2px solid #000;
        }
        
        .sidebar-section:last-child {
            border-bottom: 4px solid black;
        }
        
        .content-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            border-right: 2px solid #000;
            min-width: 0;
        }
        
        .top-row,
        .middle-row,
        .bottom-row {
            display: flex;
            width: 100%;
            border-bottom: 2px solid #000;
            height: auto; /* Cho phép chiều cao tự động thay đổi */
        }

        .top-row {
            display: flex;
            min-height: auto;
            border-bottom: 2px solid #000;
        }
        
        .middle-row {
            display: flex;
            min-height: auto;
            border-bottom: 2px solid #000;
        }
        
        .bottom-row {
            display: flex;
            min-height: auto;
            border-bottom: 2px solid #000;
        }
        
        .content-section {
            flex: 1 1 0;  /* Cho phép các ô co giãn linh hoạt */
            min-width: 0;
            position: relative;
            display: flex;
            flex-direction: column;
            padding: 4px;
            background: #fff;
            overflow: visible;   /* Quan trọng */
            box-sizing: border-box;
            font-size: 13px;
            height: auto;        /* Cho phép cao theo nội dung */
            min-height: auto;
            border-bottom:1px solid #000;
        }
        
        /* Top row sections */
        .top-row .content-section:first-child {
            flex: 1;
            border-right: 2px solid #000;
        }
        
        .top-row .content-section:last-child {
            flex: 1;
            border-right: 2px solid #000;
        }
        
        /* Middle row sections */
        .middle-row .content-section:first-child {
            flex: 1;
            border-right: 2px solid #000;
        }
        
        .middle-row .content-section:last-child {
            flex: 1; 
            border-right: 2px solid #000;
        }
        
        /* Bottom row sections - 4 equal columns */
        .bottom-row .content-section {
            flex: 1;
            border-right: 2px solid #000;
        }
        
        .bottom-row .content-section:last-child {
            flex: 1;
            border-right: 2px solid #000;
        }

        /* Custom widths for bottom row sections */
        .bottom-row .content-section:nth-child(1) { /* Lợi ích */
            flex: 0 0 40%;
        }
        .bottom-row .content-section:nth-child(2) { /* Đánh giá */
            flex: 0 0 15%;
        }
        .bottom-row .content-section:nth-child(3) { /* Chi phí */
            flex: 0 0 15%;
        }
        .bottom-row .content-section:nth-child(4) { /* Khen thưởng */
            flex: 0 0 30%;
        }

        .section-title {
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 0px 0;
            padding: 1px 1px;
            background: #f5f5f5;
            border-radius: 3px;
            position: relative;
            z-index: 1;
            font-size: 12px;
            color: #333;
            flex-shrink: 0;
        }
        
        .image-box { 
            border: 2px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;   /* Cho ảnh to không bị co chữ */
            background: #fff;
            margin-top: 1px;
            height: auto;        /* Bỏ cứng 150px */
            min-height: 100px;
        }
        
        .image-box img { 
            max-width: 100%; 
            max-height: 100%; 
            object-fit: contain; 
            display: block; 
        }

        .section-content {
            flex: 1;
            white-space: pre-line;
            text-align: justify;
            border: none;
            padding: 5px;
            font-family: inherit;
            overflow: visible;
            word-wrap: break-word;
            white-space: pre-line;
            font-size: 13px;
            line-height: 1.5;
        }

        .section-content .image-box {
            margin-top: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .section-content .image-box img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            border: 1px solid #ccc;
        }
        
        /* Dynamic content styling */
        .content-thuc-trang {
            ${getContentStyle(idea.solution || '')}
        }
        
        .content-doi-sach {
            ${getContentStyle(idea.benefit || '')}
        }
        
        .content-loi-ich {
            ${getContentStyle(idea.benefitOutcome || '')}
        }
        
        .content-danh-gia {
            ${getContentStyle(idea.scalingOpportunity || '')}
        }
        
        .content-chi-phi {
            ${getContentStyle(idea.resourcesUsed || '')}
        }
        
        .content-khen-thuong {
            ${getContentStyle(idea.calculationDescription || '')}
        }
        
        /* Xử lý nội dung dài */
        .long-content {
            max-height: none !important;
            overflow: visible !important;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .a3-container {
                margin: 0;
                border: 2px solid #000 !important;
                min-height: 297mm;
                height: auto;
            }
            
            .content-section {
                page-break-inside: avoid;
                overflow: visible;
            }

            /* Đảm bảo border không bị mất trong print */
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <div class="a3-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                ${logoDataUrl
                  ? `<img src="${logoDataUrl}" alt="Logo" style="max-width: 90px; max-height: 60px;" />`
                  : 'LOGO'}
            </div>
            <div class="title-section">
                <div>
                    <h1>CÔNG TY TNHH THẮNG LỢI</h1>
                    <h1>BÁO CÁO CẢI TIẾN A3</h1>
                </div>
            </div>
            <div class="info-sections">
                <!-- Ô 1: Tên đề tài và Mã ý tưởng -->
                <div class="info-section">
                    <div class="info-row">
                        <span class="info-label">TÊN ĐỀ TÀI:</span>
                        <div class="info-value">${idea.topicTitle || idea.idea || 'N/A'}</div>
                    </div>
                    
                </div>
                
                <!-- Ô 2: Người lập, Ngày lập, Đơn vị -->
                <div class="info-section">
                    <div class="info-row">
                        <span class="info-label">MÃ Ý TƯỞNG: ${idea.ideaCode || 'N/A'}</span>
                        
                    </div>
                    <div class="info-row">
                        <span class="info-label">Người lâp:  ${idea.fullName || 'N/A'}</span>
                        
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ngày lập: ${formatDate(new Date())}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Đơn vị: ${idea.department || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Left Sidebar -->
            <div class="left-sidebar">
                <div class="sidebar-section">
                    NGƯỜI LẬP
                </div>
                <div class="sidebar-section">
                    P. CẢI TIẾN
                </div>
                <div class="sidebar-section">
                    GĐ KT
                </div>
                <div class="sidebar-section">
                    GĐ ĐH
                </div>
            </div>

            <!-- Content Area -->
            <div class="content-area">
                <!-- Top Row -->
                <div class="top-row">
                    <div class="content-section">
                        <div class="section-title">THỰC TRẠNG</div>
                        <div class="section-content content-thuc-trang ${(idea.solution || '').length > 500 ? 'long-content' : ''}">${idea.solution || 'Mô tả thực trạng hiện tại...'}</div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">ĐỐI SÁCH</div>
                        <div class="section-content content-doi-sach ${(idea.benefit || '').length > 500 ? 'long-content' : ''}">${idea.benefit || 'Đối sách đề xuất...'}</div>
                    </div>
                </div>

                <!-- Middle Row -->
                <div class="middle-row">
                    <div class="content-section">
                        <div class="section-title">HÌNH ẢNH TRƯỚC</div>
                        <div class="section-content">
                          ${(idea as any).beforeImage
                            ? `<div class=\"image-box\"><img src=\"${(idea as any).beforeImage}\" alt=\"Hình ảnh trước\" /></div>`
                            : '<div class=\"image-box\" style=\"color:#999; font-style:italic;\">Chưa có hình ảnh trước</div>'}
                        </div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">HÌNH ẢNH SAU</div>
                        <div class="section-content">
                          ${(idea as any).afterImage
                            ? `<div class=\"image-box\"><img src=\"${(idea as any).afterImage}\" alt=\"Hình ảnh sau\" /></div>`
                            : '<div class=\"image-box\" style=\"color:#999; font-style:italic;\">Chưa có hình ảnh sau</div>'}
                        </div>
                    </div>
                </div>

                <!-- Bottom Row -->
                <div class="bottom-row">
                    <div class="content-section">
                        <div class="section-title">LỢI ÍCH</div>
                        <div class="section-content content-loi-ich ${(idea.benefitOutcome || '').length > 500 ? 'long-content' : ''}">${idea.benefitOutcome || 'Lợi ích đạt được...'}</div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">ĐÁNH GIÁ</div>
                        <div class="section-content content-danh-gia ${(idea.scalingOpportunity || '').length > 500 ? 'long-content' : ''}">${idea.scalingOpportunity || 'Đánh giá kết quả...'}</div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">CHI PHÍ</div>
                        <div class="section-content content-chi-phi ${(idea.resourcesUsed || '').length > 500 ? 'long-content' : ''}">${idea.resourcesUsed || 'Chi phí thực hiện...'}</div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">KHEN THƯỞNG</div>
                        <div class="section-content content-khen-thuong ${(idea.calculationDescription || '').length > 500 ? 'long-content' : ''}">${idea.calculationDescription || 'Đề xuất khen thưởng...'}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  };

  const createPdfFromHtml = async (htmlContent: string, filename: string) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '297mm';
    container.style.background = '#ffffff';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mainContainer = container.querySelector('.a3-container') as HTMLElement;
      
      if (!mainContainer) {
        throw new Error('Không tìm thấy container A3');
      }

      // Đo chiều cao thực tế của container sau khi content đã render
      const actualHeight = mainContainer.scrollHeight;
      const actualWidth = mainContainer.scrollWidth;
      
      console.log('Container dimensions:', { actualWidth, actualHeight });
      
      const canvas = await html2canvas(mainContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        allowTaint: false,
        foreignObjectRendering: false,
        width: actualWidth,
        height: actualHeight,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { 
              font-family: Arial, sans-serif !important;
              background-color: white !important;
            }
            .content-section {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            .a3-container {
              height: auto !important;
              min-height: 210mm !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Tạo PDF với kích thước động dựa trên nội dung
      const pdf = new jsPDF('l', 'mm', 'a3');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Tính toán kích thước thực tế của canvas trong mm
      const canvasWidthMM = canvas.width / 3.78; // Convert pixels to mm
      const canvasHeightMM = canvas.height / 3.78;
      
      console.log('Canvas dimensions in mm:', { canvasWidthMM, canvasHeightMM });
      
      // Nếu nội dung dài hơn 1 trang A3, tạo nhiều trang
      if (canvasHeightMM > pageHeight) {
        const margin = 5;
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        // Scale để fit width
        const scale = availableWidth / canvasWidthMM;
        const scaledHeight = canvasHeightMM * scale;
        
        // Tính số trang cần thiết
        const pagesNeeded = Math.ceil(scaledHeight / availableHeight);
        
        console.log(`Content requires ${pagesNeeded} pages`);
        
        for (let i = 0; i < pagesNeeded; i++) {
          if (i > 0) {
            pdf.addPage();
          }
          
          const yOffset = -i * availableHeight;
          const currentPageHeight = Math.min(availableHeight, scaledHeight - (i * availableHeight));
          
          pdf.addImage(
            imgData, 
            'JPEG', 
            margin, 
            margin + yOffset, 
            availableWidth, 
            currentPageHeight,
            undefined,
            'FAST'
          );
        }
      } else {
        // Nội dung vừa 1 trang, fit toàn bộ
        const margin = 5;
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        const scaleWidth = availableWidth / canvasWidthMM;
        const scaleHeight = availableHeight / canvasHeightMM;
        const scale = Math.min(scaleWidth, scaleHeight);
        
        const finalWidth = canvasWidthMM * scale;
        const finalHeight = canvasHeightMM * scale;
        
        const xOffset = (pageWidth - finalWidth) / 2;
        const yOffset = (pageHeight - finalHeight) / 2;
        
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
      }

      // Lưu PDF
      pdf.save(filename.replace(/\s+/g, '_'));
    } catch (error) {
      console.error('Error creating PDF:', error);
      throw error;
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleExport = async () => {
    if (!idea) return;
    
    setLoading(true);
    setError('');
    
    try {
      const htmlContent = generateHTMLReport(reportData as Idea);
      const filename = `Bao_Cao_Cai_Tien_A3_${idea.ideaCode || idea._id}.pdf`;
      await createPdfFromHtml(htmlContent, filename);
      
      setSuccess('File báo cáo A3 PDF đã được tải về thành công!');
    } catch (error: any) {
      console.error('Error exporting A3 report:', error);
      setError('Không thể xuất file báo cáo A3. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndExport = async () => {
    await handleSave();
    if (!error) {
      setTimeout(() => {
        handleExport();
      }, 1000);
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
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tên đề tài"
                value={reportData.topicTitle || ''}
                onChange={(e) => handleInputChange('topicTitle', e.target.value)}
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
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
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
              onClick={handleExport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Đang xuất...' : 'Export PDF A3'}
            </Button>
            
            <Button
              variant="contained"
              color="info"
              onClick={handleSaveAndExport}
              disabled={saving || loading}
              startIcon={saving || loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              sx={{ minWidth: 200 }}
            >
              {saving || loading ? 'Đang xử lý...' : 'Lưu và Export PDF'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default A3ReportForm;
