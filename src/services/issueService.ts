import { jiraApiUrls } from '../config/jiraApiUrls';
import { IssueCustomfield, IssueTypeEnum } from '../enums/issueEnum';
import { AuthUserPayload } from '../middleware/auth';
import { IssueAuthorizePayload, IssuePayload, IssueQueryPayload, IssueUpdatePayload, RelatedIssuesQueryPayload } from '../types/issue';
import { Priority } from '../types/priority';
import { JiraClient } from '../utils/jira/JiraClient';
import {
    rnCreatePbdEvent, rnPbdEventSupplement,
    rnReportPbdEventState,
    rnReportPDBIDCIssueState
} from "../utils/rn/RNClient";
import {
    batchGetRnRequestPermissionByIDCIssueId,
    getRnAuthorizedIssueIds,
    getRnRequestPermissionByIDCIssueId
} from "./rnRequestPermissionService";
import { RNEventPayload, RNPbdEventPayload } from "../types/rnEvent";
import axios from 'axios';
import FormData from "form-data";
import {
    sendIssueAcceptedMessage,
    sendIssueAssignMessage,
    sendIssueCanceledMessage,
    sendIssueConfirmResolvedMessage,
    sendIssueFinishedMessage,
    sendIssueReassignMessage,
    sendIssueReopenMessage,
    sendIssueTransferedMessage
} from "../utils/feishu/feishuPBDMessage";
import { alertRecover, confirmAlert } from "../utils/pbdalert/pbdAlert";
import { IDCRequestPermissionPayload } from "../types/idcIssue";
import { addPostmortemData } from "../controllers/postmortemController";
import {
    createIssueTimeRecord,
    getIssueTimeRecordById,
    getIssueTimeRecordByIssueId,
    updateIssueTimeRecord
} from "./IssueTimeRecordService";
import { IssueTimeRecordPayload } from "../types/issueTimeRecord";
import {
    createDowntimeRecord, deleteDowntimeRecordByIssueTimeRecordId,
    getDowntimeRecordByIssueRecordIdAndServerSn,
    updateDowntimeRecord
} from "./DowntimeRecordService";
import { DowntimeRecordPayload } from "../types/downtimeRecord";
import { DateUtil } from "../utils/dateUtil";
import {TransceiverCleanupLogPayload} from "../types/transceiverCleanupLog";
import {
    createTransceiverCleanupLog,
    getTransceiverCleanupLogByIdcTicketId, hasCleanupInLast30Days,
    updateTransceiverCleanupLog
} from "./transceiverCleanupLogService";

//新增
export const addIssue = async (
    user: AuthUserPayload,
    issue: IssuePayload,
    autoAssign: boolean = true
) => {
    try {
        const jira = new JiraClient(user.username);
        if (!issue.issuetype) {
            issue.issuetype = IssueTypeEnum.Issue;
        } else {
            const value = IssueTypeEnum[issue.issuetype as keyof typeof IssueTypeEnum];
            issue.issuetype = value;
        }

        if (!issue.reporter) {
            issue.reporter = user.username;
        }

        const priority = issue.priority;
        if (priority === 'P0') {
            issue.priority = "1";
        } else if (priority === 'P1') {
            issue.priority = "2";
        } else if (priority === 'P2') {
            issue.priority = "3";
        } else if (priority === 'P3') {
            issue.priority = "4";
        } else if (priority === 'P4') {
            issue.priority = "5";
        }

        const result = await jira.createIssue(process.env.JIRA_PROJECT_KEY as string, issue);
        if (result) {
            if (process.env.RN_API_ENABLED == '1') {
                if (issue.issuetype === IssueTypeEnum.Issue) {
                    const rnPbdEventPayload: RNPbdEventPayload = {
                        id: result.data.id,
                        name: issue.summary || "",
                        description: issue.description || "",
                        eventType: issue.service != null ? issue.service : "OTHER",
                        level: priority || "P4",
                        alarmId: issue.alarmId != null ? [issue.alarmId] : [],
                        relativeIssueId: issue.relativeIssueId != null ? [issue.relativeIssueId] : []
                    };
                    const rnResult: any = await rnCreatePbdEvent(rnPbdEventPayload);
                }
            }
        }

        if (autoAssign) {
            if (issue.issuetype === IssueTypeEnum.Issue || issue.issuetype === IssueTypeEnum.IDC) {
                if (user.username != process.env.JIRA_USER_RN
                    && user.username != process.env.JIRA_USER_ALARM
                ) {
                    const assignee = user.username;
                    const adminJira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
                    await adminJira.assignIssue(result.data.id, assignee);
                    await adminJira.transitionIssue(result.data.id, "PBD-ASSIGNED");
                    await adminJira.addComment(result.data.id, "Assigned the ticket to " + assignee);

                    const msgIssue = await getIssueInfo({ "username": user.username }, result.data.id)
                    await sendIssueAssignMessage(msgIssue, assignee);
                }
                // else{
                //     const assignee = await getOpsUserFromPriority(issue.priority as string);
                //     if (assignee != '') {
                //         const adminJira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
                //         await adminJira.assignIssue(result.data.id, assignee);
                //         await adminJira.transitionIssue(result.data.id, "PBD-ASSIGNED");
                //         await adminJira.addComment(result.data.id, "Assigned the ticket to " + assignee);
                //
                //         const msgIssue = await getIssueInfo({"username": user.username}, result.data.id)
                //         await sendIssueAssignMessage(msgIssue, assignee);
                //     }
                // }
            }
            else if (issue.issuetype === IssueTypeEnum.AutoIDC) {
                const assignee = process.env.JIRA_AUTOIDC_USERNAME as string;
                const adminJira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
                await adminJira.assignIssue(result.data.id, assignee);
                await adminJira.transitionIssue(result.data.id, "PBD-ASSIGNED");
                await adminJira.addComment(result.data.id, "Assigned the ticket to " + assignee);
                const assigneeJira = new JiraClient(process.env.JIRA_AUTOIDC_USERNAME as string);
                await assigneeJira.transitionIssue(result.data.id, "PBD-INPRORESS");
            }
        }

        return result;
    } catch (error: any) {
        console.log("error");
        console.log(error.message);
        throw new Error(error.message);
    }

};

const getOpsUserFromPriority = async (priority: string) => {
    if (priority === '1' || priority === '2') {
        return process.env.JIRA_USER_ONSITE_OPS as string;
    }
    else if (priority === '3' || priority === '4' || priority === '5') {
        return process.env.JIRA_USER_ONCALL_OPS as string;
    }
    else {
        return "";
    }
}

//根据告警ID查询
export const getIssueListByAlarmId = async (
    alarmId: string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        const result1 = await jira.searchIssuesByCustomField('alarmID', alarmId);

        return result1;
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};

