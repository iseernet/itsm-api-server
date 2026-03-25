import express from 'express';
import {
    login,
    refresh,
    logout,
    protectedRoute,
    adminOnly,
    token,
    getUserPermissions,
} from '../controllers/authController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/token', token);
router.get('/protected', authMiddleware, protectedRoute);
router.get('/admin-only', authMiddleware, roleMiddleware('admin'), adminOnly);
router.post('/getUserPermissions', authMiddleware, signatureMiddleware, getUserPermissions);
export default router;
