//因为需求改变，此文件已经废弃
// import { Request, Response } from 'express';
// import * as groupService from '../services/groupService';
// import * as permissionService from '../services/permissionsService';

// /**
//  * 创建角色（Jira Group）
//  */
// export const createGroup = async (req: Request, res: Response) => {
//     const { group } = req.body;
//     if (!group) return res.send({ success: false, message: 'group is missing' });

//     try {
//         const data = await groupService.createGroup((req as any).user, group);
//         return res.send({ success: true, data });
//     } catch (error: any) {
//         return res.send({ success: false, message: error.message });
//     }
// };

// /**
//  * 删除角色（Jira Group + 菜单关联）
//  */
// export const deleteGroup = async (req: Request, res: Response) => {
//     const { group } = req.params;
//     if (!group) return res.send({ success: false, message: 'group is missing' });

//     try {
//         await permissionService.deleteRole((req as any).user, group);
//         return res.send({ success: true, data: { success: true } });
//     } catch (error: any) {
//         return res.send({ success: false, message: error.message });
//     }
// };

// /**
//  * 获取所有角色（Jira Group）
//  */
// export const listGroups = async (req: Request, res: Response) => {
//     try {
//         const data = await groupService.getAllGroups((req as any).user);
//         return res.send({ success: true, data });
//     } catch (error: any) {
//         return res.send({ success: false, message: error.message });
//     }
// };

// /**
//  * 获取组内用户
//  */
// export const listGroupUsers = async (req: Request, res: Response) => {
//     const { group } = req.params;
//     if (!group) return res.send({ success: false, message: 'group is missing' });

//     try {
//         const data = await groupService.getGroupUsers((req as any).user, group);
//         return res.send({ success: true, data });
//     } catch (error: any) {
//         return res.send({ success: false, message: error.message });
//     }
// };

// /**
//  * 添加用户到组
//  */
// export const addUserToGroup = async (req: Request, res: Response) => {
//     const { group } = req.params;
//     const { username } = req.body;
//     if (!group) return res.send({ success: false, message: 'group is missing' });
//     if (!username) return res.send({ success: false, message: 'username is missing' });

//     try {
//         const data = await groupService.addUserToGroup((req as any).user, group, username);
//         return res.send({ success: true, data });
//     } catch (error: any) {
//         return res.send({ success: false, message: error.message });
//     }
// };

// /**
//  * 从组移除用户
//  */
// export const removeUserFromGroup = async (req: Request, res: Response) => {
//     const { group, username } = req.params;
//     if (!group) return res.send({ success: false, message: 'group is missing' });
//     if (!username) return res.send({ success: false, message: 'username is missing' });

//     try {
//         await groupService.removeUserFromGroup((req as any).user, group, username);
//         return res.send({ success: true, data: { success: true } });
//     } catch (error: any) {
//         return res.send({ success: false, message: error.message });
//     }
// };
