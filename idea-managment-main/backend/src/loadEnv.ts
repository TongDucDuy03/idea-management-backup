/**
 * Module chỉ có tác dụng phụ: nạp biến môi trường.
 *
 * Phải là import ĐẦU TIÊN trong index.ts. CommonJS thực thi các require theo
 * đúng thứ tự khai báo, nên việc này bảo đảm process.env đã sẵn sàng trước khi
 * các module khác (middleware/makeAuth, config/secrets, ...) đọc nó ở cấp module.
 */
import { loadEnv } from './config/env';

loadEnv();
