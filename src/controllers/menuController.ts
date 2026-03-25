import { Request, Response } from 'express';
import * as menuService from '../services/menuService';
import { FrontendMenuGroup, MenuPayload, MenuQueryPayload } from '../types/menu';

// 创建菜单
export const createMenu = async (req: Request<{}, {}, MenuPayload>, res: Response) => {
    const data = req.body;
    if (!data.name) return res.send({ success: false, message: 'name is missing' });

    try {
        const menu = await menuService.createMenu(data);
        return res.send({ success: true, data: menu });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 获取菜单列表
export const getMenus = async (req: Request<{}, {}, MenuQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        const params: MenuQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            ...query,
        };
        const menus = await menuService.getMenus(params);
        return res.send({ success: true, data: menus });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 获取菜单详情
export const getMenuDetail = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.send({ success: false, message: 'Invalid menu id' });

    try {
        const menu = await menuService.getMenuDetail(id);
        if (!menu) return res.send({ success: false, message: 'Menu not found' });
        return res.send({ success: true, data: menu });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 更新菜单
export const updateMenu = async (req: Request<{ id: string }, {}, MenuPayload>, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.send({ success: false, message: 'Invalid menu id' });

    try {
        const menu = await menuService.updateMenu(id, req.body);
        return res.send({ success: true, data: menu });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 删除菜单
export const deleteMenu = async (req: Request<{ id: string }>, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.send({ success: false, message: 'Invalid menu id' });

    try {
        await menuService.deleteMenu(id);
        return res.send({ success: true, data: { success: true } });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 获取所有菜单树（返回前端结构）
export const getMenuTree = async (_req: Request, res: Response) => {
    try {
        // 获取所有菜单
        const { rows: menus, total } = await menuService.getMenus();
        // 构建树形
        const tree = menuService.buildMenuTree(menus);
        // 转换为前端结构
        const frontendMenu = buildFrontendMenu(tree);

        return res.send({ success: true, data: frontendMenu });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 分配菜单到角色
export const assignMenusToRole = async (req: Request<{}, {}, { role_name: string; menuIds: number[] }>, res: Response) => {
    const { role_name, menuIds } = req.body;
    if (!role_name) return res.send({ success: false, message: 'role_name is missing' });
    if (!Array.isArray(menuIds)) return res.send({ success: false, message: 'menuIds must be an array' });

    try {
        await menuService.assignMenusToRole(role_name, menuIds);
        return res.send({ success: true, data: { success: true } });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};

// 获取角色菜单
export const getMenusByRole = async (req: Request<{ role_name: string }>, res: Response) => {
    const role_name = req.params.role_name;
    if (!role_name) return res.send({ success: false, message: 'role_name is missing' });

    try {
        const menus = await menuService.getMenusByRole(role_name);
        return res.send({ success: true, data: menus });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};


// 构建前端菜单结构
const buildFrontendMenu = (menus: any[]): FrontendMenuGroup[] => {
    return menus.map(top => ({
        id: top.id,
        title: top.name,
        parent_id: top.parent_id,
        menu: (top.children || []).map((child: any) => ({
            id: child.id,
            parent_id: child.parent_id,
            key: child.name,
            label: child.name,
            path: child.path,
            icon: child.icon
        }))
    }));
};

// 获取角色菜单树（返回前端结构）
export const getMenuTreeByRole = async (req: Request<{ role_name: string }>, res: Response) => {
    const role_name = req.params.role_name;
    if (!role_name) return res.send({ success: false, message: 'role_name is missing' });

    try {
        // 获取该角色的菜单列表
        const menus = await menuService.getMenusByRole(role_name);
        // 构建树形
        const tree = menuService.buildMenuTree(menus);
        // 转换为前端结构
        const frontendMenu = buildFrontendMenu(tree);

        return res.send({ success: true, data: frontendMenu });
    } catch (error: any) {
        return res.send({ success: false, message: error.message });
    }
};
