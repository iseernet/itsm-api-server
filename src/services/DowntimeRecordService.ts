import { pool } from '../utils/db/db';
import { DowntimeRecordPayload, DowntimeRecordQueryPayload } from '../types/downtimeRecord';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

//新增
export const createDowntimeRecord = async (
    data: DowntimeRecordPayload
): Promise<DowntimeRecordPayload> => {
    const {
        issue_time_record_id,
        server_sn,
        event_id,
        ticket_id,
        order_response_time,
        authorization_pass_time,
        authorization_upload_image,
        collect_log_time,
        collect_log_upload_image,
        pbd_finish_time,
        rn_confirm_resolved_time,
        rn_confirm_resolved_upload_image,
        fault_start_time,
        fault_start_time_upload_image,
        fault_end_time,
        fault_end_time_upload_image,
        commence_time_point,
        end_time_point,
        event_create_time,
        response_timestamp
    } = data;

    const query = `
    INSERT INTO down_time_record(
      issue_time_record_id,
      server_sn,
      event_id,
      ticket_id,
      order_response_time,
      authorization_pass_time,
      authorization_upload_image,
      collect_log_time,
      collect_log_upload_image,
      pbd_finish_time,
      rn_confirm_resolved_time,
      rn_confirm_resolved_upload_image,
      fault_start_time,
      fault_start_time_upload_image,
      fault_end_time,
      fault_end_time_upload_image,
      commence_time_point,
      end_time_point,
      event_create_time,
      response_timestamp
    )
    VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
    )
    RETURNING *
  `;

    const values = [
        issue_time_record_id,
        server_sn,
        event_id,
        ticket_id,
        order_response_time,
        authorization_pass_time,
        authorization_upload_image,
        collect_log_time,
        collect_log_upload_image,
        pbd_finish_time,
        rn_confirm_resolved_time,
        rn_confirm_resolved_upload_image,
        fault_start_time,
        fault_start_time_upload_image,
        fault_end_time,
        fault_end_time_upload_image,
        commence_time_point,
        end_time_point,
        event_create_time,
        response_timestamp
    ];

    try {
        const { rows } = await pool.query(query, values);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as DowntimeRecordPayload;
    } catch (err: any) {
        console.error('createDowntimeRecord error:', err.message);
        throw err;
    }
};

//详情
export const getDowntimeRecordById = async (
    id: string
): Promise<DowntimeRecordPayload | null> => {
    const query = `
      SELECT *
      FROM down_time_record
      WHERE id = $1
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

//条件查询
export const getDowntimeRecordByIssueRecordIdAndServerSn = async (
    issue_time_record_id: string,
    server_sn: string
): Promise<DowntimeRecordPayload | null> => {
    const query = `
      SELECT *
      FROM down_time_record
      WHERE issue_time_record_id = $1 and server_sn = $2
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [issue_time_record_id, server_sn]);
    return rows[0] || null;
};

//更新
export const updateDowntimeRecord = async (
    id: string,
    data: Partial<DowntimeRecordPayload>
): Promise<DowntimeRecordPayload> => {
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) {
        throw new Error('没有可更新的字段');
    }

    const setSql = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

    const query = `
      UPDATE down_time_record
      SET ${setSql}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
  `;

    const params = [id, ...values];

    const { rows } = await pool.query(query, params);
    return rows[0];
};

