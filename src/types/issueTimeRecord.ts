export interface IssueTimeRecordPayload {
    id?: string;
    issue_id: string;                   //工单id
    is_gpu_dropped?: string;            //GPU掉卡？(yes/no)
    server_sn?: string;
    is_logs_needed?: string;            //是否采集log信息? (yes/no)
    scenario_type: string;              //场景类型(非专项、专项、补单、撤回重提)
    order_response_time?: string;       //工单响应时间
    authorization_pass_time?: string;   //授权通过时间
    authorization_upload_image?: string;
    collect_log_time?: string;          //收集 Log 时间
    collect_log_upload_image?: string;
    pbd_finish_time?: string;           //PBD finish 时间
    rn_confirm_resolved_time?: string;  //RN Confirm Resolved 时间
    rn_confirm_resolved_upload_image?: string;
    fault_start_time?: string;          //故障发生时间
    fault_start_time_upload_image?: string;
    fault_end_time?: string;            //故障解决时间
    fault_end_time_upload_image?: string;
    created_at?: string;
    updated_at?: string;
}
