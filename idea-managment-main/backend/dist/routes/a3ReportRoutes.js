"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const a3ReportController_1 = require("../controllers/a3ReportController");
const auth = __importStar(require("../middleware/auth"));
const router = express_1.default.Router();
// Tất cả routes đều cần authentication
router.use(auth.auth);
// Tạo báo cáo A3 mới
router.post('/', a3ReportController_1.createA3Report);
// Lấy tất cả báo cáo A3
router.get('/', a3ReportController_1.getAllA3Reports);
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
