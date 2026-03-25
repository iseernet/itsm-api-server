// =========================
// 默认请求头
// =========================
export const DEFAULT_HEADERS = {
    // 接收 JSON 响应
    'Accept': 'application/json',
    // 请求体为 JSON
    'Content-Type': 'application/json'
};

// =========================
// Issue 搜索默认返回字段
// =========================
export const DEFAULT_SEARCH_FIELDS = [
    'summary',   // 标题
    'status',    // 状态
    'assignee',  // 经办人
    'project',   // 所属项目
    'issuetype', // Issue 类型
    'created',   // 创建时间
    'updated'    // 更新时间
];

// =========================
// 常用 Jira API 路径
// =========================
export const API_PATHS = {
    // 登录认证（创建 session）
    AUTH: '/rest/auth/1/session',

    // 当前登录用户信息
    MYSELF: '/rest/api/2/myself',

    // Issue 基础路径（创建 / 更新 / 获取）
    ISSUE: '/rest/api/2/issue',

    // JQL 搜索接口
    SEARCH: '/rest/api/2/search',

    // 项目接口
    PROJECT: '/rest/api/2/project',

    // 获取 / 添加评论
    COMMENTS: (issueIdOrKey: string) =>
        `/rest/api/2/issue/${issueIdOrKey}/comment`,

    // 获取可流转状态 & 执行流转
    TRANSITIONS: (issueIdOrKey: string) =>
        `/rest/api/2/issue/${issueIdOrKey}/transitions`,

    // 用户组基础接口
    GROUP: '/rest/api/2/group',

    // 获取组成员
    GROUP_MEMBERS: (groupName: string) =>
        `/rest/api/2/group/member?groupname=${encodeURIComponent(groupName)}`,

    // 向组中添加用户（POST）
    ADD_USER_TO_GROUP: (groupName: string) =>
        `/rest/api/2/group/user?groupname=${encodeURIComponent(groupName)}`,

    // 从组中移除用户（DELETE）
    REMOVE_USER_FROM_GROUP: (groupName: string, username: string) =>
        `/rest/api/2/group/user?groupname=${encodeURIComponent(groupName)}&username=${encodeURIComponent(username)}`
};

// =========================
// API Token 管理接口
// ⚠️ 路径相同，请求方法不同
// =========================
export const API_TOKEN_PATHS = {
    // 生成 Token（POST）
    GENERATE: '/rest/plugins/1.0/api-token',

    // 获取 Token 列表（GET）
    LIST: '/rest/plugins/1.0/api-token',

    // 吊销 Token（DELETE）
    REVOKE: '/rest/plugins/1.0/api-token'
};