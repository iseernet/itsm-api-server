
import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import {alertDetail} from "../controllers/alertController";

const router = express.Router();

router.get('/:id', authMiddleware, signatureMiddleware, alertDetail);

export default router;
