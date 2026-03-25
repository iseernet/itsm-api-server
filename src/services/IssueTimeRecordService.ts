import { pool } from '../utils/db/db';
import { IssueTimeRecordPayload } from '../types/issueTimeRecord';

//新增
export const createIssueTimeRecord = async (
    data: IssueTimeRecordPayload
): Promise<IssueTimeRecordPayload> => {
    const {
        issue_id,
        is_gpu_dropped,
        server_sn,
        is_logs_needed,
        scenario_type,
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
        fault_end_time_upload_image
    } = data;

    const query = `
    INSERT INTO issue_time_record(
      issue_id,
      is_gpu_dropped,
      server_sn,
      is_logs_needed,
      scenario_type,
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
      fault_end_time_upload_image
    )
    VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )
    RETURNING *
  `;

    const values = [
        issue_id,
        is_gpu_dropped,
        server_sn,
        is_logs_needed,
        scenario_type,
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
        fault_end_time_upload_image
    ];

    try {
        const { rows } = await pool.query(query, values);
        if (!rows[0]) {
            throw new Error('插入失败，未返回数据');
        }
        return rows[0] as IssueTimeRecordPayload;
    } catch (err: any) {
        console.error('createIssueTimeRecord error:', err.message);
        throw err;
    }
};


export const getIssueTimeRecordById = async (
    id: string
): Promise<IssueTimeRecordPayload | null> => {
    const query = `
      SELECT *
      FROM issue_time_record
      WHERE id=$1
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

export const getIssueTimeRecordByIssueId = async (
    id: string
): Promise<IssueTimeRecordPayload | null> => {
    const query = `
      SELECT *
      FROM issue_time_record
      WHERE issue_id=$1
      LIMIT 1
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};



export const updateIssueTimeRecord = async (
    id: string,
    data: Partial<IssueTimeRecordPayload>
): Promise<IssueTimeRecordPayload> => {
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) {
        throw new Error('没有可更新的字段');
    }

    const setSql = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

    const query = `
      UPDATE issue_time_record
      SET ${setSql}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
  `;

    const params = [id, ...values];

    const { rows } = await pool.query(query, params);
    return rows[0];
};


export const deleteIssueTimeRecord = async (id: string) => {
    const query = `
      DELETE FROM issue_time_record
      WHERE id=$1
      RETURNING *
  `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
};
