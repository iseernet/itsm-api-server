import dotenv from 'dotenv';
dotenv.config({});

import schedule from 'node-schedule';
import {IssueCustomfield} from '../enums/issueEnum';
import {fullRefresh, refreshRangeDays} from '../cron/slaDayCron';
import {issueTimeOutPush} from "../cron/issueTimeOutCron";
import {refreshAutoRebootIssueStatus} from '../cron/autoIssueCron';

(Object.keys(IssueCustomfield) as Array<keyof typeof IssueCustomfield>).forEach(key => {
    const envValue = process.env[`jira_${key}`];
    if (envValue) {
        (IssueCustomfield as any)[key] = envValue;
    }
});

async function init() {
    const mode = process.argv[2];

    if (mode === "full") {
        console.log('[SLA-Day] full cron started.')
        await fullRefresh()
        console.log('[SLA-Day] full cron finished.')
        return;
    }


    console.log('[Cron] all tasks start...');
    schedule.scheduleJob('*/5 * * * *', async () => {
        console.log("[SLA-Day] cron started (5 min).");
        try {
            await fullRefresh();
        } catch (err) {
            console.error('[SLA-Day] execution error:', err);
        }
    })

    schedule.scheduleJob('*/5 * * * *', async () => {
        console.log("[IDC-Timeout-Push] cron started (5 min).");
        try {
            await issueTimeOutPush();
        } catch (err) {
            console.error('[IDC-Timeout-Push] execution error:', err);
        }
    })

    schedule.scheduleJob('* * * * *', async () => {
        console.log("[IDC-Auto-Status-Checker] cron started (1 min).");
        try {
            await refreshAutoRebootIssueStatus();
        } catch (err) {
            console.error('[IDC-Auto-Status-Checker] execution error:', err);
        }
    })
}

init()
