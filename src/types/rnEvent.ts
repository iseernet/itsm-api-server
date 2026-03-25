export interface RNEventDeviceInfo {
    sn:string;
    pn:string;
    hardwareType:String; //CPU、BOARD、MEMORY、DISK、NIC、GPU、POWER、FAN、OTHER
}

export interface RNEventNetworkInfo {
    sn:string;
    idc:string;
    rack:string;
    startUnit:number;
}

export interface RNEventFaultInfo {
    deviceSn:string;
    faultType:string;
    brand:string;
    model:string;
    slotLocation:string;
    sn:string;
}

export interface RNEventPayload {
    ticketId?:string;
    name: string;
    description: string;
    networkSn?: string[];
    serverSn?: string[];
    rackId?: string[];
    eventType?:string; //SERVER 服务器事件,NETWORK 网络事件,RACK 整机柜事件,OTHER 其他事件
    level: string; // P0-P4
    maintenanceOperations: string[];
    hasDown?: boolean;
    faultType?: string;
    eventId?: string;
    refId?:string;
    //可操作权限，高权限一定包含低权限，申请需要的最高权限
    // 即可。枚举列表，通过枚举接口提供。简单列举如下
    // DEBUG，现场检查权限，不能影响机器
    // ONLINE，在线更换存在冗余部件，需要确保不会对机器运营
    // 产生影响，服务器场景
    // ONLINE_STO
    // RAGE，在线更换数据盘，服务器场景
    // OFFLINE，可以重启、开关机；不能装机，不能擦除/损坏数
    // 据盘上数据
    // OFFLINE_WITH_REINSTALL，可以进行重启、开关机、装
    // 机，操作数据盘等操作。服务器场景
    operationPermissions: string;
    //故障部件的 SN 和 modeld，硬件类型可分为
    // CPU、BOARD、MEMORY、DISK、NIC、GPU、POWER、
    // FAN、OTHER
    relatedComponents?: RNEventDeviceInfo[];
    networkDevices?:RNEventNetworkInfo[];
    networkFaultInfos?:RNEventFaultInfo[];
    isServerAffected?:boolean;
}

export interface RNPbdEventPayload {
    id:string;
    name: string;
    description: string;
    eventType:string; //SERVER 服务器事件,NETWORK 网络事件,RACK 整机柜事件,OTHER 其他事件
    level: string; // P0-P4
    alarmId: string[];
    relativeIssueId: string[];
}
