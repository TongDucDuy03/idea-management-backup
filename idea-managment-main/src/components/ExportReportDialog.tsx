import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  Chip,
  CircularProgress
} from '@mui/material';
import { Idea } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportReportDialogProps {
  open: boolean;
  onClose: () => void;
  ideas: Idea[];
}

const ExportReportDialog: React.FC<ExportReportDialogProps> = ({
  open,
  onClose,
  ideas
}) => {
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Lọc các ý tưởng có trạng thái "Lập báo cáo A3"
  const filteredIdeas = ideas.filter(idea => 
    idea.implementationStatus === 'Lập báo cáo A3'
  );

  // Reset selected ideas when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIdeas([]);
    }
  }, [open]);

  // Load logo from public folder and convert to data URL for embedding in exported content
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

  const handleIdeaSelection = (ideaId: string) => {
    setSelectedIdeas(prev => 
      prev.includes(ideaId) 
        ? prev.filter(id => id !== ideaId)
        : [...prev, ideaId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIdeas.length === filteredIdeas.length) {
      setSelectedIdeas([]);
    } else {
      setSelectedIdeas(filteredIdeas.map(idea => idea._id));
    }
  };

  const generateHTMLReport = (idea: Idea): string => {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('vi-VN');
    };

    // Tự động điều chỉnh font size dựa trên độ dài nội dung
    const getContentStyle = (content: string) => {
      const length = (content || '').length;
      if (length > 500) return 'font-size: 11px; line-height: 1.2;';
      if (length > 300) return 'font-size: 12px; line-height: 1.3;';
      if (length > 200) return 'font-size: 13px; line-height: 1.4;';
      return 'font-size: 12px; line-height: 1.4;';
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
            min-width: 420mm;
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
tiền thì đã đag k có pải đi ứng xong sáng ra đã mất 50k xong vẫn chả ra sao.            height: 80px;
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
            margin-top: 1px;
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
                        <span class="info-label">Người đề xuất:  ${idea.fullName || 'N/A'}</span>
                        
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ngày lập: ${formatDate(new Date())}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Đơn vị: ${idea.implementationDepartment || idea.department || 'N/A'}</span>
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
                        <div class="section-title">ĐÁNH GIÁ HIỆU QUẢ CẢI TIẾN</div>
                        <div class="section-content content-loi-ich ${(idea.benefitOutcome || '').length > 500 ? 'long-content' : ''}">${idea.benefitOutcome || 'Lợi ích đạt được...'}</div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">CƠ HỘI NHÂN RỘNG PHÁT TRIỂN</div>
                        <div class="section-content content-danh-gia ${(idea.scalingOpportunity || '').length > 500 ? 'long-content' : ''}">${idea.scalingOpportunity || 'Đánh giá cơ hội nhân rộng...'}</div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-title">NGUỒN LỰC SỬ DỤNG & CHI PHÍ</div>
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
      // Đợi DOM render hoàn toàn
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sử dụng A3 landscape orientation
      const pdf = new jsPDF('l', 'mm', 'a3'); // landscape A3
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Tìm container chính
      const mainContainer = container.querySelector('.a3-container') as HTMLElement;
      
      // Render trang chính (A3 form)
      if (mainContainer) {
        // Đo chiều cao thực tế của container sau khi content đã render
        const actualHeight = mainContainer.scrollHeight;
        const actualWidth = mainContainer.scrollWidth;
        
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
            `;
            clonedDoc.head.appendChild(style);
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Tính toán để fit content vào page
        const margin = 5; // 5mm margin
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        const scaleWidth = availableWidth / (canvas.width / 3.78);
        const scaleHeight = availableHeight / (canvas.height / 3.78);
        const scale = Math.min(scaleWidth, scaleHeight);
        
        const finalWidth = (canvas.width / 3.78) * scale;
        const finalHeight = (canvas.height / 3.78) * scale;
        
        const xOffset = (pageWidth - finalWidth) / 2;
        const yOffset = (pageHeight - finalHeight) / 2;
        
        // Nếu content cao hơn một trang, tạo nhiều trang
        if (finalHeight > availableHeight) {
          const pagesNeeded = Math.ceil(finalHeight / availableHeight);
          
          for (let page = 0; page < pagesNeeded; page++) {
            if (page > 0) pdf.addPage();
            
            const yStart = page * availableHeight;
            const pageImageHeight = Math.min(availableHeight, finalHeight - yStart);
            
            // Cắt phần ảnh cho từng trang
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const img = new Image();
            
            await new Promise((resolve) => {
              img.onload = () => {
                tempCanvas.width = canvas.width;
                tempCanvas.height = (pageImageHeight / finalHeight) * canvas.height;
                
                tempCtx?.drawImage(
                  img,
                  0, (yStart / finalHeight) * canvas.height,
                  canvas.width, tempCanvas.height,
                  0, 0,
                  tempCanvas.width, tempCanvas.height
                );
                
                const tempImgData = tempCanvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(tempImgData, 'JPEG', xOffset, yOffset, finalWidth, pageImageHeight);
                resolve(null);
              };
              img.src = imgData;
            });
          }
        } else {
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
        }
      }

      pdf.save(filename.replace(/\s+/g, '_'));
    } catch (error) {
      console.error('Error creating PDF:', error);
      throw error;
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleExport = async () => {
    if (selectedIdeas.length === 0) {
      alert('Vui lòng chọn ít nhất một ý tưởng để export!');
      return;
    }

    setLoading(true);

    try {
      const selectedIdeasData = ideas.filter(idea => selectedIdeas.includes(idea._id));
      
      if (selectedIdeasData.length === 1) {
        const idea = selectedIdeasData[0];
        const htmlContent = generateHTMLReport(idea);
        const filename = `Bao_Cao_Cai_Tien_A3_${idea.ideaCode || idea._id}.pdf`;
        await createPdfFromHtml(htmlContent, filename);
      } else {
        for (const idea of selectedIdeasData) {
          const htmlContent = generateHTMLReport(idea);
          const filename = `Bao_Cao_Cai_Tien_A3_${idea.ideaCode || idea._id}.pdf`;
          await createPdfFromHtml(htmlContent, filename);
          // Delay giữa các file để tránh lỗi
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Có lỗi xảy ra khi export báo cáo!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Export Báo Cáo Cải Tiến A3
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chọn các ý tưởng cần export báo cáo theo format A3. Các ô sẽ tự động giãn ra để chứa đầy đủ nội dung.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleSelectAll}
              sx={{ minWidth: 120 }}
            >
              {selectedIdeas.length === filteredIdeas.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
            <Chip 
              label={`Đã chọn: ${selectedIdeas.length}/${filteredIdeas.length}`}
              color="primary"
              size="small"
            />
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Chỉ hiển thị các ý tưởng có trạng thái "Lập báo cáo A3" ({filteredIdeas.length} ý tưởng)
        </Alert>
        
        <FormControl fullWidth>
          <InputLabel>Chọn ý tưởng cần export</InputLabel>
          <Select
            multiple
            value={selectedIdeas}
            onChange={(e) => setSelectedIdeas(e.target.value as string[])}
            renderValue={(selected) => `${selected.length} ý tưởng đã chọn`}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                },
              },
            }}
          >
            {filteredIdeas.map((idea) => (
              <MenuItem key={idea._id} value={idea._id}>
                <Checkbox checked={selectedIdeas.includes(idea._id)} />
                <ListItemText 
                  primary={`${idea.ideaCode || 'N/A'} - ${idea.fullName || 'N/A'}`}
                  secondary={`${idea.department || 'N/A'} - ${idea.topicTitle || idea.idea?.substring(0, 50) + '...' || 'N/A'}`}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedIdeas.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Sẽ tạo {selectedIdeas.length} file báo cáo PDF A3. Các ô sẽ tự động mở rộng để hiển thị đầy đủ nội dung.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button 
          onClick={handleExport} 
          variant="contained" 
          color="primary"
          disabled={selectedIdeas.length === 0 || loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Đang export PDF A3...' : 'Export PDF A3'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportReportDialog;
