import express from 'express';
import {
    getPriorities
} from '../controllers/priorityController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';

const router = express.Router();

router.get('/', authMiddleware, signatureMiddleware, getPriorities);

export default router;
