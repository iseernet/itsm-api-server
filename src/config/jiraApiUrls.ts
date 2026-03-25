// src/config/jiraApiUrls.ts
// Jira REST API 路径集中管理
// 适用于 Jira Server / Data Center (REST API v2)

export const jiraApiUrls = {
    // =========================
    // 用户相关 API
    // =========================
    user: {
        // 创建用户
        create: '/rest/api/2/user',

        // 更新用户信息（Server/DC 使用 username）
        update: (username: string) =>
            `/rest/api/2/user?username=${encodeURIComponent(username)}`,

        // 删除用户
        delete: (username: string) =>
            `/rest/api/2/user?username=${encodeURIComponent(username)}`,

        // 根据 username 获取用户信息
        getByName: (username: string) =>
            `/rest/api/2/user?username=${encodeURIComponent(username)}`,

        // 根据 user key 获取用户（兼容旧版本）
        getByKey: (key: string) =>
            `/rest/api/2/user?key=${encodeURIComponent(key)}`,

        // 获取用户所在的组
        getUserGroup: (username: string) =>
            `/rest/api/2/user/groups?username=${encodeURIComponent(username)}`,

        /**
         * 用户搜索
         * @param startAt 起始位置
         * @param maxResults 最大返回数量
         * @param username 模糊匹配用户名（可选）
         */
        search: (startAt: number, maxResults: number, username?: string) => {
            const u = username ? encodeURIComponent(username) : ".";
            return `/rest/api/2/user/search?startAt=${startAt}&maxResults=${maxResults}&username=${u}`;
        },

        // 获取当前登录用户信息
        currentUser: '/rest/api/2/myself',

        // 获取用户详情并展开 groups（Server/DC 专用）
        detail: (username: string) =>
            `/rest/api/2/user?username=${username}&expand=groups`,

        // 上传临时头像（需 multipart/form-data）
        uploadTempAvatar: (username: string) =>
            `/rest/api/2/avatar/user/temporary?username=${username}`,

        // 确认并应用头像
        confirmAvatar: (username: string) =>
            `/rest/api/2/avatar/user?username=${username}`,
    },

    // =========================
    // 用户属性（自定义键值对）
    // =========================
    userProperty: {
        // 设置用户属性
        set: (username: string, key: string) =>
            `/rest/api/2/user/properties/${encodeURIComponent(key)}?username=${encodeURIComponent(username)}`,

        // 获取用户属性
        get: (username: string, key: string) =>
            `/rest/api/2/user/properties/${encodeURIComponent(key)}?username=${encodeURIComponent(username)}`,

        // 获取用户所有属性 key
        listKeys: (username: string) =>
            `/rest/api/2/user/properties?username=${encodeURIComponent(username)}`,

        // 删除用户属性
        delete: (username: string, key: string) =>
            `/rest/api/2/user/properties/${encodeURIComponent(key)}?username=${encodeURIComponent(username)}`,
    },

    // =========================
    // 用户组管理
    // =========================
    group: {
        // 创建用户组
        create: '/rest/api/2/group',

        // 向组中添加用户
        addUser: (groupname: string) =>
            `/rest/api/2/group/user?groupname=${encodeURIComponent(groupname)}`,

        // 从组中移除用户
        removeUser: (groupname: string, username: string) =>
            `/rest/api/2/group/user?groupname=${encodeURIComponent(groupname)}&username=${encodeURIComponent(username)}`,

        // 获取组成员
        getMembers: (groupName: string) =>
            `/rest/api/2/group/member?groupname=${encodeURIComponent(groupName)}`,

        // 获取组信息
        get: (group: string) =>
            `/rest/api/2/group?groupname=${encodeURIComponent(group)}`,

        // 删除组
        remove: (group: string) =>
            `/rest/api/2/group?groupname=${encodeURIComponent(group)}`,

        // 获取所有组（Data Center）
        getAll: '/rest/api/2/groups/picker',
    },

    // =========================
    // 项目角色管理
    // =========================
    role: {
        // 获取项目角色列表
        listByProject: (projectKey: string) =>
            `/rest/api/2/project/${projectKey}/role`,

        // 获取角色成员
        getRoleMembers: (projectKey: string, roleId: number | string) =>
            `/rest/api/2/project/${projectKey}/role/${roleId}`,

        /**
         * 更新角色成员（PUT 覆盖式更新）
         * ⚠️ 会替换现有成员
         */
        updateRoleMembers: (projectKey: string, roleId: number | string) =>
            `/rest/api/2/project/${projectKey}/role/${roleId}`,
    },

    // =========================
    // Issue（工单）相关
    // =========================
    issue: {
        // 创建工单
        create: '/rest/api/2/issue',

        // 更新工单
        update: (issueIdOrKey: string) =>
            `/rest/api/2/issue/${issueIdOrKey}`,

        // 删除工单
        delete: (issueIdOrKey: string) =>
            `/rest/api/2/issue/${issueIdOrKey}`,

        // 获取工单详情
        get: (issueIdOrKey: string) =>
            `/rest/api/2/issue/${issueIdOrKey}`,

        // 指派处理人
        assign: (issueIdOrKey: string) =>
            `/rest/api/2/issue/${issueIdOrKey}/assignee`,

        // 工作流流转
        transition: (issueIdOrKey: string) =>
            `/rest/api/2/issue/${issueIdOrKey}/transitions`,

        // JQL 查询
        search: (jql: string) =>
            `/rest/api/2/search?jql=${encodeURIComponent(jql)}`,

        // 上传附件
        uploadAttachment: (issueIdOrKey: string) =>
            `/rest/api/2/issue/${issueIdOrKey}/attachments`,

        /**
         * 分页查询 Issue
         */
        getIssuses: (
            startAt: number = 0,
            maxResults: number = 50,
            jql: string
        ) =>
            `/rest/api/2/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}`,

        // ===== 评论管理 =====
        comments: {
            list: (issueIdOrKey: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/comment`,

            add: (issueIdOrKey: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/comment`,

            update: (issueIdOrKey: string, commentId: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/comment/${commentId}`,

            delete: (issueIdOrKey: string, commentId: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/comment/${commentId}`,

            get: (issueIdOrKey: string, commentId: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/comment/${commentId}`,
        },

        // ===== 附件 =====
        attachments: {
            add: (issueIdOrKey: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/attachments`,

            /**
             * 构造附件访问路径（需拼接域名）
             * 示例：
             * https://your-jira.com + getFile(id, filename)
             */
            getFile: (id: string, filename: string) =>
                `/secure/attachment/${id}/${encodeURIComponent(filename)}`,
        },

        // ===== 工时日志 =====
        worklog: {
            list: (issueIdOrKey: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/worklog`,

            add: (issueIdOrKey: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/worklog`,

            delete: (issueIdOrKey: string, worklogId: string) =>
                `/rest/api/2/issue/${issueIdOrKey}/worklog/${worklogId}`,
        },
    },

    // =========================
    // 项目相关
    // =========================
    project: {
        // 获取所有项目
        list: '/rest/api/2/project',

        // 获取项目详情
        getDetail: (projectKey: string) =>
            `/rest/api/2/project/${projectKey}`,

        // 获取项目组件
        components: (projectKey: string) =>
            `/rest/api/2/project/${projectKey}/components`,

        // 获取版本列表
        versions: (projectKey: string) =>
            `/rest/api/2/project/${projectKey}/versions`,
    },

    // =========================
    // 系统配置类接口
    // =========================
    resolution: {
        // 获取所有解决方案状态
        list: '/rest/api/2/resolution',
    },

    customField: {
        // 获取所有自定义字段元数据
        metadata: '/rest/api/2/field',
    },

    priority: {
        // 获取所有优先级
        list: '/rest/api/2/priority',
    },
};