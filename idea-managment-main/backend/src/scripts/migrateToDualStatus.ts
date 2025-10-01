import mongoose from 'mongoose';
import Idea from '../models/Idea';

// Mapping từ implementationDirection cũ sang implementationStatus mới
const implementationStatusMapping: Record<string, string> = {
  'Lưu ý tưởng': 'Xem xét',
  'Triển khai': 'Đang triển khai',
  'Làm báo cáo A3': 'Lập báo cáo A3',
  'Xem xét': 'Xem xét',
  '': 'Đề xuất mới' // Trường hợp rỗng
};

// Mapping từ status cũ sang status mới (giữ nguyên)
const statusMapping: Record<string, string> = {
  'pending': 'pending',
  'rejected': 'rejected',
  'noted': 'noted',
  'approved': 'approved'
};

const migrateToDualStatus = async () => {
  try {
    console.log('Bắt đầu migration dữ liệu sang hệ thống dual status...');
    
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
        let newImplementationStatus = 'Đề xuất mới'; // Mặc định
        let newStatus = 'pending'; // Mặc định

        // Migration implementationStatus từ implementationDirection
        if (idea.implementationDirection && idea.implementationDirection !== '') {
          newImplementationStatus = implementationStatusMapping[idea.implementationDirection] || 'Đề xuất mới';
        }

        // Migration status (giữ nguyên giá trị cũ)
        if (idea.status) {
          newStatus = statusMapping[idea.status] || 'pending';
        }

        // Cập nhật ý tưởng với cả hai trường
        await Idea.findByIdAndUpdate(idea._id, {
          $set: {
            status: newStatus,
            implementationStatus: newImplementationStatus,
            // Xóa trường implementationDirection cũ
            $unset: { implementationDirection: 1 }
          }
        });

        console.log(`Đã cập nhật ý tưởng ${idea.ideaCode}: status=${newStatus}, implementationStatus=${newImplementationStatus}`);
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
  migrateToDualStatus()
    .then(() => {
      console.log('Migration script hoàn thành');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script thất bại:', error);
      process.exit(1);
    });
}

export default migrateToDualStatus;
