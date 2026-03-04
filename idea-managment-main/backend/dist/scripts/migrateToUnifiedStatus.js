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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Idea_1 = __importStar(require("../models/Idea"));
const migrationLog = [];
const migrateToUnifiedStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('========================================');
        console.log('Bắt đầu migration sang hệ thống status thống nhất');
        console.log('========================================\n');
        // Kết nối database
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management';
        yield mongoose_1.default.connect(mongoUri);
        console.log('✅ Đã kết nối database:', mongoUri);
        // Lấy tất cả ý tưởng (bao gồm cả các trường cũ)
        const ideas = yield Idea_1.default.find({}).lean();
        console.log(`📊 Tìm thấy ${ideas.length} ý tưởng cần migration\n`);
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        for (const idea of ideas) {
            try {
                const oldStatus = idea.status || 'pending';
                const oldImplementationStatus = idea.implementationStatus || null;
                // Xác định status mới dựa trên logic mapping
                let newStatus = Idea_1.IdeaStatus.DE_NGHI_MOI; // Mặc định
                // Ưu tiên implementationStatus nếu có (vì nó chứa thông tin chi tiết hơn)
                if (oldImplementationStatus) {
                    switch (oldImplementationStatus) {
                        case 'Đề xuất mới':
                            newStatus = Idea_1.IdeaStatus.DE_NGHI_MOI;
                            break;
                        case 'Xem xét':
                            newStatus = Idea_1.IdeaStatus.XEM_XET;
                            break;
                        case 'Phê duyệt':
                            newStatus = Idea_1.IdeaStatus.CHO_PHE_DUYET;
                            break;
                        case 'Phản hồi phê duyệt':
                            newStatus = Idea_1.IdeaStatus.CHO_PHE_DUYET;
                            break;
                        case 'Đang triển khai':
                            newStatus = Idea_1.IdeaStatus.TRIEN_KHAI;
                            break;
                        case 'Lập báo cáo A3':
                            newStatus = Idea_1.IdeaStatus.BAO_CAO_A3;
                            break;
                        case 'Phê duyệt khen thưởng':
                            newStatus = Idea_1.IdeaStatus.KHEN_THUONG;
                            break;
                        case 'Đã khen thưởng':
                            newStatus = Idea_1.IdeaStatus.DONE;
                            break;
                        case 'Không đạt':
                            newStatus = Idea_1.IdeaStatus.KHONG_PHU_HOP;
                            break;
                        default:
                            // Fallback về status cũ
                            if (oldStatus === 'rejected') {
                                newStatus = Idea_1.IdeaStatus.REJECTED;
                            }
                            else if (oldStatus === 'noted') {
                                newStatus = Idea_1.IdeaStatus.LUU_Y_TUONG;
                            }
                            else if (oldStatus === 'approved') {
                                newStatus = Idea_1.IdeaStatus.TRIEN_KHAI;
                            }
                            else {
                                newStatus = Idea_1.IdeaStatus.DE_NGHI_MOI;
                            }
                    }
                }
                else {
                    // Chỉ có status cũ, không có implementationStatus
                    switch (oldStatus) {
                        case 'pending':
                            newStatus = Idea_1.IdeaStatus.DE_NGHI_MOI;
                            break;
                        case 'rejected':
                            newStatus = Idea_1.IdeaStatus.REJECTED;
                            break;
                        case 'noted':
                            newStatus = Idea_1.IdeaStatus.LUU_Y_TUONG;
                            break;
                        case 'approved':
                            newStatus = Idea_1.IdeaStatus.TRIEN_KHAI;
                            break;
                        default:
                            newStatus = Idea_1.IdeaStatus.DE_NGHI_MOI;
                    }
                }
                // Kiểm tra nếu status đã là giá trị mới (đã migrate rồi)
                if (Object.values(Idea_1.IdeaStatus).includes(oldStatus)) {
                    console.log(`⏭️  Bỏ qua ý tưởng ${idea.ideaCode}: đã có status mới (${oldStatus})`);
                    skippedCount++;
                    continue;
                }
                // Cập nhật ý tưởng: set status mới và unset implementationStatus
                yield Idea_1.default.findByIdAndUpdate(idea._id, {
                    $set: {
                        status: newStatus
                    },
                    $unset: {
                        implementationStatus: 1
                    }
                }, { new: true });
                // Log migration
                migrationLog.push({
                    ideaCode: idea.ideaCode,
                    oldStatus: oldStatus,
                    oldImplementationStatus: oldImplementationStatus || 'N/A',
                    newStatus: newStatus,
                    timestamp: new Date()
                });
                console.log(`✅ Đã cập nhật ý tưởng ${idea.ideaCode}:`);
                console.log(`   Trước: status="${oldStatus}", implementationStatus="${oldImplementationStatus || 'N/A'}"`);
                console.log(`   Sau: status="${newStatus}"`);
                console.log('');
                updatedCount++;
            }
            catch (error) {
                console.error(`❌ Lỗi khi cập nhật ý tưởng ${idea.ideaCode}:`, error);
                errorCount++;
            }
        }
        // In báo cáo tổng kết
        console.log('\n========================================');
        console.log('KẾT QUẢ MIGRATION');
        console.log('========================================');
        console.log(`✅ Đã cập nhật: ${updatedCount} ý tưởng`);
        console.log(`⏭️  Đã bỏ qua: ${skippedCount} ý tưởng (đã có status mới)`);
        console.log(`❌ Lỗi: ${errorCount} ý tưởng`);
        console.log(`📋 Tổng cộng: ${ideas.length} ý tưởng\n`);
        // In chi tiết mapping
        console.log('========================================');
        console.log('CHI TIẾT MAPPING (10 ý tưởng đầu tiên):');
        console.log('========================================');
        migrationLog.slice(0, 10).forEach((log, index) => {
            console.log(`${index + 1}. ${log.ideaCode}`);
            console.log(`   ${log.oldStatus} + ${log.oldImplementationStatus} → ${log.newStatus}`);
        });
        if (migrationLog.length > 10) {
            console.log(`   ... và ${migrationLog.length - 10} ý tưởng khác`);
        }
        // Lưu log vào file (optional)
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../../migration-log.json');
        fs.writeFileSync(logPath, JSON.stringify(migrationLog, null, 2));
        console.log(`\n📄 Log chi tiết đã được lưu tại: ${logPath}`);
    }
    catch (error) {
        console.error('❌ Lỗi trong quá trình migration:', error);
        throw error;
    }
    finally {
        yield mongoose_1.default.disconnect();
        console.log('\n✅ Đã ngắt kết nối database');
    }
});
// Chạy migration nếu file được gọi trực tiếp
if (require.main === module) {
    migrateToUnifiedStatus()
        .then(() => {
        console.log('\n✅ Migration script hoàn thành thành công!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Migration script thất bại:', error);
        process.exit(1);
    });
}
exports.default = migrateToUnifiedStatus;
