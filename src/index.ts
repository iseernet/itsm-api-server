// import dotenv from 'dotenv';
// dotenv.config();

// import { JiraClient } from './utils/jira/JiraClient';

// async function main() {
//     const jira = new JiraClient();

//     // 示例：创建用户并加入组
//     await jira.createUser('user123', 'user123@example.com', '测试用户123', 'StrongPass123');
//     await jira.addUserToGroup('user123', 'jira-users');

//     // 示例：创建任务并分配给该用户
//     await jira.createIssue('DEMO', '测试任务', '由 admin 创建，模拟指派', 'user123');

//     // 示例：查询该用户的任务
//     const issues = await jira.getIssuesByAssignee('user123');
//     console.log('分配给 user123 的任务:', issues.data.issues);
// }

// main().catch(console.error);

// import { JiraClient } from './utils/jira/JiraClient';
// // import { JiraCreateIssuePayload } from './types/jira';

// // async function main() {
// //     try {
// //         // 从环境变量自动创建客户端
// //         const jira = createJiraClient();

// //         // 或者手动指定配置
// //         // const jira = createJiraClient({
// //         //   baseUrl: 'https://your-jira-instance.com',
// //         //   username: 'your_username',
// //         //   password: 'your_password'
// //         // });

// //         // 测试连接
// //         const user = await jira.getCurrentUser();
// //         console.log(`Connected to Jira as ${user.displayName}`);

// //         // 获取项目列表
// //         const projects = await jira.getProjects();
// //         console.log('Available projects:', projects.map(p => p.name));

// //         // 搜索问题
// //         const searchResults = await jira.searchIssues('project=PROJ AND status=Open', 0, 5);
// //         console.log(`Found ${searchResults.total} issues. First 5:`);
// //         searchResults.issues.forEach(issue => {
// //             console.log(`- ${issue.key}: ${issue.fields.summary}`);
// //         });

// //         // 创建新问题
// //         const newIssuePayload: JiraCreateIssuePayload = {
// //             fields: {
// //                 project: { key: 'PROJ' },
// //                 summary: 'New issue from API',
// //                 description: 'This issue was created using the JiraClient',
// //                 issuetype: { name: 'Task' }
// //             }
// //         };
// //         const newIssue = await jira.createIssue(newIssuePayload);
// //         console.log(`Created new issue: ${newIssue.key}`);

// //         // 添加评论
// //         const comment = await jira.addComment(newIssue.key, 'This is a test comment');
// //         console.log(`Added comment at ${comment.created}`);

// //         // 转换问题状态
// //         const transitions = await jira.getTransitions(newIssue.key);
// //         const transitionToDo = transitions.find(t => t.name === 'To Do');
// //         if (transitionToDo) {
// //             await jira.transitionIssue(newIssue.key, transitionToDo.id, 'Moving to To Do');
// //             console.log('Issue transitioned successfully');
// //         }

// //     } catch (error) {
// //         console.error('Error:', error instanceof Error ? error.message : error);
// //         process.exit(1);
// //     } finally {
// //         // 确保登出
// //         // await jira.logout();
// //     }
// // }



// // 示例1: 使用用户名密码创建客户端并生成API令牌
// async function setupWithPassword() {
//     const jira = new JiraClient({
//         baseUrl: 'https://your-company.atlassian.net',
//         username: 'your.email@company.com',
//         password: 'your-password'
//     });

//     try {
//         // 生成新的API令牌
//         const tokenInfo = await jira.generateApiToken('自动化脚本令牌', 30);
//         console.log('成功生成API令牌:', tokenInfo.token);

//         // 使用令牌创建新客户端
//         const tokenClient = new JiraClient({
//             baseUrl: 'https://your-company.atlassian.net',
//             username: 'your.email@company.com',
//             apiToken: tokenInfo.token
//         });

//         // 测试新客户端
//         const user = await tokenClient.getCurrentUser();
//         console.log(`当前用户: ${user.displayName}`);

//     } catch (error) {
//         console.error('初始化失败:', error);
//     }
// }

// // 示例2: 使用现有API令牌操作Jira
// async function workWithIssues() {
//     const jira = new JiraClient({
//         baseUrl: 'https://your-company.atlassian.net',
//         username: 'your.email@company.com',
//         apiToken: 'existing-api-token'
//     });

//     try {
//         // 搜索问题
//         const results = await jira.searchIssues('project = PROJ AND status = Open');
//         console.log(`找到 ${results.total} 个问题`);

//         // 创建新问题
//         const newIssue = await jira.createIssue({
//             fields: {
//                 project: { key: 'PROJ' },
//                 summary: '通过API创建的问题',
//                 description: '这是通过Jira客户端API创建的问题',
//                 issuetype: { name: 'Task' }
//             }
//         });
//         console.log(`创建了新问题: ${newIssue.key}`);