//列表
export const getIssueList = async (
    user: AuthUserPayload,
    params: IssueQueryPayload
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 🆕 获取所有优先级的完整信息
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        // 动态构建 JQL
        const conditions: string[] = [];

        if (params.id) conditions.push(`id = ${params.id}`);
        if (params.jiraId) conditions.push(`id = ${params.jiraId}`);
        if (params.key) conditions.push(`key = "${params.key}"`);

        if (params.alarmId) {
            const alarmArr = params.alarmId
                .split(',')
                .map(a => a.trim())
                .filter(a => a);

            if (alarmArr.length > 0) {
                const alarmList = alarmArr.join(',');
                conditions.push(`id IN (${alarmList})`);
            }
        }

        if (params.name) conditions.push(`summary ~ "${params.name}"`);
        if (params.summary) conditions.push(`summary ~ "${params.summary}"`);
        if (params.description) conditions.push(`description ~ "${params.description}"`);

        if (params.status) {
            const statusArr = params.status.split(',');
            if (statusArr.length > 1) {
                const statusList = statusArr.map(s => `"${s}"`).join(', ');
                conditions.push(`status IN (${statusList})`);
            } else if (statusArr.length == 1) {
                conditions.push(`status = "${params.status}"`);
            }
        }

        // isFromPBD 特殊逻辑
        if (params.isFromPBD === 'true') {
            const rnJiraUser = process.env.JIRA_USER_RN as string;
            if (params.issuetype && params.issuetype.toLowerCase() === 'idc') {
                conditions.push(`reporter != "${rnJiraUser}"`);
            } else if (!params.issuetype) {
                conditions.push(`issuetype = "idc"`);
                conditions.push(`reporter != "${rnJiraUser}"`);
            }
        } else {
            if (params.reporter && params.assignee && params.reporter === params.assignee) {
                conditions.push(`(reporter = "${params.reporter}" OR assignee = "${params.assignee}")`);
            } else {
                if (params.reporter) conditions.push(`reporter = "${params.reporter}"`);
                if (params.assignee) conditions.push(`assignee = "${params.assignee}"`);
            }
        }

        if (params.service) conditions.push(`service ~ "${params.service}"`);
        if (params.rnTicketId) conditions.push(`rnTicketId ~ "${params.rnTicketId}"`);
        if (params.priority) conditions.push(`priority = "${params.priority}"`);
        if (params.createdDateStart) {
            conditions.push(`createdDate >= "${params.createdDateStart}"`);
        }
        if (params.createdDateEnd) {
            conditions.push(`createdDate <= "${params.createdDateEnd}"`);
        }
        if (params.impactLevel) conditions.push(`${IssueCustomfield.impactLevel} = "${params.impactLevel}"`);
        if (params.authorizedChangeContent) conditions.push(`${IssueCustomfield.authorizedChangeContent} ~ "${params.authorizedChangeContent}"`);

        if (params.relativeIssueId) {
            const relativeIssueIdArr = params.relativeIssueId
                .split(',')
                .map(a => a.trim())
                .filter(a => a);

            if (relativeIssueIdArr.length > 0) {
                const relativeIssueList = relativeIssueIdArr.join(',');
                conditions.push(`id IN (${relativeIssueList})`);
            }
        }

        if (params.issuetype) conditions.push(`issuetype = "${params.issuetype}"`);
        // if (params.text) {
        //     conditions.push(`text ~ "${params.text}"`);
        // }

        // 模糊搜索字段
        if (params.text) {
            const textValue = params.text; // 已经在 if 里判断过，不会是 undefined
            const keyword = /^\d+$/.test(textValue) ? `*${textValue}*` : textValue;

            const textConditions: string[] = [
                `summary ~ "${keyword}"`,
                `description ~ "${keyword}"`,
                `comment ~ "${keyword}"`,
                `serverSn ~ "${keyword}"`
            ];

            // // 如果 text 是数字，匹配 id
            // if (/^\d+$/.test(textValue)) {
            //     textConditions.push(`id = ${textValue}`);
            // }

            // // 匹配 assignee 或 reporter（用户字段）
            // textConditions.push(`assignee = "${textValue}"`);
            // textConditions.push(`reporter = "${textValue}"`);
            //不要用 id、assignee="3"、reporter="3" 这种无效条件。

            conditions.push(`(${textConditions.join(' OR ')})`);
        }

        if (params.authorizationStatus != null) {
            const authorizedIssues = await getRnAuthorizedIssueIds();
            const authorizedIssueIds = authorizedIssues.map(
                issue => issue.issue_id
            );
            if (params.authorizationStatus == '1') {
                conditions.push(`id in (${authorizedIssueIds.join(',')})`);
            }
            else if (params.authorizationStatus == '0') {
                conditions.push(`id not in (${authorizedIssueIds.join(',')})`);
            }
        }

        if (params.isRnFault === 'true') {
            conditions.push(`rn_fault_id IS NOT EMPTY`);
        }

        if (params.isRnFault === 'false') {
            // 没 rn_fault_id（包括新字段未索引的）
            const rnFaultIssues = await jira.searchIssuesList(
                `rn_fault_id IS NOT EMPTY`,
                0,
                10000
            );

            const rnFaultIds = rnFaultIssues.issues.map((i: any) => i.id);

            if (rnFaultIds.length > 0) {
                conditions.push(`id NOT IN (${rnFaultIds.join(',')})`);
            }
        }

        // 拼接 JQL
        let jql = conditions.join(' AND ');

        // 🆕 排序逻辑（带次级排序 + 兜底逻辑）
        if (params.priority_sort) {
            if (params.priority_sort.toLowerCase() === 'asc') {
                jql += ' ORDER BY priority ASC, created DESC';
            } else if (params.priority_sort.toLowerCase() === 'desc') {
                jql += ' ORDER BY priority DESC, created DESC';
            }
        } else {
            // 默认按创建时间倒序
            jql += ' ORDER BY created DESC';
        }


        const pageIndex = params.pageIndex || 1;
        const pageSize = params.pageSize || 50;
        const startAt = (pageIndex - 1) * pageSize;

        const { total, issues } = await jira.searchIssuesList(jql, startAt, pageSize);

        const list = await Promise.all(
            issues.map(async (issue: any) => {
                const newFields: Record<string, any> = { ...issue.fields };

                for (const key in newFields) {
                    if (key.startsWith('customfield_')) {
                        delete newFields[key];
                    }
                }

                for (const key in IssueCustomfield) {
                    const customfieldKey = IssueCustomfield[key as keyof typeof IssueCustomfield];
                    const value = issue.fields[customfieldKey];
                    const newKey = key;
                    newFields[newKey] = value;
                }

                const priority = newFields.priority as Priority;
                if (priority?.id) {
                    const fullPriority = priorityMap.get(priority.id) as Priority;
                    if (fullPriority) {
                        newFields.priority = {
                            ...priority,
                            statusColor: fullPriority.statusColor,
                            description: fullPriority.description
                        };
                    }
                }
                const latestComment = params.assignee ? await jira.getLatestComment(issue.id).catch(() => null) : null;

                return {
                    ...issue,
                    fields: newFields,
                    latestComment: latestComment
                };
            })
        );

        //return permission status
        const issueIds = [];
        for (const issue of list) {
            if (issue.fields.issuetype.id === IssueTypeEnum.IDC) {
                issueIds.push(issue.id.toString());
            }
        }

        const permissions = await batchGetRnRequestPermissionByIDCIssueId(issueIds);

        for (const issue of list) {
            if (issue.fields.issuetype.id === IssueTypeEnum.IDC) {
                issue.authorizationStatus = "Unsubmitted";
                for (const permission of permissions) {
                    if (parseInt(permission.issue_id) == parseInt(issue.id)) {
                        if (permission.permission_at != null) {
                            issue.authorizationStatus = "Authorized";
                        } else {
                            issue.authorizationStatus = "Under Review";
                        }

                        break;
                    }
                }
            }
        }

        return {
            totalCount: total || 0,
            list
        };
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};

//详情
export const getIssueInfo = async (
    user: AuthUserPayload,
    idOrKey: string
) => {
    try {

        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        // 获取所有优先级
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        // const jira = new JiraClient(user.username);

        const rs = await jira.getIssue(idOrKey);
        const issue = rs.data;

        if (issue.fields) {
            const newFields: Record<string, any> = { ...issue.fields };

            // 删除 customfield_
            for (const key in newFields) {
                if (key.startsWith('customfield_')) delete newFields[key];
            }

            // 添加真实字段名
            for (const key in IssueCustomfield) {
                const customfieldKey = IssueCustomfield[key as keyof typeof IssueCustomfield];
                const value = issue.fields[customfieldKey];
                const newKey = key;
                newFields[newKey] = value;
            }

            // 补充 priority
            const priority = newFields.priority as Priority;
            if (priority?.id) {
                const fullPriority = priorityMap.get(priority.id) as Priority;
                if (fullPriority) {
                    newFields.priority = {
                        ...priority,
                        statusColor: fullPriority.statusColor,
                        description: fullPriority.description
                    };
                }
            }

            // 🆕 处理附件，替换 URL 为你的代理接口
            if (newFields.attachment && Array.isArray(newFields.attachment)) {
                newFields.attachment = newFields.attachment.map((att: any) => ({
                    id: att.id,
                    filename: att.filename,
                    mimeType: att.mimeType,
                    // Jira 真实 URL（调试用，可选）
                    jiraUrl: `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.attachments.getFile(att.id, att.filename)}`,
                    // 这里拼接你的后端代理 URL
                    proxyUrl: `/issue/attachment/${att.id}/${encodeURIComponent(att.filename)}`
                }));
            }

            issue.fields = newFields;
        }

        return issue;
    } catch (error: any) {
        console.log(JSON.stringify(error));
        throw new Error(error.message);
    }
};

//删除
export const delIssueInfo = async (
    user: AuthUserPayload,
    idOrKey: string
) => {
    try {
        const jira = new JiraClient(user.username);
        return await jira.deleteIssue(idOrKey);
    } catch (error: any) {
        throw new Error(error.message);
    }

};


