import { JiraClient } from '../utils/jira/JiraClient';
import { AuthUserPayload } from '../middleware/auth';
import { RoleQueryPayload, RoleUserQueryPayload } from '../types/role';
import { pool } from '../utils/db/db';
import * as menuService from './menuService';
import { builtInRoles } from '../enums/roleEnum';


/**
 * 获取项目角色列表（带分页），过滤 Jira 系统角色
 */
export const listProjectRoles = async (params: RoleQueryPayload) => {
    if (!params.projectKey) throw new Error('projectKey is missing');

    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

    const rolesObj = await jira.listProjectRoles(params.projectKey);

    let allRoles: any[] = [];

    for (const [roleName, roleUrl] of Object.entries(rolesObj)) {
        if (builtInRoles.includes(roleName)) continue;

        try {
            const res = await jira.getRoleByUrl(roleUrl);
            allRoles.push({
                id: String(res.id),
                name: res.name,
                description: res.description,
                url: roleUrl
            });
        } catch (err) {
            console.warn(`获取角色 ${roleName} 详情失败`, err);
        }
    }

    // 🆕 模糊搜索逻辑
    if (params.text) {
        const keyword = params.text.toLowerCase();
        allRoles = allRoles.filter(role =>
            (role.name && role.name.toLowerCase().includes(keyword)) ||
            (role.description && role.description.toLowerCase().includes(keyword))
        );
    }

    const pageIndex = params.pageIndex || 1;
    const pageSize = params.pageSize || 50;
    const startAt = (pageIndex - 1) * pageSize;
    const pagedRoles = allRoles.slice(startAt, startAt + pageSize);

    return {
        total: allRoles.length,
        roles: pagedRoles
    };
};




export const getRoleDetail = async (id: number) => {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

    // 1️⃣ 获取 Jira 角色详情
    const roleDetail = await jira.getRoleById(id);
    const actors = roleDetail.actors || [];

    // 2️⃣ 查询 role_menus 表
    const { rows: menuRows } = await pool.query(
        `SELECT menu_key FROM role_menus WHERE role_id = $1`,
        [id]
    );
    const menuKeys = menuRows.map(r => r.menu_key);

    // 3️⃣ 返回整合数据
    return {
        id: String(roleDetail.id),
        name: roleDetail.name,
        description: roleDetail.description,
        users: actors
            .filter((a: any) => a.type === 'atlassian-user-role-actor')
            .map((u: any) => u.name),
        groups: actors
            .filter((a: any) => a.type === 'atlassian-group-role-actor')
            .map((g: any) => g.name),
        menu_keys: menuKeys
    };
};



/**
 * 给角色添加用户
 */
export const addUserToRoleById = async (roleId: number, username: string) => {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    return await jira.addUserToRole(roleId, username);
};

/**
 * 给角色添加 Group
 */
export const addGroupToRoleById = async (roleId: number, groupName: string) => {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    return await jira.addGroupToRole(roleId, groupName);
};


/**
 * 从角色删除用户
 */
export const removeUserFromRoleById = async (roleId: number, username: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        return await jira.removeUsersFromRoleFunc(process.env.JIRA_PROJECT_KEY!, roleId, username);
    } catch (error: any) {
        console.log(error.members);
        throw new Error(error.message);
    }
};

/**
 * 从角色删除 Group
 */
export const removeGroupFromRoleById = async (roleId: number, groupName: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        return await jira.removeGroupsFromRole(roleId, groupName);
    } catch (error: any) {
        console.log(error.members);
        throw new Error(error.message);
    }
};


export const updateRoleInfoById = async (
    roleId: number,
    updates: { name?: string; description?: string }
) => {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    return await jira.updateRoleInfo(roleId, updates);
};

/**
 * 获取 Role 成员（用户 + Group 展开为用户，分页）
 */
export const getRoleUsers = async (params: RoleUserQueryPayload) => {
    if (!params.projectKey) throw new Error('projectKey is missing');
    if (!params.role_id) throw new Error('role_id is missing');

    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

    // 调 Jira API 获取指定角色的用户
    const allUsers = await jira.getRoleUsersByRoleID(params.projectKey, params.role_id);

    // 分页
    const pageIndex = params.pageIndex || 1;
    const pageSize = params.pageSize || 50;
    const startAt = (pageIndex - 1) * pageSize;
    const pagedUsers = allUsers.slice(startAt, startAt + pageSize);

    return {
        total: allUsers.length,
        users: pagedUsers
    };
};


