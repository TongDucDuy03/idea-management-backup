import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography
} from '@mui/material';
import { RewardStatus, RewardStatusLabels } from '../types';

interface RewardStatusDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedStatuses: RewardStatus[]) => void;
  currentStatuses?: RewardStatus[];
  targetStatus: string; // IdeaStatus đích
}

const RewardStatusDialog: React.FC<RewardStatusDialogProps> = ({
  open,
  onClose,
  onConfirm,
  currentStatuses = [],
  targetStatus
}) => {
  const [selectedStatuses, setSelectedStatuses] = useState<RewardStatus[]>(currentStatuses);

  useEffect(() => {
    // Reset khi dialog mở hoặc currentStatuses thay đổi
    setSelectedStatuses(currentStatuses);
  }, [currentStatuses, open]);

  // Các trạng thái đích cho phép chọn 20%
  const statusesAllowing20Percent = [
    'BAO_CAO_A3',
    'KHEN_THUONG',
    'DONE',
    'REJECTED'
  ];

  const show20Percent = statusesAllowing20Percent.includes(targetStatus);

  const handleToggle = (status: RewardStatus) => {
    setSelectedStatuses(prev => {
      // Không cho phép tồn tại đồng thời CHO và DA của cùng một loại thưởng
      if (status === RewardStatus.CHO_KHEN_THUONG_50K) {
        return prev.filter(s => s !== RewardStatus.DA_KHEN_THUONG_50K).includes(status)
          ? prev.filter(s => s !== status)
          : [...prev.filter(s => s !== RewardStatus.DA_KHEN_THUONG_50K), status];
      }
      if (status === RewardStatus.DA_KHEN_THUONG_50K) {
        return prev.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_50K).includes(status)
          ? prev.filter(s => s !== status)
          : [...prev.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_50K), status];
      }
      if (status === RewardStatus.CHO_KHEN_THUONG_20) {
        return prev.filter(s => s !== RewardStatus.DA_KHEN_THUONG_20).includes(status)
          ? prev.filter(s => s !== status)
          : [...prev.filter(s => s !== RewardStatus.DA_KHEN_THUONG_20), status];
      }
      if (status === RewardStatus.DA_KHEN_THUONG_20) {
        return prev.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_20).includes(status)
          ? prev.filter(s => s !== status)
          : [...prev.filter(s => s !== RewardStatus.CHO_KHEN_THUONG_20), status];
      }
      return prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedStatuses);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Xét khen thưởng</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedStatuses.includes(RewardStatus.CHO_KHEN_THUONG_50K)}
                onChange={() => handleToggle(RewardStatus.CHO_KHEN_THUONG_50K)}
              />
            }
            label={RewardStatusLabels[RewardStatus.CHO_KHEN_THUONG_50K]}
          />
          {show20Percent && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedStatuses.includes(RewardStatus.CHO_KHEN_THUONG_20)}
                  onChange={() => handleToggle(RewardStatus.CHO_KHEN_THUONG_20)}
                />
              }
              label={RewardStatusLabels[RewardStatus.CHO_KHEN_THUONG_20]}
            />
          )}
          {selectedStatuses.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bạn có thể không chọn gì cả
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RewardStatusDialog;

