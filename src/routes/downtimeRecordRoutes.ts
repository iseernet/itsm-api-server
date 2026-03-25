import express from 'express';

import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import {getDowntimeRecord} from "../controllers/DowntimeRecordController";
const router = express.Router();

router.get('/list', authMiddleware, signatureMiddleware, getDowntimeRecord);


export default router;
