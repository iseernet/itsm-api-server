import express from 'express';

import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import {getSlaDayList, refreshSlaDay} from "../controllers/SlaDayController";
const router = express.Router();

router.get('/list', authMiddleware, signatureMiddleware, getSlaDayList);
router.post('/refresh', authMiddleware, signatureMiddleware, refreshSlaDay);

export default router;
