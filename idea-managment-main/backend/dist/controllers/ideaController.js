"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIdea = exports.updateIdea = exports.updatePaymentStatus = exports.getAllIdeas = exports.createIdea = void 0;
const Idea_1 = __importDefault(require("../models/Idea"));
const emailService_1 = require("../services/emailService");
const createIdea = async (req, res) => {
    try {
        const { fullName, department, idea, solution, benefit, status, implementationStatus, implementationDepartment, note, benefitValue, rewardAmount } = req.body;
        // Generate idea code (without name prefix)
        const timestamp = new Date().getTime();
        const randomNum = Math.floor(Math.random() * 1000);
        const ideaCode = `${timestamp}-${randomNum}`;
        const newIdea = new Idea_1.default({
            fullName,
            department,
            idea,
            solution,
            benefit,
            ideaCode,
            submissionDate: new Date(),
            status: status || 'pending',
            implementationStatus: implementationStatus || 'Đề xuất mới',
            implementationDepartment,
            note,
            benefitValue: benefitValue || 0,
            rewardAmount: rewardAmount || 0
        });
        const savedIdea = await newIdea.save();
        // Fire-and-forget email (do not block response)
        (0, emailService_1.sendIdeaSubmittedEmail)(savedIdea).catch((err) => {
            console.error('Failed to send idea notification email:', err);
        });
        res.status(201).json(savedIdea);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating idea', error });
    }
};
exports.createIdea = createIdea;
const getAllIdeas = async (req, res) => {
    try {
        const { search, isPaid } = req.query;
        let query = {};
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { ideaCode: { $regex: search, $options: 'i' } }
            ];
        }
        if (isPaid !== undefined) {
            query.isPaid = isPaid === 'true';
        }
        const ideas = await Idea_1.default.find(query).sort({ submissionDate: -1 });
        res.json(ideas);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching ideas', error });
    }
};
exports.getAllIdeas = getAllIdeas;
const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPaid } = req.body;
        const updatedIdea = await Idea_1.default.findByIdAndUpdate(id, { isPaid }, { new: true });
        if (!updatedIdea) {
            return res.status(404).json({ message: 'Idea not found' });
        }
        res.json(updatedIdea);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating payment status', error });
    }
};
exports.updatePaymentStatus = updatePaymentStatus;
const updateIdea = async (req, res) => {
    try {
        console.log('Updating idea:', {
            id: req.params.id,
            beforeImage: req.body.beforeImage ? 'Present' : 'Missing',
            afterImage: req.body.afterImage ? 'Present' : 'Missing',
            bodyKeys: Object.keys(req.body)
        });

        const idea = await Idea_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
        }
        
        console.log('Updated idea:', {
            id: idea._id,
            beforeImage: idea.beforeImage ? 'Present' : 'Missing',
            afterImage: idea.afterImage ? 'Present' : 'Missing'
        });
        
        res.json(idea);
    }
    catch (error) {
        console.error('Error updating idea:', error);
        res.status(500).json({ message: 'Lỗi server', error });
    }
};
exports.updateIdea = updateIdea;
const deleteIdea = async (req, res) => {
    try {
        const idea = await Idea_1.default.findByIdAndDelete(req.params.id);
        if (!idea) {
            return res.status(404).json({ message: 'Không tìm thấy ý tưởng' });
        }
        res.json({ message: 'Đã xóa ý tưởng thành công' });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};
exports.deleteIdea = deleteIdea;
