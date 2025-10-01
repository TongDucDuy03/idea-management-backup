"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ideaController_1 = require("../controllers/ideaController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.post('/', ideaController_1.createIdea);
// Protected routes
router.get('/', auth_1.auth, ideaController_1.getAllIdeas);
router.put('/:id', auth_1.auth, ideaController_1.updateIdea);
router.delete('/:id', auth_1.auth, ideaController_1.deleteIdea);
router.patch('/:id/payment', auth_1.auth, ideaController_1.updatePaymentStatus);
exports.default = router;
