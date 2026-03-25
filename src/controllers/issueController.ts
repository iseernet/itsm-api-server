import { Request, Response } from 'express';
import { IssuePayload, IssueQueryPayload, IssueUpdatePayload, RelatedIssuesQueryPayload } from '../types/issue';
import {
    addAttachmentFiles,
    addIssue,
    addIssueComment,
    assigneeIssue,
    changeIssueStatus,
    delIssueInfo,
    getIssueInfo,
    getIssueList, getIssueListForExport,
    getRelatedIssuesList,
    getRelatedMyIssuesList, recordDownTime,
    updateIssue, updateIssueManualFault, updateProjectIssueStatus
} from '../services/issueService';
import { IDCIssuePayload, IDCRequestPermissionPayload } from "../types/idcIssue";
import { IssueCustomfield, IssueTypeEnum } from "../enums/issueEnum";
import { RNEventPayload } from "../types/rnEvent";
import { rnCreateEvent, rnReportPDBIDCIssueState, rnUpdateEvent } from "../utils/rn/RNClient";
import {
    createRequestPermission,
    getRnRequestPermissionByIDCIssueId,
    updateRnRequestPermissionImage, updateRnRequestTime
} from "../services/rnRequestPermissionService";
import { getAllServiceFaultType, getServiceFaultTypeByCode } from "../services/serviceFaultTypeService";
import path from "path";
import { addComment } from "../services/commentService";
import { jiraApiUrls } from "../config/jiraApiUrls";
import fs from "fs";
import { getFinalServiceFaultTypeByCode } from "../services/serviceFaultTypeFinalService";
import {
    getExportIssuesFieldMap,
    getAllowedExportKeys,
    initFaultTypeMap,
    initFinalFaultTypeMap
} from "../utils/excel/exportIssuesFieldMap"
import ExcelJS from 'exceljs';
import dayjs from "dayjs";
import { ServiceFaultType } from "../types/serverFaultType";
import { getTicketAutoRebootStatus } from "../utils/itsmpower/itsmPower";


function parseBooleanQueryParam(value: any): any {
    if (value === undefined || value === null) {
        return "false";
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
            return "true";
        }
        if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
            return "false";
        }
    }

    return "false";
}

//查询事件单
export const getIssues = async (req: Request<{}, {}, IssueQueryPayload>, res: Response) => {

    try {
        const query = req.query;
        const loginUser = (req as any).user;
        // if (query.assignee) {
        //     if (loginUser.username !== process.env.JIRA_ADMIN_USERNAME) {
        //         query.assignee = loginUser.username;
        //     }
        // }
        if (query.reporter) {
            if (query.reporter === 'rn') {
                query.reporter = process.env.JIRA_USER_RN;
            }
            else if (query.reporter === 'alarm') {
                query.reporter = process.env.JIRA_USER_ALARM;
            }
        }



        const params: IssueQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            key: query.key as string,
            status: query.status as string,
            assignee: query.assignee as string,
            reporter: query.reporter as string,
            isFromPBD: parseBooleanQueryParam(query.isFromPBD),
            ...query
        };
        const ret = await getIssueList((req as any).user, params);
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};

