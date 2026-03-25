import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import {checkDownTimeForHistoryData, getIssueInfo, recordDownTime, updateIssue} from "../src/services/issueService";
import {IssueTypeEnum} from "../src/enums/issueEnum";
import { JiraClient } from '../src/utils/jira/JiraClient';
import {IssueCustomfield} from "../src/enums/issueEnum";

(Object.keys(IssueCustomfield) as Array<keyof typeof IssueCustomfield>).forEach(key => {
    const envValue = process.env[`jira_${key}`];
    if (envValue) {
        (IssueCustomfield as any)[key] = envValue;
    }
});


// 严格按你的要求定义类型
interface GpuDownRecord {
  ticketId: string;                    // IDC单号
  serverSn: string;                    // 原始字符串，多个SN用逗号隔开，带不带引号都原样保留
  isGpuDown: '1' | '0';                // 必须是字符串 "1" 或 "0"
}

async function parseImportCsv(filePath: string): Promise<GpuDownRecord[]> {
  const results: GpuDownRecord[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        csv({
          headers: ['ticketId', 'serverSn', 'isGpuDown'], // 直接用英文key
          skipLines: 1,         // 跳过第一行中文表头
          bom: true,            // 处理文件开头的 ﻿BOM
          trim: true,           // 去掉字段前后空格
          strict: true,         // 多一列少一列直接报错，防止数据错位
        })
      )
      .on('data', (row: any) => {
        const record: GpuDownRecord = {
          ticketId: String(row.ticketId).trim(),
          serverSn: String(row.serverSn), // 完全原样保留（即使里面有逗号和引号）
          isGpuDown: row.isGpuDown === '1' || row.isGpuDown === 1 ? '1' : '0', // 强制转成 '1' | '0'
        };

        results.push(record);
      })
      .on('end', () => {
        console.log(`CSV 解析完成，共 ${results.length} 条记录`);
        resolve(results);
      })
      .on('error', (err) => {
        console.error('解析 CSV 出错:', err);
        reject(err);
      });
  });
}

// ==================== 使用示例 ====================
async function main() {
  const csvPath = path.join(__dirname, './import.csv');

  try {
    const data = await parseImportCsv(csvPath);
    console.log(data);

    for(const issue of data) {
      console.log(issue.ticketId);
        const idcIssue = await getIssueInfo({"username":"admin"}, issue.ticketId);
        if(idcIssue.fields.issuetype.id != IssueTypeEnum.IDC){
            console.log("issuetype is not idc");
            continue;
        }

        const jira = new JiraClient("admin");
        await jira.updateIssue(issue.ticketId, {
            postmortem_is_gpu_down: issue.isGpuDown,
            postmortem_server_sn: issue.serverSn
        });

        await checkDownTimeForHistoryData(issue.ticketId, true);
        await recordDownTime(issue.ticketId);
    }
  } catch (error) {
    console.error('读取失败:', error);
  }
}

main();
