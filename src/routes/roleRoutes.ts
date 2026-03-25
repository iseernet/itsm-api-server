import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { signatureMiddleware } from '../middleware/signature';
import * as roleController from '../controllers/roleController';
import * as menuController from '../controllers/menuController';
// import { updateRole } from '../services/roleService';
const router = express.Router();

//
//role
// 项目角色列表
router.get('/', authMiddleware, signatureMiddleware, roleController.listRoles);
router.get('/:roleId', authMiddleware, signatureMiddleware, roleController.getRoleDetail);
//删除角色
router.delete('/:roleId', authMiddleware, signatureMiddleware, roleController.removeRole);
// 添加用户到角色
router.post('/:roleId/users', authMiddleware, signatureMiddleware, roleController.addUserToRole);
// 添加 Group 到角色
router.post('/:roleId/groups', authMiddleware, signatureMiddleware, roleController.addGroupToRole);
// 删除角色用户
router.delete('/:roleId/users/:username', authMiddleware, signatureMiddleware, roleController.removeUserFromRole);
// 删除角色 Group
router.delete('/:roleId/groups/:groupName', authMiddleware, signatureMiddleware, roleController.removeGroupFromRole);

// 更新角色信息
router.put('/:roleId', authMiddleware, signatureMiddleware, roleController.updateRole);

// 获取角色下用户，group解开
router.get("/:roleId/users/list", authMiddleware, signatureMiddleware, roleController.getRoleUsers);
export default router;
