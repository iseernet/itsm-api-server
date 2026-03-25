import dotenv from 'dotenv';
import {
    rnGenerateSignature,
    rnGetFaultType, rnReportAutoProcessFailure,
    RNReportAutoProcessFailurePayload,
    rnReportPDBIDCIssueState,
    sortJsonKeys
} from "../src/utils/rn/RNClient";
import XhsHwrisSignature from "../src/utils/rn/xhs-hwris-signature";
import {serverOperation} from "../src/controllers/openApiController";
import {IssueCustomfield} from "../src/enums/issueEnum";
import {JiraClient} from "../src/utils/jira/JiraClient";
import {Priority} from "../src/types/priority";
dotenv.config({});

(Object.keys(IssueCustomfield) as Array<keyof typeof IssueCustomfield>).forEach(key => {
    const envValue = process.env[`jira_${key}`];
    if (envValue) {
        (IssueCustomfield as any)[key] = envValue;
    }
});

interface Request {
    body: any;
    user?: any;
}

class Response {
    statusCode?: number;
    body?: any;

    status(code: number) {
        this.statusCode = code;
        return this;
    }

    json(data: any) {
        this.body = data;
        return this;
    }

    send(data: any) {
        this.body = data;
        return this;
    }
}

async function testGetParamSign(){
    const httpMethod = "GET";
    const requestUri = "/dcoc-api/openapi/v1/event/13";
    const queryString = "eventId=13";
    const requestBody = "";
    const nonce = "530b99e2efbb44bd9f0b03dea0d56bca";
    const timestamp = "1756371234";

    const xhsHwrisSignature = new XhsHwrisSignature();
    const signature = xhsHwrisSignature.signCalculate(requestBody.toString(), queryString, httpMethod, requestUri, timestamp, nonce);
    console.log(signature);
}

async function testPostSign(){
    const httpMethod = "POST";
    const requestUri = "/dcoc-api/openapi/v1/event";
    const queryString = "";
    const requestBody = {
        "name": "rn test event server 1",
        "description": "rn test event server 1",
        "eventType": "SERVER",
        "level": "P0",
        "maintenanceOperations": [
            "重启服务器"
        ],
        "serverSn": [
            "J80024C6"
        ],
        "networkSn": [],
        "rackId": [],
        "eventId": "10506",
        "operationPermissions": "OFFLINE",
        "refId": '',
        "hasDown": false,
        "faultType": "HARDWARE FAULT",
    };
    const nonce = "96f2fd655cc14e0b8733b0f7ee645ea5";
    const timestamp = "1756879205";

    console.log(JSON.stringify(requestBody));

    const xhsHwrisSignature = new XhsHwrisSignature();
    const signature = xhsHwrisSignature.signCalculate(JSON.stringify(requestBody), queryString, httpMethod, requestUri, timestamp, nonce);
    console.log(signature);
}

async function testGetFaultType(){
    const result = await rnGetFaultType(null);
    console.log(result);
}


async function testUpdateIssueState(){
    const result = await rnReportPDBIDCIssueState("10503", "PBD-INPRORESS");
    console.log(result);
}

async function testTicketAutoReboot(){
    const req = {
        body: {
            sn: 'A956999X6113380',
            bootType: 'AUTO_REBOOT',
            rnTicketId: 'test003',
        },
        user: { username: 'admin' },
    } as Request;

    const res = new Response();
    console.log('正在模拟调用 serverOperation...');
    console.log('输入参数:', req.body);

    await serverOperation(req as any, res as any);

    console.log('\n执行结果：');
    console.log('状态码:', res.statusCode || 200);
    console.log('返回内容:', res.body);
}

async function testReportFailure(){
    //上报用户错误原因
    const userErrorPayload: RNReportAutoProcessFailurePayload = {
        rnId: "DY202603061858044HS8",
        pbdId: "36862",
        serverSn: "A956999X6113364",
        actionType: 'AUTO_REBOOT',
        recoverTrigger: true,
        errorCode: 'AUTO_REBOOT_FAILED',
        errorMessage: "Error"
    };
    try {
        await rnReportAutoProcessFailure(userErrorPayload);
    } catch (e: any) {
        console.error('上报自动处理失败原因失败:', e.message);
    }
}

async function testReportSuccess(){
    //上报用户错误原因
    await rnReportPDBIDCIssueState("36860", 'PBD-RESOLVED', null, null, null);
}

async function testQueryAutoIssueList() {
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

// testQueryAutoIssueList();


testReportFailure();