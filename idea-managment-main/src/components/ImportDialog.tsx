import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  Typography,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  FormControlLabel,
  Checkbox,
  Tooltip,
  IconButton
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Upload as UploadIcon, CheckCircle, Warning, Error as ErrorIcon, Download, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../api/config';
import { ImportSession, ImportRow, ImportRowStatus, IdeaStatus, IdeaStatusLabels, RewardStatus, RewardStatusLabels } from '../types';
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = ['Upload & Parse', 'Rà soát dữ liệu', 'Xác nhận Import'];

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'warn' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [importMode, setImportMode] = useState<'patch' | 'overwrite'>('patch');
  const [rewardStatusesMode, setRewardStatusesMode] = useState<'replace' | 'merge'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Chỉ chấp nhận file Excel (.xlsx, .xls)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/imports/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const sessionResponse = await api.get(`/imports/${response.data.importSessionId}`);
      setImportSession(sessionResponse.data);
      setSelectedRowIndices(
        sessionResponse.data.rows
          .map((row: ImportRow, index: number) => row.status === ImportRowStatus.OK ? index : -1)
          .filter((idx: number) => idx !== -1)
      );
      setActiveStep(1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi upload và parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleExportErrors = async () => {
    if (!importSession) return;
    try {
      const response = await api.get(`/imports/${importSession._id}/export-errors`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import_errors_${importSession._id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Lỗi khi export file lỗi');
    }
  };

  const handleCommit = async () => {
    if (!importSession || selectedRowIndices.length === 0) {
      setError('Vui lòng chọn ít nhất một dòng để import');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/imports/${importSession._id}/commit`, {
        selectedRowIndices,
        mode: importMode,
        rewardStatusesMode
      });
      setActiveStep(2);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi commit import');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (!importSession) return;
    // Chọn tất cả các dòng KHÔNG lỗi (OK + Cảnh báo)
    const selectableRows = importSession.rows
      .map((row, index) => row.status !== ImportRowStatus.ERROR ? index : -1)
      .filter(idx => idx !== -1);
    setSelectedRowIndices(selectableRows);
  };

  const handleDeselectAll = () => {
    setSelectedRowIndices([]);
  };

  const handleToggleRow = (index: number) => {
    setSelectedRowIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const filteredRows = importSession?.rows.filter((row, index) => {
    if (filterStatus !== 'all') {
      const statusMap: Record<string, ImportRowStatus> = {
        'ok': ImportRowStatus.OK,
        'warn': ImportRowStatus.WARNING,
        'error': ImportRowStatus.ERROR
      };
      if (row.status !== statusMap[filterStatus]) return false;
    }
    if (searchTerm && !row.ideaCode.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  const getStatusIcon = (status: ImportRowStatus) => {
    switch (status) {
      case ImportRowStatus.OK:
        return <CheckCircle color="success" />;
      case ImportRowStatus.WARNING:
        return <Warning color="warning" />;
      case ImportRowStatus.ERROR:
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: ImportRowStatus) => {
    switch (status) {
      case ImportRowStatus.OK:
        return 'OK';
      case ImportRowStatus.WARNING:
        return 'Cảnh báo';
      case ImportRowStatus.ERROR:
        return 'Lỗi';
      default:
        return '';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'selected',
      headerName: '',
      width: 50,
      renderCell: (params) => (
        <Checkbox
          checked={selectedRowIndices.includes(params.row.index)}
          onChange={() => handleToggleRow(params.row.index)}
          disabled={params.row.status === ImportRowStatus.ERROR}
        />
      )
    },
    {
      field: 'rowIndex',
      headerName: 'Dòng',
      width: 80
    },
    {
      field: 'ideaCode',
      headerName: 'Mã ý tưởng',
      width: 150
    },
    {
      field: 'status',
      headerName: 'Kết quả',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon(params.row.status)}
          <Typography variant="body2">{getStatusLabel(params.row.status)}</Typography>
        </Box>
      )
    },
    {
      field: 'messages',
      headerName: 'Chi tiết',
      width: 300,
      renderCell: (params) => (
        <Tooltip title={params.row.messages.join('; ')}>
          <Typography variant="body2" sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            maxWidth: 280
          }}>
            {params.row.messages.join('; ')}
          </Typography>
        </Tooltip>
      )
    }
  ];

  // Thêm các cột diff nếu showDiff = true - CHỈ hiển thị các cột có thay đổi
  if (showDiff && importSession) {
    const diffColumns: GridColDef[] = [];
    const allChangedFields = new Set<string>();
    
    // Tìm tất cả các field có thay đổi (chỉ các field có trong diff là đã có thay đổi)
    importSession.rows.forEach(row => {
      if (row.diff && row.diff.new) {
        Object.keys(row.diff.new).forEach(field => allChangedFields.add(field));
      }
    });

    // Field labels mapping
    const fieldLabels: Record<string, string> = {
      'status': 'Trạng thái',
      'rewardStatuses': 'Tình trạng khen thưởng',
      'note': 'Ghi chú',
      'implementationDepartment': 'Phòng ban triển khai',
      'fullName': 'Họ và tên',
      'department': 'Đơn vị',
      'idea': 'Ý tưởng',
      'solution': 'Thực trạng',
      'benefit': 'Giải pháp',
      'benefitOutcome': 'Lợi ích mang lại',
      'resourcesUsed': 'Nguồn lực sử dụng',
      'calculationDescription': 'Mô tả cách tính',
      'scalingOpportunity': 'Cơ hội nhân rộng phát triển',
      'benefitValue': 'Giá trị làm lợi (VND)',
      'rewardAmount': 'Tiền thưởng (VND)',
      'rewardApprovalDate': 'Ngày duyệt khen thưởng',
      'rewardCalculationMethod': 'Phương thức tính thưởng'
    };

    allChangedFields.forEach(field => {
      diffColumns.push({
        field: `diff_${field}`,
        headerName: fieldLabels[field] || field,
        width: 250,
        renderCell: (params) => {
          const row = importSession.rows[params.row.index];
          if (!row.diff || !row.diff.new || !(field in row.diff.new)) return '-';
          const current = row.diff.current?.[field];
          const newVal = row.diff.new[field];
          return (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              bgcolor: '#fff3cd',
              p: 0.5,
              borderRadius: 1,
              minWidth: 200
            }}>
              <Typography variant="caption" color="text.secondary">
                Cũ: {formatValue(current)}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                Mới: {formatValue(newVal)}
              </Typography>
            </Box>
          );
        }
      });
    });
    columns.push(...diffColumns);
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      if (value.every(v => Object.values(RewardStatus).includes(v))) {
        return value.map(v => RewardStatusLabels[v as RewardStatus]).join(', ');
      }
      return value.join(', ');
    }
    if (typeof value === 'object' && value instanceof Date) {
      return new Date(value).toLocaleString('vi-VN');
    }
    if (typeof value === 'object') return JSON.stringify(value);
    if (Object.values(IdeaStatus).includes(value as IdeaStatus)) {
      return IdeaStatusLabels[value as IdeaStatus];
    }
    if (typeof value === 'number') {
      return value.toLocaleString('vi-VN');
    }
    return String(value);
  };

  const handleClose = () => {
    setActiveStep(0);
    setImportSession(null);
    setSelectedRowIndices([]);
    setError('');
    setSearchTerm('');
    setFilterStatus('all');
    setShowDiff(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Import dữ liệu</Typography>
          <IconButton onClick={handleClose} size="small">
            ×
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bước 1: Upload file Excel
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Chọn file Excel chứa dữ liệu cần import. File sẽ được parse và validate trước khi import.
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : 'Chọn file Excel'}
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeStep === 1 && importSession && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Tổng quan</Typography>
                    <Typography variant="body2">Tổng: {importSession.summary.total}</Typography>
                    <Typography variant="body2" color="success.main">
                      OK: {importSession.summary.ok}
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      Cảnh báo: {importSession.summary.warn}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      Lỗi: {importSession.summary.error}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={9}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        placeholder="Tìm theo mã ý tưởng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flexGrow: 1, minWidth: 200 }}
                      />
                      <Button
                        size="small"
                        variant={filterStatus === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setFilterStatus('all')}
                      >
                        Tất cả
                      </Button>
                      <Button
                        size="small"
                        variant={filterStatus === 'ok' ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => setFilterStatus('ok')}
                      >
                        OK
                      </Button>
                      <Button
                        size="small"
                        variant={filterStatus === 'warn' ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => setFilterStatus('warn')}
                      >
                        Cảnh báo
                      </Button>
                      <Button
                        size="small"
                        variant={filterStatus === 'error' ? 'contained' : 'outlined'}
                        color="error"
                        onClick={() => setFilterStatus('error')}
                      >
                        Lỗi
                      </Button>
                      <Button
                        size="small"
                        startIcon={showDiff ? <VisibilityOff /> : <Visibility />}
                        onClick={() => setShowDiff(!showDiff)}
                      >
                        {showDiff ? 'Ẩn Diff' : 'Hiện Diff'}
                      </Button>
                      {importSession.summary.error > 0 && (
                        <Button
                          size="small"
                          startIcon={<Download />}
                          onClick={handleExportErrors}
                        >
                          Export lỗi
                        </Button>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button size="small" onClick={handleSelectAll}>
                        Chọn tất cả
                      </Button>
                      <Button size="small" onClick={handleDeselectAll}>
                        Bỏ chọn tất cả
                      </Button>
                    </Box>
                    <Box sx={{ height: 400, width: '100%' }}>
                      <DataGrid
                        rows={filteredRows.map((row, index) => ({ ...row, id: index, index }))}
                        columns={columns}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Import thành công!
                </Typography>
                <Typography variant="body2">
                  Đã import {selectedRowIndices.length} dòng thành công.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {activeStep === 2 ? 'Đóng' : 'Hủy'}
        </Button>
        {activeStep === 1 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mr: 'auto' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={importMode === 'patch'}
                    onChange={(e) => setImportMode(e.target.checked ? 'patch' : 'overwrite')}
                  />
                }
                label="Chỉ cập nhật field có giá trị (Patch)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rewardStatusesMode === 'merge'}
                    onChange={(e) => setRewardStatusesMode(e.target.checked ? 'merge' : 'replace')}
                  />
                }
                label="Merge rewardStatuses"
              />
            </Box>
            <Button
              variant="contained"
              onClick={handleCommit}
              disabled={selectedRowIndices.length === 0 || loading}
            >
              {loading ? <CircularProgress size={20} /> : `Import ${selectedRowIndices.length} dòng`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;

