import { Router } from 'express';
import {
    getSlaRules,
    getSlaRuleById,
    createSlaRule,
    updateSlaRule,
    deleteSlaRule
} from '../controllers/slaRuleController';
import { authMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';

const router = Router();

// 查询所有 SLA 规则
router.get('/', authMiddleware, signatureMiddleware, getSlaRules);

// 根据 ID 查询
router.get('/:id', authMiddleware, signatureMiddleware, getSlaRuleById);

// 创建 SLA 规则
router.post('/', authMiddleware, signatureMiddleware, createSlaRule);

// 更新 SLA 规则
router.put('/:id', authMiddleware, signatureMiddleware, updateSlaRule);

// 删除 SLA 规则
router.delete('/:id', authMiddleware, signatureMiddleware, deleteSlaRule);

export default router;
