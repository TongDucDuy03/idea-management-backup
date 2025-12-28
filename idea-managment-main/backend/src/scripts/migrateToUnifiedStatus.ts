import mongoose from 'mongoose';
import Idea, { IdeaStatus } from '../models/Idea';

/**
 * Migration script để chuyển đổi từ hệ thống cũ (status + implementationStatus)
 * sang hệ thống mới (chỉ status với enum chuẩn)
 * 
 * Mapping rules:
 * - status cũ: 'pending' + implementationStatus: 'Đề xuất mới' → DE_NGHI_MOI
 * - status cũ: 'pending' + implementationStatus: 'Xem xét' → XEM_XET
 * - status cũ: 'pending' + implementationStatus: 'Phê duyệt' → CHO_PHE_DUYET
 * - status cũ: 'pending' + implementationStatus: 'Phản hồi phê duyệt' → CHO_PHE_DUYET
 * - status cũ: 'approved' → TRIEN_KHAI (nếu không có implementationStatus)
 * - implementationStatus: 'Đang triển khai' → TRIEN_KHAI
 * - status cũ: 'rejected' → REJECTED
 * - status cũ: 'noted' → LUU_Y_TUONG
 * - implementationStatus: 'Không đạt' → KHONG_PHU_HOP
 * - implementationStatus: 'Lập báo cáo A3' → BAO_CAO_A3
 * - implementationStatus: 'Phê duyệt khen thưởng' → KHEN_THUONG
 * - implementationStatus: 'Đã khen thưởng' → DONE
 */

interface MigrationLog {
  ideaCode: string;
  oldStatus: string;
  oldImplementationStatus: string;
  newStatus: IdeaStatus;
  timestamp: Date;
}

const migrationLog: MigrationLog[] = [];

const migrateToUnifiedStatus = async () => {
  try {
    console.log('========================================');
    console.log('Bắt đầu migration sang hệ thống status thống nhất');
    console.log('========================================\n');
    
    // Kết nối database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management';
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối database:', mongoUri);

    // Lấy tất cả ý tưởng (bao gồm cả các trường cũ)
    const ideas = await Idea.find({}).lean();
    console.log(`📊 Tìm thấy ${ideas.length} ý tưởng cần migration\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const idea of ideas) {
      try {
        const oldStatus = (idea as any).status || 'pending';
        const oldImplementationStatus = (idea as any).implementationStatus || null;

        // Xác định status mới dựa trên logic mapping
        let newStatus: IdeaStatus = IdeaStatus.DE_NGHI_MOI; // Mặc định

        // Ưu tiên implementationStatus nếu có (vì nó chứa thông tin chi tiết hơn)
        if (oldImplementationStatus) {
          switch (oldImplementationStatus) {
            case 'Đề xuất mới':
              newStatus = IdeaStatus.DE_NGHI_MOI;
              break;
            case 'Xem xét':
              newStatus = IdeaStatus.XEM_XET;
              break;
            case 'Phê duyệt':
              newStatus = IdeaStatus.CHO_PHE_DUYET;
              break;
            case 'Phản hồi phê duyệt':
              newStatus = IdeaStatus.CHO_PHE_DUYET;
              break;
            case 'Đang triển khai':
              newStatus = IdeaStatus.TRIEN_KHAI;
              break;
            case 'Lập báo cáo A3':
              newStatus = IdeaStatus.BAO_CAO_A3;
              break;
            case 'Phê duyệt khen thưởng':
              newStatus = IdeaStatus.KHEN_THUONG;
              break;
            case 'Đã khen thưởng':
              newStatus = IdeaStatus.DONE;
              break;
            case 'Không đạt':
              newStatus = IdeaStatus.KHONG_PHU_HOP;
              break;
            default:
              // Fallback về status cũ
              if (oldStatus === 'rejected') {
                newStatus = IdeaStatus.REJECTED;
              } else if (oldStatus === 'noted') {
                newStatus = IdeaStatus.LUU_Y_TUONG;
              } else if (oldStatus === 'approved') {
                newStatus = IdeaStatus.TRIEN_KHAI;
              } else {
                newStatus = IdeaStatus.DE_NGHI_MOI;
              }
          }
        } else {
          // Chỉ có status cũ, không có implementationStatus
          switch (oldStatus) {
            case 'pending':
              newStatus = IdeaStatus.DE_NGHI_MOI;
              break;
            case 'rejected':
              newStatus = IdeaStatus.REJECTED;
              break;
            case 'noted':
              newStatus = IdeaStatus.LUU_Y_TUONG;
              break;
            case 'approved':
              newStatus = IdeaStatus.TRIEN_KHAI;
              break;
            default:
              newStatus = IdeaStatus.DE_NGHI_MOI;
          }
        }

        // Kiểm tra nếu status đã là giá trị mới (đã migrate rồi)
        if (Object.values(IdeaStatus).includes(oldStatus as IdeaStatus)) {
          console.log(`⏭️  Bỏ qua ý tưởng ${idea.ideaCode}: đã có status mới (${oldStatus})`);
          skippedCount++;
          continue;
        }

        // Cập nhật ý tưởng: set status mới và unset implementationStatus
        await Idea.findByIdAndUpdate(
          idea._id,
          {
            $set: {
              status: newStatus
            },
            $unset: {
              implementationStatus: 1
            }
          },
          { new: true }
        );

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
      } catch (error) {
        console.error(`❌ Lỗi khi cập nhật ý tưởng ${(idea as any).ideaCode}:`, error);
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

  } catch (error) {
    console.error('❌ Lỗi trong quá trình migration:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Đã ngắt kết nối database');
  }
};

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

export default migrateToUnifiedStatus;


