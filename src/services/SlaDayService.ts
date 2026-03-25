import {pool} from '../utils/db/db';
import {SlaDayPayload, SlaDayQueryPayload} from '../types/slaDay';
import format from 'pg-format';

export const createSlaDay = async (
    data: SlaDayPayload
):Promise<SlaDayPayload>=> {
    const {date, downtime, dropped_num} = data;

    const query = `
    INSERT INTO sla_day (date, downtime, dropped_num)
    VALUES ($1, $2, $3)
    ON CONFLICT (date)
    DO UPDATE SET downtime = EXCLUDED.downtime,
                  dropped_num = EXCLUDED.dropped_num
    RETURNING *;
  `;

    try {
        const {rows} = await pool.query(query, [date, downtime, dropped_num]);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as SlaDayPayload;
    } catch (err: any) {
        console.error('createSlaDay error:', err.message);
        throw err;
    }
};

export const createSlaDayBatch = async (dataList: SlaDayPayload[]): Promise<void> => {
    if (dataList.length === 0) return;

    // [[date1, downtime1, num1], [date2, downtime2, num2]]
    const values = dataList.map(item => [
        item.date,
        item.downtime,
        item.dropped_num
    ]);

    const query = format(
        `
        INSERT INTO sla_day (date, downtime, dropped_num)
        VALUES %L
        ON CONFLICT (date)
        DO UPDATE SET 
            downtime = EXCLUDED.downtime,
            dropped_num = EXCLUDED.dropped_num;
        `,
        values
    );

    try {
        await pool.query(query);
        console.log(`成功批量同步 ${dataList.length} 条 SLA 数据`);
    } catch (err: any) {
        console.error('createSlaDayBatch error:', err.message);
        throw err;
    }
};

export const getSlaDayPage = async (params: SlaDayQueryPayload) => {
    const { pageIndex = 0, pageSize = 10, startDate, endDate} = params;

    const offset = pageIndex * pageSize;

    let whereSql = 'WHERE 1=1';
    const conditions: any[] = [];

    if (startDate && endDate) {
        conditions.push(startDate);
        whereSql += ` AND date >= $${conditions.length}`;

        conditions.push(endDate);
        whereSql += ` AND date <= $${conditions.length}`;
    }

    const query = `
      SELECT *
      FROM sla_day
      ${whereSql}
      ORDER BY date DESC
      LIMIT $${conditions.length + 1}
      OFFSET $${conditions.length + 2}
  `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM sla_day
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

