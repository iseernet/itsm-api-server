import { BaseQuery } from "./base";

// types/issue.ts
export interface IssuePayload {
    idOrkey?: string;
    summary?: string;
    description?: string;
    attachment?: string; // 可选
    service?: string;
    priority?: string;
    impactLevel?: string;
    alarmId?: string;
    relativeIssueId?: string;
    authorizedChangeContent?: string;
    issuetype?: string;
    reporter?: string;
    assignee?: string;
    snCode?: string;
    relatedSN?: string;
    serverSn?: string; // 可选
    networkSn?: string;
    faultType?: string;
    isDown?: boolean;
    syncToCustomer?: boolean;
    maintenanceOperation?: string;
    operationPermissions?: string;
    estimatedStartDate?: Date;
    status?: string;
    [key: string]: any; // <-- 允许用字符串索引

    //for idc issue
    rackID?: string;
    dueAt?: number;
    bootType?: string;
    cleanDataDisk?: boolean;
    os?: string;

    //for idc authorization
    authorized?: boolean;
    authorizedAt?: number;
    rnTicketId?: string;
    relatedComponents?: string;

    idcSubType?: string; //idc单的子类型，NORMAL，SERVER_OPERATION， SYSTEM_DEPLOY，REPLACE
    newSn?: string;
    networkDevice?:string;

    postmortem_is_gpu_down?:string;
    postmortem_server_sn?:string;
    postmortem_need_log?:string;

    collect_log_time?:string;
    collect_log_upload_image?:string;

    //补单
    fault_start_time?:string;
    fault_start_time_upload_image?:string;
    fault_end_time?:string;
    fault_end_time_upload_image?:string;

    manual_confirm_resolved_time?:string;
    manual_confirm_resolved_upload_image?:string;

    order_response_time?:string;
    pbd_finish_time?:string;
    rn_confirm_resolved_time?:string;
    rn_fault_id?:string;

    isNetworkEffectServer?:string;

    postmortem_fault_type?:string;
    postmortem_maintenance_operation?:string;

    pbd_finish_timestamp?:number;
    confirm_resolved_timestamp?:number;
    response_timestamp?:number;
    root_cause?:string;

    transceiver_need_clean?:boolean,
    transceiver_is_action?:string,
    transceiver_p2p_connection?:string,
    transceiver_result?:string,
    transceiver_node?:string,
    transceiver_attachments?:string,
    transceiver_cleanup_time?:number,

    servers_tenant?:string;
}

export interface IssueQueryPayload extends BaseQuery {
    id?: string;
    jiraId?: string;
    key?: string;
    alarmId?: string;
    name?: string;
    summary?: string;
    description?: string;
    status?: string;
    assignee?: string;
    reporter?: string;
    service?: string;
    priority?: string;
    impactLevel?: string;
    relativeIssueId?: string;
    authorizedChangeContent?: string;
    issuetype?: string;
    isFromPBD?: string;
    text?: string;
    priority_sort?: string;
    rnTicketId?: string;
    relatedComponents?: string;
    createdDateStart?:string;
    createdDateEnd?:string;

    authorizationStatus?: string;
    isRnFault?: string;

    authPermissionStatus?: string;

    fields?: string | string[];
}

export interface IssueUpdatePayload extends IssuePayload {
    comment: string; // 修改时必须传
}

export interface IssueAuthorizePayload extends IssuePayload {
    authorized: boolean;
    authorizedAt: number;
}


export interface RelatedIssuesQueryPayload extends BaseQuery {
    idOrkey?: string;
    issuetype?: string;
    alarmId?: string;
    relativeIssueId?: string;
    status?: string;
}

