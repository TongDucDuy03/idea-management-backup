import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management';

async function run() {
  try {
    await mongoose.connect(uri);

    const ideaCollection = mongoose.connection.collection('ideas');

    // Add new fields to existing documents
    const result = await ideaCollection.updateMany(
      { 
        $or: [
          { implementationDirection: { $exists: false } },
          { implementationDepartment: { $exists: false } },
          { note: { $exists: false } }
        ]
      },
      {
        $set: {
          implementationDirection: 'Lưu ý tưởng',
          implementationDepartment: '',
          note: ''
        }
      }
    );

    console.log('Updated documents with new fields:', result.modifiedCount);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
