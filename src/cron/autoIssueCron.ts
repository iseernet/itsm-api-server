import { JiraClient } from "../utils/jira/JiraClient";
import {IssueCustomfield} from "../enums/issueEnum";
import {Priority} from "../types/priority";
import {getTicketAutoRebootStatus} from "../utils/itsmpower/itsmPower";
import {
    RNReportAutoProcessFailurePayload,
    rnReportAutoProcessFailure,
    rnReportPDBIDCIssueState
} from "../utils/rn/RNClient";

async function queryAutoIssueList() {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 🆕 获取所有优先级的完整信息
        const allPriorities = await jira.getAllPriorities();
        const priorityMap = new Map(allPriorities.map((p: any) => [p.id, p]));

        const conditions: string[] = [];
        conditions.push(`issuetype = "auto"`);
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


export async function refreshAutoRebootIssueStatus() {
    const issueList = await queryAutoIssueList();
    for (const issue of issueList) {
        const res = await getTicketAutoRebootStatus(issue.id);
        if (res) {
            let isError = false;
            let errorReason = '';
            let isFinished = false;
            const data = res.data || {}
            if (res?.code !== 200) {
                isError = true;
                errorReason = data?.reason || `API returned code ${res?.code}`;

                if(errorReason.length >= 128){
                    errorReason = 'AUTO_REBO0T_FAILED';
                }
            }
            const apiStatus = data?.status?.toLowerCase()

            if (apiStatus === 'completed') {
                isFinished = true;
            }
            else if (apiStatus === 'error') {
                isError = true;
                errorReason = data?.reason || 'Unknown error'

                if(errorReason.length >= 128){
                    errorReason = 'AUTO_REBO0T_FAILED';
                }
            }

            if(isFinished){
                const assigneeJira = new JiraClient(process.env.JIRA_AUTOIDC_USERNAME as string);
                const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
                await assigneeJira.transitionIssue(issue.id, 'PBD-RESOLVED');
                //await jira.transitionIssue(issue.id, 'PBD-CLOSED');
                await assigneeJira.addComment(issue.id, 'Automatic Rebooting has completed.');

                await rnReportPDBIDCIssueState(issue.id, 'PBD-RESOLVED', null, null, null);
            }
            else{
                if(isError){
                    const assigneeJira = new JiraClient(process.env.JIRA_AUTOIDC_USERNAME as string);
                    const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
                    await assigneeJira.transitionIssue(issue.id, 'PBD-RESOLVED');
                    await jira.transitionIssue(issue.id, 'PBD-CLOSED');
                    let comment = 'Automatic Rebooting failed.\nFailedReason: '+errorReason;

                    await assigneeJira.addComment(issue.id, comment);

                    //上报用户错误原因
                    const userErrorPayload: RNReportAutoProcessFailurePayload = {
                        rnId: issue.fields.rnTicketId,
                        pbdId: issue.id,
                        serverSn: issue.fields.serverSn,
                        actionType: 'AUTO_REBOOT',
                        recoverTrigger: true,
                        errorCode: 'AUTO_REBOOT_FAILED',
                        errorMessage: errorReason
                    };
                    try {
                        await rnReportAutoProcessFailure(userErrorPayload);
                    } catch (e: any) {
                        console.error('上报自动处理失败原因失败:', e.message);
                    }
                }
            }
        }
    }
}