//         // 添加评论
//         await jira.addComment(newIssue.key, '这是通过API添加的评论');
//         console.log('评论添加成功');

//     } catch (error) {
//         console.error('操作失败:', error);
//     }
// }

// // 示例3: 管理API令牌
// async function manageTokens() {
//     const jira = new JiraClient({
//         baseUrl: 'https://your-company.atlassian.net',
//         username: 'admin@company.com',
//         password: 'admin-password'
//     });

//     try {
//         // 列出所有令牌
//         const tokens = await jira.listApiTokens();
//         console.log('当前API令牌:');
//         tokens.forEach(token => {
//             console.log(`- ${token.name} (创建于: ${token.created})`);
//         });

//         // 撤销第一个令牌
//         if (tokens.length > 0) {
//             await jira.revokeApiToken(tokens[0].id);
//             console.log(`已撤销令牌: ${tokens[0].name}`);
//         }

//     } catch (error) {
//         console.error('令牌管理失败:', error);
//     }
// }


// // 创建Jira客户端实例
// const jira = new JiraClient({
//     baseUrl: 'https://your-company.atlassian.net',
//     username: 'admin@company.com',
//     apiToken: 'your-api-token'
// });

// // 示例1: 创建组并添加用户
// async function manageGroup() {
//     try {
//         // 创建新组
//         const newGroup = await jira.createGroup('Developers');
//         console.log(`创建组成功: ${newGroup.name}`);

//         // 添加用户到组
//         const result = await jira.addUserToGroup('Developers', 'john.doe@company.com');
//         console.log(`添加用户结果: ${result.added ? '成功' : '失败'}`);

//         // 获取组成员
//         const members = await jira.getGroupMembers('Developers');
//         console.log('组成员:', members.map(m => m.displayName));

//     } catch (error) {
//         console.error('组管理操作失败:', error);
//     }
// }

// // 示例2: 批量添加用户到组
// async function bulkAddUsersToGroup(groupName: string, usernames: string[]) {
//     const results = [];
//     for (const username of usernames) {
//         try {
//             const result = await jira.addUserToGroup(groupName, username);
//             results.push({
//                 username,
//                 success: result.added,
//                 message: result.added ? '添加成功' : '添加失败'
//             });
//         } catch (error) {
//             results.push({
//                 username,
//                 success: false,
//                 message: error instanceof Error ? error.message : '未知错误'
//             });
//         }
//     }
//     return results;
// }

// // 示例3: 完整组管理流程
// async function fullGroupManagement() {
//     const GROUP_NAME = 'Project-Managers';

//     // 1. 创建组
//     await jira.createGroup(GROUP_NAME);

//     // 2. 批量添加用户
//     const usersToAdd = [
//         'alice@company.com',
//         'bob@company.com',
//         'charlie@company.com'
//     ];

//     const addResults = await bulkAddUsersToGroup(GROUP_NAME, usersToAdd);
//     console.log('批量添加结果:', addResults);

//     // 3. 查询组信息
//     const groupInfo = await jira.getGroup(GROUP_NAME, true);
//     console.log('组详细信息:', groupInfo);

//     // 4. 移除特定用户
//     await jira.removeUserFromGroup(GROUP_NAME, 'bob@company.com');

//     // 5. 验证组成员
//     const updatedMembers = await jira.getGroupMembers(GROUP_NAME);
//     console.log('更新后的组成员:', updatedMembers.map(u => u.displayName));

//     // 6. 删除组 (谨慎操作!)
//     // await jira.deleteGroup(GROUP_NAME);
// }

// async function testGroupOperations() {
//     //无token 动态生成
//     const jira = new JiraClient({
//         baseUrl: "https://your-jira.atlassian.net",
//         username: "admin@company.com",
//         password: "your-password" // 无 Token，会自动生成
//     });

//     //已有token
//     const jira2 = new JiraClient({
//         baseUrl: "https://your-jira.atlassian.net",
//         username: "admin@company.com",
//         apiToken: "existing-token" // 直接使用 Token
//     });

//     try {
//         // 添加用户到组
//         const result = await jira.addUserToGroup('developers', '557058:abcd1234');
//         console.log(`Added user ${result.user.displayName} to group ${result.name}: ${result.added}`);

//         // 检查用户是否在组中
//         const isMember = await jira.isUserInGroup('developers', '557058:abcd1234');
//         console.log(`Is user in group: ${isMember}`);

//     } catch (error) {
//         console.error('Group operation failed:', error);
//     }
// }

// testGroupOperations();

// // 执行示例
// manageGroup();
// fullGroupManagement();
// // main();