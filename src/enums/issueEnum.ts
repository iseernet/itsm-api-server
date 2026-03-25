export const IssueCustomfield = {
    alarmId: '',
    service: '',
    impactLevel: '',
    authorizedChangeContent: '',
    relativeIssueId: '',
    snCode: '',
    isDown: '',
    relatedSN: '',
    syncToCustomer: '',
    maintenanceOperation: '',
    operationPermissions: '',
    estimatedStartDate: '',
    rackID: '',
    dueAt: '',
    bootType: '',
    cleanDataDisk: '',
    os: '',
    authorized: '',
    authorizedAt: '',
    serverSn: '',
    networkSn: '',
    faultType: '',
    rnTicketId: '',
    relatedComponents: '',
    idcSubType: '',
    newSn: '',
    networkDevice: '',
    postmortem_is_gpu_down: '',
    postmortem_server_sn: '',
    postmortem_need_log: '',
    postmortem_time: '',
    collect_log_time: '',
    collect_log_upload_image: '',
    // 补单相关
    fault_start_time: '',
    fault_start_time_upload_image: '',
    fault_end_time: '',
    fault_end_time_upload_image: '',

    manual_confirm_resolved_time: '',
    manual_confirm_resolved_upload_image: '',

    order_response_time:'',
    pbd_finish_time:'',
    rn_confirm_resolved_time:'',
    rn_fault_id:'',

    isNetworkEffectServer:'',

    postmortem_fault_type:'',
    postmortem_maintenance_operation:'',

    pbd_finish_timestamp: '',
    confirm_resolved_timestamp: '',

    response_timestamp: '',
    root_cause: '',

    transceiver_need_clean:'',
    transceiver_is_action:'',
    transceiver_p2p_connection:'',
    transceiver_result:'',
    transceiver_node:'',
    transceiver_attachments:'',
    transceiver_cleanup_time:'',

    servers_tenant: ''
};

// export const IssueCustomfieldMap: Record<string, string> = {
//     AlarmID: 'alarmId',
//     Service: 'service',
//     ImpactLevel: 'impactLevel',
//     AuthorizedChangeContent: 'authorizedChangeContent',
//     RelativeIssueId: 'relativeIssueId',
//     SNCode: 'snCode',
//     IsServerDown: 'isDown',
//     RelatedSN: 'relatedSN',
//     SyncToCustomer: 'syncToCustomer',
//     MaintenanceOperation: 'maintenanceOperation',
//     OperationPermissions: 'operationPermissions',
//     EstimatedStartDate: 'estimatedStartDate',
//     RackID: 'rackID',
//     DueAt: 'dueAt',
//     BootType: 'bootType',
//     CleanDataDisk: 'cleanDataDisk',
//     OS: 'os',
//     Authorized: 'authorized',
//     AuthorizedAt: 'authorizedAt',
//     ServerSn: 'serverSn',
//     NetworkSn: 'networkSn',
//     FaultType: 'faultType',
//     RnTicketId: 'rnTicketId'
// };

export enum IssueTypeEnum {
    Alarm = '10008',
    Issue = '10007',
    IDC = '10009',
    AutoIDC = '10018'
}

export function getIssueLink(issuetype:string){
    if(issuetype===IssueTypeEnum.Issue){
        return process.env.FEISHU_MESSAGE_ISSUE_URL;
    }
    else if(issuetype===IssueTypeEnum.IDC){
        return process.env.FEISHU_MESSAGE_IDC_ISSUE_URL;
    }
    else{
        return "";
    }
}

export const IssueStatusMap: Record<string, string> = {
    '10017': 'Open',
    '10018': 'Assigned',
    '10019': 'In Progress',
    '10020': 'Finished',
    '10021': 'Resolved',
    '10051': 'Canceled',
};
