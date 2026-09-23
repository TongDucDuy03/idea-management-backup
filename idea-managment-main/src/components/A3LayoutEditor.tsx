import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
} from '@mui/material';
import {
  AutoFixHigh,
  Close,
  Download,
  DragIndicator,
  RestartAlt,
  Save,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { reportFileName } from '../utils/reportFileName';
import { safeImageSource } from '../utils/safeHtml';
import { Idea } from '../types';

type SectionKey =
  | 'currentSituation'
  | 'countermeasure'
  | 'beforeImage'
  | 'afterImage'
  | 'benefit'
  | 'evaluation'
  | 'cost'
  | 'reward';

type ImageFit = 'contain' | 'cover';

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

/**
 * Tách dữ liệu legacy/import khi nhiều trường A3 được ghép vào `idea`
 * dưới dạng "💡 Tên ý tưởng ... ⚠ Hiện trạng ... 🔧 Giải pháp ...".
 */
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

interface SectionStyle {
  fontSize: number;
  padding: number;
  imageFit: ImageFit;
}

/**
 * Bố cục 3 cột dọc (ảnh | thực trạng+lợi ích | giải pháp+đánh giá+chi phí+khen
 * thưởng), mỗi cột tự chia hàng riêng. `order` vẫn là mảng phẳng 8 phần tử —
 * order[0..1] luôn thuộc cột ảnh, order[2..3] luôn thuộc cột giữa, order[4..7]
 * luôn thuộc cột phải — nên cơ chế kéo-thả hoán đổi vị trí (swapSections) giữ
 * nguyên logic cũ, chỉ đổi hình dạng lưới mà các vị trí đó ánh xạ tới.
 */
export interface A3LayoutConfig {
  version: 2;
  columnWidths: number[];
  imageRowHeights: number[];
  mainRowHeights: number[];
  rightRowHeights: number[];
  order: SectionKey[];
  styles: Record<SectionKey, SectionStyle>;
}

interface A3LayoutEditorProps {
  open: boolean;
  idea: Idea;
  onClose: () => void;
  filename?: string;
}

const SECTION_META: Record<SectionKey, { label: string; kind: 'text' | 'image' }> = {
  currentSituation: { label: 'THỰC TRẠNG', kind: 'text' },
  countermeasure: { label: 'GIẢI PHÁP', kind: 'text' },
  beforeImage: { label: 'HÌNH ẢNH TRƯỚC', kind: 'image' },
  afterImage: { label: 'HÌNH ẢNH SAU', kind: 'image' },
  benefit: { label: 'LỢI ÍCH', kind: 'text' },
  evaluation: { label: 'ĐÁNH GIÁ', kind: 'text' },
  cost: { label: 'CHI PHÍ', kind: 'text' },
  reward: { label: 'KHEN THƯỞNG', kind: 'text' },
};

const createDefaultStyles = (): Record<SectionKey, SectionStyle> =>
  Object.keys(SECTION_META).reduce((result, key) => {
    result[key as SectionKey] = {
      fontSize: 13,
      padding: 7,
      imageFit: 'contain',
    };
    return result;
  }, {} as Record<SectionKey, SectionStyle>);

const DEFAULT_LAYOUT: A3LayoutConfig = {
  version: 2,
  columnWidths: [18, 44, 38],
  imageRowHeights: [50, 50],
  mainRowHeights: [22, 78],
  rightRowHeights: [25, 25, 25, 25],
  order: [
    'beforeImage',
    'afterImage',
    'currentSituation',
    'benefit',
    'countermeasure',
    'evaluation',
    'cost',
    'reward',
  ],
  styles: createDefaultStyles(),
};

const cloneLayout = (layout: A3LayoutConfig): A3LayoutConfig =>
  JSON.parse(JSON.stringify(layout));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizePercentages = (values: number[]) => {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map(value => (value / total) * 100);
};

/**
 * Keep uploaded images on the frontend origin. An image loaded directly from
 * the backend can render in an img tag but still taint the export canvas.
 */
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

const UNSUPPORTED_CANVAS_COLOR = /\b(?:oklch|oklab|lab|lch|color)\s*\(/i;
const CANVAS_COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'column-rule-color',
  'fill',
  'stroke',
] as const;

/**
 * html2canvas 1.4 cannot parse CSS Color 4 functions such as oklch(). Modern
 * browsers, themes and translation extensions may inject those values even
 * when this component only declares hex colors. Temporarily override only the
 * unsupported computed values, then restore every original inline style.
 */
const sanitizeCanvasColors = (root: HTMLElement) => {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const changed: Array<{ element: HTMLElement; inlineStyle: string | null }> = [];

  elements.forEach(element => {
    const computed = window.getComputedStyle(element);
    const replacements: Array<[string, string]> = [];

    CANVAS_COLOR_PROPERTIES.forEach(property => {
      const value = computed.getPropertyValue(property);
      if (!UNSUPPORTED_CANVAS_COLOR.test(value)) return;

      const fallback = property === 'background-color'
        ? '#ffffff'
        : property === 'outline-color'
          ? '#2563eb'
          : '#111827';
      replacements.push([property, fallback]);
    });

    ['box-shadow', 'text-shadow', 'background-image'].forEach(property => {
      const value = computed.getPropertyValue(property);
      if (UNSUPPORTED_CANVAS_COLOR.test(value)) {
        replacements.push([property, 'none']);
      }
    });

    if (replacements.length === 0) return;
    changed.push({ element, inlineStyle: element.getAttribute('style') });
    replacements.forEach(([property, value]) => {
      element.style.setProperty(property, value, 'important');
    });
  });

  return () => {
    changed.forEach(({ element, inlineStyle }) => {
      if (inlineStyle === null) element.removeAttribute('style');
      else element.setAttribute('style', inlineStyle);
    });
  };
};

const isValidLayout = (value: any): value is A3LayoutConfig => {
  // Layout kiểu cũ (version 1, hàng ngang) không tương thích cấu trúc cột mới
  // — rơi về mặc định thay vì cố migrate, đơn giản và an toàn hơn.
  return Boolean(
    value &&
    value.version === 2 &&
    Array.isArray(value.order) && value.order.length === 8 &&
    Array.isArray(value.columnWidths) && value.columnWidths.length === 3 &&
    Array.isArray(value.imageRowHeights) && value.imageRowHeights.length === 2 &&
    Array.isArray(value.mainRowHeights) && value.mainRowHeights.length === 2 &&
    Array.isArray(value.rightRowHeights) && value.rightRowHeights.length === 4
  );
};

/* ---- A3 Canvas (96 DPI landscape) ---- */
const A3_CANVAS_WIDTH = 1588;
const A3_CANVAS_HEIGHT = 1123;
const A3_HEADER_HEIGHT = 168;

const A3LayoutEditor: React.FC<A3LayoutEditorProps> = ({
  open,
  idea,
  onClose,
  filename,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentGridRef = useRef<HTMLDivElement>(null);
  const imageColumnRef = useRef<HTMLDivElement>(null);
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<A3LayoutConfig>(() => cloneLayout(DEFAULT_LAYOUT));
  const [selectedSection, setSelectedSection] = useState<SectionKey>('currentSituation');
  const [draggedSection, setDraggedSection] = useState<SectionKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [, setViewportTick] = useState(0);

  /* Re-calculate fit-scale whenever the viewport resizes */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !open) return;
    const observer = new ResizeObserver(() => setViewportTick(t => t + 1));
    observer.observe(vp);
    return () => observer.disconnect();
  }, [open]);

  /* Compute the display scale factor */
  const computeFitScale = () => {
    const vp = viewportRef.current;
    if (!vp) return 0.65;
    const padding = 48;
    const availW = vp.clientWidth - padding;
    const availH = vp.clientHeight - padding;
    return Math.min(availW / A3_CANVAS_WIDTH, availH / A3_CANVAS_HEIGHT, 1);
  };
  const displayScale = zoom === 'fit' ? computeFitScale() : zoom / 100;

  const reportStorageKey = `a3_layout_${idea.ideaCode || idea._id}`;
  const defaultStorageKey = 'a3_layout_default';

  useEffect(() => {
    if (!open) return;
    try {
      const reportLayout = localStorage.getItem(reportStorageKey);
      const defaultLayout = localStorage.getItem(defaultStorageKey);
      const parsed = reportLayout
        ? JSON.parse(reportLayout)
        : defaultLayout
          ? JSON.parse(defaultLayout)
          : null;
      setLayout(isValidLayout(parsed) ? parsed : cloneLayout(DEFAULT_LAYOUT));
    } catch {
      setLayout(cloneLayout(DEFAULT_LAYOUT));
    }
    setMessage('');
    setError('');
  }, [open, reportStorageKey]);

  const structuredIdea = useMemo(() => parseStructuredIdeaText(idea.idea), [idea.idea]);
  const hasStructuredSections = Boolean(
    structuredIdea.currentSituation ||
    structuredIdea.countermeasure ||
    structuredIdea.benefit ||
    structuredIdea.evaluation ||
    structuredIdea.cost ||
    structuredIdea.reward
  );
  const reportTitle = structuredIdea.title || idea.idea || 'Chưa có tên đề tài';

  const sectionContent = useMemo<Record<SectionKey, string>>(() => ({
    currentSituation:
      idea.solution ||
      structuredIdea.currentSituation ||
      (!hasStructuredSections ? idea.idea : '') ||
      'Chưa có nội dung thực trạng',
    countermeasure:
      idea.benefit ||
      structuredIdea.countermeasure ||
      'Chưa có nội dung đối sách',
    beforeImage: '',
    afterImage: '',
    benefit:
      idea.benefitOutcome ||
      structuredIdea.benefit ||
      'Chưa có nội dung lợi ích',
    evaluation:
      idea.scalingOpportunity ||
      structuredIdea.evaluation ||
      'Chưa có nội dung đánh giá',
    cost:
      idea.resourcesUsed ||
      structuredIdea.cost ||
      'Chưa có nội dung chi phí',
    reward:
      idea.calculationDescription ||
      structuredIdea.reward ||
      'Chưa có nội dung khen thưởng',
  }), [idea, structuredIdea, hasStructuredSections]);

  const resolveImage = (key: 'beforeImage' | 'afterImage') => {
    const row = idea as any;
    const raw = row[key];
    const urlKey = key === 'beforeImage' ? 'beforeImageUrl' : 'afterImageUrl';
    const pathKey = key === 'beforeImage' ? 'beforeImagePath' : 'afterImagePath';

    return safeImageSource(raw)
      || safeImageSource(row[pathKey])
      || safeImageSource(row[urlKey]);
  };

  const updateSelectedStyle = (patch: Partial<SectionStyle>) => {
    setLayout(previous => ({
      ...previous,
      styles: {
        ...previous.styles,
        [selectedSection]: {
          ...previous.styles[selectedSection],
          ...patch,
        },
      },
    }));
  };

  const swapSections = (source: SectionKey, target: SectionKey) => {
    if (source === target) return;
    setLayout(previous => {
      const order = [...previous.order];
      const sourceIndex = order.indexOf(source);
      const targetIndex = order.indexOf(target);
      [order[sourceIndex], order[targetIndex]] = [order[targetIndex], order[sourceIndex]];
      return { ...previous, order };
    });
    setSelectedSection(source);
  };

  /**
   * Kéo 1 đường chia để đổi tỷ lệ giữa 2 phần tử liền kề trong một mảng %
   * (chiều rộng 3 cột, hoặc chiều cao các ô con trong 1 cột). Dùng chung cho
   * mọi tay kéo trong bố cục — chỉ khác trục (x = đổi cột, y = đổi hàng) và
   * mảng/containers truyền vào.
   */
  const startAxisResize = (
    event: React.PointerEvent,
    containerRef: React.RefObject<HTMLDivElement>,
    axis: 'x' | 'y',
    values: number[],
    dividerIndex: number,
    onChange: (next: number[]) => void,
    minPercent = 10,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const start = axis === 'x' ? event.clientX : event.clientY;
    const rect = container.getBoundingClientRect();
    const size = axis === 'x' ? rect.width : rect.height;
    const startValues = [...values];

    const handleMove = (moveEvent: PointerEvent) => {
      const current = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
      const deltaPercent = ((current - start) / size) * 100;
      const next = [...startValues];
      const left = startValues[dividerIndex] + deltaPercent;
      const right = startValues[dividerIndex + 1] - deltaPercent;
      if (left < minPercent || right < minPercent) return;
      next[dividerIndex] = left;
      next[dividerIndex + 1] = right;
      onChange(normalizePercentages(next));
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleAutoBalance = () => {
    const lengthFor = (key: SectionKey) => sectionContent[key]?.length || 0;

    // Cột giữa: Hiện trạng thường ngắn hơn nhiều so với Lợi ích — giữ Hiện
    // trạng trong khoảng 15–45% để Lợi ích luôn là điểm nhấn của báo cáo.
    const currentSituationLength = lengthFor(layout.order[2]);
    const benefitLength = lengthFor(layout.order[3]);
    const totalMain = currentSituationLength + benefitLength || 1;
    const proposedMainSplit = clamp((currentSituationLength / totalMain) * 100, 15, 45);

    // Cột phải: 4 ô chia theo độ dài nội dung tương đối.
    const rightLengths = layout.order.slice(4).map(key => Math.max(80, lengthFor(key)));
    const rightRowHeights = normalizePercentages(rightLengths).map(value => clamp(value, 15, 40));

    setLayout(previous => ({
      ...previous,
      mainRowHeights: normalizePercentages([proposedMainSplit, 100 - proposedMainSplit]),
      rightRowHeights: normalizePercentages(rightRowHeights),
    }));
    setMessage('Đã tự cân đối theo độ dài nội dung. Bạn có thể kéo chỉnh thêm.');
  };

  const handleReset = () => {
    setLayout(cloneLayout(DEFAULT_LAYOUT));
    setSelectedSection('currentSituation');
    setMessage('Đã khôi phục bố cục mặc định.');
  };

  const handleSaveLayout = (asDefault = false) => {
    try {
      localStorage.setItem(asDefault ? defaultStorageKey : reportStorageKey, JSON.stringify(layout));
      setMessage(asDefault
        ? 'Đã lưu làm mẫu mặc định trên thiết bị này.'
        : 'Đã lưu bố cục cho báo cáo hiện tại trên thiết bị này.');
      setError('');
    } catch {
      setError('Không thể lưu bố cục trên trình duyệt này.');
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    setError('');
    setMessage('');
    let restoreCanvasColors: () => void = () => undefined;
    try {
      await new Promise(resolve => window.setTimeout(resolve, 100));
      if (document.fonts?.ready) await document.fonts.ready;
      const images = Array.from(canvasRef.current.querySelectorAll('img'));
      await Promise.all(images.map(image => {
        if (image.complete) {
          return image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
        }
        return new Promise<void>(resolve => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      }));

      const failedImages = images.filter(image => !image.complete || image.naturalWidth === 0);
      if (failedImages.length > 0) {
        const labels = failedImages
          .map(image => image.alt || 'ảnh không xác định')
          .join(', ');
        throw new Error(`Không tải được ${labels}. Hãy kiểm tra file ảnh hoặc đường dẫn /uploads.`);
      }

      restoreCanvasColors = sanitizeCanvasColors(canvasRef.current);
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // 1. Sanitize all <style> tags inside cloned iframe to prevent oklch CSS parse errors
          clonedDoc.querySelectorAll('style').forEach(styleTag => {
            if (styleTag.textContent) {
              styleTag.textContent = styleTag.textContent.replace(
                /\b(?:oklch|oklab|lab|lch|color)\s*\([^)]*\)/gi,
                '#000000'
              );
            }
          });

          // 2. Sanitize all elements inside clonedDoc
          clonedDoc.querySelectorAll<HTMLElement>('*').forEach(el => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr && /\b(?:oklch|oklab|lab|lch|color)\s*\(/i.test(styleAttr)) {
              el.setAttribute(
                'style',
                styleAttr.replace(/\b(?:oklch|oklab|lab|lch|color)\s*\([^)]*\)/gi, '#000000')
              );
            }
          });
        },
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
      pdf.save(filename || reportFileName(idea.fullName, idea.ideaCode || idea._id));
      setMessage('Đã lưu và xuất PDF đúng theo bố cục đang xem.');
    } catch (exportError) {
      console.error('A3 layout export error:', exportError);
      const detail = exportError instanceof Error
        ? exportError.message
        : String(exportError);
      setError(`Không thể xuất PDF: ${detail || 'Vui lòng thử lại.'}`);
    } finally {
      restoreCanvasColors();
      setExporting(false);
    }
  };

  const selectedMeta = SECTION_META[selectedSection];
  const selectedStyle = layout.styles[selectedSection];
  const selectedContentLength = sectionContent[selectedSection]?.length || 0;

  const renderSection = (key: SectionKey) => {
    const meta = SECTION_META[key];
    const style = layout.styles[key];
    const imageUrl = key === 'beforeImage' || key === 'afterImage' ? resolveImage(key) : '';
    return (
      <Box
        key={key}
        draggable={!exporting}
        onDragStart={() => setDraggedSection(key)}
        onDragEnd={() => setDraggedSection(null)}
        onDragOver={event => event.preventDefault()}
        onDrop={() => draggedSection && swapSections(draggedSection, key)}
        onClick={() => setSelectedSection(key)}
        sx={{
          height: '100%',
          minWidth: 0,
          border: '1px solid #111827',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#fff',
          overflow: 'hidden',
          cursor: exporting ? 'default' : 'pointer',
          outline: !exporting && selectedSection === key ? '3px solid #2563eb' : 'none',
          outlineOffset: -3,
          opacity: draggedSection === key ? 0.55 : 1,
        }}
      >
        <Box
          sx={{
            minHeight: 34,
            px: 1,
            py: 0.45,
            backgroundColor: '#dbeafe',
            borderBottom: '1px solid #111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {!exporting && (
            <DragIndicator sx={{ position: 'absolute', left: 4, fontSize: 17, color: '#64748b' }} />
          )}
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
            {meta.label}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            p: `${style.padding}px`,
            fontSize: `${style.fontSize}px`,
            lineHeight: 1.4,
            whiteSpace: 'pre-line',
            textAlign: 'justify',
            overflow: 'hidden',
            wordBreak: 'break-word',
            display: meta.kind === 'image' ? 'flex' : 'block',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {meta.kind === 'image' ? (
            imageUrl ? (
              <Box
                component="img"
                src={imageUrl}
                crossOrigin={imageUrl.startsWith('data:') || imageUrl.startsWith('blob:') ? undefined : 'anonymous'}
                alt={meta.label}
                sx={{ width: '100%', height: '100%', objectFit: style.imageFit }}
              />
            ) : (
              <Typography sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                Chưa có hình ảnh
              </Typography>
            )
          ) : sectionContent[key]}
        </Box>
      </Box>
    );
  };

  /** Tay kéo dọc để đổi bề rộng giữa 2 cột chính liền kề (cột 0..2). */
  const renderColumnDivider = (dividerIndex: number) => {
    const leftPercent = layout.columnWidths.slice(0, dividerIndex + 1).reduce((sum, value) => sum + value, 0);
    return (
      <Box
        onPointerDown={event => startAxisResize(
          event, contentGridRef, 'x', layout.columnWidths, dividerIndex,
          next => setLayout(previous => ({ ...previous, columnWidths: next })), 10,
        )}
        sx={{
          position: 'absolute', zIndex: 12, top: 0, bottom: 0, left: `${leftPercent}%`,
          width: 10, transform: 'translateX(-50%)', cursor: 'col-resize',
          '&::after': { content: '""', position: 'absolute', top: 0, bottom: 0, left: 4, width: 2, backgroundColor: '#2563eb', opacity: 0.65 },
        }}
      />
    );
  };

  /** Tay kéo ngang để đổi chiều cao giữa 2 ô liền kề bên trong một cột. */
  const renderRowDivider = (
    containerRef: React.RefObject<HTMLDivElement>,
    values: number[],
    dividerIndex: number,
    onChange: (next: number[]) => void,
  ) => {
    const topPercent = values.slice(0, dividerIndex + 1).reduce((sum, value) => sum + value, 0);
    return (
      <Box
        onPointerDown={event => startAxisResize(event, containerRef, 'y', values, dividerIndex, onChange, 10)}
        sx={{
          position: 'absolute', zIndex: 13, left: 0, right: 0, top: `${topPercent}%`,
          height: 10, transform: 'translateY(-50%)', cursor: 'row-resize',
          '&::after': { content: '""', position: 'absolute', left: 0, right: 0, top: 4, height: 2, backgroundColor: '#2563eb', opacity: 0.65 },
        }}
      />
    );
  };

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#e2e8f0',
        }}
      >
        <Box
          sx={{
            minHeight: 64,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            backgroundColor: '#fff',
            borderBottom: '1px solid #cbd5e1',
          }}
        >
          <IconButton aria-label="Đóng trình chỉnh sửa A3" onClick={onClose}>
            <Close />
          </IconButton>
          <Box sx={{ mr: 'auto' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Xem trước & căn chỉnh A3</Typography>
            <Typography variant="caption" color="text.secondary">
              Kéo đường xanh để đổi kích thước · Kéo tiêu đề ô để hoán đổi vị trí
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mx: 1, minWidth: 180 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Thu phóng:</Typography>
            <Slider
              size="small"
              min={30}
              max={150}
              step={5}
              value={zoom === 'fit' ? Math.round(computeFitScale() * 100) : zoom}
              onChange={(_, v) => setZoom(v as number)}
              valueLabelDisplay="auto"
              valueLabelFormat={v => `${v}%`}
              sx={{ mx: 1 }}
            />
            <Button size="small" variant={zoom === 'fit' ? 'contained' : 'outlined'} onClick={() => setZoom('fit')} sx={{ minWidth: 42, px: 1 }}>Fit</Button>
          </Box>
          <Button startIcon={<AutoFixHigh />} onClick={handleAutoBalance}>Tự cân đối</Button>
          <Button startIcon={<RestartAlt />} onClick={handleReset}>Khôi phục</Button>
          <Button startIcon={<Save />} onClick={() => handleSaveLayout(false)}>Lưu báo cáo này</Button>
          <Button variant="outlined" onClick={() => handleSaveLayout(true)}>Đặt làm mặc định</Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting ? 'Đang xử lý...' : 'Lưu và xuất PDF'}
          </Button>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <Box ref={viewportRef} sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 3, display: 'flex', alignItems: zoom === 'fit' ? 'center' : 'flex-start', justifyContent: 'center' }}>
            <Box sx={{
              width: A3_CANVAS_WIDTH * displayScale,
              height: A3_CANVAS_HEIGHT * displayScale,
              flexShrink: 0,
            }}>
              <Box
                ref={canvasRef}
                sx={{
                  width: A3_CANVAS_WIDTH,
                  height: A3_CANVAS_HEIGHT,
                  backgroundColor: '#fff',
                  border: '2px solid #111827',
                  boxShadow: exporting ? 'none' : '0 18px 50px rgba(15, 23, 42, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  color: '#111827',
                  fontFamily: 'Arial, sans-serif',
                  transform: exporting ? 'none' : `scale(${displayScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <Box sx={{ height: A3_HEADER_HEIGHT, display: 'grid', gridTemplateColumns: '160px 1fr 380px', borderBottom: '2px solid #111827' }}>
                  <Box sx={{ borderRight: '1px solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1.5 }}>
                    <Box component="img" src="/vico-logo.png" alt="VICO" sx={{ maxWidth: 120, maxHeight: 100, objectFit: 'contain' }} />
                  </Box>
                  <Box sx={{ borderRight: '1px solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 3 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: 24 }}>CÔNG TY TNHH THẮNG LỢI</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: 30, color: '#1d4ed8' }}>BÁO CÁO CẢI TIẾN A3</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 0.5, maxHeight: 48, overflow: 'hidden' }}>
                        {reportTitle}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', fontSize: 11 }}>
                    <Box sx={{ px: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid #111827' }}><b>Mã:</b>&nbsp;{idea.ideaCode || 'N/A'}</Box>
                    <Box sx={{ px: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid #111827' }}><b>Người lập:</b>&nbsp;{idea.fullName || 'N/A'}</Box>
                    <Box sx={{ px: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid #111827' }}><b>Ngày lập:</b>&nbsp;{new Date().toLocaleDateString('vi-VN')}</Box>
                    <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}><b>Đơn vị:</b>&nbsp;{idea.department || 'N/A'}</Box>
                  </Box>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <Box sx={{ borderRight: '2px solid #111827', display: 'grid', gridTemplateRows: 'repeat(4, 1fr)' }}>
                    {['NGƯỜI LẬP', 'P. CẢI TIẾN', 'GĐ KT', 'GĐ ĐH'].map(label => (
                      <Box
                        key={label}
                        sx={{
                          borderBottom: '1px solid #111827',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          flexDirection: 'column',
                          pb: 0.75,
                          px: 0.5,
                          fontSize: 10,
                          fontWeight: 800,
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {label}
                      </Box>
                    ))}
                  </Box>

                  <Box
                    ref={contentGridRef}
                    sx={{
                      minHeight: 0,
                      display: 'grid',
                      gridTemplateColumns: layout.columnWidths.map(value => `${value}%`).join(' '),
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Cột 1: Ảnh trước / Ảnh sau */}
                    <Box ref={imageColumnRef} sx={{ minHeight: 0, display: 'grid', gridTemplateRows: layout.imageRowHeights.map(value => `${value}%`).join(' '), position: 'relative' }}>
                      {renderSection(layout.order[0])}
                      {renderSection(layout.order[1])}
                      {!exporting && renderRowDivider(imageColumnRef, layout.imageRowHeights, 0, next => setLayout(previous => ({ ...previous, imageRowHeights: next })))}
                    </Box>
                    {/* Cột 2: Hiện trạng (nhỏ) / Lợi ích (lớn, trọng tâm báo cáo) */}
                    <Box ref={mainColumnRef} sx={{ minHeight: 0, display: 'grid', gridTemplateRows: layout.mainRowHeights.map(value => `${value}%`).join(' '), position: 'relative' }}>
                      {renderSection(layout.order[2])}
                      {renderSection(layout.order[3])}
                      {!exporting && renderRowDivider(mainColumnRef, layout.mainRowHeights, 0, next => setLayout(previous => ({ ...previous, mainRowHeights: next })))}
                    </Box>
                    {/* Cột 3: Giải pháp / Đánh giá / Chi phí / Khen thưởng */}
                    <Box ref={rightColumnRef} sx={{ minHeight: 0, display: 'grid', gridTemplateRows: layout.rightRowHeights.map(value => `${value}%`).join(' '), position: 'relative' }}>
                      {layout.order.slice(4).map(renderSection)}
                      {!exporting && layout.rightRowHeights.slice(0, 3).map((_, index) => (
                        <React.Fragment key={index}>
                          {renderRowDivider(rightColumnRef, layout.rightRowHeights, index, next => setLayout(previous => ({ ...previous, rightRowHeights: next })))}
                        </React.Fragment>
                      ))}
                    </Box>

                    {!exporting && (
                      <>
                        {renderColumnDivider(0)}
                        {renderColumnDivider(1)}
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: 300, flexShrink: 0, backgroundColor: '#fff', borderLeft: '1px solid #cbd5e1', p: 2, overflowY: 'auto' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Thuộc tính ô</Typography>
            <Chip label={selectedMeta.label} size="small" color="primary" sx={{ mt: 1, mb: 2 }} />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Typography variant="body2" sx={{ fontWeight: 700 }}>Cỡ chữ: {selectedStyle.fontSize}px</Typography>
            <Slider
              min={9}
              max={20}
              step={1}
              value={selectedStyle.fontSize}
              onChange={(_, value) => updateSelectedStyle({ fontSize: value as number })}
              valueLabelDisplay="auto"
            />

            <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>Khoảng đệm: {selectedStyle.padding}px</Typography>
            <Slider
              min={2}
              max={18}
              step={1}
              value={selectedStyle.padding}
              onChange={(_, value) => updateSelectedStyle({ padding: value as number })}
              valueLabelDisplay="auto"
            />

            {selectedMeta.kind === 'image' && (
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Kiểu hiển thị ảnh</InputLabel>
                <Select
                  label="Kiểu hiển thị ảnh"
                  value={selectedStyle.imageFit}
                  onChange={event => updateSelectedStyle({ imageFit: event.target.value as ImageFit })}
                >
                  <MenuItem value="contain">Thấy toàn bộ ảnh</MenuItem>
                  <MenuItem value="cover">Phủ kín khung</MenuItem>
                </Select>
              </FormControl>
            )}

            <Divider sx={{ my: 2.5 }} />
            <Typography variant="caption" color="text.secondary">
              Độ dài nội dung: {selectedContentLength} ký tự
            </Typography>
            {selectedMeta.kind === 'text' && selectedContentLength > 500 && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Nội dung khá dài. Hãy tăng kích thước ô, giảm cỡ chữ hoặc dùng “Tự cân đối” để tránh bị cắt.
              </Alert>
            )}

            <Divider sx={{ my: 2.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Tỷ lệ hiện tại</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              3 cột: {layout.columnWidths.map(value => `${value.toFixed(0)}%`).join(' / ')}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Cột ảnh: {layout.imageRowHeights.map(value => `${value.toFixed(0)}%`).join(' / ')}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Cột giữa: {layout.mainRowHeights.map(value => `${value.toFixed(0)}%`).join(' / ')}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Cột phải: {layout.rightRowHeights.map(value => `${value.toFixed(0)}%`).join(' / ')}
            </Typography>

            <Box sx={{ mt: 3, p: 1.5, borderRadius: 2, backgroundColor: '#eff6ff' }}>
              <Typography variant="caption" sx={{ color: '#1e40af', lineHeight: 1.5 }}>
                📐 Canvas: {A3_CANVAS_WIDTH}×{A3_CANVAS_HEIGHT}px (A3 @ 96 DPI ngang)<br />
                🔍 Đang xem: {Math.round(displayScale * 100)}%<br />
                Bản PDF sẽ xuất từ canvas gốc toàn phân giải — sắc nét trên giấy A3.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default A3LayoutEditor;
