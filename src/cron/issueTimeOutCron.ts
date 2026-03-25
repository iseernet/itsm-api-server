import { JiraClient } from "../utils/jira/JiraClient";
import { SlaRuleService } from '../services/slaRuleService';
import {
    createIssueTimeOutPushRecord, createIssueTimeOutPushRecordBatch,
    getOneIssueTimeOutPushRecord,
    getPushRecordsByIssueIds
} from '../services/issueTimeOutPushRecordService';
import {IssueCustomfield} from "../enums/issueEnum";
import {Priority} from "../types/priority";
import {sendFeishuIDCTimeoutMessage} from "../utils/feishu/feishu-util";

async function queryIssueList() {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 🆕 获取所有优先级的完整信息
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        const conditions: string[] = [];
        conditions.push(`issuetype = "idc"`);
        const statusArr = ['10018', '10019'];
        const statusList = statusArr.map(s => `"${s}"`).join(', ');
        conditions.push(`status IN (${statusList})`);
        let jql = conditions.join(' AND ');

        const allIssues = [];
        let startAt = 0;
        const maxResults = 100;
        let hasNext = true;

        while (hasNext) {
            const { total, issues } = await jira.searchIssuesList(jql, startAt, maxResults);

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

        return list



    } catch (error: any) {
        console.error('查询 Issue 失败:', error.message);
        throw new Error(error.message);
    }
}

function resolveTimeToMs(resolveTime: number, unit: string): number {
    switch (unit.toLowerCase()) {
        case "m":
            return resolveTime * 60 * 1000;
        case "h":
            return resolveTime * 3600 * 1000;
        case "d":
            return resolveTime * 86400 * 1000;
        default:
            return 0;
    }
}

function getDiffTimeMs(created: string): number {
    const createdTime = new Date(created).getTime();
    const now = Date.now();
    return now - createdTime;
}

async function hasPushed(issueId: string, percent: number): Promise<boolean> {
    const record = await getOneIssueTimeOutPushRecord(issueId, percent);
    return !!record;
}

async function recordPush(issueId: string, percent: number) {
    await createIssueTimeOutPushRecord({issue_id:issueId, threshold_percent:percent});
}

export async function issueTimeOutPush() {
    try {
        const issueList = await queryIssueList();
        console.log(`[IDC-Timeout-Push] find ${issueList.length} IDC Tickets`);

        if(issueList.length === 0){
            return;
        }

        const issueIds = issueList.map(i => i.id);
        const existingRecords = await getPushRecordsByIssueIds(issueIds);
        const pushedSet = new Set(
            existingRecords.map(r => `${r.issue_id}_${r.threshold_percent}`)
        );

        const slaRules = await SlaRuleService.getOpenSlaRules();
        const ruleMap = new Map<string, any>();
        slaRules.forEach((rule) => {
            ruleMap.set(rule.level_id, rule);
        });

        const newPushRecords: any[] = [];

        for (const issue of issueList) {
            const issueId = issue.id;
            const fields = issue.fields;
            const level = fields.priority?.name

            const rule = ruleMap.get(level);
            if (!rule) {
                console.warn(`[IDC-Timeout-Push] ${issueId} no match SLA Rule (level=${level})`);
                continue;
            }

            const resolveMs = resolveTimeToMs(rule.resolve_time, rule.resolve_time_unit);
            if (resolveMs <= 0) continue;

            const diffTimeMs = getDiffTimeMs(issue.fields.created);
            const progress = (diffTimeMs / resolveMs) * 100;

            const key70 = `${issueId}_70`;
            const key100 = `${issueId}_100`;

            // 已超过 100%，检查是否发过 100% 提醒
            if (progress >= 100) {
                if (pushedSet.has(key100)) {
                    continue; // 已发过 100%，不再发
                }

                // await sendFeishuIDCTimeoutMessage(issue);
                // await recordPush(issueId, 100);
                newPushRecords.push({ issue_id: issueId, threshold_percent: 100 });
                console.log(`[IDC-Timeout-Push] ${issueId} 已推送 100% 超时提醒`);
                continue;
            }

            // 70% ~ 100% 区间，检查是否发过 70%
            if (progress >= 70) {
                if (pushedSet.has(key70)) {
                    continue; // 已发过 70%，不再发
                }


                // await sendFeishuIDCTimeoutMessage(issue);
                // await recordPush(issueId, 70);
                newPushRecords.push({ issue_id: issueId, threshold_percent: 70 });
                console.log(`[IDC-Timeout-Push] ${issueId} 已推送 70% 超时提醒`);
            }
        }

        if(newPushRecords.length > 0){
            await createIssueTimeOutPushRecordBatch(newPushRecords);

        }

        console.log("[IDC-Timeout-Push] cron finished.");
    }catch (err){
        console.error('[IDC-Timeout-Push] execution error:', err);
    }
}