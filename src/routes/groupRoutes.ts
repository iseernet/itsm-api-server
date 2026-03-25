import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import * as groupController from '../controllers/groupController';
import * as menuController from '../controllers/menuController';
// import { updateRole } from '../services/roleService';
const router = express.Router();
// 组 CRUD
router.post('/', authMiddleware, signatureMiddleware, groupController.createGroup);
router.get('/', authMiddleware, signatureMiddleware, groupController.listGroups);
router.get('/:group_name', authMiddleware, signatureMiddleware, groupController.getGroupdetail);
router.delete('/:group_name', authMiddleware, signatureMiddleware, groupController.deleteGroup);
router.put('/:group_name', authMiddleware, signatureMiddleware, groupController.updateGroup);

// 组成员操作
router.get('/:group_name/users', authMiddleware, signatureMiddleware, groupController.listGroupUsers);
router.post('/:group_name/users', authMiddleware, signatureMiddleware, groupController.addUserToGroup);
router.delete('/:group_name/users/:username', authMiddleware, signatureMiddleware, groupController.removeUserFromGroup);


// 角色菜单
router.get('/:group_name', authMiddleware, signatureMiddleware, menuController.getMenusByRole);
router.get('/:group_name/tree', authMiddleware, signatureMiddleware, menuController.getMenuTreeByRole);
// router.post('/assign', authMiddleware, menuController.assignMenusToRole);


export default router;
