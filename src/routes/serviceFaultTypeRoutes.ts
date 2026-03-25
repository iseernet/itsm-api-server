import { Router } from 'express';
import { ServiceFaultTypeController } from '../controllers/serviceFaultTypeController';
import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';

const router = Router();

router.get('/', authMiddleware, signatureMiddleware, ServiceFaultTypeController.getAll);

router.get('/getFromRn', authMiddleware, signatureMiddleware, ServiceFaultTypeController.getAll);

export default router;
