"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-management';
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(uri);
            const ideaCollection = mongoose_1.default.connection.collection('ideas');
            // Add new fields to existing documents
            const result = yield ideaCollection.updateMany({
                $or: [
                    { benefitValue: { $exists: false } },
                    { rewardAmount: { $exists: false } }
                ]
            }, {
                $set: {
                    benefitValue: 0,
                    rewardAmount: 0
                }
            });
            console.log('Updated documents with benefitValue and rewardAmount fields:', result.modifiedCount);
        }
        catch (err) {
            console.error('Migration failed:', err);
            process.exitCode = 1;
        }
        finally {
            yield mongoose_1.default.disconnect();
        }
    });
}
run();
