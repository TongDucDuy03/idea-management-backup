import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management';

async function run() {
  try {
    await mongoose.connect(uri);

    const ideaCollection = mongoose.connection.collection('ideas');

    // 1) Backfill: set status from isPaid when status missing
    const resultBackfill = await ideaCollection.updateMany(
      { status: { $exists: false } },
      [
        {
          $set: {
            status: {
              $cond: [
                { $eq: ['$isPaid', true] },
                'rewarded',
                'pending'
              ]
            }
          }
        }
      ] as any
    );

    // 2) Optional: remove legacy isPaid field (safe, non-fatal if kept)
    const resultUnset = await ideaCollection.updateMany(
      { isPaid: { $exists: true } },
      { $unset: { isPaid: '' } }
    );

    console.log('Backfilled docs:', resultBackfill.modifiedCount);
    console.log('Removed legacy isPaid:', resultUnset.modifiedCount);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();


