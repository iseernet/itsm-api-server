import dotenv from 'dotenv';
import {rnGenerateSignature, rnGetFaultType, rnReportPDBIDCIssueState, sortJsonKeys} from "../src/utils/rn/RNClient";
import XhsHwrisSignature from "../src/utils/rn/xhs-hwris-signature";
dotenv.config({});
import {getOpenIdBySdk, sendFeishuMessage} from "../src/utils/feishu/feishuSendMessage";
import {sendIssueAssignMessage} from "../src/utils/feishu/feishuPBDMessage";
import {getIssueInfo} from "../src/services/issueService";
import {JiraClient} from "../src/utils/jira/JiraClient";
import {sendFeishuNewEventMessage, sendFeishuNewIDCMessage} from "../src/utils/feishu/feishu-util";

async function sendMessage(){
    // await getOpenIdBySdk("13716380122");
    // await sendFeishuMessage("test","13716380122");

    const jira = new JiraClient('admin');
    const oldIssue = await getIssueInfo({"username":"admin"}, "11961");
    console.log(oldIssue);
    await sendIssueAssignMessage(oldIssue, "Johanna");
}

async function sendEventMessage(id:any){
    const issue = await getIssueInfo({"username":"admin"}, id);
    //console.log(issue);
    await sendFeishuNewIDCMessage(issue.id, issue.fields.summary, issue.fields.description);
}

sendEventMessage("10355");
