import { pool } from '../utils/db/db';
import { TransceiverCleanupLogPayload, TransceiverCleanupLogQueryPayload} from '../types/transceiverCleanupLog';

//新增
export const createTransceiverCleanupLog = async (
    data: TransceiverCleanupLogPayload
): Promise<TransceiverCleanupLogPayload> => {
    const {
        service_type,
        server_sn,
        operator,
        cleanup_start_at,
        result,
        note,
        idc_ticket_id,
        attachment_url,
        p2p
    } = data;

    const query = `
    INSERT INTO transceiver_cleanup_log(
      service_type,
      server_sn,
      operator,
      cleanup_start_at,
      result,
      note,
      idc_ticket_id,
      attachment_url,
      p2p
    )
    VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    )
    RETURNING *
  `;

    const values = [
        service_type,
        server_sn,
        operator,
        cleanup_start_at,
        result,
        note,
        idc_ticket_id,
        attachment_url,
        p2p
    ];

    try {
        const { rows } = await pool.query(query, values);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as TransceiverCleanupLogPayload;
    } catch (err: any) {
        console.error('createTransceiverCleanupLog error:', err.message);
        throw err;
    }
};

//根据id查询详情
export const getTransceiverCleanupLogById = async (
    id: string
): Promise<TransceiverCleanupLogPayload | null> => {
    const query = `
      SELECT *
      FROM transceiver_cleanup_log
      WHERE id = $1
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

//根据idc_ticket_id查询详情
export const getTransceiverCleanupLogByIdcTicketId = async (
    idc_ticket_id: string
): Promise<TransceiverCleanupLogPayload | null> => {
    const query = `
      SELECT *
      FROM transceiver_cleanup_log
      WHERE idc_ticket_id = $1
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [idc_ticket_id]);
    return rows[0] || null;
};

//更新
export const updateTransceiverCleanupLog = async (
    id: string,
    data: Partial<TransceiverCleanupLogPayload>
): Promise<TransceiverCleanupLogPayload> => {
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) {
        throw new Error('没有可更新的字段');
    }

    const setSql = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

    const query = `
      UPDATE transceiver_cleanup_log
      SET ${setSql}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
  `;

    const params = [id, ...values];

    const { rows } = await pool.query(query, params);
    return rows[0];
};

//删除
export const deleteTransceiverCleanupLog = async (id: string) => {
    const query = `
      DELETE FROM transceiver_cleanup_log
      WHERE id = $1
      RETURNING *
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
};

//分页查询
export const getTransceiverCleanupLogPage = async (params: TransceiverCleanupLogQueryPayload) => {
    const {
        pageIndex = 1,
        pageSize = 10,
        serverSn,
        idcTicketId,
        result,
        serviceType,
        cleanupTimeStart,
        cleanupTimeEnd
    } = params;

    const offset = (pageIndex - 1) * pageSize;

    let whereSql = 'WHERE 1=1';
    const conditions: any[] = [];

    if (serverSn) {
        conditions.push(serverSn);
        whereSql += ` AND server_sn = $${conditions.length}`;
    }

    if (idcTicketId) {
        conditions.push(idcTicketId);
        whereSql += ` AND idc_ticket_id = $${conditions.length}`;
    }

    if (result) {
        conditions.push(result);
        whereSql += ` AND result = $${conditions.length}`;
    }

    if (serviceType) {
        conditions.push(serviceType);
        whereSql += ` AND service_type = $${conditions.length}`;
    }

    if (cleanupTimeStart && cleanupTimeEnd) {
        // const startWithTime = `${cleanupTimeStart.trim()} 00:00:00`;
        conditions.push(cleanupTimeStart);
        whereSql += ` AND cleanup_start_at >= $${conditions.length}`;

        // const endWithTime = `${cleanupTimeEnd.trim()} 23:59:59`;
        conditions.push(cleanupTimeEnd);
        whereSql += ` AND cleanup_start_at <= $${conditions.length}`;
    }

    const query = `
      SELECT *
      FROM transceiver_cleanup_log
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${conditions.length + 1}
      OFFSET $${conditions.length + 2}
  `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM transceiver_cleanup_log
      ${whereSql}
  `;

    conditions.push(pageSize, offset);

    const [dataRes, countRes] = await Promise.all([
        pool.query(query, conditions),
        pool.query(countQuery, conditions.slice(0, -2)),
    ]);

    return {
        data: dataRes.rows,
        total: Number(countRes.rows[0].total)
    };
};

//检查过去 30 天内，指定 server_sn是否有清洁记录，针对 Server和 Rack类型
export const hasCleanupInLast30Days = async (serverSn: string[]) => {
    const placeholders = serverSn.map((_, i) => `$${i + 1}`).join(', ');
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const now = Math.floor(Date.now() / 1000);

    const query = `
        SELECT (
          SELECT COUNT(DISTINCT server_sn)
          FROM transceiver_cleanup_log
          WHERE server_sn IN (${placeholders})
            AND service_type IN ('SERVER', 'RACK')
            AND result != 'Undo'
            AND cleanup_start_at BETWEEN $${serverSn.length + 1} AND $${serverSn.length + 2}
        ) = $${serverSn.length + 3} AS all_cleaned
    `;

    try {
        const uniqueSns = [...new Set(serverSn)];
        const { rows } = await pool.query(query, [
            ...serverSn,
            thirtyDaysAgo,
            now,
            uniqueSns.length
        ]);
        // rows[0].all_cleaned 为 true 表示全部都清洁过-> 返回 true (不能清洁)
        // rows[0].all_cleaned 为 false 表示有没清洁的 -> 返回 false (能清洁)
        return rows[0]?.all_cleaned ?? false;
    } catch (err: any) {
        console.error('hasCleanupInLast30Days error:', err.message);
        throw err;
    }
};