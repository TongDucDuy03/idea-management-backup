import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import api from '../api/config';
import { Idea } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import A3LayoutEditor from './A3LayoutEditor';

interface A3ReportFormProps {
  idea: Idea | null;
  onClose: () => void;
}

const A3ReportForm: React.FC<A3ReportFormProps> = ({ idea, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
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

      // Cập nhật qua endpoint có xác thực. Endpoint công khai theo mã ý tưởng
      // (PUT /ideas/code/:ideaCode) đã bị gỡ vì cho phép sửa nội dung mà không
      // cần đăng nhập.
      const response = await api.put(`/ideas/${idea._id}`, reportData);

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

  type ParsedIdeaKey =
    | 'title'
    | 'currentSituation'
    | 'countermeasure'
    | 'benefit'
    | 'evaluation'
    | 'cost'
    | 'reward'
    | 'metadata';

  const IDEA_LABEL_GROUPS: Array<{ key: ParsedIdeaKey; aliases: string[] }> = [
    { key: 'title', aliases: ['Tên ý tưởng', 'Tên đề tài'] },
    { key: 'metadata', aliases: ['Mã ý tưởng', 'Người đề xuất', 'Người lập', 'Đơn vị'] },
    { key: 'currentSituation', aliases: ['Hiện trạng và vấn đề', 'Vấn đề và hiện trạng', 'Thực trạng hiện tại', 'Hiện trạng', 'Thực trạng'] },
    { key: 'countermeasure', aliases: ['Giải pháp đề xuất', 'Đối sách đề xuất', 'Đối sách', 'Giải pháp'] },
    { key: 'benefit', aliases: ['Lợi ích mang lại', 'Kết quả đạt được', 'Lợi ích'] },
    { key: 'evaluation', aliases: ['Cơ hội nhân rộng phát triển', 'Cơ hội nhân rộng', 'Đánh giá kết quả', 'Đánh giá'] },
    { key: 'cost', aliases: ['Nguồn lực sử dụng', 'Chi phí thực hiện', 'Nguồn lực', 'Chi phí'] },
    { key: 'reward', aliases: ['Mô tả cách tính', 'Đề xuất khen thưởng', 'Khen thưởng'] },
  ];

  const cleanExtractedText = (value: string) =>
    value
      .replace(/^[\s:：\-–—|]+/, '')
      .replace(/[\s💡🔧⚠️✅📌💰🎯📊🧮🏆]+$/u, '')
      .trim();

  const parseStructuredIdeaText = (ideaText?: string) => {
    const result: Partial<Record<Exclude<ParsedIdeaKey, 'metadata'>, string>> = {};
    if (!ideaText?.trim()) return result;

    const lowerText = ideaText.toLocaleLowerCase('vi-VN');
    const markers: Array<{ key: ParsedIdeaKey; index: number; length: number }> = [];

    IDEA_LABEL_GROUPS.forEach(group => {
      const matches = group.aliases
        .map(alias => ({
          key: group.key,
          index: lowerText.indexOf(alias.toLocaleLowerCase('vi-VN')),
          length: alias.length,
        }))
        .filter(match => match.index >= 0)
        .sort((a, b) => a.index - b.index || b.length - a.length);
      if (matches[0]) markers.push(matches[0]);
    });

    markers.sort((a, b) => a.index - b.index);
    markers.forEach((marker, index) => {
      if (marker.key === 'metadata') return;
      const nextMarker = markers[index + 1];
      const end = nextMarker ? nextMarker.index : ideaText.length;
      const value = cleanExtractedText(
        ideaText.slice(marker.index + marker.length, end)
      );
      if (value) result[marker.key] = value;
    });

    return result;
  };

  const normalizeImageSource = (source: unknown) => {
    if (typeof source !== 'string' || !source.trim()) return '';
    const value = source.trim();
    if (value.startsWith('data:image/') || value.startsWith('blob:')) return value;

    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.pathname === '/uploads' || parsed.pathname.startsWith('/uploads/')) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return parsed.href;
    } catch {
      return value;
    }
  };

  const resolveImage = (ideaItem: any, key: 'beforeImage' | 'afterImage') => {
    const raw = ideaItem[key];
    const urlKey = key === 'beforeImage' ? 'beforeImageUrl' : 'afterImageUrl';
    const pathKey = key === 'beforeImage' ? 'beforeImagePath' : 'afterImagePath';

    if (typeof raw === 'string' && raw.startsWith('data:image/')) return raw;
    return normalizeImageSource(ideaItem[pathKey])
      || normalizeImageSource(ideaItem[urlKey])
      || normalizeImageSource(raw);
  };

  const generateHTMLReport = (idea: Idea): string => {
    const structuredIdea = parseStructuredIdeaText(idea.idea);
    const hasStructuredSections = Object.keys(structuredIdea).length > 0;
    const reportTitle = structuredIdea.title || (idea.idea ? idea.idea.split('\n')[0] : 'Chưa có tên ý tưởng');

    const currentSituation =
      idea.solution ||
      structuredIdea.currentSituation ||
      (!hasStructuredSections ? idea.idea : '') ||
      'Chưa có nội dung thực trạng';

    const countermeasure =
      idea.benefit ||
      structuredIdea.countermeasure ||
      'Chưa có nội dung đối sách';

    const benefitText =
      idea.benefitOutcome ||
      structuredIdea.benefit ||
      'Chưa có nội dung lợi ích';

    const evaluationText =
      idea.scalingOpportunity ||
      structuredIdea.evaluation ||
      'Chưa có nội dung đánh giá';

    const costText =
      idea.resourcesUsed ||
      structuredIdea.cost ||
      'Chưa có nội dung chi phí';

    const rewardText =
      idea.calculationDescription ||
      structuredIdea.reward ||
      'Chưa có nội dung khen thưởng';

    const beforeImg = resolveImage(idea, 'beforeImage');
    const afterImg = resolveImage(idea, 'afterImage');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111827; }
    .a3-container {
      width: 1120px;
      height: 792px;
      background: #ffffff;
      border: 2px solid #111827;
      display: flex;
      flex-direction: column;
      color: #111827;
      font-family: Arial, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
    }
    .header {
      height: 118px;
      display: grid;
      grid-template-columns: 120px 1fr 300px;
      border-bottom: 2px solid #111827;
      flex-shrink: 0;
    }
    .logo-box {
      border-right: 1px solid #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    .title-box {
      border-right: 1px solid #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 16px;
    }
    .meta-box {
      display: grid;
      grid-template-rows: repeat(4, 1fr);
      font-size: 11px;
    }
    .meta-row {
      padding: 0 8px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #111827;
    }
    .meta-row:last-child { border-bottom: none; }
    .main-body {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 76px 1fr;
    }
    .approval-sidebar {
      border-right: 2px solid #111827;
      display: grid;
      grid-template-rows: repeat(4, 1fr);
    }
    .approval-cell {
      border-bottom: 1px solid #111827;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-direction: column;
      padding-bottom: 6px;
      padding-left: 4px;
      padding-right: 4px;
      font-size: 10px;
      font-weight: 800;
      text-align: center;
      line-height: 1.2;
      box-sizing: border-box;
    }
    .approval-cell:last-child { border-bottom: none; }
    .content-grid {
      min-height: 0;
      display: grid;
      grid-template-rows: 30% 38% 32%;
      overflow: hidden;
    }
    .grid-row-1 {
      min-height: 0;
      display: grid;
      grid-template-columns: 50% 50%;
    }
    .grid-row-2 {
      min-height: 0;
      display: grid;
      grid-template-columns: 50% 50%;
    }
    .grid-row-3 {
      min-height: 0;
      display: grid;
      grid-template-columns: 25% 25% 25% 25%;
    }
    .section-card {
      height: 100%;
      min-width: 0;
      border: 1px solid #111827;
      display: flex;
      flex-direction: column;
      background-color: #fff;
      overflow: hidden;
      box-sizing: border-box;
    }
    .section-header {
      min-height: 27px;
      padding: 3px 8px;
      background-color: #dbeafe;
      border-bottom: 1px solid #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
      flex-shrink: 0;
    }
    .section-body {
      flex: 1;
      min-height: 0;
      padding: 7px;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-line;
      text-align: justify;
      overflow: hidden;
      word-break: break-word;
      color: #111827;
    }
    .image-body {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      overflow: hidden;
      padding: 4px;
    }
    .image-body img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
    .image-placeholder {
      color: #94a3b8;
      font-style: italic;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="a3-container">
    <div class="header">
      <div class="logo-box">
        <img src="${logoDataUrl || '/vico-logo.png'}" alt="VICO" style="max-width: 92px; max-height: 72px; object-fit: contain;" />
      </div>
      <div class="title-box">
        <div>
          <div style="font-weight: 900; font-size: 18px;">CÔNG TY TNHH THẮNG LỢI</div>
          <div style="font-weight: 900; font-size: 22px; color: #1d4ed8; margin: 2px 0;">BÁO CÁO CẢI TIẾN A3</div>
          <div style="font-weight: 700; font-size: 12px; margin-top: 4px; max-height: 34px; overflow: hidden; color: #334155;">
            ${reportTitle}
          </div>
        </div>
      </div>
      <div class="meta-box">
        <div class="meta-row"><b>Mã:</b>&nbsp;${idea.ideaCode || 'N/A'}</div>
        <div class="meta-row"><b>Người lập:</b>&nbsp;${idea.fullName || 'N/A'}</div>
        <div class="meta-row"><b>Ngày lập:</b>&nbsp;${new Date().toLocaleDateString('vi-VN')}</div>
        <div class="meta-row"><b>Đơn vị:</b>&nbsp;${idea.department || 'N/A'}</div>
      </div>
    </div>

    <div class="main-body">
      <div class="approval-sidebar">
        <div class="approval-cell">NGƯỜI LẬP</div>
        <div class="approval-cell">P. CẢI TIẾN</div>
        <div class="approval-cell">GĐ KT</div>
        <div class="approval-cell">GĐ ĐH</div>
      </div>

      <div class="content-grid">
        <!-- Row 1: Thực trạng & Đối sách -->
        <div class="grid-row-1">
          <div class="section-card">
            <div class="section-header">THỰC TRẠNG</div>
            <div class="section-body">${currentSituation}</div>
          </div>
          <div class="section-card">
            <div class="section-header">ĐỐI SÁCH</div>
            <div class="section-body">${countermeasure}</div>
          </div>
        </div>

        <!-- Row 2: Hình ảnh trước & Hình ảnh sau -->
        <div class="grid-row-2">
          <div class="section-card">
            <div class="section-header">HÌNH ẢNH TRƯỚC</div>
            <div class="section-body image-body">
              ${beforeImg ? `<img src="${beforeImg}" crossOrigin="anonymous" alt="Hình ảnh trước" />` : `<span class="image-placeholder">Chưa có hình ảnh</span>`}
            </div>
          </div>
          <div class="section-card">
            <div class="section-header">HÌNH ẢNH SAU</div>
            <div class="section-body image-body">
              ${afterImg ? `<img src="${afterImg}" crossOrigin="anonymous" alt="Hình ảnh sau" />` : `<span class="image-placeholder">Chưa có hình ảnh</span>`}
            </div>
          </div>
        </div>

        <!-- Row 3: Lợi ích, Đánh giá, Chi phí, Khen thưởng -->
        <div class="grid-row-3">
          <div class="section-card">
            <div class="section-header">LỢI ÍCH</div>
            <div class="section-body">${benefitText}</div>
          </div>
          <div class="section-card">
            <div class="section-header">ĐÁNH GIÁ</div>
            <div class="section-body">${evaluationText}</div>
          </div>
          <div class="section-card">
            <div class="section-header">CHI PHÍ</div>
            <div class="section-body">${costText}</div>
          </div>
          <div class="section-card">
            <div class="section-header">KHEN THƯỞNG</div>
            <div class="section-body">${rewardText}</div>
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
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '1120px';
    container.style.height = '792px';
    container.style.background = '#ffffff';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (document.fonts?.ready) await document.fonts.ready;

      const mainContainer = container.querySelector('.a3-container') as HTMLElement;
      if (!mainContainer) throw new Error('Không tìm thấy container A3');

      // Chờ các hình ảnh load xong
      const images = Array.from(mainContainer.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete) {
          return img.decode ? img.decode().catch(() => undefined) : Promise.resolve();
        }
        return new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }));

      const canvas = await html2canvas(mainContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Sanitize all style tags inside cloned iframe
          clonedDoc.querySelectorAll('style').forEach(styleTag => {
            if (styleTag.textContent) {
              styleTag.textContent = styleTag.textContent.replace(
                /\b(?:oklch|oklab|lab|lch|color)\s*\([^)]*\)/gi,
                '#000000'
              );
            }
          });

          // Sanitize elements
          clonedDoc.querySelectorAll<HTMLElement>('*').forEach(el => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr && /\b(?:oklch|oklab|lab|lch|color)\s*\(/i.test(styleAttr)) {
              el.setAttribute('style', styleAttr.replace(/\b(?:oklch|oklab|lab|lch|color)\s*\([^)]*\)/gi, '#000000'));
            }
          });
        }
      });

      const pdf = new jsPDF('l', 'mm', 'a3');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const width = canvas.width * scale;
      const height = canvas.height * scale;

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.96),
        'JPEG',
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height,
        undefined,
        'FAST'
      );

      pdf.save(filename.replace(/\s+/g, '_'));
    } catch (error) {
      console.error('Error creating PDF:', error);
      throw error;
    } finally {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
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
        setLayoutEditorOpen(true);
      }, 300);
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
    <>
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
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
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
              onClick={() => setLayoutEditorOpen(true)}
              disabled={loading || saving}
              startIcon={<TuneIcon />}
              sx={{ minWidth: 200 }}
            >
              Xem trước & căn chỉnh
            </Button>

            <Button
              variant="outlined"
              color="success"
              onClick={handleExport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              sx={{ minWidth: 150 }}
            >
              {loading ? 'Đang xuất...' : 'Xuất nhanh'}
            </Button>
            
            <Button
              variant="contained"
              color="info"
              onClick={handleSaveAndExport}
              disabled={saving || loading}
              startIcon={saving || loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              sx={{ minWidth: 200 }}
            >
              {saving || loading ? 'Đang xử lý...' : 'Lưu & căn chỉnh'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
      <A3LayoutEditor
        open={layoutEditorOpen}
        idea={{ ...idea, ...reportData } as Idea}
        filename={`Bao_Cao_Cai_Tien_A3_${idea.ideaCode || idea._id}.pdf`}
        onClose={() => setLayoutEditorOpen(false)}
      />
    </>
  );
};

export default A3ReportForm;
