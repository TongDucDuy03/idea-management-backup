import mongoose from 'mongoose';
import Idea from '../models/Idea';

// Mapping từ implementationDirection cũ sang status mới
const statusMapping: Record<string, string> = {
  'Lưu ý tưởng': 'Xem xét',
  'Triển khai': 'Đang triển khai',
  'Làm báo cáo A3': 'Lập báo cáo A3',
  'Xem xét': 'Xem xét',
  '': 'Đề xuất mới' // Trường hợp rỗng
};

// Mapping từ status cũ sang status mới
const oldStatusMapping: Record<string, string> = {
  'pending': 'Đề xuất mới',
  'rejected': 'Không đạt',
  'noted': 'Xem xét',
  'approved': 'Phê duyệt'
};

const migrateToNewStatus = async () => {
  try {
    console.log('Bắt đầu migration dữ liệu sang trạng thái mới...');
    
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management');
    console.log('Đã kết nối database');

    // Lấy tất cả ý tưởng
    const ideas = await Idea.find({});
    console.log(`Tìm thấy ${ideas.length} ý tưởng cần migration`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const idea of ideas) {
      try {
        let newStatus = 'Đề xuất mới'; // Mặc định

        // Ưu tiên migration từ implementationDirection nếu có
        if (idea.implementationDirection && idea.implementationDirection !== '') {
          newStatus = statusMapping[idea.implementationDirection] || 'Đề xuất mới';
        } else if (idea.status) {
          // Nếu không có implementationDirection, sử dụng status cũ
          newStatus = oldStatusMapping[idea.status] || 'Đề xuất mới';
        }

        // Cập nhật ý tưởng
        await Idea.findByIdAndUpdate(idea._id, {
          $set: {
            status: newStatus,
            // Xóa trường implementationDirection cũ
            $unset: { implementationDirection: 1 }
          }
        });

        console.log(`Đã cập nhật ý tưởng ${idea.ideaCode}: ${idea.status || idea.implementationDirection} -> ${newStatus}`);
        updatedCount++;
      } catch (error) {
        console.error(`Lỗi khi cập nhật ý tưởng ${idea.ideaCode}:`, error);
        errorCount++;
      }
    }

    console.log(`\nMigration hoàn thành!`);
    console.log(`- Đã cập nhật: ${updatedCount} ý tưởng`);
    console.log(`- Lỗi: ${errorCount} ý tưởng`);

    // Cập nhật schema để loại bỏ trường implementationDirection
    console.log('\nCập nhật schema...');
    await mongoose.connection.db.collection('ideas').updateMany(
      {},
      { $unset: { implementationDirection: 1 } }
    );
    console.log('Đã xóa trường implementationDirection khỏi tất cả documents');

  } catch (error) {
    console.error('Lỗi trong quá trình migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Đã ngắt kết nối database');
  }
};

// Chạy migration nếu file được gọi trực tiếp
if (require.main === module) {
  migrateToNewStatus()
    .then(() => {
      console.log('Migration script hoàn thành');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script thất bại:', error);
      process.exit(1);
    });
}

export default migrateToNewStatus;
