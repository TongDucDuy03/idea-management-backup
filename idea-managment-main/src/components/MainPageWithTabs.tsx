import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import IdeaForm from './IdeaForm';
import A3ReportTab from './A3ReportTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`main-tabpanel-${index}`}
      aria-labelledby={`main-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MainPageWithTabs: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Hệ thống Ghi nhận và Quản lý Ý tưởng Cải tiến
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body1" sx={{ color: '#666', fontSize: '1.1rem' }}>
              Chào mừng bạn đến với hệ thống! Bạn có thể đề xuất ý tưởng mới hoặc nhập báo cáo A3 bằng mã ý tưởng.
            </Typography>
          </Box>
          <Divider sx={{ mb: 0 }} />
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="main tabs"
            centered
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                minHeight: 48,
                px: 4
              }
            }}
          >
            <Tab label="Đề xuất Ý tưởng Cải tiến" />
            <Tab label="Nhập báo cáo A3" />
          </Tabs>
        </CardContent>
      </Card>

      <TabPanel value={tabValue} index={0}>
        <IdeaForm />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <A3ReportTab />
      </TabPanel>
    </Container>
  );
};

export default MainPageWithTabs;
