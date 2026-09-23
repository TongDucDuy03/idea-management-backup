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
  Chip
} from '@mui/material';
import { Idea, IdeaStatus } from '../types';
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

  const handleSelectAll = () => {
    if (selectedIdeas.length === filteredIdeas.length) {
      setSelectedIdeas([]);
    } else {
      setSelectedIdeas(filteredIdeas.map(idea => idea._id));
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
          <Alert severity={selectedIdeas.length === 1 ? 'success' : 'info'} sx={{ mt: 2 }}>
            {selectedIdeas.length === 1
              ? 'Bạn có thể xem trước, kéo căn chỉnh rồi xuất đúng bố cục đang xem.'
              : 'Chỉ xem trước & xuất được từng ý tưởng một. Hãy bỏ bớt lựa chọn cho còn đúng 1 ý tưởng để tiếp tục.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Hủy
        </Button>
        <Button
          onClick={() => {
            const selectedIdea = filteredIdeas.find(idea => idea._id === selectedIdeas[0]);
            if (selectedIdea) setLayoutEditorIdea(selectedIdea);
          }}
          variant="outlined"
          color="primary"
          disabled={selectedIdeas.length !== 1}
          startIcon={<TuneIcon />}
        >
          Xem trước & căn chỉnh
        </Button>
      </DialogActions>
    </Dialog>
      {layoutEditorIdea && (
        <A3LayoutEditor
          open={Boolean(layoutEditorIdea)}
          idea={layoutEditorIdea}
          filename={undefined}
          onClose={() => setLayoutEditorIdea(null)}
        />
      )}
    </>
  );
};

export default ExportReportDialog;
