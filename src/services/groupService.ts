import { JiraClient } from '../utils/jira/JiraClient';
import { AuthUserPayload } from '../middleware/auth';
import { RoleQueryPayload, RoleUserQueryPayload } from '../types/role';
import { pool } from '../utils/db/db';
import * as menuService from './menuService';
import { builtInRoles } from '../enums/roleEnum';
import { GroupQueryPayload } from '../types/group';
import { builtInGroups } from '../enums/groupEnum';
/**
 * 创建组，如果有role_id,则创建组后绑定到role
 */
// services/groupService.ts
export const createGroup = async (
    groupName: string,
    description?: string,
    role_ids?: number[]   // 改成数组
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 1. 调用 Jira 创建 Group
        const jiraGroup = await jira.createGroup(groupName);

        // 2. 如果传了 role_ids，则循环绑定
        if (role_ids && role_ids.length > 0) {
            for (const role_id of role_ids) {
                const roleDetail = await jira.getRoleById(role_id);
                if (!roleDetail) {
                    console.warn(`⚠️ Jira role_id ${role_id} 不存在，跳过`);
                    continue;
                }

                // 获取已有 users + groups
                const existingUsers: string[] = roleDetail.actors
                    .filter((a: any) => a.type === 'atlassian-user-role-actor')
                    .map((a: any) => a.name);

                const existingGroups: string[] = roleDetail.actors
                    .filter((a: any) => a.type === 'atlassian-group-role-actor')
                    .map((a: any) => a.name);

                // 加入新的 group
                if (!existingGroups.includes(groupName)) {
                    existingGroups.push(groupName);
                }

                // 更新 Role 成员
                await jira.updateRoleMembers(role_id, existingUsers, existingGroups);
            }
        }

        return {
            name: jiraGroup.data.name,
            description: description || null,
            role_ids: role_ids || []
        };
    } catch (error: any) {
        throw new Error(`创建组失败: ${error.message}`);
    }
};



/**
 * 删除组
 */
export const deleteGroup = async (user: AuthUserPayload, groupName: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 1. 调用 Jira API 删除角色
        await jira.deleteGroup(groupName);

        return { groupName, deleted: true };
    } catch (error: any) {
        console.log(`删除角色失败： ${error.message}`);
        throw new Error(`删除角色失败: ${error.message}`);
    }
};


//分页查询
export const getAllGroups = async (user: AuthUserPayload, params: GroupQueryPayload) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        const pageIndex = params.pageIndex ?? 1;
        const pageSize = params.pageSize ?? 50;
        const startAt = (pageIndex - 1) * pageSize;
        const role_id = params.role_id; // number | undefined

        // ---------- 1) 拉取 Jira 上符合条件的所有 groups（自动分页） ----------
        let allJiraGroups: any[] = [];
        let fetchStart = 0;
        const fetchPage = 50;

        while (true) {
            const { total, groups } = await jira.getAllGroups(params?.group_name, fetchStart, fetchPage);
            if (!groups || groups.length === 0) break;

            allJiraGroups.push(...groups);

            if (groups.length < fetchPage) break;
            fetchStart += fetchPage;
        }

        // ---------- 过滤掉内置系统组 ----------
        allJiraGroups = allJiraGroups.filter(group => !builtInGroups.includes(group.name));

        if (allJiraGroups.length === 0) {
            return { total: 0, groups: [] };
        }

        // ---------- 2) 查询每个组所属的 Role ----------
        let groupsWithRoles = await Promise.all(
            allJiraGroups.map(async (group: any) => {
                const rolesForGroup = await jira.getRolesByGroup(process.env.JIRA_PROJECT_KEY!, group.name);
                return {
                    ...group,
                    roles: rolesForGroup, // [{ id: number, name: string, description, url }]
                };
            })
        );

        // ---------- 3) 按 role_id 过滤 ----------
        if (role_id !== undefined) {
            groupsWithRoles = groupsWithRoles.filter(group =>
                group.roles.some((role: any) => role.id === role_id)
            );
        }

        // ---------- 4) 分页 ----------
        const total = groupsWithRoles.length;
        const paged = groupsWithRoles.slice(startAt, startAt + pageSize);

        return { total, groups: paged };
    } catch (error: any) {
        throw new Error(`获取组列表失败: ${error.message}`);
    }
};








/**
 * 获取组内用户（只调用 Jira）
 */
export const getGroupUsers = async (user: AuthUserPayload, params: GroupQueryPayload) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        const pageIndex = params.pageIndex || 1;
        const pageSize = params.pageSize || 50;
        const startAt = (pageIndex - 1) * pageSize;

        return await jira.getGroupUsers(params.group_name!, startAt, pageSize);
    } catch (error: any) {
        throw new Error(`获取角色内用户失败: ${error.message}`);
    }
};

