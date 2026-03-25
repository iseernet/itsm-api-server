import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import * as menuController from '../controllers/menuController';

const router = express.Router();

// 菜单 CRUD
router.post('/', authMiddleware, signatureMiddleware, menuController.createMenu);
router.get('/', authMiddleware, signatureMiddleware, menuController.getMenus);
router.get('/:id', authMiddleware, signatureMiddleware, menuController.getMenuDetail);
router.put('/:id', authMiddleware, signatureMiddleware, menuController.updateMenu);
router.delete('/:id', authMiddleware, signatureMiddleware, menuController.deleteMenu);

// 菜单树
router.get('/tree/all', authMiddleware, signatureMiddleware, menuController.getMenuTree);

// // 角色菜单
// router.get('/role/:role_name', authMiddleware, menuController.getMenusByRole);
// router.get('/role/:role_name/tree', authMiddleware, menuController.getMenuTreeByRole);
// router.post('/role/assign', authMiddleware, menuController.assignMenusToRole);

export default router;
