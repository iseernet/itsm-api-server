import { pool } from '../utils/db/db';
import { PaginatedService, service, ServiceQueryPayload } from '../types/service';
import { jiraApiUrls } from '../config/jiraApiUrls';
import { IssueCustomfield } from '../enums/issueEnum';
import { JiraClient } from '../utils/jira/JiraClient';

export const getAllServices = async (): Promise<service[]> => {
    const res = await pool.query('SELECT * FROM service ORDER BY sort_order ASC');
    return res.rows;
};

export const getServicesByCategory = async (
    params: ServiceQueryPayload
): Promise<PaginatedService> => {
    try {
        const { pageIndex = 1, pageSize = 10, service_category_id, name } = params;

        if (!service_category_id) {
            throw new Error('service_category_id 必传');
        }

        const offset = (pageIndex - 1) * pageSize;

        // 构造参数和条件
        const paramsArr: any[] = [service_category_id];
        let where = 'WHERE service_category_id = $1';
        if (name) {
            paramsArr.push(`%${name}%`);
            where += ` AND name ILIKE $${paramsArr.length}`;
        }

        // 查询总数
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM service ${where}`,
            paramsArr
        );
        const total = parseInt(countRes.rows[0].count, 10);

        // 查询数据（按 sort_order 从小到大，NULL 放最后；再按 created_time DESC）
        paramsArr.push(pageSize, offset); // LIMIT $n OFFSET $n+1
        const dataRes = await pool.query(
            `SELECT * FROM service
             ${where}
             ORDER BY 
                sort_order ASC NULLS LAST,
                created_time DESC
             LIMIT $${paramsArr.length - 1} OFFSET $${paramsArr.length}`,
            paramsArr
        );

        return {
            total,
            data: dataRes.rows,
        };
    } catch (error) {
        throw error;
    }
};



export const getServiceById = async (id: number): Promise<service | null> => {
    const res = await pool.query('SELECT * FROM service WHERE id = $1', [id]);
    return res.rows[0] || null;
};

export const createService = async (svc: Partial<service>): Promise<service> => {
    const res = await pool.query(
        `INSERT INTO service 
        (name, service_category_id, sort_order, created_time, assignee, supervisor, is_open)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
            svc.name,
            svc.service_category_id,
            svc.sort_order || null,
            svc.created_time || new Date(),
            svc.assignee || null,
            svc.supervisor || null,
            svc.is_open ?? false
        ]
    );
    return res.rows[0];
};

export const updateService = async (id: number, svc: Partial<service>): Promise<service | null> => {
    if (!id) throw new Error('id 必传');

    const setClauses: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(svc)) {
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
    const sql = `UPDATE service SET ${setClauses.join(', ')} WHERE id=$${index} RETURNING *`;

    const res = await pool.query(sql, values);
    return res.rows[0] || null;
};


// export const deleteService = async (id: number): Promise<boolean> => {
//     try {
//         const res = await pool.query('DELETE FROM service WHERE id=$1', [id]);
//         // 使用默认值避免 TS 报错
//         return (res.rowCount ?? 0) > 0;
//     } catch (error) {
//         throw error;
//     }
// };

export const deleteService = async (
    id: number
): Promise<{ success: boolean; message?: string }> => {
    try {
        // 1. 查询 service 是否存在
        const serviceRes = await pool.query('SELECT * FROM service WHERE id=$1', [id]);
        if (serviceRes.rowCount === 0) {
            return { success: false, message: 'Service not found' };
        }
        const service = serviceRes.rows[0];

        // 2. 构造 JQL
        const jql = `service ~ "${service.name}"`;

        // 3. 调用 JiraClient.searchIssues
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        const res = await jira.searchIssues(jql, 1, 1); // 只查第一页，一条记录就够
        const issues = res.data?.issues ?? [];

        if (issues.length > 0) {
            return {
                success: false,
                message: 'Delete Failed, because there are related data',
            };
        }

        // 4. 没有关联数据 → 删除
        const deleteRes = await pool.query('DELETE FROM service WHERE id=$1', [id]);
        if ((deleteRes.rowCount ?? 0) > 0) {
            return { success: true };
        } else {
            return { success: false, message: 'Service not found' };
        }
    } catch (error: any) {
        console.log(error.message);
        throw new Error(error.message);
    }
};

export const getServicesByCategoryId = async (categoryId: number) => {
    const query = 'SELECT * FROM service WHERE service_category_id = $1';
    const result = await pool.query(query, [categoryId]);
    return result.rows;
};
