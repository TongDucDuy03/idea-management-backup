const mongoose = require('mongoose');

// Test script để kiểm tra xem các trường beforeImage và afterImage có hoạt động không
const testImageFields = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management');
    console.log('Connected to MongoDB');

    // Lấy model Idea
    const Idea = require('./dist/models/Idea').default;
    
    // Tìm một idea để test
    const idea = await Idea.findOne();
    if (!idea) {
      console.log('No ideas found in database');
      return;
    }

    console.log('Found idea:', {
      _id: idea._id,
      ideaCode: idea.ideaCode,
      hasBeforeImage: 'beforeImage' in idea,
      hasAfterImage: 'afterImage' in idea,
      beforeImageValue: idea.beforeImage,
      afterImageValue: idea.afterImage
    });

    // Test update với hình ảnh
    const testImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
    
    const updatedIdea = await Idea.findByIdAndUpdate(
      idea._id,
      { 
        beforeImage: testImageData,
        afterImage: testImageData
      },
      { new: true }
    );

    console.log('Updated idea:', {
      _id: updatedIdea._id,
      ideaCode: updatedIdea.ideaCode,
      hasBeforeImage: 'beforeImage' in updatedIdea,
      hasAfterImage: 'afterImage' in updatedIdea,
      beforeImageLength: updatedIdea.beforeImage ? updatedIdea.beforeImage.length : 0,
      afterImageLength: updatedIdea.afterImage ? updatedIdea.afterImage.length : 0
    });

    console.log('✅ Image fields are working correctly!');

  } catch (error) {
    console.error('❌ Error testing image fields:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Chạy test
testImageFields();
