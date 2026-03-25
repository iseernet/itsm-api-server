import { Request, Response } from 'express';
import * as roleService from '../services/roleService';
import { RoleQueryPayload, RoleUserQueryPayload } from '../types/role';
import * as menuService from '../services/menuService';

/**
 * 分页获取项目下的角色列表
 */
export const listRoles = async (req: Request<{}, {}, RoleQueryPayload>, res: Response) => {
    try {
        const params: RoleQueryPayload = {
            projectKey: process.env.JIRA_PROJECT_KEY!,
            pageIndex: req.query.pageIndex ? parseInt(req.query.pageIndex as string) : 1,
            pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50
        };

        const data = await roleService.listProjectRoles(params);
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

/**
 * 角色详情
 */
// 获取角色详情
export const getRoleDetail = async (req: Request<{ roleId: string }>, res: Response) => {
    const { roleId } = req.params;

    if (!process.env.JIRA_PROJECT_KEY) return res.send({ success: false, message: 'projectKey is missing' });
    if (!roleId) return res.send({ success: false, message: 'role id is missing' });

    try {
        const data = await roleService.getRoleDetail(Number(roleId));
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

/**
 * 给角色添加用户,选择已经有的用户
 * POST /roles/:roleId/users
 * body: { username: string }
 */
export const addUserToRole = async (
    req: Request<{ roleId: string }, {}, { username: string }>,
    res: Response
) => {
    const { roleId } = req.params;
    const { username } = req.body;

    if (!roleId) return res.send({ success: false, message: 'roleId is missing' });
    if (!username) return res.send({ success: false, message: 'username is missing' });

    try {
        const data = await roleService.addUserToRoleById(Number(roleId), username);
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};


/**
 * 给角色添加 Group
 * POST /roles/:roleId/groups
 * body: { groupName: string }
 */
export const addGroupToRole = async (
    req: Request<{ roleId: string }, {}, { groupName: string }>,
    res: Response
) => {
    const { roleId } = req.params;
    const { groupName } = req.body;

    if (!roleId) return res.send({ success: false, message: 'roleId is missing' });
    if (!groupName) return res.send({ success: false, message: 'groupName is missing' });

    try {
        const data = await roleService.addGroupToRoleById(Number(roleId), groupName);
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};


/**
 * 从角色删除用户
 * DELETE /roles/:roleId/users/:username
 */
export const removeUserFromRole = async (
    req: Request<{ roleId: string; username: string }>,
    res: Response
) => {
    const { roleId, username } = req.params;
    if (!roleId) return res.send({ success: false, message: 'roleId is missing' });
    if (!username) return res.send({ success: false, message: 'username is missing' });

    try {
        const data = await roleService.removeUserFromRoleById(Number(roleId), username);
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

/**
 * 从角色删除 Group
 * DELETE /roles/:roleId/groups/:groupName
 */
export const removeGroupFromRole = async (
    req: Request<{ roleId: string; groupName: string }>,
    res: Response
) => {
    const { roleId, groupName } = req.params;
    if (!roleId) return res.send({ success: false, message: 'roleId is missing' });
    if (!groupName) return res.send({ success: false, message: 'groupName is missing' });

    try {
        const data = await roleService.removeGroupFromRoleById(Number(roleId), groupName);
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};


// 更新角色信息 + 菜单
export const updateRole = async (
    req: Request<{ roleId: string }, {}, { name?: string; description?: string; menu_keys?: string[] }>,
    res: Response
) => {
    const { roleId } = req.params;
    const { name, description, menu_keys } = req.body;

    if (!roleId) return res.send({ success: false, message: 'roleId is missing' });

    try {
        const updatedRole = await roleService.updateRoleAndMenus(Number(roleId), { name, description, menu_keys });
        res.send({ success: true, data: updatedRole });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};



// 获取角色成员
export const getRoleMembers = async (req: Request<{ projectKey: string; roleName: string }>, res: Response) => {
    try {
        const { projectKey, roleName } = req.params;
        const members = await roleService.getRoleMembers(projectKey, roleName);
        res.send({ success: true, data: members });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};


/**
 * 分页获取角色成员（展开组用户）
 */
export const getRoleUsers = async (req: Request<{ roleId: string }, {}, RoleUserQueryPayload>, res: Response) => {
    try {
        const params: RoleUserQueryPayload = {
            projectKey: process.env.JIRA_PROJECT_KEY,
            role_id: Number(req.params.roleId),
            pageIndex: req.query.pageIndex ? parseInt(req.query.pageIndex as string) : 1,
            pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50
        };

        const data = await roleService.getRoleUsers(params);
        res.send({ success: true, data: data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};


export const removeRole = async (req: Request<{ roleId: string }>, res: Response) => {
    const { roleId } = req.params;
    if (!roleId) return res.send({ success: false, message: 'roleId is missing' });

    try {
        const result = await roleService.deleteRole((req as any).user, Number(roleId));
        res.send({ success: true, data: result });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};
