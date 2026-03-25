import express from 'express';
import { getOrders } from '../controllers/orderController';
import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';

const router = express.Router();

// 这里用 POST，参数通过 body 传递
router.post('/getOrders', signatureMiddleware, authMiddleware, getOrders);
router.post('/getOrdersNoSign', authMiddleware, getOrders);
export default router;