//更新
export const updateIssue = async (
    user: AuthUserPayload,
    idOrKey: string,
    data: IssueUpdatePayload,
    syncToThirdParty: boolean = true
) => {
    const jira = new JiraClient(user.username);

    // 拆出 status(transitionId) 和 comment
    let { status, comment, newSn, ...updateFields } = data;

    const oldIssue = await getIssueInfo(user, idOrKey);
    const issueOldStatus = oldIssue.fields.status.name;
    const issueOldAssignee = oldIssue.fields.assignee ? oldIssue.fields.assignee.name : "";

    // 更新工单字段（除了 status 外）
    const priority = updateFields.priority;
    if (priority === 'P0') {
        updateFields.priority = "1";
    } else if (priority === 'P1') {
        updateFields.priority = "2";
    } else if (priority === 'P2') {
        updateFields.priority = "3";
    } else if (priority === 'P3') {
        updateFields.priority = "4";
    } else if (priority === 'P4') {
        updateFields.priority = "5";
    }

    // 如果有 status（即 transitionId），直接进行状态流转
    if (status) {
        const transitionRes = await jira.transitionIssue(idOrKey, status);
        const newStatus = transitionRes.toStatus;

        switch (newStatus) {
            case 'PBD-INPRORESS':
                {
                    if (oldIssue.fields.order_response_time == null) {
                        await jira.updateIssue(idOrKey, {
                            order_response_time: ((new Date()).getTime() / 1000).toFixed(0)
                        });
                    }
                }
                break;
            case 'PBD-RESOLVED':
                {
                    // if(oldIssue.fields.pbd_finish_time == null){
                    const time = (new Date()).getTime() / 1000;
                    await jira.updateIssue(idOrKey, {
                        pbd_finish_time: time.toFixed(0),
                        pbd_finish_timestamp: time
                    });
                    // }
                }
                break;
            case 'PBD-CLOSED':
                {
                    if (user.username == process.env.JIRA_USER_RN) {
                        if (oldIssue.fields.rn_confirm_resolved_time == null) {
                            const time = (new Date()).getTime() / 1000;
                            await jira.updateIssue(idOrKey, {
                                rn_confirm_resolved_time: time.toFixed(0),
                                confirm_resolved_timestamp: time
                            });
                        }
                    }
                }
                break;
            default:
                break;
        }

        if (newStatus == 'PBD-CANCELED') {
            if (user.username == oldIssue.fields.reporter.name) {
                await sendIssueCanceledMessage(oldIssue, comment || "", user.username, issueOldAssignee);
            }
            if (user.username == process.env.JIRA_ADMIN_USERNAME) {
                await sendIssueCanceledMessage(oldIssue, comment || "", user.username, oldIssue.fields.reporter.name);
            }
        }
        if (newStatus == 'PBD-RESOLVED') {
            await sendIssueFinishedMessage(oldIssue, issueOldAssignee, oldIssue.fields.reporter.name);
        }
        // if(status == 'PBD-CLOSED'){
        //     await sendIssueConfirmResolvedMessage(oldIssue, user.username, issueOldAssignee);
        // }
        if (issueOldStatus == 'PBD-CLOSED' && newStatus == 'PBD-INPRORESS') { //reopen
            await sendIssueReopenMessage(oldIssue, user.username, issueOldAssignee);
        }
        if (issueOldStatus == 'PBD-ASSIGNED' && newStatus == 'PBD-INPRORESS') { //accepted
            await sendIssueAcceptedMessage(oldIssue, issueOldAssignee, oldIssue.fields.reporter.name);
        }
        if (issueOldStatus == 'PBD-RESOLVED' && newStatus == 'PBD-CLOSED') { //confirmed
            await sendIssueConfirmResolvedMessage(oldIssue, user.username, issueOldAssignee);

            if (user.username == process.env.JIRA_ADMIN_USERNAME) {
                await sendIssueConfirmResolvedMessage(oldIssue, user.username, oldIssue.fields.reporter.name);
            }

            await recordDownTime(oldIssue.id);
        }
    }

    if (newSn) {
        if (updateFields) {
            updateFields["newSn"] = newSn;
        }
        else {
            updateFields = {
                "newSn": newSn
            }
        }
    }

    const updateRes = await jira.updateIssue(idOrKey, updateFields);
    if (updateFields.assignee != null && issueOldAssignee != "" && updateFields.assignee != issueOldAssignee) {  //reassign
        if (user.username == process.env.JIRA_ADMIN_USERNAME) {
            await sendIssueReassignMessage(oldIssue, updateFields.assignee, "", issueOldAssignee);
            await sendIssueReassignMessage(oldIssue, updateFields.assignee, "", updateFields.assignee);
        }
        if (user.username == issueOldAssignee) {
            await sendIssueTransferedMessage(oldIssue, issueOldAssignee, updateFields.assignee);
        }
    }

    // 添加评论
    if (comment) {
        await jira.addComment(idOrKey, comment);
    }

    if (status) {
        if (syncToThirdParty && process.env.RN_API_ENABLED == '1') {
            const issue = await getIssueInfo(user, idOrKey);
            if (issue) {
                console.log("sync issue:", issue);
                const issueStatus = issue.fields.status.name;
                if (issue.fields.issuetype.id == IssueTypeEnum.Issue) {
                    await rnReportPbdEventState(issue.id, issueStatus, issue.fields.postmortem_fault_type, issue.fields.postmortem_maintenance_operation);

                    const alertId = issue.fields[IssueCustomfield.alarmId];
                    if (alertId != null && alertId != "") {
                        const alertIds = alertId.split(",").map((id: string) => id.trim()).filter(Boolean);
                        if (issueStatus == 'PBD-INPRORESS') {
                            const acknowledgedBy = issue.fields.assignee.name;
                            await Promise.all(
                                alertIds.map((id: string) => confirmAlert(id, acknowledgedBy, comment))
                            );
                        }
                        if (issueStatus == 'PBD-CLOSED') {
                            await Promise.all(alertIds.map((id: string) => alertRecover(id)));
                        }
                    }
                } else if (issue.fields.issuetype.id == IssueTypeEnum.IDC) {
                    let updateStatus = true;
                    const existedRequest = await getRnRequestPermissionByIDCIssueId(issue.id);
                    if (existedRequest.length > 0) {
                        // const idcRequestPermissionPayload: IDCRequestPermissionPayload = existedRequest[0];
                        // if(!idcRequestPermissionPayload.need_auth && idcRequestPermissionPayload.permission_at == null){
                        //     updateStatus = false;
                        // }
                        updateStatus = true;
                    }
                    else {
                        updateStatus = false;
                    }

                    if (updateStatus && (issueStatus == "PBD-INPRORESS" || issueStatus == "PBD-RESOLVED" || issueStatus == "PBD-CLOSED" || issueStatus == "PBD-CANCELED")) {
                        const finalFaultTypeCode = issue.fields.postmortem_fault_type ? issue.fields.postmortem_fault_type : "";
                        const finalMaintenanceOps = issue.fields.postmortem_maintenance_operation ? issue.fields.postmortem_maintenance_operation : "";
                        const rootCause = issue.fields.root_cause ? issue.fields.root_cause : "";

                        if (issue.fields.reporter.name == process.env.JIRA_USER_RN) {
                            await rnReportPDBIDCIssueState(issue.id, issueStatus, finalFaultTypeCode, finalMaintenanceOps, rootCause);
                        } else {
                            const requestPermissions = await getRnRequestPermissionByIDCIssueId(issue.id);
                            console.log(requestPermissions);
                            if (requestPermissions.length > 0) {
                                console.log("need rnReportPDBIssueState");
                                await rnReportPDBIDCIssueState(issue.id, issueStatus, finalFaultTypeCode, finalMaintenanceOps, rootCause);
                            }
                        }
                    }
                }
            }
        }
    }

    return updateRes.data;
};

//分配工单
export const assigneeIssue = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    assignee: string
) => {
    try {
        const jira = new JiraClient(user.username);
        return await jira.assignIssue(issueIdOrKey, assignee);
    } catch (error: any) {
        throw new Error(error.message);
    }

};

//改变工单状态
export const changeIssueStatus = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    stateId: string,
    stateName: string
) => {
    try {
        const jira = new JiraClient(user.username);
        return await jira.transitionIssue(issueIdOrKey, stateId, stateName);
    } catch (error: any) {
        throw new Error(error.message);
    }

};

export const authorizeIssue = async (
    user: AuthUserPayload,
    idOrKey: string,
    data: IssueAuthorizePayload
) => {
    const jira = new JiraClient(user.username);

    const updateFields = {
        authorized: data.authorized,
        authorizedAt: data.authorizedAt
    };

    const updateRes = await jira.updateIssue(idOrKey, updateFields);

    await jira.addComment(idOrKey, "The ticket has granted RN's Permission");

    return updateRes.data;
};

//增加附件
export const addIssueComment = async (
    user: AuthUserPayload,
    idOrKey: string,
    comment: string
) => {
    const jira = new JiraClient(user.username);
    await jira.addComment(idOrKey, comment);
};

