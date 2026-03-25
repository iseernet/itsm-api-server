import { pool } from '../utils/db/db';
import { IssueTimeOutPushRecordPayload } from '../types/issueTimeOutPushRecord';

//新增
export const createIssueTimeOutPushRecord = async (
    data: IssueTimeOutPushRecordPayload
): Promise<IssueTimeOutPushRecordPayload> => {
    const {
        issue_id,
        threshold_percent,
    } = data;

    const query = `
    INSERT INTO issue_time_out_push_record(
      issue_id,
      threshold_percent
    )
    VALUES($1,$2)
    RETURNING *
  `;

    const values = [
        issue_id,
        threshold_percent
    ];

    try {
        const { rows } = await pool.query(query, values);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as IssueTimeOutPushRecordPayload;
    } catch (err: any) {
        console.error('createIssueTimeOutPushRecord error:', err.message);
        throw err;
    }
};

//批量新增
export const createIssueTimeOutPushRecordBatch = async (
    records: { issue_id: string, threshold_percent: number }[]
): Promise<void> => {
    if (records.length === 0) return;

    const values = records.flatMap(r => [r.issue_id, r.threshold_percent]);

    const placeholders = records.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');

    const query = `
        INSERT INTO issue_time_out_push_record (issue_id, threshold_percent)
        VALUES ${placeholders}
        ON CONFLICT (issue_id, threshold_percent) DO NOTHING;
    `;

    await pool.query(query, values);
};

export const getOneIssueTimeOutPushRecord = async (
    issue_id: string,
    threshold_percent: number
): Promise<IssueTimeOutPushRecordPayload | null> => {
    const query = `
      SELECT *
      FROM issue_time_out_push_record
      WHERE issue_id = $1 and threshold_percent = $2
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [issue_id, threshold_percent]);
    return rows[0] || null;
};

export const getPushRecordsByIssueIds = async (
    issue_ids: string[]
): Promise<IssueTimeOutPushRecordPayload[]> => {
    if (issue_ids.length === 0) return [];

    const query = `
      SELECT issue_id, threshold_percent
      FROM issue_time_out_push_record
      WHERE issue_id = ANY($1)
    `;

    try {
        const { rows } = await pool.query(query, [issue_ids]);
        return rows as IssueTimeOutPushRecordPayload[];
    } catch (err: any) {
        console.error('getPushRecordsByIssueIds error:', err.message);
        return [];
    }
};