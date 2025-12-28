import express from 'express';
import multer from 'multer';
import * as importController from '../controllers/importController';

const router = express.Router();

// Cấu hình multer để xử lý file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'));
    }
  }
});

// POST /api/imports/preview - Upload và parse file
router.post('/preview', upload.single('file'), importController.previewImport);

// GET /api/imports/:id - Lấy dữ liệu staging
router.get('/:id', importController.getImportSession);

// POST /api/imports/:id/commit - Commit import
router.post('/:id/commit', importController.commitImport);

// GET /api/imports/:id/export-errors - Export lỗi ra Excel
router.get('/:id/export-errors', importController.exportErrors);

export default router;

