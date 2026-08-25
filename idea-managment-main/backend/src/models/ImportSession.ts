import mongoose, { Document, Schema } from 'mongoose';

export enum ImportRowStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export interface IImportRow {
  rowIndex: number;
  ideaCode: string;
  payload: Record<string, any>; // Các field sẽ update
  diff?: {
    current: Record<string, any>;
    new: Record<string, any>;
  };
  status: ImportRowStatus;
  messages: string[]; // Danh sách lỗi/cảnh báo
  selected: boolean;
}

export interface IImportSession extends Document {
  fileName: string;
  uploadedBy?: string;
  createdAt: Date;
  mappingConfig?: Record<string, string>;
  summary: {
    total: number;
    ok: number;
    warn: number;
    error: number;
  };
  rows: IImportRow[];
}

const ImportRowSchema = new Schema<IImportRow>({
  rowIndex: { type: Number, required: true },
  ideaCode: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  diff: {
    current: { type: Schema.Types.Mixed },
    new: { type: Schema.Types.Mixed }
  },
  status: {
    type: String,
    enum: Object.values(ImportRowStatus),
    required: true
  },
  messages: { type: [String], default: [] },
  selected: { type: Boolean, default: true }
}, { _id: false });

const ImportSessionSchema = new Schema<IImportSession>({
  fileName: { type: String, required: true },
  uploadedBy: { type: String },
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // Tự động xóa phiên import cũ sau 7 ngày
  mappingConfig: { type: Schema.Types.Mixed },
  summary: {
    total: { type: Number, default: 0 },
    ok: { type: Number, default: 0 },
    warn: { type: Number, default: 0 },
    error: { type: Number, default: 0 }
  },
  rows: { type: [ImportRowSchema], default: [] }
});

export default mongoose.model<IImportSession>('ImportSession', ImportSessionSchema);

