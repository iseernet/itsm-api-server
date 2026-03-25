import * as process from "node:process";
import {getIssueLink} from "../../enums/issueEnum";
const axios = require('axios');

export async function sendFeishuMessage(content:string, webhookUrl:string, atAll = true) {
    const message = {
        msg_type: 'text',  // 消息类型为文本
        content: {
            text: content,
        },
        at: {
            at_all: atAll
        }
    };

    try {
        const response = await axios.post(webhookUrl, message);
        return response.data;
    } catch (error) {
        return error;
    }
}

export async function sendFeishuMessageWithLink(title:string, content:any, webhookUrl:string, atAll = true) {
    const message = {
        msg_type: 'post',
        content: {
            post: {
                en_us: {
                    title: title,
                    content: content
                }
            }
        },
        at: {
            at_all: atAll
        }
    };

    try {
        const response = await axios.post(webhookUrl, message);
        return response.data;
    } catch (error) {
        return error;
    }
}


export async function sendFeishuNewEventMessage(eventId:any, summary:any, description:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nNew Event Arrived. \nID: " + eventId + "\nSummary: " + summary + " \nDescription: " + description;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuNewIDCMessage(eventId:any, summary:any, description:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nNew IDC Ticket Arrived. \nID: " + eventId + "\nSummary: " + summary + " \nDescription: " + description;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuNewAUTOIDCMessage(eventId:any, summary:any, description:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nNew Auto Reboot IDC Ticket Arrived. \nID: " + eventId + "\nSummary: " + summary + " \nDescription: " + description;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuAuthorizationMessage(eventId:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nIDC Ticket Authorized By RN. \nID: " + eventId;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuConfirmResolvedMessage(eventId:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nIDC Ticket Confirm Resolved By RN. \nID: " + eventId;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuReopenMessage(eventId:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nIDC Ticket Reopened By RN. \nID: " + eventId;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuNewRNFaultEventMessage(eventId:any, summary:any, description:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
        const message = "@所有人 \nNew RN Event Ticket Arrived. \nID: " + eventId + "\nSummary: " + summary + " \nDescription: " + description;
        await sendFeishuMessage(message, robotUrl);
    }
}

export async function sendFeishuIDCTimeoutMessage(issue:any) {
    const robotUrl = process.env.FEISHU_ROBOT_NOTIFICATION;
    if(robotUrl) {
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
                text: 'Assignee: 【' +issue.fields.assignee.name+ '】'
            }
        ]);
        content.push([
            {
                tag: 'text',
                text: 'Please finish it immediately.'
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
        await sendFeishuMessageWithLink("Ticket Resolution Timeout ", content, robotUrl);
    }
}

