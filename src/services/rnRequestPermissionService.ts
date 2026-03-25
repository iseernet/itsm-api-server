import { pool } from '../utils/db/db';
import {IDCRequestPermissionPayload} from "../types/idcIssue";

// 创建菜单
export const createRequestPermission = async (data: IDCRequestPermissionPayload): Promise<IDCRequestPermissionPayload> => {
    const { issue_id, rn_event_id, operation_permissions, operation_steps, request_at, permission_at, need_auth } = data;
    const query = `
    INSERT INTO idc_request_permission(issue_id, rn_event_id, operation_permissions, operation_steps, request_at, permission_at, need_auth)
    VALUES($1,$2,$3,$4,$5,$6, $7)
    RETURNING *
  `;
    const values = [issue_id, rn_event_id, operation_permissions, operation_steps, request_at, permission_at, need_auth];

    try {
        const { rows } = await pool.query(query, values);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as IDCRequestPermissionPayload;
    } catch (err: any) {
        console.error('createRequestPermission error:', err.message);
        throw err;
    }
};

export const updateRnRequestRnEventId = async (id:string, rnEventId:string) => {
    const query = `
        UPDATE idc_request_permission
        set rn_event_id=$2
        WHERE id=$1
    `;
    const { rows } = await pool.query(query, [id, rnEventId]);
    return rows;
};

export const updateRnRequestTime = async (rnIssueId:string, requestAt:any) => {
    const query = `
        UPDATE idc_request_permission
        set request_at=$2
        WHERE rn_event_id=$1
    `;
    console.log(query);
    const { rows } = await pool.query(query, [rnIssueId, requestAt]);
    return rows;
};

export const updateRnRequestPermissionTime = async (rnIssueId:string, permissionAt:string) => {
    const query = `
        UPDATE idc_request_permission
        set permission_at=$2
        WHERE rn_event_id=$1
    `;
    console.log(query);
    const { rows } = await pool.query(query, [rnIssueId, permissionAt]);
    return rows;
};

export const getRnRequestPermissionByIDCIssueId = async (idcIssueId: string): Promise<IDCRequestPermissionPayload[]> => {
    const query = `
        SELECT m.*
        FROM idc_request_permission m
        WHERE m.issue_id=$1
        ORDER BY m.request_at DESC
    `;
    //console.log('Executing SQL:', query);
    //console.log('With values:', idcIssueId);
    const { rows } = await pool.query(query, [idcIssueId]);
    return rows;
};

export const getPendingRnRequestPermissionByIDCIssueId = async (idcIssueId: string): Promise<IDCRequestPermissionPayload[]> => {
    const query = `
        SELECT m.*
        FROM idc_request_permission m
        WHERE m.issue_id=$1 and m.permission_at is null 
        ORDER BY m.request_at DESC
    `;
    //console.log('Executing SQL:', query);
    //console.log('With values:', idcIssueId);
    const { rows } = await pool.query(query, [idcIssueId]);
    return rows;
};

export const updateRnRequestPermissionImage = async (rn_event_id:string, permission_images:string, permissionAt:string) => {
    const query = `
        UPDATE idc_request_permission
        set permission_images=$2, permission_at=$3
        WHERE rn_event_id=$1
    `;
    const { rows } = await pool.query(query, [rn_event_id, permission_images, permissionAt]);
    return rows;
};

export const updateRnRequestPermissionImageByIssueId = async (issue_id:string, permission_images:string, permissionAt:string) => {
    const query = `
        UPDATE idc_request_permission
        set permission_images=$2, permission_at=$3
        WHERE issue_id=$1
    `;
    const { rows } = await pool.query(query, [issue_id, permission_images, permissionAt]);
    return rows;
};

export const getRnAuthorizedIssueIds = async (): Promise<any[]> => {
    const query = `
        SELECT m.issue_id
        FROM idc_request_permission m
        WHERE permission_at is not null
    `;
    const { rows } = await pool.query(query);
    return rows;
};

export const batchGetRnRequestPermissionByIDCIssueId = async (idcIssueIds: any): Promise<IDCRequestPermissionPayload[]> => {
    if (!idcIssueIds || idcIssueIds.length === 0) {
        return [];
    }

    const query = `
        SELECT m.*
        FROM idc_request_permission m
        WHERE m.issue_id = ANY($1)
        ORDER BY m.request_at DESC
    `;

    // 直接传字符串数组，pg 会自动处理
    const { rows } = await pool.query(query, [idcIssueIds]);
    return rows;
};
