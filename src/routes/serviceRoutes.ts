import express from 'express';

import { authMiddleware, roleMiddleware } from '../middleware/auth';
import * as serviceController from '../controllers/serviceController';
import { signatureMiddleware } from '../middleware/signature';
const router = express.Router();

router.get('/', authMiddleware, signatureMiddleware, serviceController.getService);
// router.get('/', authMiddleware, serviceController.getAllServices);
router.get('/detail/:id', authMiddleware, signatureMiddleware, serviceController.getServiceById);
router.post('/', authMiddleware, signatureMiddleware, serviceController.createService);
router.put('/:id', authMiddleware, signatureMiddleware, serviceController.updateService);
router.delete('/:id', authMiddleware, signatureMiddleware, serviceController.deleteService);

// // 分页查询 service 列表
router.get('/list', authMiddleware, signatureMiddleware, serviceController.getServices);

router.get('/maintenanceSystem', authMiddleware, signatureMiddleware, serviceController.getMaintenanceSystem);
router.get('/operationPermissions', authMiddleware, signatureMiddleware, serviceController.getOperationPermissions);
router.get('/relatedSN', authMiddleware, signatureMiddleware, serviceController.getRelatedSN);

export default router;