//删除
export const deleteDowntimeRecord = async (id: string) => {
    const query = `
      DELETE FROM down_time_record
      WHERE id = $1
      RETURNING *
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
};

//条件删除
export const deleteDowntimeRecordByIssueTimeRecordId = async (issue_time_record_id: string) => {
    const query = `
      DELETE FROM down_time_record
      WHERE issue_time_record_id = $1
      `;
    await pool.query(query, [issue_time_record_id]);
};

//分页查询
export const getDowntimeRecordPage = async (params: DowntimeRecordQueryPayload) => {
    const {
        pageIndex = 0,
        pageSize = 10,
        eventId,
        serverSn,
        ticketId,
        resolvedTimeStart,
        resolvedTimeEnd,
        sortField,
        sortOrder,
    } = params;

    const offset = pageIndex * pageSize;

    let whereSql = 'WHERE 1=1';
    const conditions: any[] = [];

    if (eventId) {
        conditions.push(eventId);
        whereSql += ` AND d.event_id = $${conditions.length}`;
    }

    if (resolvedTimeStart && resolvedTimeEnd) {

        conditions.push(resolvedTimeStart);
        whereSql += ` AND d.rn_confirm_resolved_time >= $${conditions.length}`;

        conditions.push(resolvedTimeEnd);
        whereSql += ` AND d.rn_confirm_resolved_time <= $${conditions.length}`;
    }

    if (serverSn) {
        conditions.push(serverSn);
        whereSql += ` AND d.server_sn = $${conditions.length}`;
    }

    if (ticketId) {
        conditions.push(`%${ticketId}%`);
        whereSql += ` AND d.ticket_id LIKE $${conditions.length}`;
    }

    // downtime 计算逻辑
    const downtimeExpr = `
          CASE 
            WHEN d.fault_start_time IS NOT NULL 
                 AND d.fault_end_time IS NOT NULL 
                 AND d.fault_end_time > d.fault_start_time 
            THEN EXTRACT(EPOCH FROM (d.fault_end_time - d.fault_start_time))
            
            ELSE 
              -- Downtime1：只有 event_create_time 不为空才计算
              CASE 
                WHEN d.event_create_time IS NOT NULL 
                     AND d.response_timestamp IS NOT NULL 
                     AND d.response_timestamp > d.event_create_time
                THEN EXTRACT(EPOCH FROM (d.response_timestamp - d.event_create_time))
                ELSE 0
              END
              +
              -- Downtime2
              COALESCE(
                CASE 
                  WHEN d.authorization_pass_time IS NOT NULL 
                       AND d.pbd_finish_time IS NOT NULL 
                  THEN 
                    CASE 
                      -- 当年月日时分相同（忽略秒），用 response_timestamp 替代 authorization_pass_time
                      WHEN DATE_TRUNC('minute', d.authorization_pass_time) = DATE_TRUNC('minute', d.response_timestamp)
                      THEN 
                        CASE 
                          WHEN d.response_timestamp IS NOT NULL 
                               AND d.pbd_finish_time > d.response_timestamp
                          THEN EXTRACT(EPOCH FROM (d.pbd_finish_time - d.response_timestamp))
                          ELSE 0
                        END
                        
                      -- 正常情况：使用 authorization_pass_time
                      ELSE 
                        CASE 
                          WHEN d.pbd_finish_time > d.authorization_pass_time
                          THEN EXTRACT(EPOCH FROM (d.pbd_finish_time - d.authorization_pass_time))
                          ELSE 0
                        END
                    END
                    
                  ELSE 0
                END,
                0
              )
          END
        `;

    const downtime1Expr = `
          CASE 
            WHEN d.fault_start_time IS NOT NULL 
                 AND d.fault_end_time IS NOT NULL 
                 AND d.fault_end_time > d.fault_start_time 
            THEN 0  -- 规则1时 Downtime1 = 0
            ELSE 
              COALESCE(
                CASE 
                  WHEN d.event_create_time IS NOT NULL 
                       AND d.response_timestamp IS NOT NULL 
                       AND d.response_timestamp > d.event_create_time
                  THEN EXTRACT(EPOCH FROM (d.response_timestamp - d.event_create_time))
                  ELSE 0
                END,
                0
              )
          END
        `;

    const downtime2Expr = `
          CASE 
            WHEN d.fault_start_time IS NOT NULL 
                 AND d.fault_end_time IS NOT NULL 
                 AND d.fault_end_time > d.fault_start_time 
            THEN 0  -- 规则1时 Downtime2 = 0
            ELSE 
              COALESCE(
                CASE 
                  WHEN d.authorization_pass_time IS NOT NULL 
                       AND d.pbd_finish_time IS NOT NULL 
                  THEN 
                    CASE 
                      -- 当年月日时分相同（忽略秒），用 response_timestamp 替代 authorization_pass_time
                      WHEN DATE_TRUNC('minute', d.authorization_pass_time) = DATE_TRUNC('minute', d.response_timestamp)
                      THEN 
                        CASE 
                          WHEN d.response_timestamp IS NOT NULL 
                               AND d.pbd_finish_time > d.response_timestamp
                          THEN EXTRACT(EPOCH FROM (d.pbd_finish_time - d.response_timestamp))
                          ELSE 0
                        END
                        
                      -- 正常情况：使用 authorization_pass_time
                      ELSE 
                        CASE 
                          WHEN d.pbd_finish_time > d.authorization_pass_time
                          THEN EXTRACT(EPOCH FROM (d.pbd_finish_time - d.authorization_pass_time))
                          ELSE 0
                        END
                    END
                    
                  ELSE 0
                END,
                0
              )
          END
        `;

    let orderBy = 'ORDER BY d.rn_confirm_resolved_time DESC';

    if (sortField && sortOrder) {
        const direction = sortOrder === 'ascend' ? 'ASC' : 'DESC';

        let sortExpr: string;

        switch (sortField) {
            case 'downtime':
                sortExpr = `(${downtimeExpr})`;
                break;
            case 'downtime1':
                sortExpr = `(${downtime1Expr})`;
                break;
            case 'downtime2':
                sortExpr = `(${downtime2Expr})`;
                break;
            default:
                sortExpr = 'd.rn_confirm_resolved_time';
                break;
        }

        orderBy = `
            ORDER BY
                ${sortExpr} ${direction} NULLS LAST,
                d.event_create_time DESC
        `;
    }

    const query = `
      SELECT 
        d.*,
        row_to_json(i) AS issue_record,
        (${downtimeExpr}) AS downtime_seconds,
        (${downtime1Expr}) AS downtime1_seconds,
        (${downtime2Expr}) AS downtime2_seconds
      FROM down_time_record d
      LEFT JOIN issue_time_record i
      ON d.issue_time_record_id = i.id
      ${whereSql}
      ${orderBy}
      LIMIT $${conditions.length + 1}
      OFFSET $${conditions.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM down_time_record d
      ${whereSql}
  `;

    conditions.push(pageSize, offset);

    console.log('SQL:', query);
    console.log('params:', conditions);


    const [dataRes, countRes] = await Promise.all([
        pool.query(query, conditions),
        pool.query(countQuery, conditions.slice(0, -2)),
    ]);

    return {
        data: dataRes.rows,
        total: Number(countRes.rows[0].total)
    };
};

export const getDowntimeRecordPoint = async () => {
    const query = `
        SELECT
            MIN(
                CASE
                    WHEN fault_start_time IS NOT NULL
                     AND fault_end_time IS NOT NULL
                    THEN fault_start_time
                    ELSE LEAST(
                        event_create_time,
                        authorization_pass_time
                    )
                END
            ) AS min_date,

            MAX(
                CASE
                    WHEN fault_start_time IS NOT NULL
                     AND fault_end_time IS NOT NULL
                    THEN fault_end_time
                    ELSE GREATEST(
                        response_timestamp,
                        pbd_finish_time
                    )
                END
            ) AS max_date
        FROM down_time_record
        WHERE
            (
                fault_start_time IS NOT NULL
                AND fault_end_time IS NOT NULL
            )
            OR
            (
                event_create_time IS NOT NULL
                AND response_timestamp IS NOT NULL
            )
            OR
            (
                authorization_pass_time IS NOT NULL
                AND pbd_finish_time IS NOT NULL
            );
    `;
    const { rows } = await pool.query(query);
    return rows;
};

//根据日期查询
export const getDowntimeRecordByDate = async (startDate: string, endDate: string) => {
    const query = `
        SELECT
            id,
            event_create_time,
            response_timestamp,
            authorization_pass_time,
            pbd_finish_time,
            fault_start_time,
            fault_end_time
        FROM down_time_record
        WHERE
            (
                -- 规则 1：Downtime = fault_end_time - fault_start_time
                fault_start_time IS NOT NULL
                AND fault_end_time IS NOT NULL
                AND fault_end_time >= $1
                AND fault_start_time <= $2
            )
            OR
            (
                -- 规则 2-1：Downtime1 = response_timestamp - event_create_time
                fault_start_time IS NULL
                OR fault_end_time IS NULL
            )
            AND (
                event_create_time IS NOT NULL
                AND response_timestamp IS NOT NULL
                AND response_timestamp >= $1
                AND event_create_time <= $2
            )
            OR
            (
                -- 规则 2-2：Downtime2 = pbd_finish_time - authorization_pass_time
                fault_start_time IS NULL
                OR fault_end_time IS NULL
            )
            AND (
                authorization_pass_time IS NOT NULL
                AND pbd_finish_time IS NOT NULL
                AND pbd_finish_time >= $1
                AND authorization_pass_time <= $2
            );
    `;
    const { rows } = await pool.query(query, [startDate, endDate]);
    return rows;
};