export const getRoleMembers = async (projectKey: string, roleName: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME!);
        return jira.getRoleMembers(projectKey, roleName);
    } catch (error: any) {
        throw new Error(`failad: ${error.message}`);
    }
};


// 给角色绑定菜单
export const updateRoleAndMenus = async (
    roleId: number,
    updates: { name?: string; description?: string; menu_keys?: string[] }
) => {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

    // 1. 更新 Jira Role 描述（Jira 不支持改名）
    if (updates.description) {
        await jira.updateRoleDescription(roleId, updates.description);
    }

    // 2. 更新 PostgreSQL 中角色信息
    const { rows: roleRows } = await pool.query(
        `UPDATE roles 
         SET description = COALESCE($1, description)
         WHERE jira_role_id = $2
         RETURNING *`,
        [updates.description, roleId]
    );

    const updatedRole = roleRows[0];

    // 3. 更新角色菜单
    if (updates.menu_keys) {
        // 删除旧菜单
        await pool.query(`DELETE FROM role_menus WHERE role_id = $1`, [roleId]);

        if (updates.menu_keys.length > 0) {
            const values = updates.menu_keys
                .map((_, idx) => `($1, $${idx + 2})`)
                .join(', ');

            await pool.query(
                `INSERT INTO role_menus(role_id, menu_key) VALUES ${values}`,
                [roleId, ...updates.menu_keys]
            );
        }
    }

    return updatedRole;
};


// export const getRoleUsers = async (projectKey: string, roleName: string) => {
//     try {
//         const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME!);
//         return jira.getRoleUsers(projectKey, roleName);
//     } catch (error: any) {
//         throw new Error(`failad: ${error.message}`);
//     }
// };

export const getRoleGroups = async (projectKey: string, roleName: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME!);
        return jira.getRoleGroups(projectKey, roleName);
    } catch (error: any) {
        throw new Error(`failad: ${error.message}`);
    }
};

export const addUserToRole = async (roleId: number, username: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME!);
        return jira.addUserToRole(roleId, username);
    } catch (error: any) {
        throw new Error(`failad: ${error.message}`);
    }
};

// export const updateRoleMembers = async (
//     projectKey: string,
//     roleName: string,
//     users: string[] = [],
//     groups: string[] = []
// ) => {
//     try {
//         const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME!);
//         return jira.updateRoleMembers(projectKey, roleName, users, groups);
//     } catch (error: any) {
//         throw new Error(`failad: ${error.message}`);
//     }
// };


export const getUserRoles = async (user: AuthUserPayload, projectKey: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 1. 获取项目下所有角色及其 URL
        const projectRoles = await jira.listProjectRoles(projectKey);
        // 返回 { "Developers": "http://jira/.../role/10001", ... }

        const roleEntries = Object.entries(projectRoles); // [ [roleName, roleUrl], ... ]
        const roles: { id: number; name: string; description?: string; url: string }[] = [];

        for (const [roleName, roleUrl] of Object.entries(projectRoles)) {
            const roleDetail = await jira.getRoleByUrl(roleUrl);

            let isMember = false;

            for (const a of roleDetail.actors) {
                if (a.type === 'atlassian-user-role-actor' && a.name === user.username) {
                    isMember = true;
                    break;
                }
                if (a.type === 'atlassian-group-role-actor') {
                    const groupMembers = await jira.getGroupMembers(a.name);
                    if (groupMembers.values.some((u: any) => u.name === user.username)) {
                        isMember = true;
                        break;
                    }
                }
            }

            if (isMember) {
                roles.push({
                    id: roleDetail.id,
                    name: roleDetail.name,
                    description: roleDetail.description,
                    url: roleUrl
                });
            }

        }

        return roles; // 返回当前用户属于的角色数组
    } catch (error: any) {
        throw new Error(`获取用户项目角色失败: ${error.message}`);
    }
};

export const deleteRole = async (user: AuthUserPayload, roleId: number) => {
    if (!roleId) throw new Error('roleId is missing');

    try {
        const jira = new JiraClient(user.username);
        const res = await jira.deleteRole(roleId);
        return res; // { success: true } 或者 Jira API 返回的数据
    } catch (error: any) {
        throw new Error(`删除角色失败: ${error.message}`);
    }
};