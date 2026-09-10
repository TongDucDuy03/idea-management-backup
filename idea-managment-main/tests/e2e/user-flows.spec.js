const { test, expect } = require('@playwright/test');
const XLSX = require('xlsx');
const fs = require('node:fs/promises');

async function login(page, username = 'admin-test') {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill('Testing-password-123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(username === 'viewer-test' ? /\/admin-view$/ : /\/admin$/);
  await expect(page.getByRole('heading', { name: 'Quản lý Ý tưởng', exact: true })).toBeVisible();
}

test.beforeEach(async ({ request, page }) => {
  expect((await request.post('/__test/reset')).ok()).toBeTruthy();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.__runtimeErrors = errors;
});
test.afterEach(async ({ page }) => { expect(page.__runtimeErrors).toEqual([]); });

async function pngFile(page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 100;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#326ad4'; ctx.fillRect(0, 0, 160, 100);
    ctx.fillStyle = 'white'; ctx.fillText('E2E image', 30, 50); return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}
async function pdfDownload(page, button) {
  const promise = page.waitForEvent('download', { timeout: 45000 });
  await button.click();
  const download = await promise;
  const bytes = await fs.readFile(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-'); expect(bytes.length).toBeGreaterThan(2000);
  await test.info().attach(download.suggestedFilename(), { body: bytes, contentType: 'application/pdf' });
  return download;
}
async function dataRows(page) { return (await page.request.get('/api/ideas')).json(); }
async function editRow(page, code) {
  await page.getByRole('row').filter({ hasText: code }).getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByRole('dialog').getByRole('tab', { name: 'Thông tin cơ bản' }).click();
  return page.getByRole('dialog');
}

test('anonymous redirects, invalid login, valid login, reload and logout', async ({ page }) => {
  for (const route of ['/admin', '/statistics', '/admin-view', '/statistics-view']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
  await page.getByLabel('Tên đăng nhập').fill('admin-test');
  await page.getByLabel('Mật khẩu').fill('wrong');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('không đúng');
  await login(page);
  await page.reload();
  await expect(page.getByRole('grid')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('viewer can read and export but cannot enter admin editing routes', async ({ page }) => {
  await login(page, 'viewer-test');
  await expect(page.getByRole('button', { name: 'Thêm ý tưởng', exact: true })).toHaveCount(0);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Excel', exact: true }).click();
  const book = XLSX.read(await fs.readFile(await (await pending).path()), { type: 'buffer' });
  expect(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]])).toHaveLength(2);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin-view$/);
  await page.goto('/statistics-view');
  await expect(page.getByRole('heading', { name: 'Dashboard Thống kê' })).toBeVisible();
  await page.getByRole('button', { name: 'Hiện Thống kê Nâng cao' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('public wizard validates, saves draft, sends an idea and supports another submission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Tiếp/ }).click();
  await expect(page.getByText('Vui lòng chọn', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Họ và tên người đề xuất').fill('Người Gửi E2E');
  await page.getByRole('combobox').click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: /Tiếp/ }).click();
  await page.getByLabel('Bạn muốn cải tiến điều gì?', { exact: false }).fill('Ý tưởng kiểm thử toàn bộ thao tác gửi mới');
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByLabel('Bạn muốn cải tiến điều gì?', { exact: false })).toHaveValue('Ý tưởng kiểm thử toàn bộ thao tác gửi mới');
  await page.getByRole('button', { name: /Tiếp/ }).click();
  await page.locator('input[type=file]').first().setInputFiles(await pngFile(page));
  await expect(page.getByText('✓ Ảnh trước', { exact: true })).toBeVisible();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/ideas') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '🚀 Gửi ý tưởng ngay', exact: true }).last().click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const receipt = await response.json();
  await expect(page.getByText('Gửi ý tưởng thành công! 🎉')).toBeVisible();
  await expect(page.getByText(receipt.ideaCode, { exact: true })).toBeVisible();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Sao chép mã' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(receipt.ideaCode);
  expect((await page.request.get('/api/ideas/code/' + receipt.ideaCode)).ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Gửi thêm ý tưởng' }).click();
  await expect(page.getByLabel('Họ và tên người đề xuất')).toHaveValue('');
});

test('admin creates all fields, edits dates and money, cancels and deletes', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Thêm ý tưởng', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Họ và tên').fill('Người Tạo E2E');
  await dialog.getByRole('combobox').first().click(); await page.getByRole('option').first().click();
  await dialog.getByLabel('Ghi chú', { exact: true }).fill('Ghi chú tạo mới');
  await dialog.getByRole('tab', { name: 'Nội dung ý tưởng' }).click();
  await dialog.getByRole('textbox', { name: /^Ý tưởng/ }).fill('Nội dung tạo mới E2E');
  await dialog.getByLabel('Lợi ích mang lại').fill('Lợi ích E2E');
  await dialog.getByRole('tab', { name: 'Triển khai', exact: true }).click();
  await dialog.getByLabel('Hạn dự kiến hoàn thành').fill('2026-10-12');
  await dialog.getByRole('tab', { name: 'Khen thưởng', exact: true }).click();
  await dialog.getByLabel('Giá trị làm lợi (VND)').fill('100000');
  await dialog.getByLabel('Tiền thưởng (VND)').fill('20000');
  await dialog.getByRole('tab', { name: 'Bổ sung' }).click();
  await dialog.getByLabel('Nguồn lực sử dụng').fill('Nguồn lực E2E');
  await dialog.getByRole('button', { name: 'Thêm mới', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  let created = (await dataRows(page)).find(row => row.fullName === 'Người Tạo E2E');
  expect(created).toMatchObject({ benefitOutcome: 'Lợi ích E2E', resourcesUsed: 'Nguồn lực E2E', rewardAmount: 20000 });
  await editRow(page, created.ideaCode);
  await dialog.getByLabel('Họ và tên').fill('Không lưu thay đổi này');
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
  expect((await dataRows(page)).find(row => row._id === created._id).fullName).toBe('Người Tạo E2E');
  await editRow(page, created.ideaCode);
  await dialog.getByRole('tab', { name: 'Khen thưởng', exact: true }).click();
  await dialog.getByLabel('Tiền thưởng (VND)').fill('0');
  await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await dataRows(page)).find(row => row._id === created._id).rewardAmount).toBe(0);
  page.once('dialog', event => event.dismiss());
  await page.getByRole('row').filter({ hasText: created.ideaCode }).getByRole('button', { name: 'Xóa', exact: true }).click();
  expect((await dataRows(page)).some(row => row._id === created._id)).toBeTruthy();
  page.once('dialog', event => event.accept());
  await page.getByRole('row').filter({ hasText: created.ideaCode }).getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: created.ideaCode })).toHaveCount(0);
});