//获取Related工单列表
export const getRelatedIssuesList = async (
    user: AuthUserPayload,
    idOrKey: string,
    params: RelatedIssuesQueryPayload
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 🆕 获取所有优先级
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        // 1️⃣ 如果传了 idOrkey，先查工单详情，取 alarmId 和 relativeIssueId
        if (idOrKey) {
            const issueDetail = await jira.getIssue(idOrKey);

            const alarmIdVal = issueDetail.data.fields[IssueCustomfield.alarmId] || '';
            const relatedIdVal = issueDetail.data.fields[IssueCustomfield.relativeIssueId] || '';

            if (params.issuetype === "alarm") {
                if (alarmIdVal) {
                    params.relativeIssueId = relatedIdVal;
                }
                else {
                    return {
                        totalCount: 0,
                        list: []
                    };
                }
            }

            if (params.issuetype === "issue") {
                if (relatedIdVal) {
                    params.relativeIssueId = relatedIdVal;
                }
            }
        }

        // 2️⃣ 构建 JQL
        const conditions: string[] = [];

        if (params.alarmId) {
            const alarmArr = params.alarmId
                .split(',')
                .map(a => a.trim())
                .filter(a => a);

            if (alarmArr.length > 0) {
                const alarmList = alarmArr.map(a => `${a}`).join(',');
                conditions.push(` id IN (${alarmList})`);
            }
        }

        if (params.relativeIssueId) {
            const relativeArr = params.relativeIssueId
                .split(',')
                .map(a => a.trim())
                .filter(a => a);

            if (relativeArr.length > 0) {
                const relatedList = relativeArr.map(a => `${a}`).join(',');
                conditions.push(` id IN (${relatedList})`);
            }
        }

        if (params.issuetype) conditions.push(`issuetype = "${params.issuetype}"`);

        const jql = conditions.join(' AND ');
        const pageIndex = params.pageIndex || 1;
        const pageSize = params.pageSize || 50;
        const startAt = (pageIndex - 1) * pageSize;

        console.log("getRelatedIssuesList:", jql, pageIndex, pageSize);

        const { total, issues } = await jira.searchIssuesList(jql, startAt, pageSize);

        // 3️⃣ 转换 fields
        const list = issues.map((issue: any) => {
            const newFields: Record<string, any> = { ...issue.fields };

            // 删除所有 customfield_
            for (const key in newFields) {
                if (key.startsWith('customfield_')) {
                    delete newFields[key];
                }
            }

            // 映射真实字段名
            for (const key in IssueCustomfield) {
                const customfieldKey = IssueCustomfield[key as keyof typeof IssueCustomfield];
                const value = issue.fields[customfieldKey];
                const newKey = key;
                newFields[newKey] = value;
            }

            // 补充 priority 的颜色 & 描述
            const priority = newFields.priority as Priority;
            if (priority?.id) {
                const fullPriority = priorityMap.get(priority.id) as Priority;
                if (fullPriority) {
                    newFields.priority = {
                        ...priority,
                        statusColor: fullPriority.statusColor,
                        description: fullPriority.description
                    };
                }
            }

            return {
                ...issue,
                fields: newFields,
            };
        });

        return {
            totalCount: total || 0,
            list
        };
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};


export const getRelatedMyIssuesList = async (
    user: AuthUserPayload,
    idOrKey: string,
    params: RelatedIssuesQueryPayload
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 获取所有优先级信息
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        // 构建 JQL
        const conditions: string[] = [];

        if (idOrKey) {
            if (params.issuetype === "alarm") {
                conditions.push(`${IssueCustomfield.alarmId} ~ ${idOrKey}`);
                conditions.push(`issuetype = "Alarm"`);
            } else if (params.issuetype === "issue" || params.issuetype === "idc") {
                conditions.push(`RelativeIssueId ~ ${idOrKey}`);
                conditions.push(`issuetype = "${params.issuetype}"`);
            }
        }

        if (params.status) {
            const statusArr = params.status.split(',');
            if (statusArr.length > 1) {
                const statusList = statusArr.map(s => `"${s}"`).join(', ');
                conditions.push(`status IN (${statusList})`);
            } else if (statusArr.length == 1) {
                conditions.push(`status = "${params.status}"`);
            }
        }

        const jql = conditions.join(' AND ');
        const pageIndex = params.pageIndex || 1;
        const pageSize = params.pageSize || 50;
        const startAt = (pageIndex - 1) * pageSize;

        // 查询 Jira
        const { total, issues } = await jira.searchIssuesList(jql, startAt, pageSize);

        // 转换 fields
        const list = issues.map((issue: any) => {
            const newFields: Record<string, any> = { ...issue.fields };

            // 删除所有 customfield_ 开头字段
            for (const key in newFields) {
                if (key.startsWith('customfield_')) {
                    delete newFields[key];
                }
            }

            // 映射真实字段名
            for (const key in IssueCustomfield) {
                const customfieldKey = IssueCustomfield[key as keyof typeof IssueCustomfield];
                const value = issue.fields[customfieldKey];
                const newKey = key;
                newFields[newKey] = value;
            }

            // 补充 priority 的颜色 & 描述
            const priority = newFields.priority as Priority;
            if (priority?.id) {
                const fullPriority = priorityMap.get(priority.id) as Priority;
                if (fullPriority) {
                    newFields.priority = {
                        ...priority,
                        statusColor: fullPriority.statusColor,
                        description: fullPriority.description
                    };
                }
            }

            return {
                ...issue,
                fields: newFields,
            };
        });

        return {
            totalCount: total || 0,
            list
        };
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};

//获取工单所有字段
export const getIssueFields = async () => {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    const res = await jira.getFields();
    return res;
}

/**
 * 🆕 查询最近 1000 条：Alarm 类型 + PBD-CANCELED 状态的 issue
 */
export async function getRecentCanceledAlarmIssues(limit: number = 1000) {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    const res = jira.getRecentCanceledAlarmIssues(limit);
    return res;
}

/**
 * 🆕 查询最近 1000 条：Alarm 类型 + PBD-CANCELED 状态的 issue
 */
export async function getAlarmAssignedIssues(limit: number = 1000) {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    const res = jira.getAlarmAssignedIssues(limit);
    return res;
}

/**
 * 🆕 查询最近 1000 Issue 类型 + PBD-CANCELED 状态的 issue
 */
export async function getRecentCanceledIssues(limit: number = 1000) {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    const res = jira.getRecentCanceledIssues(limit);
    return res;
}


export async function searchIssuesByDateRange(startDate: string, endDate: string, limit: number = 1000) {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    const res = jira.getIssuesBtDateRange(startDate, endDate, limit);
    return res;
}


export async function updateProjectIssueStatus(user: any, id: string, status: string) {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

    const existedRequest = await getRnRequestPermissionByIDCIssueId(id);
    if (existedRequest.length > 0) {
        const idcRequestPermissionPayload: IDCRequestPermissionPayload = existedRequest[0];
        if (!idcRequestPermissionPayload.need_auth) { //专项
            await updateIssueStatus(user, id, status);
        }
    }
}

export async function updateIssueStatus(user: any, idOrKey: string, status: string, comment: string = '', syncToThirdParty: boolean = true) {
    const jira = new JiraClient(user.username);

    const oldIssue = await getIssueInfo(user, idOrKey);
    const issueOldStatus = oldIssue.fields.status.name;
    const issueOldAssignee = oldIssue.fields.assignee ? oldIssue.fields.assignee.name : "";

    await jira.transitionIssue(idOrKey, status);

    if (status == 'PBD-CANCELED') {
        if (user.username == oldIssue.fields.reporter.name) {
            await sendIssueCanceledMessage(oldIssue, comment || "", user.username, issueOldAssignee);
        }
        if (user.username == process.env.JIRA_ADMIN_USERNAME) {
            await sendIssueCanceledMessage(oldIssue, comment || "", user.username, oldIssue.fields.reporter.name);
        }
    }
    if (status == 'PBD-RESOLVED') {
        await sendIssueFinishedMessage(oldIssue, issueOldAssignee, oldIssue.fields.reporter.name);
    }
    if (status == 'PBD-CLOSED') {
        await sendIssueConfirmResolvedMessage(oldIssue, user.username, issueOldAssignee);
    }
    if (issueOldStatus == 'PBD-CLOSED' && status == 'PBD-INPRORESS') { //reopen
        await sendIssueReopenMessage(oldIssue, user.username, issueOldAssignee);
    }
    if (issueOldStatus == 'PBD-ASSIGNED' && status == 'PBD-INPRORESS') { //accepted
        await sendIssueAcceptedMessage(oldIssue, issueOldAssignee, oldIssue.fields.reporter.name);
    }
    if (issueOldStatus == 'PBD-RESOLVED' && status == 'PBD-CLOSED') { //confirmed
        await sendIssueConfirmResolvedMessage(oldIssue, user.username, issueOldAssignee);

        if (user.username == process.env.JIRA_ADMIN_USERNAME) {
            await sendIssueConfirmResolvedMessage(oldIssue, user.username, oldIssue.fields.reporter.name);
        }

        await recordDownTime(oldIssue.id);

        // if(oldIssue.fields.transceiver_need_clean === 'true'){
        //     await recordTransceiverCleanupLog(oldIssue.id);
        // }

    }

    if (syncToThirdParty && process.env.RN_API_ENABLED == '1') {
        const updatedIssue = await jira.getIssue(idOrKey);
        if (updatedIssue) {
            const issue = updatedIssue.data;
            const issueStatus = issue.fields.status.name;
            if (issue.fields.issuetype.id == IssueTypeEnum.Issue) {
                await rnReportPbdEventState(issue.id, issueStatus, issue.fields.postmortem_fault_type, issue.fields.postmortem_maintenance_operation);

                const alertId = issue.fields[IssueCustomfield.alarmId];
                if (alertId != null && alertId != "") {
                    const alertIds = alertId.split(",").map((id: string) => id.trim()).filter(Boolean);
                    if (issueStatus == 'PBD-INPRORESS') {
                        const acknowledgedBy = issue.fields.assignee.name;
                        await Promise.all(
                            alertIds.map((id: string) => confirmAlert(id, acknowledgedBy, comment))
                        );
                    }
                    if (issueStatus == 'PBD-CLOSED') {
                        await Promise.all(alertIds.map((id: string) => alertRecover(id)));
                    }
                }
            } else if (issue.fields.issuetype.id == IssueTypeEnum.IDC) {
                let updateStatus = true;
                const existedRequest = await getRnRequestPermissionByIDCIssueId(updatedIssue.data.id);
                if (existedRequest.length > 0) {
                    const idcRequestPermissionPayload: IDCRequestPermissionPayload = existedRequest[0];
                    if (idcRequestPermissionPayload.need_auth && idcRequestPermissionPayload.permission_at == null) {
                        updateStatus = false;
                    }
                }
                else {
                    updateStatus = false;
                }

                if (updateStatus && (issueStatus == "PBD-INPRORESS" || issueStatus == "PBD-RESOLVED" || issueStatus == "PBD-CLOSED" || issueStatus == "PBD-CANCELED")) {
                    const finalFaultTypeCode = issue.fields.postmortem_fault_type ? issue.fields.postmortem_fault_type : "";
                    const finalMaintenanceOps = issue.fields.postmortem_maintenance_operation ? issue.fields.postmortem_maintenance_operation : "";
                    const rootCause = issue.fields.root_cause ? issue.fields.root_cause : "";

                    if (issue.fields.reporter.name == process.env.JIRA_USER_RN) {
                        await rnReportPDBIDCIssueState(issue.id, issueStatus, finalFaultTypeCode, finalMaintenanceOps, rootCause);
                    } else {
                        const requestPermissions = await getRnRequestPermissionByIDCIssueId(issue.id);
                        console.log(requestPermissions);
                        if (requestPermissions.length > 0) {
                            console.log("need rnReportPDBIssueState");
                            await rnReportPDBIDCIssueState(issue.id, issueStatus, finalFaultTypeCode, finalMaintenanceOps, rootCause);
                        }
                    }
                }
            }
        }
    }
}

