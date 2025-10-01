"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdmin = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find user
        const user = await User_1.default.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};
exports.login = login;
const createAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if user exists
        const existingUser = await User_1.default.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
        }
        // Create new user
        const user = new User_1.default({ username, password });
        await user.save();
        res.status(201).json({ message: 'Tạo tài khoản thành công' });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};
exports.createAdmin = createAdmin;
