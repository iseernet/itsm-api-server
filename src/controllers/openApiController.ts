import { NextFunction, Request, Response } from 'express';
import {
    IssuePayload,
    IssueQueryPayload,
    IssueUpdatePayload
} from '../types/issue';

import {
    Assignee, DeviceReplacePayload,
    IDCIssuePayload, IDCIssueQueryPayload, IDCRequestPermissionPayload,
    ServerOperationPayload,
    SystemDeployPayload
} from '../types/idcIssue';
import {
    addIssue,
    assigneeIssue,
    authorizeIssue,
    changeIssueStatus,
    delIssueInfo,
    getIssueInfo,
    getIssueList,
    updateIssue,
    getIssueListByAlarmId, getIssueListByRnFaultId
} from '../services/issueService';
import { IssueTypeEnum } from "../enums/issueEnum";
import { RNEventPayload } from "../types/rnEvent";
import { rnCreateEvent, rnReportPDBIDCIssueState } from "../utils/rn/RNClient";
import { RNIssuePayload } from "../types/rnIssue";
import crypto from "crypto";
import { isValidAppKey, parseParamTypes, sortObject } from "../middleware/signature";
import { config } from "../config/config";
import {
    createRequestPermission,
    getPendingRnRequestPermissionByIDCIssueId,
    updateRnRequestPermissionTime
} from "../services/rnRequestPermissionService";
import { JiraClient } from "../utils/jira/JiraClient";
import { sendAlarmAutoRecoveryMessage, sendPermissionRquestAuthorizedMessage } from "../utils/feishu/feishuPBDMessage";
import {
    sendFeishuAuthorizationMessage, sendFeishuConfirmResolvedMessage, sendFeishuNewAUTOIDCMessage,
    sendFeishuNewEventMessage,
    sendFeishuNewIDCMessage, sendFeishuNewRNFaultEventMessage, sendFeishuReopenMessage
} from "../utils/feishu/feishu-util";
import { AttachmentVO, RNFaultIssuePayload } from "../types/rnIFaultIssue";
import { getAlertDetail } from "../utils/pbdalert/pbdAlert";
import {getDeviceType, getRebootingStatus, ticketAutoReboot, verifySN} from "../utils/itsmpower/itsmPower";
const { appSecrets, allowedTimeDriftMs } = config.signature;