export const addAttachmentFiles = async (
    user: AuthUserPayload,
    issueIdOrKey: string,
    filePaths: string[],
) => {
    const jira = new JiraClient(user.username);

    return jira.uploadAttachments(issueIdOrKey, filePaths);
};



export const updateIssueManualFault = async (
    user: AuthUserPayload,
    idOrKey: string,
    data: any
) => {
    const jira = new JiraClient(user.username);

    const updateRes = await jira.updateIssue(idOrKey, data);

    // 添加评论
    // if (comment) {
    //     await jira.addComment(idOrKey, comment);
    // }

    if (process.env.RN_API_ENABLED == '1') {
        const issue = await getIssueInfo(user, idOrKey);
        if (issue.fields.fault_start_time != null && issue.fields.fault_end_time != null) {
            const permissionInfos = await getRnRequestPermissionByIDCIssueId(issue.id);
            if (permissionInfos.length > 0) {
                const permission = permissionInfos[0];
                if (permission.permission_at != null) {
                    const rn_event_id = permission.rn_event_id;

                    const startTime = DateUtil.formatAsInstant(issue.fields.fault_start_time);
                    const endTime = DateUtil.formatAsInstant(issue.fields.fault_end_time);
                    await rnPbdEventSupplement(rn_event_id, issue.id, startTime, endTime, "");
                }
            }
        }
    }

    return updateRes.data;
};

export const updateIssuePostmortem = async (
    user: AuthUserPayload,
    idOrKey: string,
    data: any
) => {
    const jira = new JiraClient(user.username);

    const updateRes = await jira.updateIssue(idOrKey, data);

    // 添加评论
    // if (comment) {
    //     await jira.addComment(idOrKey, comment);
    // }

    return updateRes.data;
};

export async function getIssueRecordTimeData(issue_id: any) {
    await checkDownTimeForHistoryData(issue_id, true);

    const issue = await getIssueInfo({ "username": process.env.JIRA_ADMIN_USERNAME as string }, issue_id);

    // console.log("recordDownTime issue:",issue);

    let scenario_type = '';
    let authorization_pass_time = '';
    let authorization_pass_timestamp = 0;
    let authorization_upload_image = '';
    const permissionInfos = await getRnRequestPermissionByIDCIssueId(issue.id);

    if (permissionInfos && permissionInfos.length > 0) {
        const permissionInfo = permissionInfos[0];
        authorization_pass_time = permissionInfo.permission_at as string;
        authorization_pass_timestamp = new Date(permissionInfo.permission_at as string).getTime() / 1000;

        if (permissionInfo.permission_images != null && permissionInfo.permission_images != '') {
            const images = JSON.parse(permissionInfo.permission_images as string);

            const image_urls = [];
            for (const image of images) {
                image_urls.push(image.proxyUrl);
            }

            authorization_upload_image = image_urls.join(',');
        }
        else {
            authorization_upload_image = '';
        }
    }

    if (issue.fields.status.name == 'PBD-CANCELED') {
        scenario_type = 'withdraw';
    }
    else {
        if (issue.fields.fault_start_time != null) {
            scenario_type = 'fill_order';
        }
        else {
            if (permissionInfos && permissionInfos.length > 0) {
                const permissionInfo = permissionInfos[0];
                if (permissionInfo.need_auth) {
                    scenario_type = 'special';
                }
                else {
                    scenario_type = 'non_special';
                }
            }
        }
    }


    let confirm_resolve_time = 0;
    if (issue.fields.rn_confirm_resolved_time) {
        confirm_resolve_time = parseInt(issue.fields.rn_confirm_resolved_time);
    }
    else if (issue.fields.manual_confirm_resolved_time > 0) {
        confirm_resolve_time = parseInt(issue.fields.manual_confirm_resolved_time);
    }

    let fault_start_time = undefined;
    if (issue.fields.fault_start_time) {
        if (issue.fields.fault_start_time.length > 10) {
            fault_start_time = new Date(parseInt(issue.fields.fault_start_time)).toISOString();
        }
        else {
            fault_start_time = new Date(parseInt(issue.fields.fault_start_time) * 1000).toISOString();
        }
    }

    let fault_end_time = undefined;
    if (issue.fields.fault_end_time) {
        if (issue.fields.fault_end_time.length > 10) {
            fault_end_time = new Date(parseInt(issue.fields.fault_end_time)).toISOString();
        }
        else {
            fault_end_time = new Date(parseInt(issue.fields.fault_end_time) * 1000).toISOString();
        }
    }


    // add issue record
    const issueTimeRecord: any = {
        issue_id: issue.fields.relativeIssueId ? issue.fields.relativeIssueId : issue.id,                  //事件单id
        event_id: issue.fields.relativeIssueId ? issue.fields.relativeIssueId : issue.id,                  //事件单id
        ticket_id: issue.id,                  //idc id
        is_gpu_dropped: issue.fields.postmortem_is_gpu_down == "1" ? "yes" : "no",            //GPU掉卡？(yes/no)
        server_sn: issue.fields.postmortem_server_sn,
        is_logs_needed: issue.fields.postmortem_need_log == "1" ? "yes" : "no",            //是否采集log信息? (yes/no)
        scenario_type: scenario_type,              //场景类型(非专项、专项、补单、撤回重提)
        order_response_time: issue.fields.order_response_time ? new Date(parseInt(issue.fields.order_response_time) * 1000).toISOString() : undefined,       //工单响应时间
        authorization_pass_time: authorization_pass_time,   //授权通过时间
        authorization_upload_image: authorization_upload_image,
        collect_log_time: (issue.fields.collect_log_time && issue.fields.collect_log_time != 0) ? new Date(parseInt(issue.fields.collect_log_time) * 1000).toISOString() : undefined,          //收集 Log 时间
        collect_log_upload_image: issue.fields.collect_log_upload_image,
        pbd_finish_time: issue.fields.pbd_finish_time ? new Date(parseInt(issue.fields.pbd_finish_time) * 1000).toISOString() : undefined,           //PBD finish 时间
        rn_confirm_resolved_time: confirm_resolve_time != 0 ? new Date(confirm_resolve_time * 1000).toISOString() : undefined,  //RN Confirm Resolved 时间
        rn_confirm_resolved_upload_image: issue.fields.manual_confirm_resolved_upload_image,
        fault_start_time: fault_start_time,         //故障发生时间
        fault_start_time_upload_image: issue.fields.fault_start_time_upload_image,
        fault_end_time: fault_end_time,            //故障解决时间
        fault_end_time_upload_image: issue.fields.fault_end_time_upload_image,
    }

    let commence_time_point = undefined;
    if (fault_start_time != null && fault_start_time != "" && fault_start_time != undefined) {
        commence_time_point = fault_start_time;
    }
    else if (authorization_pass_time != null && authorization_pass_time != "") {
        if (issue.fields.collect_log_time != null && issue.fields.collect_log_time != 0 && issue.fields.collect_log_time != undefined) {
            if (parseInt(issue.fields.collect_log_time) > authorization_pass_timestamp) {
                commence_time_point = new Date(parseInt(issue.fields.collect_log_time) * 1000).toISOString();
            }
            else {
                commence_time_point = authorization_pass_time;
            }
        }
        else {
            commence_time_point = authorization_pass_time;
        }
    }

    let end_time_point = undefined;
    if (fault_end_time != null && fault_end_time != "" && fault_end_time != undefined) {
        end_time_point = fault_end_time;
    }
    else if (confirm_resolve_time != null && confirm_resolve_time != 0) {
        const pbdFinishTime = parseInt(issue.fields.pbd_finish_time);
        if (confirm_resolve_time - pbdFinishTime > 3600) {
            end_time_point = new Date((pbdFinishTime + 3600) * 1000).toISOString();
        }
        else {
            end_time_point = new Date(confirm_resolve_time * 1000).toISOString();
        }
    }

    issueTimeRecord['commence_time_point'] = commence_time_point;
    issueTimeRecord['end_time_point'] = end_time_point;

    return issueTimeRecord;
}

