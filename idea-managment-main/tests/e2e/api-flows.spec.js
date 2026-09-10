const { test, expect } = require('@playwright/test');
const XLSX = require('xlsx');
const origin = 'http://127.0.0.1:4173';
let csrf;
test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset');
  const response = await request.post('/api/auth/login', { headers: { Origin: origin }, data: { username: 'admin-test', password: 'Testing-password-123!' } });
  expect(response.ok()).toBeTruthy();
  csrf = (await response.json()).csrfToken;
});
const headers = () => ({ 'X-CSRF-Token': csrf, Origin: origin });
async function record(request) { return (await (await request.get('/api/ideas')).json()).find(row => row.ideaCode === 'E2E-A3'); }
async function preview(request, rows, bookType = 'xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Import');
  const response = await request.post('/api/imports/preview', { headers: headers(), multipart: {
    file: { name: 'data.' + bookType, mimeType: 'application/vnd.ms-excel', buffer: XLSX.write(workbook, { type: 'buffer', bookType }) },
  } });
  expect(response.ok(), await response.text()).toBeTruthy();
  const id = (await response.json()).importSessionId;
  return (await request.get('/api/imports/' + id)).json();
}

test('admin creation retains every editable report and reward field', async ({ request }) => {
  const input = { fullName: 'Người mới', department: 'Phòng Cải Tiến', idea: 'Ý tưởng mới',
    benefitOutcome: 'Lợi ích', resourcesUsed: 'Nguồn lực', calculationDescription: 'Cách tính', scalingOpportunity: 'Nhân rộng',
    rewardStatuses: ['CHO_KHEN_THUONG_50K'], rewardCalculationMethod: 'PERCENT_20' };
  const response = await request.post('/api/ideas/admin', { headers: headers(), data: input });
  expect(response.status()).toBe(201);
  const created = await response.json();
  for (const [key, value] of Object.entries(input)) expect(created[key], key).toEqual(value);
});

test('edit, payment, search, pagination, lookup and deletion roundtrip', async ({ request }) => {
  const idea = await record(request);
  let response = await request.put('/api/ideas/' + idea._id, { headers: headers(), data: { fullName: 'Sửa E2E', rewardAmount: 0, note: '', expectedCompletionDate: null } });
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ fullName: 'Sửa E2E', rewardAmount: 0, note: '', expectedCompletionDate: null });
  expect((await request.patch('/api/ideas/' + idea._id + '/payment', { headers: headers(), data: { isPaid: true } })).ok()).toBeTruthy();
  response = await request.get('/api/ideas?search=' + encodeURIComponent('Sửa E2E') + '&page=1&limit=1');
  expect(await response.json()).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  expect((await request.get('/api/ideas/code/E2E-A3')).ok()).toBeTruthy();
  expect((await request.delete('/api/ideas/' + idea._id, { headers: headers() })).ok()).toBeTruthy();
  expect((await request.get('/api/ideas/code/E2E-A3')).status()).toBe(404);
});

test('Excel import updates zero values and preserves blank fields in patch mode', async ({ request }) => {
  const session = await preview(request, [{ 'Mã ý tưởng': 'E2E-A3', 'Tiền thưởng (VND)': 0, 'Giá trị làm lợi (VND)': 0, 'Ghi chú': '' }]);
  const response = await request.post('/api/imports/' + session._id + '/commit', { headers: headers(), data: { selectedRowIndices: [0], mode: 'patch' } });
  expect(response.ok()).toBeTruthy();
  expect(await record(request)).toMatchObject({ rewardAmount: 0, benefitValue: 0, note: 'Ghi chú cần giữ' });
});

test('Excel overwrite clears an explicitly blank optional field', async ({ request }) => {
  const session = await preview(request, [{ 'Mã ý tưởng': 'E2E-A3', 'Ghi chú': '' }], 'xls');
  const response = await request.post('/api/imports/' + session._id + '/commit', { headers: headers(), data: { selectedRowIndices: [0], mode: 'overwrite' } });
  expect(response.ok()).toBeTruthy();
  expect((await record(request)).note).toBe('');
});

test('import rejects invalid dates and merge cannot create contradictory reward states', async ({ request }) => {
  let session = await preview(request, [{ 'Mã ý tưởng': 'E2E-A3', 'Hạn dự kiến hoàn thành': '31/02/2026' }]);
  expect(session.rows[0].status).toBe('ERROR');
  const idea = await record(request);
  await request.put('/api/ideas/' + idea._id, { headers: headers(), data: { rewardStatuses: ['CHO_KHEN_THUONG_50K'] } });
  session = await preview(request, [{ 'Mã ý tưởng': 'E2E-A3', 'Tình trạng khen thưởng': 'DA_KHEN_THUONG_50K' }]);
  const response = await request.post('/api/imports/' + session._id + '/commit', { headers: headers(), data: { selectedRowIndices: [0], mode: 'patch', rewardStatusesMode: 'merge' } });
  const result = await response.json();
  expect(result.summary.error).toBe(1);
  expect((await record(request)).rewardStatuses).toEqual(['CHO_KHEN_THUONG_50K']);
});

