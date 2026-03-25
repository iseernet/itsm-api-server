import {getUserFeishuPhone} from "../../services/userService";
import {sendMessageWithLink} from "./feishuSendMessage";
import {getIssueLink} from "../../enums/issueEnum";

export async function sendIssueUnassignedTimeoutMessage(issue:any, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Action Required: A new ticket has been created but is unassigned.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Please assign an owner promptly.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: '🔗 '
        },
        {
            tag: 'a',
            text: '[View Ticket]',
            href: getIssueLink(issue.fields.issuetype.id) + issue.id
        }
    ]);


    const feishuPhone = await getUserFeishuPhone(targetUserName);
    if(feishuPhone != null && feishuPhone != ""){
        await sendMessageWithLink('New Unassigned Ticket', content, feishuPhone, undefined);
    }
}

export async function sendIssueResponseApproachingTimeoutMessage(issue:any, assigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Reminder: Ticket is approaching its response deadline.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Time Elapsed: >50%'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Current Assignee: 【' +assigneeName+ '】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Please respond soon to avoid a timeout.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: '🔗 '
        },
        {
            tag: 'a',
            text: '[View Ticket]',
            href: getIssueLink(issue.fields.issuetype.id) + issue.id
        }
    ]);


    const feishuPhone = await getUserFeishuPhone(targetUserName);
    if(feishuPhone != null && feishuPhone != ""){
        await sendMessageWithLink('Ticket Response Approaching Timeout   ', content, feishuPhone, undefined);
    }
}

export async function sendIssueResponseTimeoutMessage(issue:any, assigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'URGENT: Response Timeout'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Time Elapsed: >50%'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Assignee: 【' +assigneeName+ '】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Immediate action is required.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: '🔗 '
        },
        {
            tag: 'a',
            text: '[View Ticket]',
            href: getIssueLink(issue.fields.issuetype.id) + issue.id
        }
    ]);


    const feishuPhone = await getUserFeishuPhone(targetUserName);
    if(feishuPhone != null && feishuPhone != ""){
        await sendMessageWithLink('Ticket Response Timeout', content, feishuPhone, undefined);
    }
}

export async function sendIssueResolutionApproachingTimeoutMessage(issue:any, assigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Reminder: Ticket is approaching its resolution deadline.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Time Elapsed: >70%'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Current Assignee: 【' +assigneeName+ '】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Please prioritize this ticket.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: '🔗 '
        },
        {
            tag: 'a',
            text: '[View Ticket]',
            href: getIssueLink(issue.fields.issuetype.id) + issue.id
        }
    ]);


    const feishuPhone = await getUserFeishuPhone(targetUserName);
    if(feishuPhone != null && feishuPhone != ""){
        await sendMessageWithLink('Ticket Resolution Approaching Timeout', content, feishuPhone, undefined);
    }
}

export async function sendIssueResolutionTimeoutMessage(issue:any, assigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'URGENT: Resolution Timeout'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Time Elapsed: >50%'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Assignee: 【' +assigneeName+ '】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Escalation may occur. Please resolve immediately.'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: '🔗 '
        },
        {
            tag: 'a',
            text: '[View Ticket]',
            href: getIssueLink(issue.fields.issuetype.id) + issue.id
        }
    ]);


    const feishuPhone = await getUserFeishuPhone(targetUserName);
    if(feishuPhone != null && feishuPhone != ""){
        await sendMessageWithLink('Ticket Resolution Timeout', content, feishuPhone, undefined);
    }
}