export async function recordDownTime(idc_id: any, force: boolean = false) {
    console.log("recordDownTime start");
    const idcIssue = await getIssueInfo({ "username": process.env.JIRA_ADMIN_USERNAME as string }, idc_id);
    if (idcIssue.fields.issuetype.id != IssueTypeEnum.IDC) {
        console.log('recordDownTime:Not IDC Issue');
        return;
    }
    if (idcIssue.fields.status.name != 'PBD-CLOSED' && !force) {
        return;
    }

    const issueId = idcIssue.fields.relativeIssueId;
    let createTimestamp = "";
    if (issueId !== null) {
        const issue = await getIssueInfo({ "username": process.env.JIRA_ADMIN_USERNAME as string }, issueId);

        const createTime = issue.fields.created;
        createTimestamp = (new Date(createTime)).toISOString();
    }
    console.log("createTimestamp", createTimestamp);



    let issueRelativeIdcIssues = null;
    if (issueId != null && issueId != undefined && issueId != '') {
        issueRelativeIdcIssues = await getRelatedMyIssuesList(
            { "username": process.env.JIRA_ADMIN_USERNAME as string },
            issueId,
            {
                idOrkey: issueId,
                issuetype: "idc"
            });

        console.log("issueRelativeIdcIssues:", issueRelativeIdcIssues);
    }

    const finalTimeRecord = await getIssueRecordTimeData(idc_id);
    console.log('finalTimeRecord:', finalTimeRecord.authorization_pass_time);

    let minResTimestamp = null;
    if (issueRelativeIdcIssues != null && issueRelativeIdcIssues.totalCount > 1) {
        const ticket_id = [];
        for (const issueRelativeIdcIssue of issueRelativeIdcIssues.list) {
            ticket_id.push(issueRelativeIdcIssue.id);

            const ts = issueRelativeIdcIssue.fields.response_timestamp;
            if (typeof ts === 'number' && !isNaN(ts)) {
                if (minResTimestamp === null || ts < minResTimestamp) {
                    minResTimestamp = ts;
                }
            }

            const timeRecord = await getIssueRecordTimeData(issueRelativeIdcIssue.id);

            if (timeRecord.order_response_time != null && timeRecord.order_response_time != undefined && new Date(timeRecord.order_response_time) < new Date(finalTimeRecord.order_response_time)) {
                finalTimeRecord.order_response_time = timeRecord.order_response_time;
            }

            console.log('timeRecord:', timeRecord.authorization_pass_time);
            if (timeRecord.authorization_pass_time != null && timeRecord.authorization_pass_time != undefined && timeRecord.authorization_pass_time > 0 && new Date(timeRecord.authorization_pass_time) < new Date(finalTimeRecord.authorization_pass_time)) {
                finalTimeRecord.authorization_pass_time = timeRecord.authorization_pass_time;
                finalTimeRecord.authorization_upload_image = timeRecord.authorization_upload_image;
            }

            if (timeRecord.collect_log_time != null && timeRecord.collect_log_time != undefined && timeRecord.collect_log_time > 0 && finalTimeRecord.collect_log_time > 0 && new Date(timeRecord.collect_log_time) < new Date(finalTimeRecord.collect_log_time)) {
                finalTimeRecord.collect_log_time = timeRecord.collect_log_time;
                finalTimeRecord.collect_log_upload_image = timeRecord.collect_log_upload_image;
            }

            if (timeRecord.pbd_finish_time != null && timeRecord.pbd_finish_time != undefined && timeRecord.pbd_finish_time > 0 && new Date(timeRecord.pbd_finish_time) < new Date(finalTimeRecord.pbd_finish_time)) {
                finalTimeRecord.pbd_finish_time = timeRecord.pbd_finish_time;
            }

            if (timeRecord.rn_confirm_resolved_time != null && timeRecord.rn_confirm_resolved_time != undefined && timeRecord.rn_confirm_resolved_time > 0 && new Date(timeRecord.rn_confirm_resolved_time) < new Date(finalTimeRecord.rn_confirm_resolved_time)) {
                finalTimeRecord.rn_confirm_resolved_time = timeRecord.rn_confirm_resolved_time;
                finalTimeRecord.rn_confirm_resolved_upload_image = timeRecord.rn_confirm_resolved_upload_image;
            }

            if (timeRecord.commence_time_point != null && timeRecord.commence_time_point != undefined && timeRecord.commence_time_point > 0 && new Date(timeRecord.commence_time_point) < new Date(finalTimeRecord.commence_time_point)) {
                finalTimeRecord.commence_time_point = timeRecord.commence_time_point;
            }

            if (timeRecord.end_time_point != null && timeRecord.end_time_point != undefined && timeRecord.end_time_point > 0 && new Date(timeRecord.end_time_point) > new Date(finalTimeRecord.end_time_point)) {
                finalTimeRecord.end_time_point = timeRecord.end_time_point;
            }

            if (timeRecord.scenario_type == 'withdraw') {
                finalTimeRecord.scenario_type = timeRecord.scenario_type;
            }
        }

        finalTimeRecord.ticket_id = ticket_id.join(',');
    }

    let issueRecord = await getIssueTimeRecordByIssueId(finalTimeRecord.issue_id);
    if (issueRecord) {
        const data = {
            issue_id: finalTimeRecord.issue_id,
            is_gpu_dropped: finalTimeRecord.is_gpu_dropped,
            server_sn: finalTimeRecord.server_sn,
            is_logs_needed: finalTimeRecord.is_logs_needed,
            scenario_type: finalTimeRecord.scenario_type,
            order_response_time: finalTimeRecord.order_response_time,
            authorization_pass_time: finalTimeRecord.authorization_pass_time,
            authorization_upload_image: finalTimeRecord.authorization_upload_image,
            collect_log_time: finalTimeRecord.collect_log_time,
            collect_log_upload_image: finalTimeRecord.collect_log_upload_image,
            pbd_finish_time: finalTimeRecord.pbd_finish_time,
            rn_confirm_resolved_time: finalTimeRecord.rn_confirm_resolved_time,
            rn_confirm_resolved_upload_image: finalTimeRecord.rn_confirm_resolved_upload_image,
            fault_start_time: finalTimeRecord.fault_start_time,
            fault_start_time_upload_image: finalTimeRecord.fault_start_time_upload_image,
            fault_end_time: finalTimeRecord.fault_end_time,
            fault_end_time_upload_image: finalTimeRecord.fault_end_time_upload_image,
        };
        console.log("update data:", data);
        issueRecord = await updateIssueTimeRecord(issueRecord.id as string, data);
    }
    else {
        issueRecord = await createIssueTimeRecord(finalTimeRecord);
    }

    //add downtime
    if(minResTimestamp === null){
        minResTimestamp = idcIssue.fields.response_timestamp;
    }
    await deleteDowntimeRecordByIssueTimeRecordId(issueRecord.id as string);
    if (issueRecord.server_sn != null && issueRecord.server_sn != '') {
        //remove old data
        const serverSNs = finalTimeRecord.server_sn.split(',');
        console.log(serverSNs);
        for (const serverSN of serverSNs) {
            const serverDownTime: DowntimeRecordPayload = {
                issue_time_record_id: issueRecord.id as string,
                event_id: finalTimeRecord.event_id == finalTimeRecord.ticket_id ? "" : finalTimeRecord.event_id,                  //工单id
                ticket_id: finalTimeRecord.ticket_id,                  //工单id
                server_sn: serverSN,
                order_response_time: issueRecord.order_response_time,       //工单响应时间
                authorization_pass_time: issueRecord.authorization_pass_time,   //授权通过时间
                authorization_upload_image: issueRecord.authorization_upload_image,
                collect_log_time: issueRecord.collect_log_time,           //收集 Log 时间
                collect_log_upload_image: issueRecord.collect_log_upload_image,
                pbd_finish_time: issueRecord.pbd_finish_time,           //PBD finish 时间
                rn_confirm_resolved_time: issueRecord.rn_confirm_resolved_time,  //RN Confirm Resolved 时间
                rn_confirm_resolved_upload_image: issueRecord.rn_confirm_resolved_upload_image,
                fault_start_time: issueRecord.fault_start_time,         //故障发生时间
                fault_start_time_upload_image: issueRecord.fault_start_time_upload_image,
                fault_end_time: issueRecord.fault_end_time,            //故障解决时间
                fault_end_time_upload_image: issueRecord.fault_end_time_upload_image,
                commence_time_point: finalTimeRecord.commence_time_point,
                end_time_point: finalTimeRecord.end_time_point,
                event_create_time: createTimestamp != '' ? createTimestamp : undefined,
                response_timestamp: minResTimestamp != null ? (new Date(minResTimestamp * 1000)).toISOString() : undefined
            }

            await createDowntimeRecord(serverDownTime);
        }
    }
}


