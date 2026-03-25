import { AuthUserPayload } from '../middleware/auth';
import * as roleService from './roleService';
import * as menuService from './menuService';
import { pool } from '../utils/db/db'; // 假设你有一个 pg Pool 实例

export const flattenMenuNames = (menus: any[]): string[] => {
    let result: string[] = [];
    for (const menu of menus) {
        if (menu.name) result.push(menu.name);
        if (menu.children && menu.children.length > 0) {
            result = result.concat(flattenMenuNames(menu.children));
        }
    }
    return result;
};



export const getPermissions = async (user: AuthUserPayload, projectKey: string) => {
    // 1. 获取当前用户在指定项目的所有 Jira 角色
    const roles = await roleService.getUserRoles(user, projectKey);
    // 返回 [{ id, name, description, url }]

    if (!roles?.length) {
        return { username: user.username, roles: [], menus: [] };
    }

    // 2. 提取 role_id
    const roleIds = roles.map((r: any) => r.id);

    // 3. 查询 PostgreSQL role_menus
    const { rows } = await pool.query(
        `SELECT DISTINCT menu_key 
         FROM role_menus 
         WHERE role_id = ANY($1::int[])`,
        [roleIds]
    );

    // 4. 提取菜单 key
    const menuKeys = rows.map((r: any) => r.menu_key);

    // 5. 返回给前端
    return {
        username: user.username,
        roles,   // 完整角色信息
        menus: menuKeys
    };
};



/**
 * 给角色分配菜单
 */
export const assignMenusToRole = async (
    user: AuthUserPayload,
    role_name: string,
    menuIds: number[]
) => {
    await menuService.assignMenusToRole(role_name, menuIds);
};

/**
 * 获取角色菜单树
 */
export const getMenuTreeByRole = async (
    user: AuthUserPayload,
    role_name: string
) => {
    const menus = await menuService.getMenusByRole(role_name);
    return menuService.buildMenuTree(menus);
};