test('public form reports broken images, allows removal and retries a failed submission', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Họ và tên người đề xuất').fill('Người Thử Lại');
  await page.getByRole('combobox').click(); await page.getByRole('option').first().click();
  await page.getByRole('button', { name: /Tiếp/ }).click();
  await page.getByLabel('Bạn muốn cải tiến điều gì?').fill('Nội dung phải giữ sau lỗi gửi');
  await page.getByRole('button', { name: /Tiếp/ }).click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert').filter({ hasText: 'Lỗi khi xử lý hình ảnh' })).toBeVisible();
  await page.locator('input[type=file]').first().setInputFiles(await pngFile(page));
  await expect(page.getByText('✓ Ảnh trước', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
  await expect(page.getByText('✓ Ảnh trước', { exact: true })).toHaveCount(0);
  await page.route('**/api/ideas', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi gửi giả lập' }) }) : route.fallback());
  await page.getByRole('button', { name: '🚀 Gửi ý tưởng ngay', exact: true }).last().click();
  await expect(page.getByRole('alert').filter({ hasText: 'Lỗi gửi giả lập' })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByLabel('Bạn muốn cải tiến điều gì?')).toHaveValue('Nội dung phải giữ sau lỗi gửi');
  await page.unroute('**/api/ideas');
  await page.getByRole('button', { name: /Tiếp/ }).click();
  await page.getByRole('button', { name: '🚀 Gửi ý tưởng ngay', exact: true }).last().click();
  await expect(page.getByText('Gửi ý tưởng thành công! 🎉')).toBeVisible();
});

test('failed save keeps the editor and unsaved user input', async ({ page }) => {
  await login(page); const dialog = await editRow(page, 'E2E-NEW');
  await dialog.getByLabel('Họ và tên').fill('Nội dung chưa lưu');
  await page.route('**/api/ideas/*', route => route.request().method() === 'PUT'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi lưu giả lập' }) }) : route.fallback());
  await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('Lỗi lưu giả lập');
  await expect(dialog.getByLabel('Họ và tên')).toHaveValue('Nội dung chưa lưu');
});

test('image upload, reload, lightbox, unrelated edit and image removal', async ({ page }) => {
  await login(page); let dialog = await editRow(page, 'E2E-A3');
  await dialog.getByRole('tab', { name: 'Hình ảnh', exact: true }).click();
  await dialog.locator('input[type=file]').first().setInputFiles(await pngFile(page));
  await expect(dialog.getByRole('img', { name: 'Hình ảnh trước', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const image = (await dataRows(page)).find(row => row.ideaCode === 'E2E-A3').beforeImageUrl;
  await page.reload(); dialog = await editRow(page, 'E2E-A3');
  await dialog.getByLabel('Ghi chú', { exact: true }).fill('Giữ nguyên ảnh');
  await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await page.request.get(image)).ok()).toBeTruthy();
  dialog = await editRow(page, 'E2E-A3');
  await dialog.getByRole('tab', { name: 'Hình ảnh', exact: true }).click();
  await dialog.getByRole('img', { name: 'Hình ảnh trước', exact: true }).click();
  await expect(page.getByRole('dialog', { includeHidden: true })).toHaveCount(2);
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Xóa hình ảnh', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await page.request.get(image)).status()).toBe(404);
});

test('table filters, view presets, Excel export and detail modal', async ({ page }) => {
  await login(page);
  await page.getByRole('textbox', { name: 'Mã ý tưởng', exact: true }).fill('E2E-A3');
  await expect(page.getByRole('row').filter({ hasText: 'E2E-NEW' })).toHaveCount(0);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất Excel', exact: true }).click();
  const workbook = XLSX.read(await fs.readFile(await (await pending).path()), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  expect(rows).toHaveLength(1); expect(JSON.stringify(rows)).toContain('E2E-A3');
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E-NEW' })).toHaveCount(1);
  await page.getByRole('row').filter({ hasText: 'E2E-A3' }).getByRole('button', { name: 'Xem chi tiết' }).click();
  await expect(page.getByRole('heading', { name: 'Hồ sơ ý tưởng' })).toBeVisible();
  await page.getByRole('button', { name: 'Ghi chú', exact: true }).click();
  await expect(page.getByText('Ghi chú cần giữ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng hồ sơ ý tưởng' }).click();
  await page.getByRole('group', { name: 'Chế độ hiển thị bảng ý tưởng' }).getByRole('button', { name: 'Khen thưởng', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Chế độ hiển thị bảng ý tưởng' }).getByRole('button', { name: 'Khen thưởng', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('actual A3 PDF download and layout editor settings/export', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Export Báo Cáo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Chọn tất cả' }).click();
  await pdfDownload(page, dialog.getByRole('button', { name: 'Export PDF A3', exact: true }));
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Export Báo Cáo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Chọn tất cả' }).click();
  await dialog.getByRole('button', { name: 'Xem trước & căn chỉnh' }).click();
  await page.getByRole('button', { name: 'Tự cân đối', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu báo cáo này', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('a3_layout_E2E-A3'))).not.toBeNull();
  await page.getByRole('button', { name: 'Đặt làm mặc định' }).click();
  await pdfDownload(page, page.getByRole('button', { name: 'Xuất PDF', exact: true }));
});

test('statistics filters, comparison, charts, drilldown and actual PDF export', async ({ page }) => {
  await login(page); await page.goto('/statistics');
  await page.getByRole('button', { name: 'Tháng này', exact: true }).click();
  await page.getByRole('button', { name: 'So sánh tháng', exact: true }).click();
  await page.getByRole('button', { name: 'Không so sánh', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện Thống kê Nâng cao' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Xuất Báo cáo PDF', exact: true }).click();
  await pdfDownload(page, page.getByRole('button', { name: 'Tạo PDF', exact: true }));
  await page.getByText('Tổng số ý tưởng', { exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\?/);
  await expect(page.getByRole('row').filter({ hasText: 'E2E-A3' })).toBeVisible();
});

test('inline implementation and reward changes persist without conflicting states', async ({ page }) => {
  await login(page);
  const row = page.getByRole('row').filter({ hasText: 'E2E-NEW' });
  await row.getByRole('button', { name: 'Đề xuất mới', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Đang triển khai', exact: true }).click();
  await expect.poll(async () => (await dataRows(page)).find(r => r.ideaCode === 'E2E-NEW').implementationStatus).toBe('Đang triển khai');
  await page.getByRole('group', { name: 'Chế độ hiển thị bảng ý tưởng' }).getByRole('button', { name: 'Khen thưởng', exact: true }).click();
  await row.locator('[data-field="rewardStatuses"]').click();
  await page.getByRole('checkbox', { name: 'Chờ khen thưởng 50.000đ', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Đã khen thưởng 50.000đ', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Chờ khen thưởng 50.000đ', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect.poll(async () => (await dataRows(page)).find(r => r.ideaCode === 'E2E-NEW').rewardStatuses).toEqual(['DA_KHEN_THUONG_50K']);
  await row.locator('[data-field="status"]').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Báo cáo A3', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
  expect((await dataRows(page)).find(r => r.ideaCode === 'E2E-NEW').status).toBe('DE_NGHI_MOI');
  await row.locator('[data-field="status"]').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Báo cáo A3', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect.poll(async () => (await dataRows(page)).find(r => r.ideaCode === 'E2E-NEW').status).toBe('BAO_CAO_A3');
});

test('custom columns persist and external tools have explicit destinations', async ({ page }) => {
  await login(page);
  for (const [label, destination] of [['Tính thưởng', /docs\.google\.com\/forms\//], ['Kết quả', /docs\.google\.com\/spreadsheets\//]]) {
    const link = page.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', destination);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
  await page.getByRole('button', { name: 'Tùy chỉnh cột', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ghi chú', exact: true }).click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('admin_column_visibility')).note)).toBe(false);
  await page.reload();
  await page.getByRole('button', { name: 'Tùy chỉnh cột', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Ghi chú', exact: true }).getByRole('checkbox')).not.toBeChecked();
});

test('mobile public form and authenticated dashboard/cards/statistics', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(page.getByText('Vui lòng chọn', { exact: false }).first()).toBeVisible();
  await login(page);
  await expect(page.getByRole('button', { name: 'Thêm ý tưởng', exact: true })).toBeVisible();
  await test.info().attach('dashboard-mobile.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Thêm ý tưởng', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.goto('/statistics');
  await page.getByRole('tab', { name: 'Biểu đồ' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('expired session redirects instead of permitting stale admin access', async ({ page, request }) => {
  await login(page); await request.post('/__test/revoke'); await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

async function importFile(page, rows, name = 'data.xlsx') {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Import');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) });
  await expect(dialog.getByRole('button', { name: 'Chọn tất cả', exact: true })).toBeVisible();
  return dialog;
}

test('Excel preview filters retain original row selection, diff and exported errors', async ({ page }) => {
  await login(page);
  const dialog = await importFile(page, [
    { 'Mã ý tưởng': 'E2E-A3', 'Ghi chú': 'Không chọn dòng này' },
    { 'Mã ý tưởng': 'E2E-NEW', 'Ghi chú': 'Chỉ cập nhật dòng này' },
    { 'Mã ý tưởng': 'UNKNOWN', 'Ghi chú': 'Dòng lỗi' },
  ]);
  await dialog.getByRole('button', { name: 'Lỗi', exact: true }).click();
  await expect(dialog.getByRole('row').filter({ hasText: 'UNKNOWN' })).toHaveCount(1);
  const pending = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Export lỗi' }).click();
  const book = XLSX.read(await fs.readFile(await (await pending).path()), { type: 'buffer' });
  expect(JSON.stringify(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]))).toContain('UNKNOWN');
  await dialog.getByRole('button', { name: 'Cảnh báo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Hiện Diff' }).click();
  await dialog.getByRole('button', { name: 'Chọn tất cả', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Import 2 dòng' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Bỏ chọn tất cả' }).click();
  await dialog.getByPlaceholder('Tìm theo mã ý tưởng...').fill('E2E-NEW');
  await dialog.getByRole('row').filter({ hasText: 'E2E-NEW' }).getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Import 1 dòng' }).click();
  await expect(dialog.getByText('Đã import 1 dòng thành công; 0 dòng thất bại.')).toBeVisible();
  const rows = await dataRows(page);
  expect(rows.find(row => row.ideaCode === 'E2E-NEW').note).toBe('Chỉ cập nhật dòng này');
  expect(rows.find(row => row.ideaCode === 'E2E-A3').note).toBe('Ghi chú cần giữ');
});

test('Excel accepts uppercase extension and reports actual partial commit failures', async ({ page }) => {
  await login(page);
  const dialog = await importFile(page, [
    { 'Mã ý tưởng': 'E2E-A3', 'Ghi chú': 'Cập nhật thành công' },
    { 'Mã ý tưởng': 'E2E-NEW', 'Ghi chú': 'Đã bị xóa sau preview' },
  ], 'DATA.XLSX');
  const removed = (await dataRows(page)).find(row => row.ideaCode === 'E2E-NEW');
  const me = await (await page.request.get('/api/auth/session')).json();
  expect((await page.request.delete('/api/ideas/' + removed._id, { headers: { 'X-CSRF-Token': me.csrfToken, Origin: 'http://127.0.0.1:4173' } })).ok()).toBeTruthy();
  await dialog.getByRole('button', { name: 'Chọn tất cả', exact: true }).click();
  await dialog.getByRole('button', { name: 'Import 2 dòng' }).click();
  await expect(dialog.getByText('Đã import 1 dòng thành công; 1 dòng thất bại.')).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('E2E-NEW');
  // The result must remain available after the refresh, not flash during a closing animation.
  await expect(async () => {
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(350);
    await expect(dialog).toBeVisible();
  }).toPass({ timeout: 1500 });
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Chọn file Excel', exact: true })).toBeVisible();
});