function extractConfirmResolvedTimestamp(input: string | Record<string, any>): number | null {
    let obj: any;

    // 1. 支持字符串或对象
    if (typeof input === 'string') {
        try {
            obj = JSON.parse(input);
        } catch (e) {
            console.error('JSON 解析失败');
            return null;
        }
    } else {
        obj = input;
    }

    const text = obj?.confirmResolvedTime;
    if (typeof text !== 'string') return null;

    // 2. 提取时间部分
    const match = text.match(/Confirm Resolved Time[:：]?\s*(.+)/i);
    if (!match) return null;

    let timeStr = match[1].trim(); // "2025-12-26 10:00 UTC+8"

    // 3. 提取并正确解析时区（关键修复！）
    let offsetHours = 8;   // 默认 UTC+8
    let offsetMinutes = 0;

    const tzMatch = timeStr.match(/\bUTC\s*([+-]?\d+(?::\d+)?)\b/i);
    if (tzMatch) {
        const offsetStr = tzMatch[1]; // "+8" 或 "-05:30" 等
        const sign = offsetStr.startsWith('-') ? -1 : 1;
        const cleaned = offsetStr.replace(/[+:]/g, '');
        const [h, m = '0'] = cleaned.split(':').map(Number);
        offsetHours = sign * h;
        offsetMinutes = sign * (m as number);

        // 移除时区部分
        timeStr = timeStr.replace(tzMatch[0], '').trim();
    }

    // 4. 解析日期时间（去掉秒或补上）
    const dateMatch = timeStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (!dateMatch) return null;

    const [_, datePart, timePart] = dateMatch;
    const [hour, minute, second = '0'] = timePart.split(':').map(Number);

    // 5. 创建 Date 对象（本地时间当作 UTC+8 或指定时区）
    const localDate = new Date(Date.UTC(
        Number(datePart.slice(0, 4)),
        Number(datePart.slice(5, 7)) - 1,
        Number(datePart.slice(8, 10)),
        hour,
        minute,
        Number(second)
    ));

    // 6. 减去时区偏移，得到真正的 UTC 时间
    const utcTimestamp = localDate.getTime() - (offsetHours * 60 + offsetMinutes) * 60 * 1000;

    return utcTimestamp;
}


export async function checkDownTimeForHistoryData(issue_id: string, force: boolean = false) {
    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
    const res = await jira.getIssue(issue_id, true, true);
    if (res.data.fields.status.name != 'PBD-CLOSED' && !force) {
        return;
    }

    const histories = res.data.changelog.histories;
    const comments = res.data.fields.comment.comments;
    const attachments = res.data.fields.attachment;
    // console.log(JSON.stringify(comments));

    let needOrderResponseTime: boolean = res.data.fields.order_response_time == null;
    let needPDBFinishTime: boolean = res.data.fields.pbd_finish_time == null;
    let needRnConfirmResolvedTime: boolean = res.data.fields.rn_confirm_resolved_time == null;
    let needManualConfirmResolvedTime: boolean = res.data.fields.manual_confirm_resolved_time == null;

    let order_response_time = 0;
    let pbd_finish_time = 0;
    let rn_confirm_resolved_time = 0;
    let manual_confirm_resolved_time = 0;
    let manual_confirm_resolved_upload_image = '';

    for (const history of histories) {
        for (const item of history.items) {
            if (item.field === 'status') {
                if (needOrderResponseTime) {
                    if (item.fromString === 'PBD-ASSIGNED' && item.toString === 'PBD-INPRORESS') {
                        const timestamp = Math.floor(new Date(history.created).getTime() / 1000);
                        if (order_response_time == 0 || timestamp < order_response_time) {
                            order_response_time = timestamp;
                        }
                    }
                }
                if (needPDBFinishTime) {
                    if (item.fromString === 'PBD-INPRORESS' && item.toString === 'PBD-RESOLVED') {
                        const timestamp = Math.floor(new Date(history.created).getTime() / 1000);
                        if (pbd_finish_time == 0 || timestamp > pbd_finish_time) {
                            pbd_finish_time = timestamp;
                        }
                    }
                }
            }
        }
    }

    if (needRnConfirmResolvedTime) {
        for (const comment of comments) {
            if ((comment.body as string).indexOf('Close the ticket') != -1) {
                const timestamp = Math.floor(new Date(comment.created).getTime() / 1000);
                if (rn_confirm_resolved_time == 0 || timestamp < rn_confirm_resolved_time) {
                    rn_confirm_resolved_time = timestamp;
                }
            }
        }
    }

    if (needManualConfirmResolvedTime) {
        for (const comment of comments) {
            if ((comment.body as string).indexOf('Confirm resolved the ticket.') != -1) {
                // console.log("manual_confirm_resolved_time:", comment);
                // console.log("attachments:", attachments);
                const commentRows = (comment.body as string).split('\n');
                const row = commentRows[0];
                console.log(row);
                const timestamp = extractConfirmResolvedTimestamp(JSON.parse(row));
                console.log(timestamp);

                const attachmentUrls = [];

                for (const attachment of attachments) {
                    if ((comment.body as string).indexOf(attachment.filename) != -1) {
                        attachmentUrls.push(`/issue/comment/attachment/${attachment.id}/${encodeURIComponent(attachment.filename)}`);
                    }
                }

                if (timestamp != null) {
                    if (manual_confirm_resolved_time == 0 || timestamp / 1000 < manual_confirm_resolved_time) {
                        manual_confirm_resolved_time = timestamp / 1000;
                    }
                }

                if (attachmentUrls.length > 0) {
                    manual_confirm_resolved_upload_image = attachmentUrls.join(',');
                }
            }
        }
    }

    const updateData = {
        "order_response_time": order_response_time != 0 ? order_response_time.toFixed(0) : undefined,
        "pbd_finish_time": pbd_finish_time != 0 ? pbd_finish_time.toFixed(0) : undefined,
        "rn_confirm_resolved_time": rn_confirm_resolved_time != 0 ? rn_confirm_resolved_time.toFixed(0) : undefined,
        "manual_confirm_resolved_time": manual_confirm_resolved_time != 0 ? manual_confirm_resolved_time.toFixed(0) : undefined,
        "manual_confirm_resolved_upload_image": manual_confirm_resolved_upload_image != '' ? manual_confirm_resolved_upload_image : undefined
    }

    if (needOrderResponseTime || needPDBFinishTime || needRnConfirmResolvedTime || needManualConfirmResolvedTime) {
        await jira.updateIssue(issue_id, updateData);
    }
}

