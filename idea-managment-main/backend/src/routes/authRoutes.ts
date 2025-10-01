import express from 'express';
import { login, createAdmin } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/create-admin', createAdmin);

export default router; 