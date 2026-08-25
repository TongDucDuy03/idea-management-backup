import '../loadEnv';
import mongoose from 'mongoose';
import Idea from '../models/Idea';
import { isBase64DataUrl, saveBase64ToFile } from '../services/imageStorageService';

async function migrateCleanBase64() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const cursor = Idea.find({
    $or: [
      { beforeImage: { $regex: '^data:image/' } },
      { afterImage: { $regex: '^data:image/' } },
    ],
  }).cursor();

  let count = 0;
  let totalSavedBefore = 0;
  let totalSavedAfter = 0;

  console.log('Scanning ideas with Base64 image data...');

  for await (const doc of cursor) {
    const updates: any = {};
    const unsets: any = {};

    // Xử lý beforeImage
    if (isBase64DataUrl(doc.beforeImage)) {
      if (!doc.beforeImagePath) {
        try {
          const path = await saveBase64ToFile(doc.beforeImage, doc.ideaCode, 'before');
          updates.beforeImagePath = path;
          totalSavedBefore += 1;
        } catch (err) {
          console.error(`[MIGRATE] Failed to save beforeImage for ${doc.ideaCode}:`, err);
        }
      }
      unsets.beforeImage = 1;
    }

    // Xử lý afterImage
    if (isBase64DataUrl(doc.afterImage)) {
      if (!doc.afterImagePath) {
        try {
          const path = await saveBase64ToFile(doc.afterImage, doc.ideaCode, 'after');
          updates.afterImagePath = path;
          totalSavedAfter += 1;
        } catch (err) {
          console.error(`[MIGRATE] Failed to save afterImage for ${doc.ideaCode}:`, err);
        }
      }
      unsets.afterImage = 1;
    }

    const updateOps: any = {};
    if (Object.keys(updates).length > 0) {
      updateOps.$set = updates;
    }
    if (Object.keys(unsets).length > 0) {
      updateOps.$unset = unsets;
    }

    if (Object.keys(updateOps).length > 0) {
      await Idea.updateOne({ _id: doc._id }, updateOps);
      count += 1;
      console.log(`[CLEANED] Idea ${doc.ideaCode} (_id: ${doc._id})`);
    }
  }

  console.log(`\n=== Migration Finished ===`);
  console.log(`Total documents cleaned: ${count}`);
  console.log(`New beforeImage files created: ${totalSavedBefore}`);
  console.log(`New afterImage files created: ${totalSavedAfter}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

migrateCleanBase64().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
