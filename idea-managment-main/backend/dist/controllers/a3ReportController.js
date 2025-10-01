"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getA3ReportByIdeaCode = exports.deleteA3Report = exports.updateA3Report = exports.getA3ReportByIdeaId = exports.getA3ReportById = exports.getAllA3Reports = exports.createA3Report = void 0;
const A3Report_1 = __importDefault(require("../models/A3Report"));
const Idea_1 = __importDefault(require("../models/Idea"));
// Tạo báo cáo A3 mới
const createA3Report = async (req, res) => {
    try {
        const { ideaId, ideaCode, fullName, department, topicTitle, submissionDate, problemDescription, currentSituation, rootCause, targetSituation, solution, implementationPlan, resources, timeline, responsiblePerson, expectedResult, actualResult, benefit, cost, risk, followUpAction, lessonsLearned, scalingOpportunity, implementationDepartment, implementationDate, completionDate, status, note, createdBy } = req.body;
        // Kiểm tra xem ý tưởng có tồn tại không
        const idea = await Idea_1.default.findById(ideaId);
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
        }
        // Kiểm tra xem đã có báo cáo A3 cho ý tưởng này chưa
        const existingReport = await A3Report_1.default.findOne({ ideaId });
        if (existingReport) {
            return res.status(400).json({ message: 'Đã tồn tại báo cáo A3 cho ý tưởng này' });
        }
        const a3Report = new A3Report_1.default({
            ideaId,
            ideaCode,
            fullName,
            department,
            topicTitle,
            submissionDate,
            problemDescription,
            currentSituation,
            rootCause,
            targetSituation,
            solution,
            implementationPlan,
            resources,
            timeline,
            responsiblePerson,
            expectedResult,
            actualResult,
            benefit,
            cost,
            risk,
            followUpAction,
            lessonsLearned,
            scalingOpportunity,
            implementationDepartment,
            implementationDate,
            completionDate,
            status: status || 'draft',
            note,
            createdBy
        });
        await a3Report.save();
        res.status(201).json(a3Report);
    }
    catch (error) {
        console.error('Error creating A3 report:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo báo cáo A3' });
    }
};
exports.createA3Report = createA3Report;
// Lấy tất cả báo cáo A3
const getAllA3Reports = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, ideaCode, department } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (ideaCode)
            filter.ideaCode = { $regex: ideaCode, $options: 'i' };
        if (department)
            filter.department = { $regex: department, $options: 'i' };
        const a3Reports = await A3Report_1.default.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await A3Report_1.default.countDocuments(filter);
        res.json({
            a3Reports,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    }
    catch (error) {
        console.error('Error getting A3 reports:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách báo cáo A3' });
    }
};
exports.getAllA3Reports = getAllA3Reports;
// Lấy báo cáo A3 theo ID
const getA3ReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const a3Report = await A3Report_1.default.findById(id);
        if (!a3Report) {
            return res.status(404).json({ message: 'Không tìm thấy báo cáo A3' });
        }
        res.json(a3Report);
    }
    catch (error) {
        console.error('Error getting A3 report:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo A3' });
    }
};
exports.getA3ReportById = getA3ReportById;
// Lấy báo cáo A3 theo ideaId
const getA3ReportByIdeaId = async (req, res) => {
    try {
        const { ideaId } = req.params;
        const a3Report = await A3Report_1.default.findOne({ ideaId });
        if (!a3Report) {
            return res.status(404).json({ message: 'Không tìm thấy báo cáo A3 cho ý tưởng này' });
        }
        res.json(a3Report);
    }
    catch (error) {
        console.error('Error getting A3 report by idea ID:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo A3' });
    }
};
exports.getA3ReportByIdeaId = getA3ReportByIdeaId;
// Cập nhật báo cáo A3
const updateA3Report = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const a3Report = await A3Report_1.default.findByIdAndUpdate(id, Object.assign(Object.assign({}, updateData), { updatedAt: new Date() }), { new: true, runValidators: true });
        if (!a3Report) {
            return res.status(404).json({ message: 'Không tìm thấy báo cáo A3' });
        }
        res.json(a3Report);
    }
    catch (error) {
        console.error('Error updating A3 report:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật báo cáo A3' });
    }
};
exports.updateA3Report = updateA3Report;
// Xóa báo cáo A3
const deleteA3Report = async (req, res) => {
    try {
        const { id } = req.params;
        const a3Report = await A3Report_1.default.findByIdAndDelete(id);
        if (!a3Report) {
            return res.status(404).json({ message: 'Không tìm thấy báo cáo A3' });
        }
        res.json({ message: 'Xóa báo cáo A3 thành công' });
    }
    catch (error) {
        console.error('Error deleting A3 report:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa báo cáo A3' });
    }
};
exports.deleteA3Report = deleteA3Report;
// Lấy báo cáo A3 theo ideaCode
const getA3ReportByIdeaCode = async (req, res) => {
    try {
        const { ideaCode } = req.params;
        const a3Report = await A3Report_1.default.findOne({ ideaCode });
        if (!a3Report) {
            return res.status(404).json({ message: 'Không tìm thấy báo cáo A3 với mã ý tưởng này' });
        }
        res.json(a3Report);
    }
    catch (error) {
        console.error('Error getting A3 report by idea code:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo A3' });
    }
};
exports.getA3ReportByIdeaCode = getA3ReportByIdeaCode;
