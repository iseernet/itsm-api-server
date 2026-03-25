// src/controllers/jiraController.ts
import { Request, Response } from 'express';
// import { createJiraClient } from '../utils/jira/JiraClient';
// import { JiraCreateIssuePayload } from '../types/jira';
import { JiraClient } from '../utils/jira/JiraClient';
import { jiraIssueRepo } from '../db/jiraIssues';
import { JiraIssue } from '../types/jira';
export const list = async (req: Request, res: Response) => {
  // 实现逻辑
  try {
    const { id, name } = req.body;
    let result: any;
    // if (id) {
    //   result = await dbUpdateEtpArticleType(id, name);
    // } else {
    //   result = await dbCreateETPArticleType(name);
    // }
    res.send({
      status: true,
      data: id + "rrrrrrrrrrrr4444rr"
    });
  } catch (error) {
    res.send({
      status: false,
      data: error
    });
  }
};

export const test = async (req: Request, res: Response) => {


  const admin_username = process.env.JIRA_ADMIN_USERNAME;
  const admin_password = process.env.JIRA_ADMIN_PASSWORD;
  // const username = req.body.username;
  // const password = req.body.password;
  if (!admin_username || !admin_password) {
    throw new Error('JIRA_ADMIN_USERNAME or JIRA_ADMIN_PASSWORD is not set in .env');
  }
  const jira = new JiraClient(admin_username, admin_password);
  try {
    // 示例：创建用户并加入组
    // const creatUserRes = await jira.createUser('0000122qq222', '0000221qq222@example.com', '测试用户00002211222qq', '123456');
    // console.log('创建用户成功:', creatUserRes);
    // await jira.addUserToGroup('00001', 'itsm-agents');
    // // 将 用户 添加到项目 指定的角色中 角色中
    // await jira.addUserToRole('ITSD', 'Custom Service Team', '00001')
    //   .then(() => console.log('用户添加成功'))
    //   .catch(err => console.error('添加失败:', err.response?.data || err.message));

    // // 示例：创建任务并分配给该用户
    // await jira.createIssue('ITSD', '测试任务6666666666666', '由 user888 创建指派', '00001');

    //修改问题的状态
    // 获取可用 transition state
    // const res2 = await jira.getTransitions("10004");
    // console.log(res2.data.transitions);
    // const issueTypes = await jira.getProjectIssueTypes("ITSD");
    // console.log("支持的 Issue Types：", issueTypes);

    // const resolutions = await jira.getResolutions();
    // console.log("支持的 Resolutions：", resolutions.data);
    // // // const resolved = await jira.findResolutionByName("已解决");
    // // // 假设 ID 为 31 是 "完成"
    // await jira.transitionIssue("ITSD-9", "5", "");
    // 示例：查询该用户的任务
    // const issues = await jira.getIssuesByAssignee('user88899');
    // console.log('分配给 user88899 的任务:', issues.data.issues);


    // const jql = `key = "ITSD-8"`;

    // const issues = await jira.getIssues(0, 50, jql);
    // console.log('任务:', issues.data.issues);
    // // const client = new JiraClient(admin_username, admin_password);
    // const client = new JiraClient("00001");
    // const base64Token = Buffer.from('00001:123456').toString('base64');

    // // 设置 token 属性
    // // await client.setUserProperty('00001', 'token', base64Token);

    // // 获取 token
    // const res3 = await jira.getUserProperty('rn-dev', 'token');
    // console.log('token value:', res3.data.value);

    // // 获取所有属性 key
    // const keys = await client.getUserPropertyKeys('00001');
    // console.log('属性key:', keys.data.keys);

    // // 删除 token
    // // await client.deleteUserProperty('00001', 'token');
    // // console.log('token 属性删除成功');




    // res.send({
    //   status: true,
    //   data: res2.data.transitions
    // });
  } catch (error: any) {
    console.error("创建任务失败：", error.response?.data || error.message);
    res.send({
      status: false,
      data: "创建任务失败：" + (error.response?.data || error.message)
    });
  }



  // // 实现逻辑
  // try {
  //   // 从环境变量自动创建客户端
  //   const jira = createJiraClient();

  //   // 或者手动指定配置
  //   // const jira = createJiraClient({
  //   //   baseUrl: 'http://192.168.14.4:8080',
  //   //   username: 'admin',
  //   //   password: '123mnb098zxc'
  //   // });

  //   // 测试连接
  //   const user = await jira.getCurrentUser();
  //   console.log(`Connected to Jira as ${user.displayName}`);

  //   // 获取项目列表
  //   const projects = await jira.getProjects();
  //   console.log('Available projects:', projects.map(p => p.name));

  //   // 搜索问题
  //   const searchResults = await jira.searchIssues('project=PROJ AND status=Open', 0, 5);
  //   console.log(`Found ${searchResults.total} issues. First 5:`);
  //   searchResults.issues.forEach(issue => {
  //     console.log(`- ${issue.key}: ${issue.fields.summary}`);
  //   });

  //   // 创建新问题
  //   const newIssuePayload: JiraCreateIssuePayload = {
  //     fields: {
  //       project: { key: 'PROJ' },
  //       summary: 'New issue from API',
  //       description: 'This issue was created using the JiraClient',
  //       issuetype: { name: 'Task' }
  //     }
  //   };
  //   const newIssue = await jira.createIssue(newIssuePayload);
  //   console.log(`Created new issue: ${newIssue.key}`);

  //   // 添加评论
  //   const comment = await jira.addComment(newIssue.key, 'This is a test comment');
  //   console.log(`Added comment at ${comment.created}`);

  //   // 转换问题状态
  //   const transitions = await jira.getTransitions(newIssue.key);
  //   const transitionToDo = transitions.find(t => t.name === 'To Do');
  //   if (transitionToDo) {
  //     await jira.transitionIssue(newIssue.key, transitionToDo.id, 'Moving to To Do');
  //     console.log('Issue transitioned successfully');
  //   }

  // } catch (error) {
  //   console.error('Error:', error instanceof Error ? error.message : error);
  //   process.exit(1);
  // } finally {
  //   // 确保登出
  //   // await jira.logout();
  // }
};