//创建事件单
export const createIssue = async (req: Request<{}, {}, IssuePayload>, res: Response) => {
    console.log(req);
    const requiredFields: [keyof IssuePayload, string][] = [
        ['summary', 'name is missing'],
        ['description', 'description is missing'],
        ['service', 'service is missing'],
        ['priority', 'priority is missing'],
        // ['impactLevel', 'impactLevel is missing'],
        // ['snCode', 'impactLevel is missing'],
        // ['isDown', 'isDown is missing'],
        // ['syncToCustomer', 'syncToCustomer is missing'],
        // ['maintenanceOperation', 'maintenanceOperation is missing'],
        // ['operationPermissions', 'operationPermissions is missing'],
        // ['estimatedStartDate', 'estimatedStartDate is missing'],
    ];

    for (const [field, message] of requiredFields) {
        const body = req.body;
        if (!body[field]) {
            return res.send({ success: false, message });
        }
        // // 先判断 isDown / syncToCustomer 是否为空
        // if (body.isDown === null || body.syncToCustomer === null) {
        //     return res.send({ success: false, message });
        // }

        // // 跳过 isDown 校验
        // if (field === 'isDown') continue;

        // if (body.syncToCustomer) {
        //     // syncToCustomer = true 时需要额外必填
        //     const extraFields = [
        //         ['maintenanceOperation', 'maintenanceOperation is missing'],
        //         ['operationPermissions', 'operationPermissions is missing'],
        //         ['estimatedStartDate', 'estimatedStartDate is missing']
        //     ];
        //     for (const [f, m] of extraFields) {
        //         if (!body[f]) {
        //             return res.send({ success: false, m });
        //         }
        //     }
        // } else {
        //     // 其它字段校验
        //     if (typeof body[field] !== 'boolean' && !body[field]) {
        //         return res.send({ success: false, message });
        //     }
        // }
    }

    try {
        const ret = await addIssue((req as any).user, req.body);
        return res.send({
            success: true,
            data: ret.data
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};


//事件单详情
export const getIssueDetail = async (req: Request, res: Response) => {
    const { idOrKey } = req.params;
    if (!idOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    try {
        const ret = await getIssueInfo((req as any).user, idOrKey as string);

        const permissions = await getRnRequestPermissionByIDCIssueId(ret.id);

        ret.permissions = permissions;

        if (ret.fields.faultType != null && ret.fields.faultType != "") {
            const faultType = await getServiceFaultTypeByCode(ret.fields.faultType);
            if (faultType.length > 0) {
                ret.fields.faultTypeName = faultType[0].name;
            }
        }

        if (ret.fields.postmortem_fault_type != null && ret.fields.postmortem_fault_type != "") {
            const faultType = await getFinalServiceFaultTypeByCode(ret.fields.postmortem_fault_type);
            if (faultType.length > 0) {
                ret.fields.postmortem_fault_type_name = faultType[0].name;
            }
        }

        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//删除事件单
export const delIssue = async (req: Request, res: Response) => {

    const { idOrKey } = req.params;
    if (!idOrKey) {
        return res.send({ status: false, message: 'idOrKey is missing' });
    }

    try {
        const ret = await delIssueInfo((req as any).user, idOrKey as string);

        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//更新事件单
export const updateIssueInfo = async (req: Request<{ idOrKey: string }, {}, IssueUpdatePayload>, res: Response) => {

    const { idOrKey } = req.params;
    if (!idOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    // const requiredFields: [keyof IssuePayload, string][] = [
    //     ['summary', 'name is missing'],
    //     ['description', 'description is missing'],
    //     ['service', 'service is missing'],
    //     ['priority', 'priority is missing'],
    //     // ['impactLevel', 'impactLevel is missing'],
    // ];
    // for (const [field, message] of requiredFields) {
    //     if (!req.body[field]) {
    //         return res.send({
    //             success: false,
    //             message
    //         });
    //     }
    // }
    try {
        const ret = await updateIssue((req as any).user, idOrKey, req.body);

        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//指派事件单
export const assignIssue = async (req: Request<{ idOrKey: string }, {}, { assignee: string }>, res: Response) => {
    const { idOrKey } = req.params;
    const { assignee } = req.body;
    if (!idOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }
    if (!assignee) {
        return res.send({
            success: false,
            message: 'assignee is missing'
        });
    }
    try {
        const ret = await assigneeIssue((req as any).user, idOrKey, assignee);
        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//更新事件单状态
export const changeIssueState = async (req: Request<{ idOrKey: string }, {}, { stateId: string, stateName: string }>, res: Response) => {
    const { idOrKey } = req.params;
    const { stateId, stateName } = req.body;
    if (!idOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }
    if (!stateId) {
        return res.send({
            success: false,
            message: 'stateId is missing'
        });
    }
    // if (!stateName) {
    //     return res.send({
    //         success: false,
    //         message: 'stateName is missing'
    //     });
    // }

    try {
        const ret = await changeIssueStatus((req as any).user, idOrKey, stateId, stateName);
        return res.send({
            success: true,
            data: { success: true }
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};

export const createIDCIssueFromIssue = async (req: Request<{}, {}, IDCIssuePayload>, res: Response) => {

    const requiredFields: [keyof IDCIssuePayload, string][] = [
        ['name', 'name is missing'],
        ['description', 'description is missing'],
        ['service', 'service is missing'],
        ['eventId', 'eventId is missing'],
        ['operationSteps', 'operationSteps is missing'],
        ['operationPermissions', 'operationPermissions is missing'],
        ['dueAt', 'dueAt is missing'],
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }

    if (req.body['service'] == "SERVER") {
        if (req.body['hasDown'] == null || !req.body['faultType'] || !req.body['serverSn']) {
            return res.send({ success: false, message: "For SERVER service, hasDown, faultType, serverSn are required" });
        }
    }

    if (req.body['service'] == "NETWORK") {
        if (!req.body['networkSn']) {
            return res.send({ success: false, message: "For NETWORK service, networkSn is required" });
        }
    }

    try {
        const issueData: IssuePayload = {
            issuetype: "IDC",
            summary: req.body['name'],
            description: req.body['description'],
            service: req.body['service'],
            relativeIssueId: req.body['eventId'] != null && req.body['eventId'].length > 0 ? req.body['eventId'].join(',') : "",
            serverSn: req.body['serverSn'] != null ? req.body['serverSn'].join(',') : "",
            hasDown: req.body['hasDown'],
            isDown: req.body['hasDown'],
            faultType: req.body['faultType'],
            networkSn: req.body['networkSn'] != null ? req.body['networkSn'].join(',') : "",
            maintenanceOperation: req.body['operationSteps'] != null && req.body['operationSteps'].length > 0 ? req.body['operationSteps'].join(',') : "",
            operationPermissions: req.body['operationPermissions'] != null
                ? Array.isArray(req.body['operationPermissions'])
                    ? req.body['operationPermissions'].join(',')
                    : req.body['operationPermissions']
                : "",
            priority: req.body['level'],
            rackID: req.body['rackId'] != null ? req.body['rackId'].join(',') : "",
            dueAt: req.body['dueAt'],
            relatedComponents: req.body['relatedComponents'] != null ? req.body['relatedComponents'] : "",
            idcSubType: "NORMAL",
            newSn: req.body['newSn'] != null ? req.body['newSn'] : "",
            networkDevice: req.body['networkDevice'] != null ? req.body['networkDevice'] : "",
            isNetworkEffectServer: req.body['isNetworkEffectServer'] != null ? req.body['isNetworkEffectServer'] : "",
            transceiver_need_clean: req.body['transceiver_need_clean'] != null ? req.body['transceiver_need_clean'] : undefined,
            transceiver_is_action: req.body['transceiver_is_action'] != null ? req.body['transceiver_is_action'] : "",
            transceiver_p2p_connection: req.body['transceiver_p2p_connection'] != null ? req.body['transceiver_p2p_connection'] : "",
        }

        const ret = await addIssue((req as any).user, issueData, false);

        //assign to publisher
        const assign: any = {
            assignee: (req as any).user.username,
            status: "PBD-ASSIGNED"
        }
        await updateIssue((req as any).user, ret.data.id, assign);

        //publisher accept
        const accept: any = {
            status: "PBD-INPRORESS"
        }
        await updateIssue((req as any).user, ret.data.id, accept);

        return res.send({
            success: true,
            data: ret?.data
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }

};

export const requestRNPermission = async (req: Request, res: Response) => {
    let { id } = req.params;
    let { maintenanceOperation, operationPermissions, estimatedStartDate } = req.body;
    if (!id) {
        return res.send({
            success: false,
            message: 'id is missing'
        });
    }

    const requestTime = new Date();

    try {
        const issue = await getIssueInfo((req as any).user, id as string);
        if (issue.fields.issuetype.id !== IssueTypeEnum.IDC) {
            return res.send({
                success: false,
                message: 'Only IDC issues can request RN permission'
            });
        }

        let finalMaintenanceOperation = [];
        if (maintenanceOperation) {
            finalMaintenanceOperation = maintenanceOperation.split(',')
        }
        else if (issue.fields.maintenanceOperation) {
            finalMaintenanceOperation = issue.fields.maintenanceOperation.split(',')
        }

        let finalOperationPermissions = "";
        if (operationPermissions) {
            finalOperationPermissions = operationPermissions
        }
        else if (issue.fields.operationPermissions) {
            finalOperationPermissions = issue.fields.operationPermissions
        }

        // console.log(finalOperationPermissions)
        // console.log(maintenanceOperation)

        const updateData: IssueUpdatePayload = {
            maintenanceOperation: finalMaintenanceOperation.length > 0 ? finalMaintenanceOperation.join(',') : "",
            operationPermissions: finalOperationPermissions,
            dueAt: Number(estimatedStartDate),
            comment: "Updated for RN's Permission"
        };
        await updateIssue((req as any).user, id as string, updateData);

        const existedRequest = await getRnRequestPermissionByIDCIssueId(id as string);
        if (existedRequest.length > 0) {
            const idcRequestPermissionPayload: IDCRequestPermissionPayload = existedRequest[0];
            await updateRnRequestTime(idcRequestPermissionPayload.rn_event_id, (new Date()).toISOString());

            let finalHasDown = false;
            if (issue.fields.hasDown != null) {
                finalHasDown = issue.fields.hasDown.value.toLowerCase() === 'yes';
            }
            else if (issue.fields.isDown != null) {
                finalHasDown = issue.fields.isDown.value.toLowerCase() === 'yes';
            }

            if (process.env.RN_API_ENABLED == '1') {
                const rnRequest: RNEventPayload = {
                    ticketId: idcRequestPermissionPayload.rn_event_id,
                    name: issue.fields.summary,
                    description: issue.fields.description,
                    level: issue.fields.priority.name,
                    maintenanceOperations: finalMaintenanceOperation,
                    operationPermissions: finalOperationPermissions,
                    hasDown: finalHasDown,
                    faultType: issue.fields.faultType ? issue.fields.faultType : ""
                }

                const rnResult: any = await rnUpdateEvent(rnRequest);

                // await addIssueComment((req as any).user, id, "Updated for RN's Permission");

                if (rnResult.success) {
                    return res.send({
                        success: true,
                        data: rnResult.data
                    });
                }
                else {
                    return res.send({
                        success: false,
                        message: rnResult.message,
                        data: rnResult.data
                    }
                    )
                }
            }
        }
        else {
            const idcRequestPermissionPayload: IDCRequestPermissionPayload = {
                issue_id: id as string,
                rn_event_id: "",
                operation_permissions: finalOperationPermissions,
                operation_steps: finalMaintenanceOperation.length > 0 ? finalMaintenanceOperation.join(',') : "",
                request_at: requestTime.toISOString(),
                need_auth: true
            };

            let server = [];
            let networkFault = [];

            if (issue.fields.relatedComponents && issue.fields.relatedComponents != '') {
                const relatedComponents = JSON.parse(issue.fields.relatedComponents);
                if (relatedComponents['SERVER']) {
                    server = relatedComponents['SERVER'];
                }
                if (relatedComponents['NETWORK']) {
                    networkFault = relatedComponents['NETWORK'];
                    server = relatedComponents['SERVER'];
                }
            }

            let finalHasDown = false;
            if (issue.fields.hasDown != null) {
                finalHasDown = issue.fields.hasDown.value.toLowerCase() === 'yes';
            }
            else if (issue.fields.isDown != null) {
                finalHasDown = issue.fields.isDown.value.toLowerCase() === 'yes';
            }

            const rnRequest: RNEventPayload = {
                name: issue.fields.summary,
                description: issue.fields.description,
                eventType: issue.fields.service,
                level: issue.fields.priority.name,
                maintenanceOperations: finalMaintenanceOperation,
                serverSn: issue.fields.serverSn ? issue.fields.serverSn.split(',') : [],
                networkSn: issue.fields.networkSn ? issue.fields.networkSn.split(',') : [],
                rackId: issue.fields.rackID ? issue.fields.rackID.split(',') : [],
                eventId: issue.id,
                operationPermissions: finalOperationPermissions,
                refId: issue.fields.relativeIssueId ? issue.fields.relativeIssueId : "",
                hasDown: finalHasDown,
                faultType: issue.fields.faultType ? issue.fields.faultType : "",
                relatedComponents: server,
                networkDevices: issue.fields.networkDevice ? JSON.parse(issue.fields.networkDevice) : [],
                networkFaultInfos: networkFault,
                isServerAffected: issue.fields.isNetworkEffectServer != null && issue.fields.isNetworkEffectServer.toLowerCase() == 'yes'
            }

            switch (issue.fields.service) {
                case 'SERVER':
                    {
                        rnRequest.serverSn = issue.fields.serverSn ? issue.fields.serverSn.split(',') : [];
                        rnRequest.hasDown = finalHasDown;
                        rnRequest.faultType = issue.fields.faultType ? issue.fields.faultType : ""
                    }
                    break;
                case 'NETWORK':
                    {
                        rnRequest.networkSn = issue.fields.networkSn ? issue.fields.networkSn.split(',') : [];
                        rnRequest.serverSn = issue.fields.serverSn ? issue.fields.serverSn.split(',') : [];
                        rnRequest.isServerAffected = issue.fields.isNetworkEffectServer != null && issue.fields.isNetworkEffectServer.toLowerCase() == 'yes';
                    }
                    break;
                case 'RACK':
                    {
                        rnRequest.rackId = issue.fields.rackID ? issue.fields.rackID.split(',') : [];
                    }
                    break;
                default:
                    break;
            }

            if (process.env.RN_API_ENABLED == '1') {
                console.log("rnCreateEvent with:", rnRequest);
                const rnResult: any = await rnCreateEvent(rnRequest);
                if (rnResult.success) {
                    if (rnResult.data.needAuth) {
                        await addIssueComment((req as any).user, id as string, "Applied for RN's Permission");
                        idcRequestPermissionPayload.rn_event_id = rnResult.data.ticketId;
                        idcRequestPermissionPayload.need_auth = true;
                    } else {
                        idcRequestPermissionPayload.rn_event_id = rnResult.data.ticketId;
                        idcRequestPermissionPayload.need_auth = false;
                    }

                    const data = await createRequestPermission(idcRequestPermissionPayload);

                    if (rnResult.data.serversTenant) {
                        const updateServersTenant = {
                            comment: "Updated servers tenant",
                            servers_tenant: rnResult.data.serversTenant
                        };
                        await updateIssue((req as any).user, id as string, updateServersTenant);
                    }

                    if(!issue.fields.response_timestamp){
                        const updateResponseTime = {
                            comment: "Updated request time",
                            response_timestamp: Math.floor(requestTime.getTime() / 1000)
                        };
                        await updateIssue((req as any).user, id as string, updateResponseTime);
                    }


                    return res.send({
                        success: true,
                        data: rnResult.data
                    });
                } else {
                    return res.send({
                        success: false,
                        message: rnResult.message,
                        data: rnResult.data
                    }
                    )
                }
            }
            else {
                idcRequestPermissionPayload.rn_event_id = '';
                idcRequestPermissionPayload.need_auth = false;
                const data = await createRequestPermission(idcRequestPermissionPayload);

                if(!issue.fields.response_timestamp){
                    const updateResponseTime = {
                        comment: "Updated request time",
                        response_timestamp: Math.floor(requestTime.getTime() / 1000)
                    };
                    await updateIssue((req as any).user, id as string, updateResponseTime);
                }


                return res.send({
                    success: true,
                    data: data
                });
            }
        }
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//通过传过来的工单id，和工单类型，查询工单关联的工单列表
export const getRelatedIssues = async (req: Request<{ idOrKey: string }, {}, RelatedIssuesQueryPayload>, res: Response) => {

    try {
        const { idOrKey } = req.params;
        if (!idOrKey) {
            return res.send({
                success: false,
                message: 'idOrKey is missing'
            });
        }
        const query = req.query;
        const loginUser = (req as any).user;


        const params: RelatedIssuesQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            issuetype: query.issuetype as string,
            ...query
        };
        const ret = await getRelatedIssuesList((req as any).user, idOrKey, params);
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};

//通过传过来的工单id，查找关联这个工单的工单列表
export const getRelatedMyIssues = async (req: Request<{ idOrKey: string }, {}, RelatedIssuesQueryPayload>, res: Response) => {

    try {
        const { idOrKey } = req.params;
        if (!idOrKey) {
            return res.send({
                success: false,
                message: 'idOrKey is missing'
            });
        }
        const query = req.query;
        const loginUser = (req as any).user;


        const params: RelatedIssuesQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            issuetype: query.issuetype as string,
            status: query.status as string,
            ...query
        };
        const ret = await getRelatedMyIssuesList((req as any).user, idOrKey, params);
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};


export const cancelRNPermission = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.send({
            success: false,
            message: 'id is missing'
        });
    }

    try {
        const existedRequest = await getRnRequestPermissionByIDCIssueId(id as string);
        if (existedRequest.length < 0) {
            return res.send({
                success: false,
                data: "No request can be canceled"
            });
        }

        if ((req as any).user) {
            await addIssueComment((req as any).user, id as string, "Withdraw the request for RN's Permission");
        }


        const idcRequestPermissionPayload: IDCRequestPermissionPayload = existedRequest[0];
        await updateRnRequestTime(idcRequestPermissionPayload.rn_event_id, null);

        return res.send({
            success: true,
            data: ""
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};


export const addManualFault = async (req: Request, res: Response) => {

    const { issueIdOrKey } = req.params;

    const { fault_start_time, fault_end_time, commentBody } = req.body || {};

    const files = req.files as Express.Multer.File[];
    const filePaths = files.map((file) => path.resolve(file.path));
    if (!issueIdOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    const ret = await addComment((req as any).user, issueIdOrKey as string, filePaths, commentBody);
    const issue = await getIssueInfo((req as any).user, issueIdOrKey as string);
    const attachments = issue.fields.attachment || [];
    const commentBodyNew = ret.data.body;
    const regex = /!([^\|!\n]+?)\s*(?:\|[^!]*)?!/g;
    const matchedAttachments: any[] = [];
    let match: RegExpExecArray | null;
    const fileUrls = [];
    while ((match = regex.exec(commentBodyNew)) !== null) {
        // 去掉文件名首尾空格
        const filename = match[1].trim();

        // 在 attachments 中查找匹配文件
        const file = attachments.find((a: any) => a.filename === filename);

        if (file) {
            fileUrls.push(`/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`);
        }
    }

    console.log(fileUrls);

    const updateData = {
        fault_start_time: fault_start_time,
        fault_start_time_upload_image: fileUrls.join(','),
        fault_end_time: fault_end_time,
        fault_end_time_upload_image: ''
    };
    const result = await updateIssueManualFault((req as any).user, issueIdOrKey as string, updateData);

    const newIssue = await getIssueInfo((req as any).user, issueIdOrKey as string);
    if (newIssue.fields.status.name == 'PBD-CLOSED') {
        await recordDownTime(newIssue.id);
    }

    try {
        return res.send({
            success: true,
            data: result
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};

export const manualConfirmResolved = async (req: Request, res: Response) => {

    const { issueIdOrKey } = req.params;

    const { commentBody, manual_confirm_resolved_time } = req.body || {};

    const files = req.files as Express.Multer.File[];
    const filePaths = files.map((file) => path.resolve(file.path));
    if (!issueIdOrKey) {
        return res.send({
            success: false,
            message: 'idOrKey is missing'
        });
    }

    const ret = await addComment((req as any).user, issueIdOrKey as string, filePaths, commentBody);
    const issue = await getIssueInfo((req as any).user, issueIdOrKey as string);
    const attachments = issue.fields.attachment || [];
    const commentBodyNew = ret.data.body;
    const regex = /!([^\|!\n]+?)\s*(?:\|[^!]*)?!/g;
    const matchedAttachments: any[] = [];
    let match: RegExpExecArray | null;
    const fileUrls = [];
    while ((match = regex.exec(commentBodyNew)) !== null) {
        // 去掉文件名首尾空格
        const filename = match[1].trim();

        // 在 attachments 中查找匹配文件
        const file = attachments.find((a: any) => a.filename === filename);

        if (file) {
            fileUrls.push(`/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`);
        }
    }

    console.log(fileUrls);

    const updateData = {
        manual_confirm_resolved_time: manual_confirm_resolved_time,
        manual_confirm_resolved_upload_image: fileUrls.join(','),
        confirm_resolved_timestamp: parseInt(manual_confirm_resolved_time)
    };

    const result = await updateIssueManualFault((req as any).user, issueIdOrKey as string, updateData);

    await updateProjectIssueStatus((req as any).user, issueIdOrKey as string, 'PBD-CLOSED');

    try {
        return res.send({
            success: true,
            data: result
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};

//导出工单
export const exportIssues = async (req: Request<{}, {}, IssueQueryPayload>, res: Response) => {

    try {
        const query = req.body;
        const fields = query.fields;


        if (!Array.isArray(fields) || !fields.length) {
            return res.status(400).json({ success: false, message: 'Select at least one export field' });
        }

        await initFaultTypeMap();
        await initFinalFaultTypeMap();

        const EXPORT_ISSUES_FIELD_MAP = getExportIssuesFieldMap();
        const allowedKeys = getAllowedExportKeys();

        const invalid = fields.filter(f => !allowedKeys.includes(f));
        if (invalid.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid field: ${invalid.join(', ')}`,
            });
        }

        if (query.reporter) {
            if (query.reporter === 'rn') {
                query.reporter = process.env.JIRA_USER_RN;
            }
            else if (query.reporter === 'alarm') {
                query.reporter = process.env.JIRA_USER_ALARM;
            }
        }

        const params: IssueQueryPayload = {
            key: query.key as string,
            status: query.status as string,
            assignee: query.assignee as string,
            reporter: query.reporter as string,
            isFromPBD: parseBooleanQueryParam(query.isFromPBD),
            ...query
        };
        delete params.fields;

        //excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Issues List');

        const headerRow = worksheet.addRow(fields.map(key => EXPORT_ISSUES_FIELD_MAP[key].label));
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        fields.forEach((key, colIndex) => {
            const col = worksheet.getColumn(colIndex + 1);
            col.width = EXPORT_ISSUES_FIELD_MAP[key].width || 15;
            if (EXPORT_ISSUES_FIELD_MAP[key].isDate) {
                col.numFmt = 'yyyy-mm-dd hh:mm:ss';
            }
        });

        //query jira
        const needFields = fields.map(fieldKey => {
            const config = EXPORT_ISSUES_FIELD_MAP[fieldKey];
            return config?.jiraFieldKey;
        })
            .filter(Boolean) as string[];
        const list = await getIssueListForExport((req as any).user, params, needFields);

        for (const item of list) {
            const rowValues = fields.map((key) => {
                const config = EXPORT_ISSUES_FIELD_MAP[key];
                return config.valueGetter(item);
            });

            worksheet.addRow(rowValues).commit();
        }

        const buffer = await workbook.xlsx.writeBuffer();

        const now = new Date();
        let prefix = 'Issues';
        if (query.issuetype === 'issue') {
            prefix = 'Events';
        } else if (query.issuetype === 'idc') {
            prefix = 'IDC_Tickets';
        }
        const filename = `${prefix}_Export_${dayjs(now).format('YYYYMMDDHHmmss')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        return res.send(buffer);
    } catch (error: any) {
        console.error('Export failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Export failed, please try again later.',
        });
    }
};

export const getTicketRebootStatus = async (req: Request, res: Response) => {

    try {
        const rawIdOrKey = (req.params as any).idOrKey as string | string[] | undefined;
        const idOrKey = Array.isArray(rawIdOrKey) ? rawIdOrKey[0] : rawIdOrKey;
        if (!idOrKey || typeof idOrKey !== 'string') {
            return res.send({
                success: false,
                message: 'idOrKey is missing'
            });
        }
        const ret = await getTicketAutoRebootStatus(idOrKey);
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }


};
