import { pool } from '../utils/db/db';
import { serviceCategory } from '../types/serviceCategory';

const buildTree = (categories: serviceCategory[]): serviceCategory[] => {
    const map: Record<number, serviceCategory & { children: serviceCategory[] }> = {};
    const roots: serviceCategory[] = [];

    categories.forEach(cat => {
        map[cat.id] = { ...cat, children: [] };
    });

    categories.forEach(cat => {
        if (cat.parent_id && map[cat.parent_id]) {
            map[cat.parent_id].children.push(map[cat.id]);
        } else {
            roots.push(map[cat.id]);
        }
    });

    return roots;
};

export const getAllCategories = async (tree = false): Promise<serviceCategory[]> => {
    try {
        const res = await pool.query('SELECT * FROM service_category ORDER BY sort_order ASC');
        if (tree) {
            return buildTree(res.rows);
        }
        return res.rows;
    } catch (error) {
        throw error;
    }
};

export const getCategoryById = async (id: number): Promise<serviceCategory | null> => {
    const res = await pool.query('SELECT * FROM service_category WHERE id = $1', [id]);
    return res.rows[0] || null;
};

export const createCategory = async (category: Partial<serviceCategory>): Promise<serviceCategory> => {
    const res = await pool.query(
        `INSERT INTO service_category (name, parent_id, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [category.name, category.parent_id || null, category.sort_order || null]
    );
    return res.rows[0];
};

export const updateCategory = async (id: number, category: Partial<serviceCategory>): Promise<serviceCategory | null> => {
    const res = await pool.query(
        `UPDATE service_category
         SET name = $1, parent_id = $2, sort_order = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [category.name, category.parent_id || null, category.sort_order || null, id]
    );
    return res.rows[0] || null;
};

export const deleteCategory = async (id: number): Promise<boolean> => {
    try {
        const res = await pool.query('DELETE FROM service_category WHERE id = $1', [id]);
        // 使用默认值避免 TS 报错
        return (res.rowCount ?? 0) > 0;
    } catch (error) {
        throw error;
    }
};