test('invalid edit must not delete an existing image or silently report success', async ({ request }) => {
  const idea = await record(request);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  const uploaded = await request.put('/api/ideas/' + idea._id, { headers: headers(), data: { beforeImage: png } });
  expect(uploaded.ok()).toBeTruthy();
  const image = (await uploaded.json()).beforeImageUrl;
  expect((await request.get(image)).status()).toBe(200);
  const bad = await request.put('/api/ideas/' + idea._id, { headers: headers(), data: { beforeImage: null, rewardAmount: 'not a number' } });
  expect(bad.status()).toBe(400);
  expect((await request.get(image)).status()).toBe(200);
});

test('malformed IDs and invalid status give useful client errors', async ({ request }) => {
  expect((await request.put('/api/ideas/not-an-id', { headers: headers(), data: { note: 'x' } })).status()).toBe(400);
  const idea = await record(request);
  expect((await request.put('/api/ideas/' + idea._id, { headers: headers(), data: { status: 'INVALID' } })).status()).toBe(400);
});

test('missing idea code is a preview error row and can be exported', async ({ request }) => {
  const session = await preview(request, [{ 'Mã ý tưởng': '', 'Ghi chú': 'Thiếu mã' }]);
  expect(session.rows[0].status).toBe('ERROR');
  const response = await request.get('/api/imports/' + session._id + '/export-errors');
  expect(response.ok()).toBeTruthy();
  const book = XLSX.read(await response.body(), { type: 'buffer' });
  expect(JSON.stringify(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]))).toContain('không được để trống');
});

test('import validates money and reward states instead of silently changing them', async ({ request }) => {
  for (const row of [
    { 'Tiền thưởng (VND)': '123abc' },
    { 'Giá trị làm lợi (VND)': 'abc' },
    { 'Tình trạng khen thưởng': 'CHO_KHEN_THUONG_50K;DA_KHEN_THUONG_50K' },
    { 'Tình trạng khen thưởng': 'CHO_KHEN_THUONG_50K;INVALID' },
  ]) {
    const session = await preview(request, [{ 'Mã ý tưởng': 'E2E-A3', ...row }]);
    expect(session.rows[0].status, JSON.stringify(row)).toBe('ERROR');
  }
});

test('import keeps blank rewards in patch and imports calculation method from export headers', async ({ request }) => {
  const idea = await record(request);
  await request.put('/api/ideas/' + idea._id, { headers: headers(), data: { rewardStatuses: ['CHO_KHEN_THUONG_50K'] } });
  const session = await preview(request, [{ 'Mã ý tưởng': 'E2E-A3', 'Tình trạng khen thưởng': '', 'Phương thức tính thưởng': 'Tính bằng công cụ' }]);
  await request.post('/api/imports/' + session._id + '/commit', { headers: headers(), data: { selectedRowIndices: [0], mode: 'patch' } });
  expect(await record(request)).toMatchObject({ rewardStatuses: ['CHO_KHEN_THUONG_50K'], rewardCalculationMethod: 'TOOL_BASED' });
  await request.post('/api/imports/' + session._id + '/commit', { headers: headers(), data: { selectedRowIndices: [0], mode: 'overwrite' } });
  expect((await record(request)).rewardStatuses).toEqual([]);
});

test('AI helpers validate input and return local provider suggestions', async ({ request }) => {
  for (const [path, key] of [['improve-description', 'improvedIdea'], ['suggest-solution', 'solution'], ['suggest-benefit', 'benefit'], ['suggest-topic-title', 'topicTitle']]) {
    expect((await request.post('/api/ai/' + path, { headers: headers(), data: { idea: '' } })).status()).toBe(400);
    const response = await request.post('/api/ai/' + path, { headers: headers(), data: { idea: 'Cải tiến kiểm thử', department: 'Phòng Cải Tiến' } });
    expect(response.ok()).toBeTruthy();
    expect((await response.json())[key]).toContain('giả lập');
  }
});

test('A3 report create, read, edit, list filter and delete', async ({ request }) => {
  const idea = await record(request);
  const input = { ideaId: idea._id, ideaCode: idea.ideaCode, fullName: idea.fullName, department: idea.department, topicTitle: 'Báo cáo thử', submissionDate: new Date().toISOString() };
  for (const field of ['problemDescription', 'currentSituation', 'rootCause', 'targetSituation', 'solution', 'implementationPlan', 'resources', 'timeline', 'responsiblePerson', 'expectedResult', 'actualResult', 'benefit', 'cost', 'risk', 'followUpAction', 'lessonsLearned', 'scalingOpportunity']) input[field] = 'Nội dung thử';
  const created = await request.post('/api/a3-reports', { headers: headers(), data: input });
  expect(created.status()).toBe(201);
  const report = await created.json();
  for (const url of ['/' + report._id, '/idea/' + idea._id, '/code/' + idea.ideaCode]) expect((await request.get('/api/a3-reports' + url)).status()).toBe(200);
  expect((await request.put('/api/a3-reports/' + report._id, { headers: headers(), data: { note: 'Đã sửa' } })).ok()).toBeTruthy();
  expect((await request.get('/api/a3-reports?department=%28')).status()).toBe(200);
  expect((await request.delete('/api/a3-reports/' + report._id, { headers: headers() })).ok()).toBeTruthy();
});
