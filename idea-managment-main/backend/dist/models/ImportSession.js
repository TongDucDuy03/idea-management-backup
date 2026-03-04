"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportRowStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ImportRowStatus;
(function (ImportRowStatus) {
    ImportRowStatus["OK"] = "OK";
    ImportRowStatus["WARNING"] = "WARNING";
    ImportRowStatus["ERROR"] = "ERROR";
})(ImportRowStatus || (exports.ImportRowStatus = ImportRowStatus = {}));
const ImportRowSchema = new mongoose_1.Schema({
    rowIndex: { type: Number, required: true },
    ideaCode: { type: String, required: true },
    payload: { type: mongoose_1.Schema.Types.Mixed, required: true },
    diff: {
        current: { type: mongoose_1.Schema.Types.Mixed },
        new: { type: mongoose_1.Schema.Types.Mixed }
    },
    status: {
        type: String,
        enum: Object.values(ImportRowStatus),
        required: true
    },
    messages: { type: [String], default: [] },
    selected: { type: Boolean, default: true }
}, { _id: false });
const ImportSessionSchema = new mongoose_1.Schema({
    fileName: { type: String, required: true },
    uploadedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    mappingConfig: { type: mongoose_1.Schema.Types.Mixed },
    summary: {
        total: { type: Number, default: 0 },
        ok: { type: Number, default: 0 },
        warn: { type: Number, default: 0 },
        error: { type: Number, default: 0 }
    },
    rows: { type: [ImportRowSchema], default: [] }
});
exports.default = mongoose_1.default.model('ImportSession', ImportSessionSchema);
