"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Idea_1 = __importDefault(require("../models/Idea"));

// Script để thêm các trường beforeImage và afterImage vào database
const addImageFields = async () => {
    try {
        // Kết nối database
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management');
        console.log('Connected to MongoDB');

        // Thêm các trường mới vào tất cả documents hiện có
        const result = await Idea_1.default.updateMany(
            {}, // Tìm tất cả documents
            {
                $set: {
                    beforeImage: null,
                    afterImage: null
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} documents with new image fields`);
        console.log('Image fields added successfully!');
        
        // Kiểm tra một document để xác nhận
        const sampleIdea = await Idea_1.default.findOne();
        if (sampleIdea) {
            console.log('Sample document structure:', {
                _id: sampleIdea._id,
                ideaCode: sampleIdea.ideaCode,
                hasBeforeImage: 'beforeImage' in sampleIdea,
                hasAfterImage: 'afterImage' in sampleIdea
            });
        }

    } catch (error) {
        console.error('Error adding image fields:', error);
    } finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Chạy script
addImageFields();
