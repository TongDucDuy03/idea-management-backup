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
          { benefitValue: { $exists: false } },
          { rewardAmount: { $exists: false } }
        ]
      },
      {
        $set: {
          benefitValue: 0,
          rewardAmount: 0
        }
      }
    );

    console.log('Updated documents with benefitValue and rewardAmount fields:', result.modifiedCount);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
