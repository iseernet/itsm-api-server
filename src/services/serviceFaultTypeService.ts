import { pool } from '../utils/db/db';
import { ServiceFaultType, ServiceFaultTypeQuery } from '../types/serverFaultType';
import {IDCRequestPermissionPayload} from "../types/idcIssue";

export class ServiceFaultTypeService {
    static async getAll(payload: ServiceFaultTypeQuery) {
        const pageIndex = payload.pageIndex || 1;
        const pageSize = payload.pageSize || 10;
        const offset = (pageIndex - 1) * pageSize;

        let baseQuery = 'SELECT * FROM service_fault_type';
        let countQuery = 'SELECT COUNT(*) FROM service_fault_type WHERE parent_id IS NULL';
        const params: any[] = [];
        const conditions: string[] = [];

        if (payload.name) {
            params.push(`%${payload.name}%`);
            conditions.push(`name ILIKE $${params.length}`);
        }

        if (payload.code) {
            params.push(payload.code);
            conditions.push(`code = $${params.length}`);
        }

        if (payload.service_category_id !== undefined) {
            params.push(payload.service_category_id);
            conditions.push(`service_category_id = $${params.length}`);
        }

        if (payload.service_category_name) {
            params.push(payload.service_category_name);
            conditions.push(`service_category_name = $${params.length}`);
        }

        // ⚡ 拼接 where 条件
        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            baseQuery += whereClause;
            countQuery =
                'SELECT COUNT(*) FROM service_fault_type WHERE parent_id IS NULL' +
                whereClause.replace('WHERE', 'AND');
        }

        // ⚡ 根节点查询（注意 WHERE / AND 的拼接区别）
        let rootQuery = baseQuery;
        if (conditions.length > 0) {
            rootQuery += ' AND parent_id IS NULL';
        } else {
            rootQuery += ' WHERE parent_id IS NULL';
        }
        rootQuery += ` ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        console.log(rootQuery);
        const rootParams = [...params, pageSize, offset];
        console.log(rootParams);

        const [countResult, rootResult, allResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(rootQuery, rootParams),
            pool.query('SELECT * FROM service_fault_type') // 查全部，方便组树
        ]);

        const total = parseInt(countResult.rows[0].count, 10);
        const allRows = allResult.rows as ServiceFaultType[];
        const rootNodes = rootResult.rows as ServiceFaultType[];

        // ⚡ 如果没有符合条件的根节点，直接返回空
        if (total === 0 || rootNodes.length === 0) {
            return {
                total: 0,
                list: []
            };
        }

        // ⚡ 构建树（保留分页后的根节点）
        const map = new Map<number, ServiceFaultType & { children: ServiceFaultType[] }>();
        allRows.forEach((node) => {
            map.set(node.id, { ...node, children: [] });
        });
        allRows.forEach((node) => {
            if (node.parent_id && map.has(node.parent_id)) {
                map.get(node.parent_id)!.children.push(map.get(node.id)!);
            }
        });
        const tree = rootNodes.map((node) => map.get(node.id)!);

        return {
            total,
            list: tree
        };
    }

    // private static buildTree(allRows: ServiceFaultType[]): ServiceFaultType[] {
    //     const map = new Map<number, ServiceFaultType & { children: ServiceFaultType[] }>();

    //     // 初始化 map，每个节点都加上 children
    //     allRows.forEach(node => {
    //         map.set(node.id, { ...node, children: [] });
    //     });

    //     const tree: ServiceFaultType[] = [];

    //     allRows.forEach(node => {
    //         if (node.parent_id != null) {
    //             const parent = map.get(node.parent_id);
    //             const child = map.get(node.id);
    //             if (parent && child) {
    //                 parent.children.push(child);
    //             }
    //         } else {
    //             // parent_id 为 null 的就是根节点
    //             tree.push(map.get(node.id)!);
    //         }
    //     });

    //     return tree;
    // }

}

export const getServiceFaultTypeByCode = async (code: string): Promise<ServiceFaultTypeQuery[]> => {
    const query = `
        SELECT *
        FROM service_fault_type
        WHERE code=$1
    `;
    //console.log('Executing SQL:', query);
    //console.log('With values:', code);
    const { rows } = await pool.query(query, [code]);
    return rows;
};

export const getAllServiceFaultType = async (): Promise<ServiceFaultType[]> => {
    const query = `
        SELECT *
        FROM service_fault_type
        ORDER BY service_category_id, code
      `;

    const { rows } = await pool.query(query);
    return rows;
};

export const getGroupedServiceFaultTypes = async (): Promise<Record<string, Record<string, ServiceFaultType>>> => {
    const records = await getAllServiceFaultType();

    const grouped: Record<string, Record<string, ServiceFaultType>> = {};

    for (const record of records) {
        const category = (record.service_category_name ?? "未知分类").trim();

        if (!grouped[category]) {
            grouped[category] = {};
        }

        const code = (record.code ?? "").trim();

        grouped[category][code] = { ...record };
    }
    return grouped;
};