//db调用示例
// import { jiraIssueRepo } from './db/JiraIssueRepository';

// async function demo() {
//   // 插入新 issue
//   await jiraIssueRepo.insert({
//     issue_key: 'ISSUE-123',
//     summary: '示例问题',
//     status: 'Open',
//     assignee: '张三',
//     created_at: new Date().toISOString(),
//     updated_at: new Date().toISOString(),
//   });

//   // 查询所有
//   const all = await jiraIssueRepo.findAll();
//   console.log('全部issue', all);

//   // 根据 issue_key 查找
//   const single = await jiraIssueRepo.findByIssueKey('ISSUE-123');
//   console.log('查询单条', single);

//   // 更新
//   if (single && single.id) {
//     await jiraIssueRepo.update(single.id, { status: 'Closed' });
//   }

//   // 批量插入
//   await jiraIssueRepo.batchInsert([
//     {
//       issue_key: 'ISSUE-124',
//       summary: '批量插入1',
//       status: 'Open',
//       assignee: null,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     },
//     {
//       issue_key: 'ISSUE-125',
//       summary: '批量插入2',
//       status: 'Open',
//       assignee: null,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     },
//   ]);

//   // 事务批量插入
//   await jiraIssueRepo.batchInsertWithTransaction([
//     {
//       issue_key: 'ISSUE-126',
//       summary: '事务批量1',
//       status: 'Open',
//       assignee: null,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     },
//     {
//       issue_key: 'ISSUE-127',
//       summary: '事务批量2',
//       status: 'Open',
//       assignee: null,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     },
//   ]);
// }



export default {
  list,
  test
};