//查询事件单
export const getIssues = async (req: Request<{}, {}, IssueQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        const loginUser = (req as any).user;
        if (!query.assignee) {
            if (loginUser.username !== process.env.JIRA_ADMIN_USERNAME) {
                query.assignee = loginUser.username;
            }
        }
        const params: IssueQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            key: query.key as string,
            status: query.status as string,
            assignee: query.assignee as string,
            reporter: query.reporter as string,
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
export const createIssue = async (req: Request<{}, {}, RNIssuePayload>, res: Response) => {
    const requiredFields: [keyof RNIssuePayload, string][] = [
        ['name', 'name is missing'],
        ['description', 'description is missing'],
        ['service', 'service is missing'],
        ['level', 'level is missing']
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }

    try {
        const issueData: IssuePayload = {
            issuetype: "Issue",
            summary: req.body['name'],
            description: req.body['description'],
            service: req.body['service'],
            relativeIssueId: req.body['relativeIssueId'] != null ? req.body['relativeIssueId'].join(',') : "",
            priority: req.body['level'],
            alarmId: req.body['alarmId'] != null ? req.body['alarmId'].join(',') : ""
        }

        const ret = await addIssue((req as any).user, issueData);
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
    const { id } = req.params;
    if (!id) {
        return res.send({
            success: false,
            message: 'id is missing'
        });
    }

    try {
        const ret = await getIssueInfo((req as any).user, id as string);
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

//更新事件单
export const updateIssueInfo = async (req: Request<{ id: string }, {}, IssueUpdatePayload>, res: Response) => {

    const { id } = req.params;
    if (!id) {
        return res.send({
            success: false,
            message: 'id is missing'
        });
    }

    const requiredFields: [keyof IssuePayload, string][] = [
        ['summary', 'name is missing'],
        ['description', 'description is missing'],
        ['service', 'service is missing'],
        ['priority', 'priority is missing'],
        // ['impactLevel', 'impactLevel is missing'],
    ];
    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({
                success: false,
                message
            });
        }
    }
    try {
        const ret = await updateIssue((req as any).user, id, req.body);
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
export const changeIssueState = async (req: Request<{ id: string }, {}, { stateId: string, stateName: string }>, res: Response) => {
    const { id } = req.params;
    const { stateId, stateName } = req.body;
    if (!id) {
        return res.send({
            success: false,
            message: 'id is missing'
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
        const ret = await changeIssueStatus((req as any).user, id, stateId, stateName);
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

export const getIdcIssues = async (req: Request<{}, {}, IssueQueryPayload>, res: Response) => {

    try {
        const query = req.query;

        const params: IssueQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 0,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            key: query.key as string,
            status: query.status as string,
            assignee: query.assignee as string,
            reporter: query.reporter as string,
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

//关闭事件单
export const closeIssue = async (req: Request<{ id: string }, {}, { closeComment: string }>, res: Response) => {
    const { id } = req.params;
    const { closeComment } = req.body;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const data = { "status": "10021", "comment": closeComment };
        const ret = await updateIssue((req as any).user, id, data);
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

export const createIDCIssue = async (req: Request<{}, {}, IDCIssuePayload>, res: Response) => {

    const requiredFields: [keyof IDCIssuePayload, string][] = [
        ['name', 'name is missing'],
        ['description', 'description is missing'],
        ['service', 'service is missing'],
        ['operationSteps', 'operationSteps is missing'],
        ['operationPermissions', 'operationPermissions is missing'],
        ['dueAt', 'dueAt is missing'],
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }

    console.log("openapi/createIDCIssue:", JSON.stringify(req.body));

    const user = (req as any).user;
    if (user.username != process.env.JIRA_USER_RN) {
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
    }

    let dueAt = req.body['dueAt'].toString();
    // 如果是 10 或 11 位，认为是秒，转换为毫秒
    if (dueAt.length === 10 || dueAt.length === 11) {
        dueAt = dueAt + "000";
    }

    try {
        const relatedComponents: any = {};
        let hasRelatedComponents = false;
        if (req.body['relatedComponents']) {
            relatedComponents['SERVER'] = req.body['relatedComponents'];
            hasRelatedComponents = true;
        }
        if (req.body['networkFaultInfos']) {
            relatedComponents['NETWORK'] = req.body['networkFaultInfos'];
            hasRelatedComponents = true;
        }

        const issueData: IssuePayload = {
            issuetype: "IDC",
            summary: req.body['name'],
            description: req.body['description'],
            service: req.body['service'],
            relativeIssueId: req.body['eventId'] != null ? req.body['eventId'].join(',') : "",
            serverSn: req.body['serverSn'] != null ? req.body['serverSn'].join(',') : "",
            hasDown: req.body['hasDown'] != null ? req.body['hasDown'] : false,
            faultType: req.body['faultType'] != null ? req.body['faultType'] : "",
            networkSn: req.body['networkSn'] != null ? req.body['networkSn'].join(',') : "",
            maintenanceOperation: req.body['operationSteps'] != null ? req.body['operationSteps'].join(',') : "",
            operationPermissions: req.body['operationPermissions'] != null
                ? Array.isArray(req.body['operationPermissions'])
                    ? req.body['operationPermissions'].join(',')
                    : req.body['operationPermissions']
                : "",
            priority: 'P1',
            rackID: req.body['rackId'] != null ? req.body['rackId'].join(',') : "",
            dueAt: Number(dueAt),
            rnTicketId: req.body['rnTicketId'] != null ? req.body['rnTicketId'] : "",
            relatedComponents: hasRelatedComponents ? JSON.stringify(relatedComponents) : "",
            networkDevice: req.body['networkDevices'] != null ? JSON.stringify(req.body['networkDevices']) : "",
            idcSubType: "NORMAL",
            newSn: req.body['newSn'] != null ? req.body['newSn'] : ""
        }

        console.log("add issue:", issueData);

        const ret: any = await addIssue((req as any).user, issueData);
        if (ret) {
            const newIssue = await getIssueInfo((req as any).user, ret.data.id);
            await sendFeishuNewIDCMessage(newIssue.id, newIssue.fields.summary, newIssue.fields.description);

            const idcRequestPermissionPayload: IDCRequestPermissionPayload = {
                issue_id: ret.data.id,
                rn_event_id: req.body['rnTicketId'] ? req.body['rnTicketId'] : "",
                operation_permissions: req.body['operationPermissions'] != null
                    ? Array.isArray(req.body['operationPermissions'])
                        ? req.body['operationPermissions'].join(',')
                        : req.body['operationPermissions']
                    : "",
                operation_steps: req.body['operationSteps'] != null ? req.body['operationSteps'].join(',') : "",
                request_at: (new Date()).toISOString(),
                permission_at: (new Date()).toISOString(),
                need_auth: true
            };
            const data = await createRequestPermission(idcRequestPermissionPayload);
        }
        return res.send({
            success: true,
            data: { id: ret?.data.id }
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }

};

function getRNStatusFromPDBStatus(status: string) {

}

//事件单详情
export const getIdcIssueDetail = async (req: Request, res: Response) => {
    console.log("getIdcIssueDetail:", req.params);

    const { id } = req.params;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const ret = await getIssueInfo((req as any).user, id as string);
        if (ret != null) {
            let reportState = "";
            switch (ret.fields.status.name) {
                case 'PBD-PENDING':
                    reportState = 'Open';
                    break;
                case 'PBD-ASSIGNED':
                    reportState = 'Assigned';
                    break;
                case 'PBD-INPRORESS':
                    reportState = 'In Progress';
                    break;
                case 'PBD-RESOLVED':
                    reportState = 'Finished';
                    break;
                case 'PBD-CLOSED':
                    reportState = 'Resolved';
                    break;
                case 'PBD-CANCELED':
                    reportState = 'Canceled';
                    break;
                default:
                    break;
            }

            const assignee: Assignee = {
                accountId: ret.fields.assignee.key,
                displayName: ret.fields.assignee.displayName
            }

            const issueData: IDCIssueQueryPayload = {
                id: ret.id,
                key: ret.key,
                name: ret.fields.summary,
                description: ret.fields.description,
                created: (new Date(ret.fields.created)).getTime(),
                status: reportState,
                assignee: assignee,
                newSn: ret.fields.newSn,
            }

            console.log("query suc:", issueData);
            return res.send({
                success: true,
                data: issueData
            });
        }
        else {
            return res.send({
                success: true,
                data: null
            });
        }

    } catch (error: any) {
        console.log("query error:", error.message);
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//关闭事件单
export const closeIdcIssue = async (req: Request<{ id: string }, {}, { closeComment: string }>, res: Response) => {
    const { id } = req.params;
    const { closeComment } = req.body;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        let data: any = { "status": "10021" };
        let finalComment = "Close the ticket";
        if (closeComment != null) {
            finalComment += ": " + closeComment;
        }
        data["comment"] = finalComment;
        const ret = await updateIssue((req as any).user, id, data);
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


export const serverOperation = async (req: Request<{}, {}, ServerOperationPayload>, res: Response) => {
    const requiredFields: [keyof ServerOperationPayload, string][] = [
        ['sn', 'sn is missing'],
        ['bootType', 'bootType is missing'],
        ['rnTicketId', 'rnTicketId is missing']
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }

    /**
     * H3C走人工重启流程
     * GB200走自动化重启流程
     */
    try {
        //验证SN正确性
        console.log(`[serverOperation] 开始验证SN: ${req.body['sn']}`);
        const snValidationRes = await verifySN(req.body['sn']);
        console.log(`[serverOperation] verifySN 响应: code=${snValidationRes?.code}, matched=${snValidationRes?.data?.matched}`);
        if(snValidationRes?.code !== 200 || !snValidationRes?.data?.matched){
            console.log(`[serverOperation] SN验证失败, 返回无效SN`);
            return res.send({ success: false, message: 'The server SN is invalid.' });
        }

        //判断sn类型
        let deviceType;
        const operator = process.env.AUTOIDC_OPERATOR || 'ITSM_OPERATOR';
        console.log(`[serverOperation] 开始获取设备类型: sn=${req.body['sn']}, operator=${operator}`);
        const deviceTypeRes = await getDeviceType(req.body['sn'], operator);
        console.log(`[serverOperation] getDeviceType 响应: code=${deviceTypeRes?.code}, device_type=${deviceTypeRes?.data?.device_type}`);
        if(deviceTypeRes?.code === 200 && deviceTypeRes?.data?.device_type === 'GB200'){
            deviceType = deviceTypeRes?.data?.device_type;
        }
        console.log(`[serverOperation] 最终 deviceType=${deviceType}`);

        //根据SN号判断GB200机器是否正在重启
        if (deviceType === 'GB200' && req.body['bootType'] === 'AUTO_REBOOT') {
            console.log(`[serverOperation] GB200设备, 检查是否正在重启: sn=${req.body['sn']}`);
            const rebootingRes = await getRebootingStatus(req.body['sn']);
            console.log(`[serverOperation] getRebootingStatus 响应: code=${rebootingRes?.code}, rebooting=${rebootingRes?.data?.rebooting}`);
            if(rebootingRes?.code === 200 && rebootingRes?.data?.rebooting){
                console.log(`[serverOperation] 设备正在重启中, 拒绝请求`);
                return res.send({ success: false, message: 'The server is rebooting, please try again later.' });
            }
        }

        const issueData: IssuePayload = {
            issuetype: (req.body['bootType'] === 'AUTO_REBOOT' && deviceType === 'GB200') ? "AutoIDC" : "IDC", //只有GB200的auto reboot才走AutoIDC流程
            summary: "Server Operation: " + req.body['bootType'],
            description: "Server Operation: " + req.body['bootType'] + " for SN: " + req.body['sn'],
            service: "SERVER",
            snCode: req.body['sn'],
            serverSn: req.body['sn'],
            maintenanceOperation: req.body['bootType'],
            operationPermissions: "OFFLINE",
            priority: 'P1',
            bootType: req.body['bootType'],
            rnTicketId: req.body['rnTicketId'],
            dueAt: new Date().getTime(),
            idcSubType: "SERVER_OPERATION"
        }

        const ret = await addIssue((req as any).user, issueData);

        if (!ret) {
            return res.send({ success: false, message: 'Server operation failed: failed to create issue.' });
        }

        const idcRequestPermissionPayload: IDCRequestPermissionPayload = {
            issue_id: ret.data.id,
            rn_event_id: req.body['rnTicketId'] ? req.body['rnTicketId'] : "",
            operation_permissions: "OFFLINE",
            operation_steps: req.body['bootType'],
            request_at: (new Date()).toISOString(),
            permission_at: (new Date()).toISOString(),
            need_auth: true
        };
        const data = await createRequestPermission(idcRequestPermissionPayload);

        // GB200走自动化重启
        if (deviceType === 'GB200' && req.body['bootType'] === 'AUTO_REBOOT') {
            const rebootResult = await ticketAutoReboot(req.body['sn'], ret.data.id, operator);

            console.log('[AUTO_REBOOT_RESULT]', rebootResult);

            await sendFeishuNewAUTOIDCMessage(ret.data.id, "Server Operation: " + req.body['bootType'], "Server Operation: " + req.body['bootType'] + " for SN: " + req.body['sn']);
        } else {
            await sendFeishuNewIDCMessage(ret.data.id, "Server Operation: " + req.body['bootType'], "Server Operation: " + req.body['bootType'] + " for SN: " + req.body['sn']);
        }

        return res.send({
            success: true,
            data: { id: ret.data.id }
        });
    } catch (error: any) {
        console.error(`[serverOperation] 异常: ${error.message}`, error.stack);
        return res.send({
            success: false,
            message: `Server operation failed: ${error.message}`
        });
    }
};

export const systemDeploy = async (req: Request<{}, {}, SystemDeployPayload>, res: Response) => {
    console.log("systemDeploy");
    const requiredFields: [keyof SystemDeployPayload, string][] = [
        ['sn', 'sn is missing'],
        ['cleanDataDisk', 'cleanDataDisk is missing'],
        ['rnTicketId', 'rnTicketId is missing']
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }
    try {
        let description = "System Deploy for SN: " + req.body['sn'] + ", Clean Data Disk: " + req.body['cleanDataDisk'];
        if (req.body['os'] != null && req.body['os'] != '') {
            description += ", OS: " + req.body['os']
        }

        const issueData: IssuePayload = {
            issuetype: "IDC",
            summary: "System Deploy for SN: " + req.body['sn'],
            description: description,
            service: "SERVER",
            snCode: req.body['sn'],
            serverSn: req.body['sn'],
            maintenanceOperation: "System deploy",
            operationPermissions: "OFFLINE_WITH_REINSTALL",
            priority: 'P1',
            cleanDataDisk: req.body['cleanDataDisk'],
            os: req.body['os'],
            rnTicketId: req.body['rnTicketId'],
            dueAt: new Date().getTime(),
            idcSubType: "SYSTEM_DEPLOY"
        }

        const ret = await addIssue((req as any).user, issueData);

        if (ret) {
            const idcRequestPermissionPayload: IDCRequestPermissionPayload = {
                issue_id: ret.data.id,
                rn_event_id: req.body['rnTicketId'] ? req.body['rnTicketId'] : "",
                operation_permissions: "OFFLINE_WITH_REINSTALL",
                operation_steps: description,
                request_at: (new Date()).toISOString(),
                permission_at: (new Date()).toISOString(),
                need_auth: true
            };
            const data = await createRequestPermission(idcRequestPermissionPayload);

            await sendFeishuNewIDCMessage(ret.data.id, "System Deploy for SN: " + req.body['sn'], description);
        }

        return res.send({
            success: true,
            data: { id: ret?.data.id }
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};

export const updateRnIssueState = async (req: Request<{ rnIssueId: string }, {}, { newState: string }>, res: Response) => {
    const { rnIssueId } = req.params;
    const { newState } = req.query;

    console.log(rnIssueId, newState);

    if (!newState) {
        return res.send({ success: false, message: "newState is missing" });
    }

    try {
        const username = process.env.JIRA_USER_RN || "";

        if (newState == "FINISH") {
            const issues = await getIssueList({ username: username }, { rnTicketId: rnIssueId });
            if (issues.list.length > 0) {
                const jira = new JiraClient(username);
                for (const issue of issues.list) {
                    await jira.transitionIssue(issue.id, "PBD-CLOSED");
                }
            }
        }

        return res.send({
            success: true
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};


//授权事件单
export const authorizeIssueInfo = async (req: Request<{ id: string }, {}, { closeComment: string }>, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const data = { "authorized": true, "authorizedAt": (new Date()).getTime() / 1000 };
        const ret = await authorizeIssue((req as any).user, id, data);

        const requestPermissions = await getPendingRnRequestPermissionByIDCIssueId(id);
        for (const requestPermission of requestPermissions) {
            if (requestPermission.rn_event_id != null && requestPermission.rn_event_id != "") {
                await updateRnRequestPermissionTime(requestPermission.rn_event_id, (new Date()).toISOString());

                setTimeout(async () => {
                    await sendFeishuAuthorizationMessage(requestPermission.issue_id);
                }, 1000);
            }
        }

        setTimeout(async () => {
            await rnReportPDBIDCIssueState(id, "PBD-INPRORESS", "", "", "");
        }, 5000);

        setTimeout(async () => {
            const issue = await getIssueInfo((req as any).user, id);
            if (issue) {
                await sendPermissionRquestAuthorizedMessage(issue, (req as any).user.username, issue.fields.assignee.name);
            }
        }, 200)

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


export const getSignature = async (req: Request, res: Response) => {
    let { timestamp, nonce, appkey, path } = req.headers;
    const clientId = req.headers["client-id"];

    if (!timestamp || !nonce) {
        return res.status(400).json({ message: 'Missing signature parameters' });
    }

    if (!appkey) {
        if (clientId) {
            // 兼容老的 client-id 头
            appkey = clientId;
        } else {
            return res.status(400).json({ message: 'Missing appkey' });
        }
    }

    const key = appkey as string;
    if (!isValidAppKey(key, appSecrets)) {
        return res.status(403).json({ message: 'Invalid appkey' });
    }

    const secret = appSecrets[key as keyof typeof appSecrets];

    // ✅ 获取正序参数：GET 使用 query，POST 使用 body
    // const params = req.method === 'GET'
    //     ? sortObject(req.query as Record<string, string | number | boolean | ParsedQs>)
    //     : sortObject(req.body || {});
    const rawParams = req.method === 'GET'
        ? req.query
        : req.body || {};
    const parsedParams = parseParamTypes(rawParams);
    const sortedParams = sortObject(parsedParams);

    const paramString = JSON.stringify(sortedParams);
    const dataToSign = `timestamp=${timestamp}&nonce=${nonce}&key=${key}&path=${path}&queryString=${paramString}`;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

    return res.send({
        success: true,
        message: {
            "dataToSign": dataToSign,
            "expectedSignature:": expectedSignature,
        }
    });
};


//创建报警单
export const createAlarmIssue = async (req: Request<{}, {}, RNIssuePayload>, res: Response) => {
    const requiredFields: [keyof RNIssuePayload, string][] = [
        ['name', 'name is missing'],
        // ['description', 'description is missing'],
        // ['service', 'service is missing'],
        // ['level', 'level is missing']
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }

    let service = req.body['service'];

    if (service != "SERVER" && service != "NETWORK" && service != "RACK" && service != "OTHER") {
        service = "OTHER";
    }

    try {
        const issueData: IssuePayload = {
            issuetype: "Alarm",
            summary: req.body['name'],
            description: req.body['description'],
            service: service,
            priority: req.body['level'],
            alarmId: req.body['alarmId'] != null ? req.body['alarmId'].join(',') : ""
        }

        const alarmIssue = await addIssue((req as any).user, issueData);

        issueData['issuetype'] = 'Issue';
        issueData['relativeIssueId'] = alarmIssue.data.id;

        const issue: any = await addIssue((req as any).user, issueData);
        const newIssue = await getIssueInfo((req as any).user, issue.data.id);
        let desc = newIssue.fields.description;

        // mip
        const alertRes = await getAlertDetail(newIssue.fields.alarmId);
        if (alertRes.code == 1000) {
            const mip = alertRes.data?.dataMetrics?.mip;
            if (mip) {
                desc = `${desc}\nMIP: ${mip}`;
            }
        }

        await sendFeishuNewEventMessage(newIssue.id, newIssue.fields.summary, desc);

        return res.send({
            success: true,
            data: issue.data
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};

//告警恢复
export const alarmRecovery = async (req: Request, res: Response) => {
    const { alarmId } = req.params;

    if (!alarmId && alarmId != "") {
        return res.send({ success: false, message: "alarm id is missing" });
    }

    try {
        const issueList = await getIssueListByAlarmId(alarmId as string);

        if (issueList.total > 0) {
            for (const issue of issueList.issues) {
                if (issue.fields.status.name == 'PBD-CANCELED') {
                    continue;
                }

                const data: any = {
                    "status": "PBD-CANCELED",
                    "comment": "Alarm recovery"
                };

                const ret = await updateIssue((req as any).user, issue.id, data);

                const assigneeName = issue.fields.assignee ? issue.fields.assignee.name : "";
                if (assigneeName != '') {
                    await sendAlarmAutoRecoveryMessage(issue, assigneeName)
                }
            }
        }

        return res.send({
            success: true,
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//取消IDC单
export const cancelIdcIssue = async (req: Request<{ id: string }, {}, { comment: string }>, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const data: any = { "status": "PBD-CANCELED" };
        let finalComment = "Cancel the ticket";
        if (comment != null) {
            finalComment += ": " + comment;
        }
        data["comment"] = finalComment;
        const ret = await updateIssue((req as any).user, id, data, false);
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

export const reopenIdcIssue = async (req: Request<{ id: string }, {}, { comment: string }>, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const data: any = { "status": "PBD-INPRORESS" };
        let finalComment = "Reopen the ticket";
        if (comment != null) {
            finalComment += ": " + comment;
        }
        data["comment"] = finalComment;
        const ret = await updateIssue((req as any).user, id, data, false);

        await sendFeishuReopenMessage(id);

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

export const confirmResolveIdcIssue = async (req: Request<{ id: string }, {}, { comment: string }>, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const data: any = { "status": "PBD-CLOSED" };
        let finalComment = "Close the ticket";
        if (comment != null) {
            finalComment += ": " + comment;
        }
        data["comment"] = finalComment;
        const ret = await updateIssue((req as any).user, id, data, false);

        await sendFeishuConfirmResolvedMessage(id);

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

export const deviceReplace = async (req: Request<{}, {}, DeviceReplacePayload>, res: Response) => {
    const requiredFields: [keyof DeviceReplacePayload, string][] = [
        ['sn', 'sn is missing']
    ];

    for (const [field, message] of requiredFields) {
        if (!req.body[field]) {
            return res.send({ success: false, message });
        }
    }
    try {
        const operations = "Replace device with SN: " + req.body['sn'];
        const issueData: IssuePayload = {
            issuetype: "IDC",
            service: "SERVER",
            snCode: req.body['sn'],
            serverSn: req.body['sn'],
            maintenanceOperation: operations,
            operationPermissions: "REPLACE",
            priority: 'P1',
            rnTicketId: req.body['rnTicketId'],
            dueAt: new Date().getTime(),
            idcSubType: "REPLACE"
        }

        const ret = await addIssue((req as any).user, issueData);

        if (ret) {
            const idcRequestPermissionPayload: IDCRequestPermissionPayload = {
                issue_id: ret.data.id,
                rn_event_id: req.body['rnTicketId'] ? req.body['rnTicketId'] : "",
                operation_permissions: "REPLACE",
                operation_steps: operations,
                request_at: (new Date()).toISOString(),
                permission_at: (new Date()).toISOString(),
                need_auth: true
            };
            const data = await createRequestPermission(idcRequestPermissionPayload);
        }
        return res.send({
            success: true,
            data: { id: ret?.data.id }
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }
};

//创建故障单
export const createFaultIssue = async (req: Request<{}, {}, RNFaultIssuePayload>, res: Response) => {

    console.log('[createFaultIssue] req.body:', JSON.stringify(req.body, null, 2));

    const requiredFields: [keyof RNFaultIssuePayload, string][] = [
        ['ticketId', 'ticketId is missing'],
        ['name', 'name is missing'],
        ['description', 'description is missing'],
        ['serverSn', 'serverSn is missing'],
        ['eventType', 'eventType is missing'],
        ['level', 'level is missing'],
        ['maintenanceOperations', 'maintenanceOperations is missing'],
        ['hasDown', 'hasDown is missing'],
        ['faultType', 'faultType is missing'],
    ];

    const isEmpty = (v: any) =>
        v === undefined || v === null || v === '';

    for (const [field, message] of requiredFields) {
        if (isEmpty(req.body[field])) {
            return res.send({ success: false, message });
        }
    }

    try {
        const serverSn = req.body['serverSn'] != null ? req.body['serverSn'].join(',') : "";
        const attachments = req.body.attachments ?? [];
        const attachmentText = attachments
            .map(att => {
                let line = `OSS Url: ${att.ossUrl};`;
                if (att.zipPassword) {
                    line += `OSS Password: ${att.zipPassword};`;
                }
                return line;
            })
            .join('\n');

        const description = [
            `${req.body.description};`,
            `SN: ${serverSn};`,
            `Fault Type: ${req.body.faultType};`,
            `Is The Server Down: ${req.body.hasDown ? 'Yes' : 'No'};`,
            `maintenanceOperations: ${req.body.maintenanceOperations};`,
            attachmentText,
            `RN Fault Ticket ID: ${req.body.ticketId};`,
        ].filter(Boolean).join('\n');

        const issueData: IssuePayload = {
            issuetype: "Issue",
            rn_fault_id: req.body['ticketId'],
            summary: req.body['name'],
            serverSn: serverSn,
            description: description,
            priority: req.body['level'],
            service: req.body['eventType'],
            maintenanceOperation: req.body['maintenanceOperations'],
            isDown: req.body['hasDown'],
            faultType: req.body['faultType'],
        }

        const ret = await addIssue((req as any).user, issueData);
        if (ret) {
            const newIssue = await getIssueInfo((req as any).user, ret.data.id);
            await sendFeishuNewRNFaultEventMessage(newIssue.id, newIssue.fields.summary, newIssue.fields.description);
        }

        return res.send({
            success: true,
            data: { id: ret?.data.id }
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};

//添加故障单附件
export const addFaultIssueAttachments = async (req: Request<{ id: string }, {}, { attachments: AttachmentVO[] }>, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.send({ success: false, message: 'id is missing' });
    }

    try {
        const existedIssueList = await getIssueListByRnFaultId(id);
        if (!existedIssueList || existedIssueList.total <= 0) {
            return res.send({ success: false, message: 'No issue found' });
        }

        const issue = existedIssueList.issues[0];
        const issueData = await getIssueInfo((req as any).user, issue.id);

        if (issueData) {
            let description: string = issueData.fields?.description;

            const attachments = req.body.attachments ?? [];
            const attachmentText = attachments
                .map(att => {
                    let line = `OSS Url: ${att.ossUrl};`;
                    if (att.zipPassword) {
                        line += `OSS Password: ${att.zipPassword};`;
                    }
                    return line;
                })
                .join('\n');

            description += "\n" + attachmentText;

            const updateData: IssueUpdatePayload = {
                description: description,
                comment: "Update attachments"
            };

            await updateIssue((req as any).user,
                issueData.id,
                updateData,
                false);
        }

        return res.send({
            success: true,
            data: { id: issueData.id }
        });
    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }

};