/**
 * 添加用户到角色（只调用 Jira）
 */
export const addUserToGroup = async (
    user: AuthUserPayload,
    group_name: string,
    username: string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        return await jira.addUserToGroup(username, group_name);
    } catch (error: any) {
        throw new Error(`添加用户到角色失败: ${error.message}`);
    }
};

/**
 * 从角色移除用户（只调用 Jira）
 */
export const removeUserFromGroup = async (
    user: AuthUserPayload,
    group_name: string,
    username: string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        return await jira.removeUserFromGroup(username, group_name);
    } catch (error: any) {
        throw new Error(`从角色移除用户失败: ${error.message}`);
    }
};

/**
 * 获取用户所属角色（Jira为主 + PostgreSQL补充字段）
 */
export const getUserGroups = async (user: AuthUserPayload, username?: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        const targetUser = username || user.username;

        // 1. 调用 Jira API 获取用户所属组 (返回 string[])
        const jiraGroups: string[] = await jira.getUserGroups(targetUser);

        // 2. 查询 PostgreSQL 补充字段
        let descriptionsMap: Record<string, any> = {};
        if (jiraGroups.length > 0) {
            const { rows } = await pool.query(
                `SELECT name, description, created_at 
                 FROM roles 
                 WHERE name = ANY($1::text[])`,
                [jiraGroups]
            );
            descriptionsMap = rows.reduce((acc, row) => {
                acc[row.role_name] = {
                    description: row.description,
                    created_at: row.created_at
                };
                return acc;
            }, {} as Record<string, any>);
        }

        // 3. 合并 Jira + PostgreSQL 数据
        const roles = jiraGroups.map(g => ({
            name: g,
            description: descriptionsMap[g]?.description ?? null,
            created_at: descriptionsMap[g]?.created_at ?? null,
        }));

        return roles;
    } catch (error: any) {
        throw new Error(`获取用户所属角色失败: ${error.message}`);
    }
};




export const updateGroup = async (
    groupName: string,
    description?: string,
    role_ids: number[] = []
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 1. 检查组是否存在（Jira API 会报错如果不存在）
        await jira.getGroupMembers(groupName);

        // 2. 如果传了 role_ids，重新绑定
        for (const role_id of role_ids) {
            const roleDetail = await jira.getRoleById(role_id);
            if (!roleDetail) throw new Error(`Jira role_id ${role_id} 不存在`);

            // 当前用户 + group
            const existingUsers: string[] = roleDetail.actors
                .filter((a: any) => a.type === 'atlassian-user-role-actor')
                .map((a: any) => a.name);

            const existingGroups: string[] = roleDetail.actors
                .filter((a: any) => a.type === 'atlassian-group-role-actor')
                .map((a: any) => a.name);

            // 加入新的 group
            if (!existingGroups.includes(groupName)) existingGroups.push(groupName);

            // 更新 Role 成员
            await jira.updateRoleMembers(role_id, existingUsers, existingGroups);
        }

        return {
            name: groupName,
            description: description || null,
            role_ids: role_ids.length ? role_ids : null,
        };
    } catch (error: any) {
        throw new Error(`更新组失败: ${error.message}`);
    }
};



/**
 * 获取角色详情（包含菜单树和 PostgreSQL 字段）
 */
export const getGroupDetail = async (groupName: string, projectKey: string) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 1. 校验组是否存在（不存在会抛错）
        const members = await jira.getGroupMembers(groupName);

        // 2. 查找该 group 在指定项目里的角色
        const roles = await jira.getRolesByGroup(projectKey, groupName);

        return {
            name: groupName,
            members: members || [],
            roles
        };
    } catch (error: any) {
        throw new Error(`获取组详情失败: ${error.message}`);
    }
};

// export const getGroupDetail = async (roleName: string) => {
//     // 1. 查询角色信息
//     const { rows: roleRows } = await pool.query(
//         `SELECT id, name, description, created_at
//          FROM roles
//          WHERE name = $1`,
//         [roleName]
//     );

//     if (roleRows.length === 0) return null;
//     const role = roleRows[0];

//     // 2. 查询该角色关联的菜单 key
//     const { rows: menuRows } = await pool.query(
//         `SELECT menu_key FROM role_menus WHERE role_name = $1`,
//         [roleName]
//     );

//     const menuKeys = menuRows.map(r => r.menu_key);

//     return {
//         ...role,
//         menuKeys, // 前端拿到数组去构建菜单树
//     };
// };


