// import { Pool } from 'pg';
import { Menu, MenuPayload, MenuQueryPayload } from '../types/menu';
import { pool } from '../utils/db/db';


// 创建菜单
export const createMenu = async (data: MenuPayload): Promise<Menu> => {
    const { name, path, icon, parent_id, sort_order, type, visible } = data;
    const query = `
    INSERT INTO menus(name, path, icon, parent_id, sort_order, type, visible)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `;
    const menuPath = path?.trim() || null;
    const menuIcon = icon?.trim() || null;
    const values = [name, menuPath, menuIcon, parent_id, sort_order, type, visible];

    //console.log('Executing SQL:', query);
    //console.log('With values:', values);

    try {
        const { rows } = await pool.query(query, values);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as Menu;
    } catch (err: any) {
        console.error('createMenu error:', err.message);
        throw err;
    }
};

export const getMenus = async (query?: MenuQueryPayload): Promise<{ total: number, rows: Menu[] }> => {
    let sql = 'SELECT * FROM menus';
    const values: any[] = [];
    const conditions: string[] = [];

    if (query) {
        if (query.name) {
            values.push(`%${query.name}%`);
            conditions.push(`name ILIKE $${values.length}`);
        }
        if (query.path) {
            values.push(`%${query.path}%`);
            conditions.push(`path ILIKE $${values.length}`);
        }
        if (query.icon) {
            values.push(`%${query.icon}%`);
            conditions.push(`icon ILIKE $${values.length}`);
        }
        if (query.parent_id !== undefined) {
            values.push(query.parent_id);
            conditions.push(`parent_id = $${values.length}`);
        }
        if (query.sort_order !== undefined) {
            values.push(query.sort_order);
            conditions.push(`sort_order = $${values.length}`);
        }
        if (query.type !== undefined) {
            values.push(query.type);
            conditions.push(`type = $${values.length}`);
        }
        if (query.visible !== undefined) {
            values.push(query.visible);
            conditions.push(`visible = $${values.length}`);
        }
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    // 先查总数
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${sql}) AS t`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    // 分页
    if (query?.pageIndex !== undefined && query?.pageSize !== undefined) {
        const offset = (query.pageIndex - 1) * query.pageSize;
        sql += ` ORDER BY sort_order LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(query.pageSize, offset);
    } else {
        sql += ' ORDER BY sort_order';
    }

    const { rows } = await pool.query(sql, values);
    return { total, rows };
};


// 获取单个菜单
export const getMenuDetail = async (id: number): Promise<Menu | undefined> => {
    const { rows } = await pool.query('SELECT * FROM menus WHERE id=$1', [id]);
    return rows[0];
};

// 更新菜单
export const updateMenu = async (id: number, data: Partial<MenuPayload>): Promise<Menu> => {
    // 过滤掉 undefined 的字段，只更新有值的
    const fields = Object.entries(data).filter(([_, value]) => value !== undefined);
    if (fields.length === 0) throw new Error('No fields to update');

    const setClause = fields.map(([key], idx) => `${key}=$${idx + 1}`).join(', ');
    const values = fields.map(([_, value]) => value);

    const query = `UPDATE menus SET ${setClause} WHERE id=$${fields.length + 1} RETURNING *`;
    const { rows } = await pool.query(query, [...values, id]);
    return rows[0];
};
// 删除菜单
export const deleteMenu = async (id: number): Promise<Menu> => {
    const { rows } = await pool.query('DELETE FROM menus WHERE id=$1 RETURNING *', [id]);
    return rows[0];
};

// 角色-菜单关联
export const assignMenusToRole = async (role_name: string, menuIds: number[]) => {
    await pool.query('DELETE FROM role_menus WHERE role_name=$1', [role_name]);
    if (menuIds.length === 0) return;
    const query = 'INSERT INTO role_menus(role_name, menu_id) VALUES ' +
        menuIds.map((_, idx) => `($1,$${idx + 2})`).join(',');
    await pool.query(query, [role_name, ...menuIds]);
};

export const getMenusByRole = async (role_name: string): Promise<Menu[]> => {
    const query = `
        SELECT m.*
        FROM menus m
        JOIN role_menus rm ON m.id = rm.menu_id
        WHERE rm.role_name=$1
        ORDER BY m.sort_order
    `;
    //console.log('Executing SQL:', query);
    //console.log('With values:', role_name);
    const { rows } = await pool.query(query, [role_name]);
    return rows;
};

// 构建菜单树
export const buildMenuTree = (menus: Menu[]): Menu[] => {
    const map: Record<number, Menu & { children: Menu[] }> = {};
    const tree: (Menu & { children: Menu[] })[] = [];

    menus.forEach(menu => map[menu.id] = { ...menu, children: [] });
    menus.forEach(menu => {
        if (menu.parent_id && map[menu.parent_id]) {
            map[menu.parent_id].children.push(map[menu.id]);
        } else {
            tree.push(map[menu.id]);
        }
    });

    return tree;
};

export const buildFrontendMenu = (menus: Menu[]): any[] => {
    // 顶级菜单作为 title
    return menus.map(top => ({
        title: top.name,
        menu: (top.children || []).map(child => ({
            key: child.name,     // 或 child.id
            label: child.name,
            path: child.path,
            icon: child.icon
        }))
    }));
};

