import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management';

async function run() {
  try {
    await mongoose.connect(uri);

    const ideaCollection = mongoose.connection.collection('ideas');

    // Update all records that have "Lưu ý tưởng" as implementationDirection to empty string
    const result = await ideaCollection.updateMany(
      { implementationDirection: 'Lưu ý tưởng' },
      { $set: { implementationDirection: '' } }
    );

    console.log('Updated implementationDirection from "Lưu ý tưởng" to empty string:', result.modifiedCount);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
