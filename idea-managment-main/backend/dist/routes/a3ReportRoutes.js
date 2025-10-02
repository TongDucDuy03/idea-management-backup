"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const a3ReportController_1 = require("../controllers/a3ReportController");
const router = express_1.default.Router();
// Tất cả routes đều cần authentication
// Tạo báo cáo A3 mới
router.post('/', a3ReportController_1.createA3Report);
// Lấy tất cả báo cáo A3
router.get('/', a3ReportController_1.getAllA3Reports);
// router.get('/', searchIdeas);
// Lấy báo cáo A3 theo ID
router.get('/:id', a3ReportController_1.getA3ReportById);
// Lấy báo cáo A3 theo ideaId
router.get('/idea/:ideaId', a3ReportController_1.getA3ReportByIdeaId);
// Lấy báo cáo A3 theo ideaCode
router.get('/code/:ideaCode', a3ReportController_1.getA3ReportByIdeaCode);
// Cập nhật báo cáo A3
router.put('/:id', a3ReportController_1.updateA3Report);
// Xóa báo cáo A3
router.delete('/:id', a3ReportController_1.deleteA3Report);
exports.default = router;
