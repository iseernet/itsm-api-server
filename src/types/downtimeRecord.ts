import {BaseQuery} from "./base";

export interface DowntimeRecordPayload {
    id?: string;
    issue_time_record_id: string;
    server_sn?: string;
    event_id?: string;
    ticket_id?: string;
    order_response_time?: string;
    authorization_pass_time?: string;
    collect_log_time?: string;
    pbd_finish_time?: string;
    rn_confirm_resolved_time?: string;
    fault_start_time?: string;
    fault_end_time?: string;
    commence_time_point?: string;       //开始时间点
    end_time_point?: string;            //结束时间点
    created_at?: string;
    updated_at?: string;
    event_create_time?: string;

    authorization_upload_image?: string;
    collect_log_upload_image?: string;
    rn_confirm_resolved_upload_image?: string;
    fault_start_time_upload_image?: string;
    fault_end_time_upload_image?: string;

    response_timestamp?: string;
}

export interface DowntimeRecordQueryPayload extends BaseQuery {
    eventId?: string;
    serverSn?: string;
    ticketId?: string;
    resolvedTimeStart?: string;
    resolvedTimeEnd?: string;
    sortField?: string;
    sortOrder?: 'ascend' | 'descend';
}
