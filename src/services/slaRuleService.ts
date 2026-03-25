import { SlaRulePayload } from '../types/slaRule';
import { pool } from '../utils/db/db';
import { SlaRuleQueryPayload } from '../types/slaRule';
export class SlaRuleService {
    static async getAll(payload: SlaRuleQueryPayload): Promise<{ total: number; data: SlaRulePayload[] }> {
        const pageIndex = payload.pageIndex && payload.pageIndex > 0 ? payload.pageIndex : 1;
        const pageSize = payload.pageSize && payload.pageSize > 0 ? payload.pageSize : 10;
        const offset = (pageIndex - 1) * pageSize;

        let baseQuery = 'FROM sla_rule';
        const params: any[] = [];
        const conditions: string[] = [];

        // 🔍 模糊搜索逻辑
        if (payload.text) {
            const text = `%${payload.text}%`;

            // 如果 text 是数字，尝试匹配 id
            if (!isNaN(Number(payload.text))) {
                params.push(Number(payload.text));
                conditions.push(`id = $${params.length}`);
            }

            // 其余字段用 ILIKE 模糊匹配
            for (const col of ["name", "update_by", "level_id", "responce_time_unit", "resolve_time_unit"]) {
                params.push(text);
                conditions.push(`${col} ILIKE $${params.length}`);
            }

            baseQuery += ' WHERE ' + conditions.join(' OR ');
        } else {
            // 🎯 精准过滤条件
            if (payload.id !== undefined) {
                params.push(payload.id);
                conditions.push(`id = $${params.length}`);
            }
            if (payload.name) {
                params.push(payload.name);
                conditions.push(`name = $${params.length}`);
            }
            if (payload.update_by) {
                params.push(payload.update_by);
                conditions.push(`update_by = $${params.length}`);
            }
            if (payload.level_id) {
                params.push(payload.level_id);
                conditions.push(`level_id = $${params.length}`);
            }
            if (payload.responce_time !== undefined) {
                params.push(payload.responce_time);
                conditions.push(`responce_time = $${params.length}`);
            }
            if (payload.responce_time_unit) {
                params.push(payload.responce_time_unit);
                conditions.push(`responce_time_unit = $${params.length}`);
            }
            if (payload.resolve_time !== undefined) {
                params.push(payload.resolve_time);
                conditions.push(`resolve_time = $${params.length}`);
            }
            if (payload.resolve_time_unit) {
                params.push(payload.resolve_time_unit);
                conditions.push(`resolve_time_unit = $${params.length}`);
            }

            if (conditions.length > 0) {
                baseQuery += ' WHERE ' + conditions.join(' AND ');
            }
        }

        // 1️⃣ 查询总数
        const countQuery = `SELECT COUNT(*) AS total ${baseQuery}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);

        // 2️⃣ 查询当前页数据
        const dataQuery = `SELECT * ${baseQuery} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const dataParams = [...params, pageSize, offset];
        const dataResult = await pool.query(dataQuery, dataParams);

        return { total, data: dataResult.rows };
    }


    static async getById(id: number): Promise<SlaRulePayload | null> {
        const result = await pool.query(`SELECT * FROM sla_rule WHERE id = $1`, [id]);
        return result.rows[0] || null;
    }

    static async create(rule: SlaRulePayload): Promise<SlaRulePayload> {
        const result = await pool.query(
            `INSERT INTO sla_rule (name,update_by,level_id, responce_time, responce_time_unit, resolve_time, resolve_time_unit,is_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [rule.name, rule.update_by, rule.level_id, rule.responce_time || null, rule.responce_time_unit || null, rule.resolve_time || null, rule.resolve_time_unit || null, rule.is_open ?? false]
        );
        return result.rows[0];
    }



    static async update(id: number, rule: Partial<SlaRulePayload>): Promise<SlaRulePayload | null> {
        if (!id) throw new Error('id 必传');

        const setClauses: string[] = [];
        const values: any[] = [];
        let index = 1;

        for (const [key, value] of Object.entries(rule)) {
            // 只更新有值的字段
            setClauses.push(`${key}=$${index}`);
            values.push(value);
            index++;
        }

        if (setClauses.length === 0) {
            throw new Error('没有字段需要更新');
        }

        // id 参数
        values.push(id);
        const sql = `UPDATE sla_rule SET ${setClauses.join(', ')} WHERE id=$${index} RETURNING *`;

        const res = await pool.query(sql, values);
        return res.rows[0] || null;
    };

    // static async update(id: number, rule: Partial<SlaRulePayload>): Promise<SlaRulePayload | null> {
    //     const result = await pool.query(
    //         `UPDATE sla_rule
    //          SET level_id = COALESCE($1, level_id),
    //              responce_time = COALESCE($2, responce_time),
    //              responce_time_unit = COALESCE($3, responce_time_unit),
    //              resolve_time = COALESCE($4, resolve_time),
    //              resolve_time_unit = COALESCE($5, resolve_time_unit),
    //              updated_at = CURRENT_TIMESTAMP,
    //              name = COALESCE($6, name),
    //              update_by = COALESCE($7, update_by),
    //              is_open
    //          WHERE id = $8 RETURNING *`,
    //         [rule.level_id, rule.responce_time, rule.responce_time_unit, rule.resolve_time, rule.resolve_time_unit, rule.name, rule.update_by, id]
    //     );
    //     return result.rows[0] || null;
    // }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query(`DELETE FROM sla_rule WHERE id = $1`, [id]);
        return (result.rowCount ?? 0) > 0;
    }

    static async getOpenSlaRules(): Promise<SlaRulePayload[]> {
        const query = `SELECT * FROM sla_rule WHERE is_open = true`;
        const { rows } = await pool.query(query);
        return rows;
    }

}