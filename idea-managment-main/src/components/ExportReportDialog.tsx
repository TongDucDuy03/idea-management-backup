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
import { Idea, IdeaStatus } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Tune as TuneIcon } from '@mui/icons-material';
import A3LayoutEditor from './A3LayoutEditor';

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
  const [layoutEditorIdea, setLayoutEditorIdea] = useState<Idea | null>(null);

  // Lọc các ý tưởng có trạng thái "BAO_CAO_A3"
  const filteredIdeas = ideas.filter(idea => {
    const status = idea.status;
    // Handle backward compatibility
    if (!Object.values(IdeaStatus).includes(status as IdeaStatus)) {
      // Legacy: check implementationStatus
      return (idea as any).implementationStatus === 'Lập báo cáo A3';
    }
    return status === IdeaStatus.BAO_CAO_A3;
  });

  // Reset selected ideas when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIdeas([]);
      setLayoutEditorIdea(null);
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

  const handleSelectAll = () => {
    if (selectedIdeas.length === filteredIdeas.length) {
      setSelectedIdeas([]);
    } else {
      setSelectedIdeas(filteredIdeas.map(idea => idea._id));
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
        // Đặt tên file: Mã ý tưởng + Tên người gửi ý tưởng
        const filename = `${idea.fullName }_${idea.ideaCode}.pdf`;
        await createPdfFromHtml(htmlContent, filename);
      } else {
        for (const idea of selectedIdeasData) {
          const htmlContent = generateHTMLReport(idea);
          // Đặt tên file: Mã ý tưởng + Tên người gửi ý tưởng
          const filename = `$${idea.fullName}_${idea.ideaCode}.pdf`;
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
    <>
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
                  secondary={`${idea.department || 'N/A'} - ${idea.idea?.substring(0, 50) + '...' || 'N/A'}`}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedIdeas.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {selectedIdeas.length === 1
              ? 'Bạn có thể xem trước, kéo căn chỉnh rồi xuất đúng bố cục đang xem.'
              : `Sẽ tạo ${selectedIdeas.length} file PDF theo mẫu xuất nhanh. Để căn chỉnh riêng, hãy chọn từng ý tưởng một.`}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          onClick={() => {
            const selectedIdea = filteredIdeas.find(idea => idea._id === selectedIdeas[0]);
            if (selectedIdea) setLayoutEditorIdea(selectedIdea);
          }}
          variant="outlined"
          color="primary"
          disabled={selectedIdeas.length !== 1 || loading}
          startIcon={<TuneIcon />}
        >
          Xem trước & căn chỉnh
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
      {layoutEditorIdea && (
        <A3LayoutEditor
          open={Boolean(layoutEditorIdea)}
          idea={layoutEditorIdea}
          filename={`Bao_Cao_Cai_Tien_A3_${layoutEditorIdea.ideaCode || layoutEditorIdea._id}.pdf`}
          onClose={() => setLayoutEditorIdea(null)}
        />
      )}
    </>
  );
};

export default ExportReportDialog;