export const getIssueListForExport = async (
    user: AuthUserPayload,
    params: IssueQueryPayload,
    fields: string[]
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 🆕 获取所有优先级的完整信息
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        // 动态构建 JQL
        const conditions: string[] = [];

        if (params.id) conditions.push(`id = ${params.id}`);
        if (params.jiraId) conditions.push(`id = ${params.jiraId}`);
        if (params.key) conditions.push(`key = "${params.key}"`);

        if (params.alarmId) {
            const alarmArr = params.alarmId
                .split(',')
                .map(a => a.trim())
                .filter(a => a);

            if (alarmArr.length > 0) {
                const alarmList = alarmArr.join(',');
                conditions.push(`id IN (${alarmList})`);
            }
        }

        if (params.name) conditions.push(`summary ~ "${params.name}"`);
        if (params.summary) conditions.push(`summary ~ "${params.summary}"`);
        if (params.description) conditions.push(`description ~ "${params.description}"`);

        if (params.status) {
            const statusArr = params.status.split(',');
            if (statusArr.length > 1) {
                const statusList = statusArr.map(s => `"${s}"`).join(', ');
                conditions.push(`status IN (${statusList})`);
            } else if (statusArr.length == 1) {
                conditions.push(`status = "${params.status}"`);
            }
        }

        // isFromPBD 特殊逻辑
        if (params.isFromPBD === 'true') {
            const rnJiraUser = process.env.JIRA_USER_RN as string;
            if (params.issuetype && params.issuetype.toLowerCase() === 'idc') {
                conditions.push(`reporter != "${rnJiraUser}"`);
            } else if (!params.issuetype) {
                conditions.push(`issuetype = "idc"`);
                conditions.push(`reporter != "${rnJiraUser}"`);
            }
        } else {
            if (params.reporter && params.assignee && params.reporter === params.assignee) {
                conditions.push(`(reporter = "${params.reporter}" OR assignee = "${params.assignee}")`);
            } else {
                if (params.reporter) conditions.push(`reporter = "${params.reporter}"`);
                if (params.assignee) conditions.push(`assignee = "${params.assignee}"`);
            }
        }

        if (params.service) conditions.push(`service ~ "${params.service}"`);
        if (params.rnTicketId) conditions.push(`rnTicketId ~ "${params.rnTicketId}"`);
        if (params.priority) conditions.push(`priority = "${params.priority}"`);
        if (params.createdDateStart) {
            conditions.push(`createdDate >= "${params.createdDateStart}"`);
        }
        if (params.createdDateEnd) {
            conditions.push(`createdDate <= "${params.createdDateEnd}"`);
        }
        if (params.impactLevel) conditions.push(`${IssueCustomfield.impactLevel} = "${params.impactLevel}"`);
        if (params.authorizedChangeContent) conditions.push(`${IssueCustomfield.authorizedChangeContent} ~ "${params.authorizedChangeContent}"`);

        if (params.relativeIssueId) {
            const relativeIssueIdArr = params.relativeIssueId
                .split(',')
                .map(a => a.trim())
                .filter(a => a);

            if (relativeIssueIdArr.length > 0) {
                const relativeIssueList = relativeIssueIdArr.join(',');
                conditions.push(`id IN (${relativeIssueList})`);
            }
        }

        if (params.issuetype) conditions.push(`issuetype = "${params.issuetype}"`);
        // if (params.text) {
        //     conditions.push(`text ~ "${params.text}"`);
        // }

        // 模糊搜索字段
        if (params.text) {
            const textValue = params.text; // 已经在 if 里判断过，不会是 undefined
            const keyword = /^\d+$/.test(textValue) ? `*${textValue}*` : textValue;

            const textConditions: string[] = [
                `summary ~ "${keyword}"`,
                `description ~ "${keyword}"`,
                `comment ~ "${keyword}"`,
                `serverSn ~ "${keyword}"`
            ];

            // // 如果 text 是数字，匹配 id
            // if (/^\d+$/.test(textValue)) {
            //     textConditions.push(`id = ${textValue}`);
            // }

            // // 匹配 assignee 或 reporter（用户字段）
            // textConditions.push(`assignee = "${textValue}"`);
            // textConditions.push(`reporter = "${textValue}"`);
            //不要用 id、assignee="3"、reporter="3" 这种无效条件。

            conditions.push(`(${textConditions.join(' OR ')})`);
        }

        if (params.authorizationStatus != null) {
            const authorizedIssues = await getRnAuthorizedIssueIds();
            const authorizedIssueIds = authorizedIssues.map(
                issue => issue.issue_id
            );
            if (params.authorizationStatus == '1') {
                conditions.push(`id in (${authorizedIssueIds.join(',')})`);
            }
            else if (params.authorizationStatus == '0') {
                conditions.push(`id not in (${authorizedIssueIds.join(',')})`);
            }
        }

        if (params.isRnFault === 'true') {
            conditions.push(`rn_fault_id IS NOT EMPTY`);
        }

        if (params.isRnFault === 'false') {
            // 没 rn_fault_id（包括新字段未索引的）
            const rnFaultIssues = await jira.searchIssuesListForExport(
                `rn_fault_id IS NOT EMPTY`,
                0,
                10000,
                fields
            );

            const rnFaultIds = rnFaultIssues.issues.map((i: any) => i.id);

            if (rnFaultIds.length > 0) {
                conditions.push(`id NOT IN (${rnFaultIds.join(',')})`);
            }
        }

        // 拼接 JQL
        let jql = conditions.join(' AND ');

        // 🆕 排序逻辑（带次级排序 + 兜底逻辑）
        if (params.priority_sort) {
            if (params.priority_sort.toLowerCase() === 'asc') {
                jql += ' ORDER BY priority ASC, created DESC';
            } else if (params.priority_sort.toLowerCase() === 'desc') {
                jql += ' ORDER BY priority DESC, created DESC';
            }
        } else {
            // 默认按创建时间倒序
            jql += ' ORDER BY created DESC';
        }


        const allIssues = [];
        let startAt = 0;
        const maxResults = 100;
        let hasNext = true;

        while (hasNext) {
            const { total, issues } = await jira.searchIssuesListForExport(jql, startAt, maxResults, fields);

            if (issues.length === 0) {
                break;
            }

            allIssues.push(...issues);
            startAt += issues.length;

            hasNext = startAt < total;
        }


        const list = allIssues.map((issue: any) => {
            const newFields: Record<string, any> = { ...issue.fields };

            for (const key in newFields) {
                if (key.startsWith('customfield_')) {
                    delete newFields[key];
                }
            }

            for (const key in IssueCustomfield) {
                const customfieldKey = IssueCustomfield[key as keyof typeof IssueCustomfield];
                const value = issue.fields[customfieldKey];
                const newKey = key;
                newFields[newKey] = value;
            }

            const priority = newFields.priority as Priority;
            if (priority?.id) {
                const fullPriority = priorityMap.get(priority.id) as Priority;
                if (fullPriority) {
                    newFields.priority = {
                        ...priority,
                        statusColor: fullPriority.statusColor,
                        description: fullPriority.description
                    };
                }
            }

            return {
                ...issue,
                fields: newFields,
            };
        });
        return list;
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};

export const getIssueListByRnFaultId = async (
    rn_fault_id: string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        const result1 = await jira.searchIssuesByCustomField('rn_fault_id', rn_fault_id);

        return result1;
    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
};

export async function recordTransceiverCleanupLog(idc_id: any) {
    console.log("recordTransceiverCleanupLog start", { idc_id });
    const idcIssue = await getIssueInfo({ "username": process.env.JIRA_ADMIN_USERNAME as string }, idc_id);
    if (idcIssue.fields.issuetype.id != IssueTypeEnum.IDC) {
        console.log('recordTransceiverCleanupLog:Not IDC Issue');
        return;
    }

    const existCleanupLog = await getTransceiverCleanupLogByIdcTicketId(idc_id);
    if (existCleanupLog) return;

    const serviceType = idcIssue.fields?.service;
    const baseData: TransceiverCleanupLogPayload = {
        service_type: serviceType,
        server_sn: idcIssue.fields?.serverSn,
        operator: idcIssue.fields?.creator?.name,
        cleanup_start_at: idcIssue.fields?.transceiver_cleanup_time,
        result: idcIssue.fields?.transceiver_result,
        note: idcIssue.fields?.transceiver_node,
        idc_ticket_id: idc_id,
        attachment_url: idcIssue.fields?.transceiver_attachments,
    }

    if(serviceType === 'SERVER' || serviceType === 'RACK'){
        if(idcIssue.fields?.serverSn === '' || idcIssue.fields?.serverSn === null) return;

        const serverSnArr = idcIssue.fields?.serverSn.split(',');
        for (const sn of serverSnArr){
            const hasCleanIn30Day = await hasCleanupInLast30Days([sn]);
            if(!hasCleanIn30Day){
                const data = {
                    ...baseData,
                    server_sn: sn,
                    service_type: 'SERVER'
                };
                const newRecord = await createTransceiverCleanupLog(data);
                console.log('recordTransceiverCleanupLog: Success', {
                    id: newRecord.id,
                    idc_ticket: idc_id,
                    server_sn: newRecord.server_sn
                });
            }
        }
    } else if(serviceType === 'NETWORK' || serviceType === 'OTHER'){
        if(idcIssue.fields?.networkSn === '' || idcIssue.fields?.networkSn === null) return;

        let p2pConnection = idcIssue.fields?.transceiver_p2p_connection;
        if(p2pConnection != '' && p2pConnection != null){
            p2pConnection = JSON.parse(p2pConnection);
            for (const item of p2pConnection){
                const itemData = {
                    ...baseData,
                    p2p: JSON.stringify([item]),
                    service_type: 'NETWORK',
                    server_sn:idcIssue.fields?.networkSn
                };
                const newRecord = await createTransceiverCleanupLog(itemData);
                console.log('recordTransceiverCleanupLog: Success', {
                    id: newRecord.id,
                    idc_ticket: idc_id,
                    server_sn: newRecord.server_sn
                });
            }
        }
    }

}
