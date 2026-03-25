import { Router } from 'express';
import { ServiceFaultTypeController } from '../controllers/serviceFaultTypeController';
import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import {ServiceFaultTypeFinalController} from "../controllers/serviceFaultTypeFinalController";

const router = Router();

router.get('/', authMiddleware, signatureMiddleware, ServiceFaultTypeFinalController.getAll);

router.get('/getFromRn', authMiddleware, signatureMiddleware, ServiceFaultTypeFinalController.getAll);

export default router;
