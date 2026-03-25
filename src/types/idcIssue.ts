

export interface IDCRequestPermissionPayload {
    id?: string;
    issue_id: string;
    rn_event_id: string;
    operation_permissions: string; // 申请的权限
    operation_steps: string; // 申请的操作步骤
    request_at: string; // 申请时间
    permission_at?: string; // 批准时间
    permission_images?: string; //专项时上传的图片
    need_auth: boolean;
}

export interface IDCIssuePayload {
    idOrkey?: string;
    name: string;
    description: string;
    service: string;
    level?: string;
    serverSn?: string[];
    networkSn?: string[];
    rackId?: string[];
    hasDown?: boolean;
    faultType?: string;
    eventId: string[];
    operationSteps: string[];
    operationPermissions: string[] | string;
    dueAt: number;
    rnTicketId?: string;
    relatedComponents?: string;
    idcSubType?: string; //idc单的子类型，NORMAL，SERVER_OPERATION， SYSTEM_DEPLOY，REPLACE
    newSn?: string;
    networkDevice?:string;

    networkDevices?:string;
    networkFaultInfos?:string;

    isNetworkEffectServer?:string;

    transceiver_need_clean?:boolean;
    transceiver_is_action?:string;
    transceiver_p2p_connection?:string;
    transceiver_result?:string;
    transceiver_node?:string;
    transceiver_attachments?:string;
    transceiver_cleanup_time?:number;
}

export interface IDCIssueQueryPayload {
    id: string;
    key: string;
    name: string;
    description: string;
    status: string;
    created: number;
    assignee: Assignee;
    newSn: string;
}

export interface Assignee {
    accountId: string;
    displayName: string;
}

export interface ServerOperationPayload {
    sn: string;
    bootType: string; // 启动类型 REBOOT：重启; POWER_OFF：关机; POWER_ON：开机
    rnTicketId?: string;
}

export interface SystemDeployPayload {
    sn: string;
    cleanDataDisk: boolean; // 是否清除数据盘
    os: string; // 方便扩展，如果后续对操作系统版本有其他要求，可通过此字段传递
    rnTicketId?: string;
}

export interface DeviceReplacePayload {
    sn: string;
    rnTicketId?: string;
}
