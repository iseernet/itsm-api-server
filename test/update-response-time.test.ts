import {
    addIssue,
    getIssueInfo,
    getRecentCanceledAlarmIssues,
    updateIssue,
    getIssueList,
    recordDownTime, checkDownTimeForHistoryData
} from "../src/services/issueService";
import {createIDCIssueFromIssue} from "../src/controllers/issueController";
import {Assignee, IDCIssuePayload, IDCIssueQueryPayload} from "../src/types/idcIssue";
import {IssuePayload} from "../src/types/issue";
import {IssueCustomfield} from "../src/enums/issueEnum";
import process from "process";
import {pool} from '../src/utils/db/db';

(Object.keys(IssueCustomfield) as Array<keyof typeof IssueCustomfield>).forEach(key => {
    const envValue = process.env[`jira_${key}`];
    if (envValue) {
        (IssueCustomfield as any)[key] = envValue;
    }
});


async function testAddIssue(){
    await addIssue({
        "username":"admin"
    }, {
        issuetype:'IDC',
        summary: 'rn test event 3',
        description: 'rn test event 3',
        service: 'SERVER',
        priority: 'P3',
        alarmId: '10399',
        relativeIssueId: '10518',
    });
}

async function testAddIDCIssue(){
    const req = {
        user:{username: 'admin'},
        body: {"name":"123idc","description":"123idc","service":"SERVER","serverSn":["123"],"networkSn":[""],"rackId":[""],"hasDown":false,"faultType":"MOTHER_BOARD_FAULT","eventId":["10305"],"operationSteps":["测试"],"operationPermissions":["OFFLINE"],"dueAt":1758607487692,"operator":"op4","level":"P0","relatedComponents":"{\"SERVER\":[],\"NETWORK\":[]}","networkDevice":"[]"}
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
            faultType: req.body['faultType'],
            networkSn: req.body['networkSn'] != null ? req.body['networkSn'].join(',') : "",
            maintenanceOperation: req.body['operationSteps'] != null && req.body['operationSteps'].length > 0 ? req.body['operationSteps'].join(',') : "",
            operationPermissions: req.body['operationPermissions'] != null && req.body['operationSteps'].length > 0 ? req.body['operationPermissions'].join(',') : "",
            priority: req.body['level'],
            rackID: req.body['rackId'] != null ? req.body['rackId'].join(',') : "",
            dueAt: req.body['dueAt'],
            relatedComponents: req.body['relatedComponents'] != null ? req.body['relatedComponents'] : "",
            idcSubType: "NORMAL",
            newSn: req.body['newSn'] != null ? req.body['newSn'] : "",
            networkDevice: req.body['networkDevice'] != null ? req.body['networkDevice'] : "",
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
    } catch (error: any) {
        console.error(error);
    }
}

async function testAssignIssue(){
    const id = "11961";

    try {
        const ret = await updateIssue({username:"admin"}, id, {"status":"10018","assignee":"Johanna","comment":"{\"operate\":\"assignee\",\"description\":\"123\",\"operationRecord\":\"Assigned the ticket to Johanna\"}"});

        console.log(ret);
    } catch (error: any) {
        console.error(error);
    }
}

async function testGetIssue(id:string){
    const ret = await getIssueInfo({username:"admin"}, id);
    console.log(ret);
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
        status: "Finished",
        assignee: assignee,
        newSn: ret.fields.newSn,
    }

    console.log("query suc:", issueData);
}

async function testQueryIssueList(id:any){
    // const param:any = { pageIndex:"1", pageSize:"10", status:"10018", assignee:"onsite-ops-prod", reporter:"", text:"", priority_sort:"", id:"26018", issuetype:"idc", summary:"端口错包维修", description:"机柜: JPI2-A-4-430-H-H10", service:"NETWORK", level:"P1" }

    const param:any = { pageIndex:"1", pageSize:"10", summary:'饱和告警'};
    const res = await getIssueList({"username":"admin"}, param);
    console.log(JSON.stringify(res));
}

