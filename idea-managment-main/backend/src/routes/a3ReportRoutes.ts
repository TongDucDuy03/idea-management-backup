import express from 'express';
import {
  createA3Report,
  getAllA3Reports,
  getA3ReportById,
  getA3ReportByIdeaId,
  updateA3Report,
  deleteA3Report,
  getA3ReportByIdeaCode
} from '../controllers/a3ReportController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Tất cả routes đều cần authentication.
// (Trước đây middleware `auth` được import nhưng không route nào dùng — kể cả
// DELETE — nên bất kỳ ai cũng xóa được báo cáo A3.)
router.use(auth);

// Tạo báo cáo A3 mới
router.post('/', createA3Report);

// Lấy tất cả báo cáo A3
router.get('/', getAllA3Reports);

// Lấy báo cáo A3 theo ID
router.get('/:id', getA3ReportById);

// Lấy báo cáo A3 theo ideaId
router.get('/idea/:ideaId', getA3ReportByIdeaId);

// Lấy báo cáo A3 theo ideaCode
router.get('/code/:ideaCode', getA3ReportByIdeaCode);

// Cập nhật báo cáo A3
router.put('/:id', updateA3Report);

// Xóa báo cáo A3
router.delete('/:id', deleteA3Report);

export default router;
