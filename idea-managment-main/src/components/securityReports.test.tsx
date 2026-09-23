import React from 'react';
import '@testing-library/jest-dom';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import html2canvas from 'html2canvas';
import api from '../api/config';
import A3ReportForm from './A3ReportForm';
import ExportReportDialog from './ExportReportDialog';
import ReportGenerator from './ReportGenerator';
import { Idea, IdeaStatus } from '../types';
import { escapeHtml, safeImageSource } from '../utils/safeHtml';
import A3LayoutEditor from './A3LayoutEditor';

jest.mock('html2canvas', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('jspdf', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../api/config', () => ({ __esModule: true, default: { get: jest.fn() } }));

const payload = '<img src=x onerror="window.pwned=1"> & Tiếng Việt';
const idea = {
  _id: 'test-id', ideaCode: 'TEST-CODE', fullName: payload, department: payload, idea: payload,
  solution: payload, benefit: payload, benefitOutcome: payload, resourcesUsed: payload,
  calculationDescription: payload, scalingOpportunity: payload,
  beforeImage: 'data:image/png;base64," onerror="window.pwned=1',
  afterImage: 'javascript:window.pwned=1',
  submissionDate: new Date(), status: IdeaStatus.BAO_CAO_A3, isPaid: false,
  implementationStatus: 'Lập báo cáo A3', rewardAmount: 1000, benefitValue: 5000,
} as Idea;
let captured: HTMLElement | undefined;

beforeEach(() => {
  captured = undefined;
  (api.get as jest.Mock).mockResolvedValue({ data: idea });
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  jest.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { get: () => 100, configurable: true });
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  (html2canvas as jest.Mock).mockImplementation(async (element: HTMLElement) => {
    captured = element.cloneNode(true) as HTMLElement;
    // Stop after real DOM construction, before the unrelated PDF encoding step.
    throw new Error('test capture complete');
  });
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.clearAllMocks(); });

async function assertSafeReport() {
  await waitFor(() => expect(captured).toBeDefined(), { timeout: 5000 });
  expect(captured!.textContent).toContain(payload);
  expect(captured!.querySelector('[onerror], [onload], script, iframe')).toBeNull();
  expect(captured!.querySelector('img[src="x"]')).toBeNull();
  expect(captured!.querySelector('img[src^="javascript:"]')).toBeNull();
}

test('A3LayoutEditor treats stored fields as text and rejects malicious image attributes', async () => {
  render(<A3LayoutEditor open idea={idea} onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /Xuất PDF/i }));
  await assertSafeReport();
});

test('A3ReportForm provides preview and export controls', async () => {
  render(<A3ReportForm idea={idea} onClose={() => {}} />);
  expect(screen.getByRole('button', { name: 'Xem trước & căn chỉnh' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Lưu và xuất PDF' })).toBeInTheDocument();
});

test('ExportReportDialog allows selecting idea and opening layout editor', async () => {
  render(<ExportReportDialog open onClose={() => {}} ideas={[idea]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Chọn tất cả' }));
  expect(screen.getByRole('button', { name: 'Xem trước & căn chỉnh' })).toBeEnabled();
});

test('statistics PDF encodes names, departments and the department filter', async () => {
  render(<ReportGenerator ideas={[idea]} timeRange="all" departmentFilter={payload} />);
  fireEvent.click(screen.getByRole('button', { name: 'Xuất Báo cáo PDF' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tạo PDF' }));
  await assertSafeReport();
});

test('plain text roundtrips through HTML without double encoding or executable elements', () => {
  const element = document.createElement('div');
  const value = '&lt;existing&gt; <svg onload="alert(1)"> "quotes" \' Tiếng Việt\nDòng hai';
  element.innerHTML = escapeHtml(value);
  expect(element.textContent).toBe(value);
  expect(element.children.length).toBe(0);
});

test('image source validation allows local uploads and raster data, blocks remote and active content', () => {
  expect(safeImageSource('/uploads/photo.png')).toBe(window.location.origin + '/uploads/photo.png');
  expect(safeImageSource('https://old-host.test/uploads/photo.png')).toBe(window.location.origin + '/uploads/photo.png');
  expect(safeImageSource('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
  for (const source of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'https://evil.example/tracker.png',
    'data:image/png;base64," onerror="alert(1)']) expect(safeImageSource(source)).toBe('');
});