async function testGetIssueInfo(idOrKey:string){
    const ret = await getIssueInfo({"username":"admin"}, idOrKey);
    console.log(JSON.stringify(ret));
}

async function testUpdateIssue(idOrKey:string){
    const ret = await updateIssue({"username":"onsite-ops-dev"}, idOrKey, {"status":"10020", comment:""}, false);
}

async function testRecord(idOrKey:string){
    // await checkDownTimeForHistoryData(idOrKey, true);
    await recordDownTime(idOrKey);
}

async function testRecordHistory(idOrKey:string){
    await recordDownTime(idOrKey);
}

async function testGetIssueList(){
    const res = await getIssueList(
        {"username":"admin"},
        {
            "issuetype":"idc",
            "status":"10019",
            "authorizationStatus":"1"
        });
    console.log(JSON.stringify(res));
}

async function updateDowntimeEventResponseTime(){
    const minTimeSql = `
        SELECT
          issue_id,
          request_at 
        FROM
          idc_request_permission 
        WHERE
          request_at IS NOT NULL
      `;
    const { rows } = await pool.query(minTimeSql);

    const requestAtMap = new Map();
    for (const row of rows) {
        const issueId = row.issue_id as string;
        requestAtMap.set(issueId, row.request_at);
    }

    const recordsSql = `
        SELECT id, ticket_id, response_timestamp
        FROM down_time_record
        WHERE ticket_id IS NOT NULL AND ticket_id != '' AND response_timestamp IS NULL
      `;

    const { rows: records } = await pool.query(recordsSql);
    for (const record of records) {
        const ticketIds = record.ticket_id
            .split(',')
            .map((id: any) => String(id).trim())
            .filter((id: string) => id !== '');

        if (ticketIds.length === 0) continue;

        let minRequestAt = null;

        for (const tid of ticketIds) {
            const time = requestAtMap.get(tid);
            if (time) {
                if (!minRequestAt || time < minRequestAt) {
                    minRequestAt = time;
                }
            }
        }

        if (!minRequestAt) continue;

        //数据库时区问题，强制 +8小时
        const utcDate = new Date(minRequestAt);
        utcDate.setHours(utcDate.getHours() + 8);
        const localStr = utcDate.toISOString().replace('Z', '').replace('T', ' ');

        // 如果原本就有值且相同，跳过
        if (record.response_timestamp === localStr) {
            continue;
        }

        const updateSql = `
          UPDATE down_time_record
          SET response_timestamp = $1
          WHERE id = $2
        `;

        try {
            await pool.query(updateSql, [localStr, record.id]);
            console.log(`Updated downtime: ${record.ticket_id} → ${localStr}`);
        } catch (err) {
            console.error(`Update failed for ${record.ticket_id}:`, err);
        }

        //更新 jira response_timestamp字段
        for (const issueId of ticketIds) {
            if (!requestAtMap.has(issueId)) {
                continue;
            }

            try {
                 const issue = await getIssueInfo(
                    { username: process.env.JIRA_ADMIN_USERNAME as string },
                    issueId
                );

                if (!issue) continue;

                const request_at = requestAtMap.get(issueId);
                const response_timestamp = Math.round(new Date(request_at).getTime()/1000);

                await updateIssue(
                    { username: process.env.JIRA_ADMIN_USERNAME as string },
                    issueId,
                    {
                        comment: "",
                        response_timestamp: response_timestamp
                    },
                    false
                );
                console.log(`Jira updated: ${issueId} → response_timestamp = ${response_timestamp}`);


            } catch (err: any) {
                if (err?.response?.status === 404) {
                }else {
                    console.error(`Jira failed for ${issueId}:`, err.message || err);
                }

            }
        }

    }
    console.log('All downtime records have been updated.');
}

updateDowntimeEventResponseTime();
