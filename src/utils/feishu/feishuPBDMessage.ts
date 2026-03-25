import {getUserFeishuPhone} from "../../services/userService";
import {sendMessageWithLink} from "./feishuSendMessage";
import {getIssueLink} from "../../enums/issueEnum";

export async function sendIssueAssignMessage(issue:any, targetUserName:string): Promise<void> {
    const content = [];
    content.push(
[{
                tag: 'text',
                text: 'You have been assigned a new ticket.'
            }]
    );
    content.push(
 [{
                tag: 'text',
                text: 'Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
            }]
    );
    content.push([{
                tag: 'text',
                text: 'Priority: 【'+issue.fields.priority.name+'】'
            }]
    );
    content.push(
        [{
                tag: 'text',
                text: 'Please check and respond in a timely manner.'
            }]
    );
    content.push([
                {
                    tag: 'text',
                    text: '🔗 '
                },
                {
                    tag: 'a',
                    text: '[View Ticket]',
                    href: getIssueLink(issue.fields.issuetype.id) + issue.id
                }]
    );


    const feishuPhone = await getUserFeishuPhone(targetUserName);
    console.log("feishuPhone:",feishuPhone);
    if(feishuPhone != null && feishuPhone != ""){
        await sendMessageWithLink('New Ticket Assigned', content, feishuPhone, undefined);
    }
}

export async function sendIssueReassignMessage(issue:any, newAssignee:string, reason:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'An Operator has reassigned a ticket.'
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
            text: 'New Assignee: 【'+newAssignee+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Reason: '+reason+'.'
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
        await sendMessageWithLink('Ticket Reassigned by Operator', content, feishuPhone, undefined);
    }
}

export async function sendIssueReopenMessage(issue:any, operatorName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Ticket has been reopened by【'+operatorName+'】.'
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
            text: 'Please review and continue the investigation.'
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
        await sendMessageWithLink('Ticket Reopened by ' + operatorName, content, feishuPhone, undefined);
    }
}


export async function sendIssueAcceptedMessage(issue:any, assigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'You have a new response on your ticket.'
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
            text: 'Assignee: 【'+ assigneeName +'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Check the update and provide feedback if needed.'
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
        await sendMessageWithLink('Response Received', content, feishuPhone, undefined);
    }
}

export async function sendIssueTransferedMessage(issue:any, previousAssigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'A ticket has been transferred to you.'
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
            text: 'Transferred by: 【' +previousAssigneeName+ '】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Please accept and proceed.'
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
        await sendMessageWithLink('Ticket Transferred', content, feishuPhone, undefined);
    }
}

export async function sendIssueFinishedMessage(issue:any, previousAssigneeName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Your ticket has been marked as resolved.'
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
            text: 'Please verify the solution and close the ticket.'
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
        await sendMessageWithLink('Ticket Resolution Proposed', content, feishuPhone, undefined);
    }
}

export async function sendIssueCommentMentionedMessage(issue:any, initiatorName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'You were mentioned in a comment on Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Comment by: 【' +initiatorName+ '】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Please review and respond.'
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
        await sendMessageWithLink('You Were Mentioned in a Comment', content, feishuPhone, undefined);
    }
}

export async function sendIssueNewCommentAddedMessage(issue:any, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'A new comment was added by the initiator on Ticket #【'+issue.id+'】 【'+issue.fields.summary+'】'
        }
    ]);
    content.push([
        {
            tag: 'text',
            text: 'Please check for additional details or questions.'
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
        await sendMessageWithLink('New Comment Added', content, feishuPhone, undefined);
    }
}


export async function sendIssueConfirmResolvedMessage(issue:any, operatorName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Ticket was been confirmed resolved by 【'+operatorName+'】.'
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
        await sendMessageWithLink('Ticket confirmed resolved by ' + operatorName, content, feishuPhone, undefined);
    }
}

export async function sendIssueCanceledMessage(issue:any, reason:string, operatorName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Ticket was canceled by【'+operatorName+'】.'
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
            text: 'Reason: 【'+reason+'】'
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
        await sendMessageWithLink('Ticket canceled by '+operatorName, content, feishuPhone, undefined);
    }
}

export async function sendAlarmAutoRecoveryMessage(issue:any, targetUserName:string): Promise<void> {
    if(targetUserName == null || targetUserName == ""){
        return;
    }

    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'The Alert associated with this ticket has automatic recovered.'
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
            text: 'Please check if this ticket is resolved.'
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
        await sendMessageWithLink('Alert Automatic Recovered', content, feishuPhone, undefined);
    }
}

export async function sendPermissionRquestAuthorizedMessage(issue:any, operatorName:string, targetUserName:string): Promise<void> {
    const content = [];
    content.push([
        {
            tag: 'text',
            text: 'Ticket has granted RN’s Permission'
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
        await sendMessageWithLink('Ticket Permission by' + operatorName, content, feishuPhone, undefined);
    }
}
