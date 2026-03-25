import axios, { AxiosResponse } from 'axios';
import { jiraApiUrls } from '../../config/jiraApiUrls';
import * as fs from 'fs';
import FormData from 'form-data';
import { IssuePayload } from '../../types/issue';
import { IssueCustomfield } from '../../enums/issueEnum';
import { CommentPayload } from '../../types/conmment';
import { User, UserQueryPayload } from '../../types/user';
import { DateUtil } from '../dateUtil';
import pLimit from "p-limit";
import { builtInGroups, builtUserInGroups } from '../../enums/groupEnum';
import path from 'path';
import util from 'util';
import { builtInRoles } from '../../enums/roleEnum';
import { JiraIssue } from "../../types/jira";

// Set global timeout to 60 seconds (60000 ms)
axios.defaults.timeout = 60000;

export class JiraClient {
    private username: string;
    private password: string;

    //如果构造函数传入了 username 和 password → 使用它们；
    // 如果仅传入了 username，则尝试从用户属性中获取 token 字段，并拼成 Basic Auth。
    constructor(username: string, password?: string) {
        this.username = username;
        if (username === process.env.JIRA_ADMIN_USERNAME) {
            this.password = process.env.JIRA_ADMIN_PASSWORD as string;
        } else {
            this.password = password || '';
        }

    }

    /** 获取普通请求头（含 Basic Auth） */
    private async getHeaders(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
        let token: string = "";

        if (this.password) {
            // 使用构造函数传入的密码
            token = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        } else {
            // 从用户属性中读取 token（管理员权限请求）
            try {
                const adminToken = Buffer.from(`${process.env.JIRA_ADMIN_USERNAME}:${process.env.JIRA_ADMIN_PASSWORD}`).toString('base64');
                const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user/properties/token?username=${encodeURIComponent(this.username)}`;

                const res = await axios.get(url, {
                    headers: {
                        Authorization: `Basic ${adminToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'Node.js Axios',
                    },
                    timeout: 30000,
                    httpAgent: new (require('http').Agent)({ keepAlive: false }),
                    decompress: true,
                });

                token = res.data?.value;
                if (!token) throw new Error('Token property is empty');
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    console.error(`获取用户 ${this.username} token 属性失败:`, err.response?.data || err.message);
                } else if (err instanceof Error) {
                    console.error(`获取用户 ${this.username} token 属性失败:`, err.message);
                } else {
                    console.error(`获取用户 ${this.username} token 属性失败:`, err);
                }
                // 避免返回空 token，直接抛出异常
                throw new Error(`无法获取用户 ${this.username} 的 token`);
            }
        }

        return {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
            ...additionalHeaders,
        };
    }

    /** 获取附件上传请求头 */
    private async getFileUploadHeaders(form: FormData, additionalHeaders = {}): Promise<Record<string, string>> {
        let token: string = "";

        if (this.password) {
            // 使用构造函数传入的密码
            token = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        } else {
            // 从用户属性中读取 token（管理员权限请求）
            try {
                const adminToken = Buffer.from(`${process.env.JIRA_ADMIN_USERNAME}:${process.env.JIRA_ADMIN_PASSWORD}`).toString('base64');
                const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user/properties/token?username=${encodeURIComponent(this.username)}`;
                const res = await axios.get(url, {
                    headers: {
                        Authorization: `Basic ${adminToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                token = res.data?.value;
                if (!token) throw new Error('Token property is empty');
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    console.error(`获取用户 ${this.username} token 属性失败:`, err.response?.data || err.message);
                } else if (err instanceof Error) {
                    console.error(`获取用户 ${this.username} token 属性失败:`, err.message);
                } else {
                    console.error(`获取用户 ${this.username} token 属性失败:`, err);
                }
            }
        }

        return {
            Authorization: `Basic ${token}`,
            'X-Atlassian-Token': 'no-check', // Jira 上传附件必须有这个
            ...form.getHeaders(), // 这里的 Content-Type 带 boundary，必须保留
            ...additionalHeaders,
        };
    }

    /** 获取当前用户及其项目角色 */
    static async getCurrentUserWithBasicAuth(
        username: string,
        password: string,
        projectKey: string
    ) {
        const token = Buffer.from(`${username}:${password}`).toString("base64");
        const headers = {
            Authorization: `Basic ${token}`,
            "Content-Type": "application/json",
        };

        const baseUrl = process.env.JIRA_BASE_URL;

        // 1. 获取当前用户信息
        const myselfUrl = `${baseUrl}/rest/api/2/myself`;
        const { data: myself } = await axios.get(myselfUrl, { headers });
        const jiraUsername = myself.name; // Server/DC 用 name 字段

        // 2. 获取指定项目的角色
        const rolesUrl = `${baseUrl}/rest/api/2/project/${projectKey}/role`;
        const { data: roles } = await axios.get(rolesUrl, { headers });

        let matchedRoles: string[] = [];

        // 3. 遍历每个角色，查找用户
        for (const [roleName, roleUrl] of Object.entries(roles)) {
            const { data: roleDetail } = await axios.get(roleUrl as string, { headers });

            if (roleDetail.actors) {
                const isMember = roleDetail.actors.some(
                    (actor: any) =>
                        actor.name === jiraUsername || actor.name === username
                );

                if (isMember) {
                    matchedRoles.push(roleName);
                }
            }
        }
        matchedRoles = matchedRoles.filter(
            (role) => !builtInRoles.includes(role)
        );
        return {
            data: {
                ...myself,
                project: projectKey,
                roles: matchedRoles,
            },
        };
    }

    // -------- 用户管理 --------

    // /**
    //  * 获取指定用户的详细信息
    //  * @param username - Jira 用户名（如 "admin"）
    //  */
    // async getUserInfo(username: string) {
    //     const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.get(username)}`;
    //     return await axios.get(url, { headers: await this.getHeaders() });
    // }

    // 根据 key 查询用户信息（老版本）
    async getUserByKey(userKey: string) {
        try {
            const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user?key=${encodeURIComponent(userKey)}`;
            const res = await axios.get(url, { headers: await this.getHeaders() });
            return res.data;
        } catch (err: any) {

            console.error(`获取用户 ${this.username} 败:`, err.response?.data || err.message);
            throw new Error(err.message);

        }
    }

    // 根据 name 查询用户信息
    async getUserByName(username: string) {
        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user?username=${encodeURIComponent(username)}`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data;
    }

    /** 根据用户名获取用户信息（可选包含用户组） */
    async getUserAndGroupByName(username: string, options?: { expandGroups?: boolean }) {
        try {
            const expandParam = options?.expandGroups ? '&expand=groups' : '';
            const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user?username=${encodeURIComponent(username)}${expandParam}`;

            const res = await axios.get(url, { headers: await this.getHeaders() });

            // 如果 expandGroups，提取 groups 名称
            if (options?.expandGroups && res.data.groups) {
                res.data.groups = res.data.groups.items?.map((g: any) => g.name) || [];
            }

            return res.data;
        } catch (err: any) {

            console.error(`获取用户 ${this.username} 败:`, err.response?.data || err.message);
            throw new Error(err.message);

        }
    }

    /** 上传用户临时头像 */
    async uploadTemporaryUserAvatar(username: string, filePath: string) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`头像文件不存在: ${filePath}`);
        }

        const form = new FormData();
        form.append('username', username);
        form.append('file', fs.createReadStream(filePath));

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user/avatar/temporary`;

        try {
            const res = await axios.post(url, form, {
                headers: {
                    ...(await this.getHeaders()),
                    'X-Atlassian-Token': 'no-check',
                    ...form.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                decompress: false,
            });

            if (!res.data.temporaryAvatarId) {
                throw new Error(`Jira 上传头像失败，返回: ${JSON.stringify(res.data)}`);
            }

            return res.data;
        } catch (err: any) {
            console.error('uploadTemporaryUserAvatar 错误:', err.response?.data || err.message);
            throw new Error(err.response?.data || err.message);
        }
    }






    // ⭐ 确认头像
    async confirmUserAvatar(username: string, fileId: number) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.confirmAvatar(username)}`;
            const body = {
                cropperWidth: 120,
                cropperOffsetX: 0,
                cropperOffsetY: 0,
                fileId: fileId,
            };
            const res = await axios.post(url, body, { headers: await this.getHeaders() });
            return res.data;
        } catch (err: any) {

            console.error(`获取用户 ${this.username} 败:`, err.response?.data || err.message);
            throw new Error(err.message);

        }
    }


    /** 创建 Jira 用户 */
    async createUser(user: User) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.create}`;

        const data: any = {
            name: user.username,
            password: user.password,
            emailAddress: user.emailAddress,
            displayName: user.displayName,
        };

        if (user.groups) data.groups = user.groups;
        if (user.applicationKeys) data.applicationKeys = user.applicationKeys;
        if (user.active !== undefined) data.active = user.active;
        if (user.timeZone) data.timeZone = user.timeZone;
        if (user.locale) data.locale = user.locale;

        return await axios.post(url, data, { headers: await this.getHeaders() });
    }

    /** 更新 Jira 用户信息 */
    async updateUser(username: string, user: User) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.update(username)}`;

        const data: any = {};
        if (user.emailAddress) data.emailAddress = user.emailAddress;
        if (user.displayName) data.displayName = user.displayName;
        if (user.groups) data.groups = user.groups;
        if (user.applicationKeys) data.applicationKeys = user.applicationKeys;
        if (user.active !== undefined) data.active = user.active;
        if (user.timeZone) data.timeZone = user.timeZone;
        if (user.locale) data.locale = user.locale;

        return await axios.put(url, data, { headers: await this.getHeaders() });
    }

    /** 删除 Jira 用户 */
    async deleteUser(username: string) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.delete(username)}`;
            return await axios.delete(url, { headers: await this.getHeaders() });
        } catch (err: any) {

            const msg = `删除 ${username} 失败: ${JSON.stringify(err.response?.data || err.message)}`;
            console.error(msg);
            throw new Error(msg);

        }
    }

    // -------- 获取当前用户信息 --------
    async getCurrentUser() {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.currentUser}`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    /**
     * 获取用户列表
     * @param query - 支持 username/email/displayName 模糊搜索，以及分页
     */
    async getUserList(startAt: number, maxResults: number, username?: string, displayName?: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.search(startAt, maxResults, username)}`;
        console.log(url);

        const res = await axios.get(url, { headers: await this.getHeaders() });

        let users = res.data;

        if (displayName) {
            users = users.filter((user: any) => user.displayName.includes(displayName));
        }

        return {
            total: users.length,
            users
        };
    }



    /** 按条件查询 Jira 用户列表（含组和角色） */
    async getUserListByPayload(
        query: Partial<UserQueryPayload> & { text?: string },
        pageIndex = 1,
        pageSize = 50
    ) {
        const { username, emailAddress, displayName, group, role, text } = query;
        const searchKey = username || emailAddress || "";

        // 1️⃣ 全量拉取用户
        let allUsers: any[] = [];
        const fetchMax = 50;
        let fetchStart = 0;
        while (true) {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.search(fetchStart, fetchMax, searchKey)}`;
            const res = await axios.get(url, { headers: await this.getHeaders() });
            const usersBatch = res.data;
            if (!usersBatch || usersBatch.length === 0) break;
            allUsers.push(...usersBatch);
            if (usersBatch.length < fetchMax) break;
            fetchStart += fetchMax;
        }

        // 2️⃣ 获取项目角色
        const project = process.env.JIRA_PROJECT_KEY;
        const projectRolesRes = await axios.get(
            `${process.env.JIRA_BASE_URL}/rest/api/2/project/${project}/role`,
            { headers: await this.getHeaders() }
        );

        const projectRolesMap: Record<string, string[]> = {};
        for (const [roleName, roleUrl] of Object.entries(projectRolesRes.data)) {
            const roleDetail = await axios.get(`${roleUrl}`, { headers: await this.getHeaders() });
            projectRolesMap[roleName] = roleDetail.data.actors.map((a: any) => a.accountId || a.name);
        }

        // 3️⃣ enrich 用户信息（并行限制）
        const limit = pLimit(5);
        const enrichedUsers = await Promise.all(
            allUsers.map(u =>
                limit(async () => {
                    try {
                        const detailUrl = `${process.env.JIRA_BASE_URL}${jiraApiUrls.user.detail(u.name)}`;
                        const detailRes = await axios.get(detailUrl, { headers: await this.getHeaders() });

                        const groups = detailRes.data.groups?.items?.map((g: any) => g.name) || [];
                        const filteredGroups = groups.filter((g: any) => !builtInGroups.includes(g));

                        const rolesInfo: string[] = [];
                        for (const [roleName, userIds] of Object.entries(projectRolesMap)) {
                            if (userIds.includes(u.accountId || u.name) && !builtInRoles.includes(roleName)) {
                                rolesInfo.push(roleName);
                            }
                        }

                        return {
                            ...u,
                            groups: filteredGroups,
                            _allGroups: groups,
                            roles: rolesInfo
                        };
                    } catch {
                        return { ...u, groups: [], _allGroups: [], roles: [] };
                    }
                })
            )
        );

        // // 4️⃣ 过滤掉 builtUserInGroups 的用户
        // let filteredUsers = enrichedUsers.filter(
        //     u => !u._allGroups.some((g: any) => builtUserInGroups.includes(g))
        // );

        // 🚀 替换掉 group 过滤逻辑只是去掉前端不想显示的组名
        let filteredUsers = enrichedUsers.map(user => ({
            ...user,
            _allGroups: user._allGroups.filter(
                (g: string) => !builtUserInGroups.includes(g)
            ),
        }));

        // 5️⃣ group / role / displayName 条件过滤
        if (group) {
            filteredUsers = filteredUsers.filter(u => u.groups?.includes(group));
        }
        if (displayName) {
            filteredUsers = filteredUsers.filter(u => u.displayName?.includes(displayName));
        }
        if (role) {
            filteredUsers = filteredUsers.filter(u => u.roles.includes(role));
        }

        // 6️⃣ text 仅在 name / displayName / emailAddress 里模糊搜索
        if (text) {
            const lowerText = text.toLowerCase();
            filteredUsers = filteredUsers.filter(u => {
                return (
                    (u.name && u.name.toLowerCase().includes(lowerText)) ||
                    (u.displayName && u.displayName.toLowerCase().includes(lowerText)) ||
                    (u.emailAddress && u.emailAddress.toLowerCase().includes(lowerText))
                );
            });
        }

        // 7️⃣ total
        const total = filteredUsers.length;

        // 8️⃣ 分页切片
        const startAt: number = pageIndex;
        const endAt: number = startAt + Number(pageSize);
        const users = filteredUsers.slice(startAt, endAt);

        return { total, users };
    }





    /**
     * 获取指定项目的角色及成员
     * 返回 { roleName: [{ id, accountId, name }] }，并自动过滤 builtInRoles
     */
    async getProjectRoles(projectKey: string) {
        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/project/${projectKey}/role`;
        const res = await axios.get(url, { headers: await this.getHeaders() });

        const projectRolesMap: Record<
            string,
            { id: string; users: Array<{ accountId: string; name: string }> }
        > = {};

        for (const [roleName, roleUrl] of Object.entries(res.data)) {
            if (builtInRoles.includes(roleName)) continue; // 过滤内置角色

            const roleDetail = await axios.get(`${roleUrl}`, { headers: await this.getHeaders() });

            // 从 self URL 中提取角色 ID，例如 "https://jira.example.com/rest/api/2/role/10002"
            const roleId = roleDetail.data.self.split('/').pop() || '';

            projectRolesMap[roleName] = {
                id: roleId,
                users: roleDetail.data.actors.map((a: any) => ({
                    accountId: a.accountId || a.name,
                    name: a.name
                }))
            };
        }

        return projectRolesMap;
    }


    // -------- 用户组 --------
    /**
     * 创建 Jira Group
     */
    async createGroup(group: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.create}`;
        return await axios.post(url, { name: group }, { headers: await this.getHeaders() });
    }

    async addUserToGroup(username: string, group: string) {
        try {
            // const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.addUser(group)}`;
            const url = `${process.env.JIRA_BASE_URL}/rest/api/2/group/user?groupname=${encodeURIComponent(group)}`;

            return await axios.post(url, { name: username }, { headers: await this.getHeaders() });
        } catch (err) {
            console.error(`===================`, JSON.stringify(err));
            throw new Error(JSON.stringify(err));
        }

    }

    async addUserToGroups(username: string, groups: string[]) {
        for (const group of groups) {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.addUser(group)}`;
            await axios.post(url, { name: username }, { headers: await this.getHeaders() });
        }
        return { message: `User ${username} added to groups: ${groups.join(', ')}` };
    }

    async removeUserFromGroup(username: string, group: string) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.removeUser(group, username)}`;
            return await axios.delete(url, { headers: await this.getHeaders() });
        } catch (err: any) {
            if (err.response?.status === 404) {
                throw new Error(`用户 ${username} 不存在`);
            }
            throw new Error(`从角色移除用户失败: ${err.message}`);
        }
    }

    async getUserGroups(username: string): Promise<string[]> {
        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user`;
        try {
            const res = await axios.get(url, {
                headers: await this.getHeaders(),
                params: { username: encodeURIComponent(username), expand: 'groups' }
            });
            return res.data.groups.items.map((g: any) => g.name);
        } catch (err: any) {
            if (err.response?.status === 404) {
                throw new Error(`用户 ${username} 不存在`);
            }
            throw new Error(`获取用户所属组失败: ${err.message}`);
        }
    }

    /**
     * 删除 Jira Group
     */
    async deleteGroup(group: string) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.remove(group)}`;
            return axios.delete(url, { headers: await this.getHeaders() });
        } catch (err: any) {
            if (err.response?.status === 404) return false;
            throw err;
        }
    }

    /**
     * 检查组是否存在
     */
    async groupExists(group: string): Promise<boolean> {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.get(group)}`;
        try {
            await axios.get(url, { headers: await this.getHeaders() });
            return true;
        } catch (err: any) {
            if (err.response?.status === 404) return false;
            throw err;
        }
    }

    /**
     * 获取所有 Jira Groups（Data Center），支持分页和模糊查询
     * @param query 模糊查询组名，可选
     * @param startAt 起始位置，默认 0
     * @param maxResults 每页条数，默认 50
     */
    async getAllGroups(
        query?: string,
        startAt = 0,
        maxResults = 50
    ): Promise<{ total: number; groups: any[] }> {

        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.getAll}`;

        const res = await axios.get(url, {
            headers: await this.getHeaders(),
            params: {
                query: query || '',
                startAt,
                maxResults
            }
        });

        // Data Center 返回可能是 { groups: [...], total: number }
        const groups = res.data.groups || [];
        const total = res.data.total ?? groups.length;

        return { total, groups };
    }

    /**
     * 获取所有 Jira Groups（Data Center），支持模糊查询和自动分页
     * @param query 模糊查询组名，可选
     * @param pageSize 每页条数，默认 50
     */
    async getAllGroupsAuto(
        query?: string,
        pageSize = 50
    ): Promise<{ total: number; groups: any[] }> {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.getAll}`;
        const allGroups: any[] = [];
        let startAt = 0;
        let total = 0;

        while (true) {
            const res = await axios.get(url, {
                headers: await this.getHeaders(),
                params: {
                    query: query || '',
                    startAt,
                    maxResults: pageSize
                }
            });

            const groups = res.data.groups || [];
            total = res.data.total ?? total + groups.length;

            allGroups.push(...groups);

            // 如果已经拉取完或本页条数少于 pageSize，停止
            if (allGroups.length >= total || groups.length < pageSize) break;

            startAt += pageSize;
        }

        return { total, groups: allGroups };
    }

    /**
     * 获取组内用户（支持分页 + total）
     */
    async getGroupUsers(
        group: string,
        startAt = 0,
        maxResults = 50
    ): Promise<{ total: number; users: any[] }> {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.getMembers(group)}`;
        const res = await axios.get(url, {
            headers: await this.getHeaders(),
            params: { startAt, maxResults }
        });

        const users = res.data.values || [];
        const total = res.data.total ?? users.length; // Data Center 会返回 total，Cloud 可能没有

        return {
            total,
            users
        };
    }



    // -------- 项目角色 --------

    // 根据 Role URL 获取角色详情
    async getRoleByUrl(roleUrl: string) {
        const res = await axios.get(roleUrl, { headers: await this.getHeaders() });
        return res.data; // 包含 id, name, description, actors 等
    }

    // 根据 projectKey + roleName 获取角色 URL
    async getRoleUrl(projectKey: string, roleName: string) {
        const rolesObj = await this.listProjectRoles(projectKey);
        const roleUrl = rolesObj[roleName];
        if (!roleUrl) throw new Error(`找不到角色：${roleName}`);
        return roleUrl;
    }

    // 根据 Role ID 获取角色详情
    async getRoleById(roleId: number) {
        if (!roleId) throw new Error('roleId is missing');
        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data; // 包含 id, name, description, actors 等
    }

    /**
     * 给角色添加用户
     * @param roleId Jira 角色 ID
     * @param usernames 单个用户名或数组
     */
    async addUserToRole(roleId: number, usernames: string | string[]) {
        if (!roleId) throw new Error('roleId is missing');
        const users = Array.isArray(usernames) ? usernames : [usernames];

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        // Jira 角色添加用户是 PUT 请求，body 支持 { user: ["username1", ...] }
        const res = await axios.put(
            url,
            { user: users },
            { headers: await this.getHeaders() }
        );
        return res.data;
    }

    /**
     * 给项目角色添加用户
     * @param projectKey Jira 项目 key
     * @param roleId Jira 角色 ID
     * @param usernames 单个用户名或数组
     */
    async addUserToProjectRole(projectKey: string, roleId: number, usernames: string | string[]) {
        if (!projectKey) throw new Error('projectKey is missing');
        if (!roleId) throw new Error('roleId is missing');
        const users = Array.isArray(usernames) ? usernames : [usernames];

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/project/${projectKey}/role/${roleId}`;
        try {
            const res = await axios.post(
                url,
                { user: users },
                { headers: await this.getHeaders() }
            );
            return res.data;
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }

    /**
     * 给角色添加 Group
     * @param roleId Jira 角色 ID
     * @param groups 单个组名或数组
     */
    async addGroupToRole(roleId: number, groups: string | string[]) {
        if (!roleId) throw new Error('roleId is missing');
        const groupArray = Array.isArray(groups) ? groups : [groups];

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        // Jira 角色添加 Group 是 PUT 请求，body 支持 { group: ["group1", ...] }
        const res = await axios.put(
            url,
            { group: groupArray },
            { headers: await this.getHeaders() }
        );
        return res.data;
    }


    /**
     * 删除角色下的用户（包括直接绑定和间接绑定在组的）
     */
    async removeUsersFromRole(projectKey: string, roleId: number, usernames: string | string[]) {
        if (!projectKey) throw new Error('projectKey is missing');
        if (!roleId) throw new Error('roleId is missing');

        const userArray = Array.isArray(usernames) ? usernames : [usernames];

        // 1️⃣ 获取角色详情
        const roleRes = await axios.get(`${process.env.JIRA_BASE_URL}/rest/api/2/project/${projectKey}/role/${roleId}`, {
            headers: await this.getHeaders()
        });
        const actors = roleRes.data.actors || [];

        // 2️⃣ 找出直接绑定的用户和绑定在组的用户
        const directUsers = actors.filter((a: any) => a.type === 'atlassian-user-role-actor');
        const groupActors = actors.filter((a: any) => a.type === 'atlassian-group-role-actor');

        for (const username of userArray) {
            // 删除直接绑定的用户
            const direct = directUsers.find((u: any) => u.actorUser?.name === username || u.name === username || u.actorUser?.accountId === username);
            if (direct) {
                await axios.delete(`${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}/actors`, {
                    headers: await this.getHeaders(),
                    params: { user: direct.actorUser?.accountId || direct.name }
                });
                continue;
            }

            // 删除间接绑定在组的用户
            for (const group of groupActors) {
                const members = await this.getGroupMembers(group.name);
                const memberNames = (members.values || []).map((u: any) => u.name);
                if (memberNames.includes(username)) {
                    await this.removeUserFromGroup(username, group.name);
                    break;
                }
            }
        }

        return { deleted: userArray };
    }

    async removeUsersFromRoleFunc(projectKey: string, roleId: number, usernames: string | string[]) {
        if (!projectKey) throw new Error('projectKey is missing');
        if (!roleId) throw new Error('roleId is missing');

        const userArray = Array.isArray(usernames) ? usernames : [usernames];

        for (const username of userArray) {
            try {
                // 注意：这里必须用 accountId
                await axios.delete(
                    `${process.env.JIRA_BASE_URL}/rest/api/2/project/${projectKey}/role/${roleId}`,
                    {
                        headers: await this.getHeaders(),
                        params: { user: username } // username 必须是 accountId
                    }
                );
            } catch (err: any) {
                console.error(`❌ 删除用户 ${username} 从角色 ${roleId} 失败:`, err.response?.data || err.message);
            }
        }

        return { deleted: userArray };
    }

    /**
     * 删除角色下的组
     */
    async removeGroupsFromRole(roleId: number, groups: string | string[]) {
        if (!roleId) throw new Error('roleId is missing');
        const groupArray = Array.isArray(groups) ? groups : [groups];

        // 获取角色详情
        const roleRes = await axios.get(`${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`, {
            headers: await this.getHeaders()
        });
        const actors = roleRes.data.actors || [];

        for (const groupName of groupArray) {
            const actor = actors.find((a: any) => a.type === 'atlassian-group-role-actor' && a.name === groupName);
            if (!actor) continue;

            await axios.delete(`${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}/actors`, {
                headers: await this.getHeaders(),
                params: { group: actor.name }
            });
        }

        return { deleted: groupArray };
    }



    /**
    * 删除 Jira 角色
    * @param roleId Jira 角色 ID
    */
    async deleteRole(roleId: number) {
        if (!roleId) throw new Error('roleId is missing');

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        const res = await axios.delete(url, { headers: await this.getHeaders() });
        return res.status === 204 ? { success: true } : res.data;
    }

    /**
     * 更新角色信息（只修改 name 和 description）
     * @param roleId Jira 角色 ID
     * @param updates { name?: string; description?: string }
     */
    async updateRoleInfo(roleId: number, updates: { name?: string; description?: string }) {
        if (!roleId) throw new Error('roleId is missing');

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        const payload: any = {};
        if (updates.name) payload.name = updates.name;
        if (updates.description) payload.description = updates.description;

        if (Object.keys(payload).length === 0) {
            throw new Error('没有要更新的字段');
        }

        const res = await axios.put(url, payload, { headers: await this.getHeaders() });
        return res.data;
    }

    // 更新 Jira 角色描述
    async updateRoleDescription(roleId: number, description: string) {
        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;

        // 先获取角色原信息
        const role = await axios.get(url, { headers: await this.getHeaders() });

        // 再带上 name + 新 description 更新
        const res = await axios.put(
            url,
            {
                name: role.data.name,
                description
            },
            { headers: await this.getHeaders() }
        );

        return res.data;
    }


    // 查询某个组所属的项目角色
    async getRolesByGroup(projectKey: string, groupName: string) {
        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/project/${projectKey}/role`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        const rolesObj = res.data; // { "Developers": "http://.../role/10001", ... }

        const matchedRoles: { id: number; name: string; url: string, description: string }[] = [];

        for (const [roleName, roleUrl] of Object.entries(rolesObj)) {
            const roleRes = await axios.get(roleUrl as string, { headers: await this.getHeaders() });
            const actors = roleRes.data.actors || [];
            if (actors.some((a: any) => a.type === 'atlassian-group-role-actor' && a.name === groupName)) {
                matchedRoles.push({
                    id: roleRes.data.id,
                    name: roleName,
                    description: roleRes.data.description,
                    url: roleUrl as string,
                });
            }
        }

        return matchedRoles;
    }


    // 获取项目角色列表 { roleName: roleUrl }
    async listProjectRoles(projectKey: string): Promise<Record<string, string>> {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.role.listByProject(projectKey)}`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data;
    }

    // 获取角色成员 (users + groups)
    async getRoleMembers(projectKey: string, roleName: string): Promise<any> {
        const roles = await this.listProjectRoles(projectKey);
        const roleUrl = roles[roleName];
        if (!roleUrl) throw new Error(`找不到角色：${roleName}`);
        const res = await axios.get(roleUrl, { headers: await this.getHeaders() });
        return res.data;
    }



    // 获取 Role 下绑定的 Group
    async getRoleGroups(projectKey: string, roleName: string): Promise<string[]> {
        const role = await this.getRoleMembers(projectKey, roleName);
        return role.actors.filter((a: any) => a.type === 'atlassian-group-role-actor').map((a: any) => a.name);
    }

    // 获取 Role 下所有用户（含 group 成员）
    async getRoleUsers(projectKey: string, roleName: string): Promise<string[]> {
        const role = await this.getRoleMembers(projectKey, roleName);
        const users: string[] = role.actors
            .filter((a: any) => a.type === 'atlassian-user-role-actor')
            .map((a: any) => a.name);

        const groupActors = role.actors.filter((a: any) => a.type === 'atlassian-group-role-actor');
        for (const group of groupActors) {
            const members = await this.getGroupMembers(group.name);
            const groupUsers = members.values.map((u: any) => u.name);
            users.push(...groupUsers);
        }

        return Array.from(new Set(users));
    }


    // 获取 Role 下所有用户（含 group 成员），返回完整用户信息
    async getRoleUsersByRoleID(projectKey: string, roleId: number): Promise<any[]> {
        const role = await this.getRoleMembersByProjectKeyRoleId(projectKey, roleId);
        if (!role?.actors) return [];

        const users: any[] = [];

        // 直接绑定在角色下的用户
        const directUsers = role.actors
            .filter((a: any) => a.type === "atlassian-user-role-actor")
            .map((a: any) => a.name);

        // 绑定在角色下的组，展开组内成员
        const groupActors = role.actors.filter((a: any) => a.type === "atlassian-group-role-actor");
        let groupUsers: string[] = [];
        for (const group of groupActors) {
            const members = await this.getGroupMembers(group.name);
            groupUsers.push(...(members.values || []).map((u: any) => u.name));
        }

        const allUsernames = Array.from(new Set([...directUsers, ...groupUsers]));

        // 查询用户详情
        for (const username of allUsernames) {
            try {
                const userDetail = await this.getUserDetail(username);
                users.push({
                    name: userDetail.name,
                    key: userDetail.key,
                    displayName: userDetail.displayName,
                    emailAddress: userDetail.emailAddress,
                    active: userDetail.active,
                    timeZone: userDetail.timeZone,
                    accountType: userDetail.accountType,
                });
            } catch (err: any) {
                console.error(`获取用户 ${username} 详情失败: `, err.message);
            }
        }

        return users;
    }

    async getUserDetail(username: string): Promise<any> {
        try {
            const url = `${process.env.JIRA_BASE_URL}/rest/api/2/user?username=${encodeURIComponent(username)}`;
            const res = await axios.get(url, { headers: await this.getHeaders() });
            return res.data;
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }

    // 获取 Group 成员
    async getGroupMembers(groupName: string): Promise<any> {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.group.getMembers(groupName)}`;
            const res = await axios.get(url, { headers: await this.getHeaders() });
            return res.data;
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }


    // 覆盖式更新 Role 成员 (users + groups)
    // ---------- 更新 Role 成员（覆盖式） ----------
    async updateRoleMembers(roleId: number, users: string[] = [], groups: string[] = []) {
        if (!roleId) throw new Error('roleId is missing');

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        const body = {
            user: users,   // 用户列表
            group: groups  // 组列表
        };

        const res = await axios.put(url, body, { headers: await this.getHeaders() });
        return res.data;
    }

    // ---------- 获取 Role 成员 ----------
    async getRoleMembersByRoleId(roleId: number) {
        if (!roleId) throw new Error('roleId is missing');

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/role/${roleId}`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data; // 返回 actors 数组
    }

    // 获取角色成员 (users + groups) - 按 roleId
    async getRoleMembersByProjectKeyRoleId(projectKey: string, roleId: number): Promise<any> {
        if (!projectKey) throw new Error("projectKey is missing");
        if (!roleId) throw new Error("roleId is missing");

        const url = `${process.env.JIRA_BASE_URL}/rest/api/2/project/${projectKey}/role/${roleId}`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data; // 包含 actors 数组
    }


    // -------- 问题管理 --------

    async createIssue(projectKey: string, payload: IssuePayload) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.create}`;

        // const date = new Date('2025-08-19 00:00:07');
        // const isoString = date.toISOString(); // 生成UTC时间，类似 "2025-08-19T00:00:07.000Z"

        const data: any = {
            fields: {
                project: { key: projectKey },
                summary: payload.summary,
                description: payload.description,
                issuetype: { id: payload.issuetype },
                reporter: { name: payload.reporter },
                priority: { id: payload.priority },


                // 这里用 IssueCustomfield 枚举的值作为字段名
                [IssueCustomfield.service]: payload.service,
                [IssueCustomfield.snCode]: payload.snCode,
                [IssueCustomfield.impactLevel]: "高",
                [IssueCustomfield.isDown]: payload.isDown ? { "value": "yes" } : { "value": "no" },
                [IssueCustomfield.syncToCustomer]: payload.syncToCustomer ? { "value": "Yes" } : { "value": "No" },
                [IssueCustomfield.maintenanceOperation]: payload.maintenanceOperation,
                [IssueCustomfield.operationPermissions]: payload.operationPermissions

            },
        };

        // // 可选字段
        // if (payload.alarmId) {
        //     data.fields.customfield_10201 = payload.alarmId; // 替换为 alarmId 字段 ID
        // }

        // 可选字段
        if (payload.assignee) {
            data.fields.assignee = { name: payload.assignee };
        }

        if (payload.alarmId) {
            data.fields[IssueCustomfield.alarmId] = payload.alarmId;
        }

        if (payload.authorizedChangeContent) {
            data.fields[IssueCustomfield.authorizedChangeContent] = payload.authorizedChangeContent; // 替换为授权变更内容字段 ID
        }

        if (payload.relativeIssueId) {
            data.fields[IssueCustomfield.relativeIssueId] = payload.relativeIssueId;// 替换为关联单id
        }

        if (payload.relatedSN) {
            data.fields[IssueCustomfield.relatedSN] = payload.relatedSN;// 替换为关联SN
        }

        if (payload.estimatedStartDate) {
            data.fields[IssueCustomfield.estimatedStartDate] = payload.estimatedStartDate
        }

        if (payload.estimatedStartDate) {
            const date = payload.estimatedStartDate instanceof Date
                ? payload.estimatedStartDate
                : new Date(payload.estimatedStartDate);

            data.fields[IssueCustomfield.estimatedStartDate] = DateUtil.formatDateForJira(date);
        }

        if (payload.authorized) {
            data.fields[IssueCustomfield.authorized] = payload.authorized
        }

        if (payload.authorizedAt) {
            data.fields[IssueCustomfield.authorizedAt] = payload.authorizedAt.toString()
        }

        if (payload.rackID) {
            data.fields[IssueCustomfield.rackID] = payload.rackID
        }

        if (payload.dueAt) {
            data.fields[IssueCustomfield.dueAt] = payload.dueAt.toString()
        }

        if (payload.serverSn) {
            data.fields[IssueCustomfield.serverSn] = payload.serverSn
        }

        if (payload.networkSn) {
            data.fields[IssueCustomfield.networkSn] = payload.networkSn
        }

        if (payload.faultType) {
            data.fields[IssueCustomfield.faultType] = payload.faultType
        }

        if (payload.os) {
            data.fields[IssueCustomfield.os] = payload.os
        }

        if (payload.cleanDataDisk) {
            data.fields[IssueCustomfield.cleanDataDisk] = payload.cleanDataDisk ? { "value": "Yes" } : { "value": "No" }
        }

        if (payload.bootType) {
            data.fields[IssueCustomfield.bootType] = payload.bootType
        }

        if (payload.rnTicketId) {
            data.fields[IssueCustomfield.rnTicketId] = payload.rnTicketId
        }

        if (payload.relatedComponents) {
            data.fields[IssueCustomfield.relatedComponents] = payload.relatedComponents
        }

        if (payload.idcSubType) {
            data.fields[IssueCustomfield.idcSubType] = payload.idcSubType
        }

        if (payload.newSn) {
            data.fields[IssueCustomfield.newSn] = payload.newSn
        }

        if (payload.networkDevice) {
            data.fields[IssueCustomfield.networkDevice] = payload.networkDevice
        }

        if (payload.rn_fault_id) {
            data.fields[IssueCustomfield.rn_fault_id] = payload.rn_fault_id
        }

        if (payload.isNetworkEffectServer) {
            data.fields[IssueCustomfield.isNetworkEffectServer] = payload.isNetworkEffectServer
        }

        if (payload.postmortem_fault_type) {
            data.fields[IssueCustomfield.postmortem_fault_type] = payload.postmortem_fault_type
        }

        if (payload.postmortem_maintenance_operation) {
            data.fields[IssueCustomfield.postmortem_maintenance_operation] = payload.postmortem_maintenance_operation
        }

        if (payload.transceiver_need_clean) {
            if(payload.transceiver_need_clean){
                data.fields[IssueCustomfield.transceiver_need_clean] = 'true';
            }else {
                data.fields[IssueCustomfield.transceiver_need_clean] = 'false';
            }

        }

        if (payload.transceiver_is_action) {
            data.fields[IssueCustomfield.transceiver_is_action] = payload.transceiver_is_action;
        }

        if (payload.transceiver_p2p_connection) {
            data.fields[IssueCustomfield.transceiver_p2p_connection] = payload.transceiver_p2p_connection;
        }

        if (payload.transceiver_result) {
            data.fields[IssueCustomfield.transceiver_result] = payload.transceiver_result;
        }

        if (payload.transceiver_node) {
            data.fields[IssueCustomfield.transceiver_node] = payload.transceiver_node;
        }

        if (payload.transceiver_attachments) {
            data.fields[IssueCustomfield.transceiver_attachments] = payload.transceiver_attachments;
        }
        console.log("createIssue:", url);
        console.log("createIssue data:", data);

        try {
            return await axios.post(url, data, { headers: await this.getHeaders() });
        } catch (err) {
            console.error(`===================`, JSON.stringify(err));
            throw new Error(JSON.stringify(err));
        }
    }

    async updateIssue(issueIdOrKey: string, updates: IssuePayload) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.update(issueIdOrKey)}`;

        const fields: any = {};

        // 必填字段
        if (updates.summary) fields.summary = updates.summary;
        if (updates.description) fields.description = updates.description;
        if (updates.issuetype) fields.issuetype = { id: updates.issuetype };
        if (updates.reporter) fields.reporter = { name: updates.reporter };
        if (updates.priority) fields.priority = { id: updates.priority };
        if (updates.service) fields[IssueCustomfield.service] = updates.service; // service
        if (updates.impactLevel) fields[IssueCustomfield.impactLevel] = updates.impactLevel; // impactLevel

        // 可选字段
        // 这样就可以兼容三种场景：
        // updates.assignee = "op4" → 设置为 op4
        // updates.assignee = "" 或 null → 清空负责人
        // 不传 assignee → 保持原值
        if ("assignee" in updates) {
            fields.assignee = updates.assignee ? { name: updates.assignee } : null;
        }
        // if (updates.assignee) fields.assignee = { name: updates.assignee };
        if (updates.alarmId) fields[IssueCustomfield.alarmId] = updates.alarmId;
        if (updates.authorizedChangeContent) fields[IssueCustomfield.authorizedChangeContent] = updates.authorizedChangeContent;
        if (updates.relativeIssueId) fields[IssueCustomfield.relativeIssueId] = updates.relativeIssueId;
        if (updates.snCode) fields[IssueCustomfield.snCode] = updates.snCode;
        if (updates.relatedSN) fields[IssueCustomfield.relatedSN] = updates.relatedSN;
        if (typeof updates.isDown === 'boolean') fields[IssueCustomfield.isDown] = updates.isDown ? { "value": "yes" } : { "value": "no" };
        if (typeof updates.syncToCustomer === 'boolean') fields[IssueCustomfield.syncToCustomer] = updates.syncToCustomer ? { "value": "Yes" } : { "value": "No" };
        if (updates.maintenanceOperation) fields[IssueCustomfield.maintenanceOperation] = updates.maintenanceOperation;
        if (updates.operationPermissions) fields[IssueCustomfield.operationPermissions] = updates.operationPermissions;

        if (updates.bootType) fields[IssueCustomfield.bootType] = updates.bootType;
        if (updates.os) fields[IssueCustomfield.os] = updates.os;
        if (updates.cleanDataDisk) fields[IssueCustomfield.cleanDataDisk] = updates.cleanDataDisk;

        if (typeof updates.authorized === 'boolean') fields[IssueCustomfield.authorized] = updates.authorized ? { "value": "Yes" } : { "value": "No" };
        if (updates.authorizedAt) fields[IssueCustomfield.authorizedAt] = updates.authorizedAt.toString();
        if (updates.serverSn) fields[IssueCustomfield.serverSn] = updates.serverSn;
        if (updates.networkSn) fields[IssueCustomfield.networkSn] = updates.networkSn;
        if (updates.faultType) fields[IssueCustomfield.faultType] = updates.faultType;
        if (updates.rackID) fields[IssueCustomfield.rackID] = updates.rackID;
        if (updates.dueAt) fields[IssueCustomfield.dueAt] = updates.dueAt.toString();

        if (updates.estimatedStartDate) {
            const date = updates.estimatedStartDate instanceof Date
                ? updates.estimatedStartDate
                : new Date(updates.estimatedStartDate);

            fields[IssueCustomfield.estimatedStartDate] = DateUtil.formatDateForJira(date);
        }

        if (updates.rnTicketId) fields[IssueCustomfield.rnTicketId] = updates.rnTicketId;

        if (updates.relatedComponents) fields[IssueCustomfield.relatedComponents] = updates.relatedComponents;

        if (updates.idcSubType) fields[IssueCustomfield.idcSubType] = updates.idcSubType;

        if (updates.newSn) fields[IssueCustomfield.newSn] = updates.newSn;

        if (updates.networkDevice) fields[IssueCustomfield.networkDevice] = updates.networkDevice;

        if (updates.fault_start_time) fields[IssueCustomfield.fault_start_time] = updates.fault_start_time;
        if (updates.fault_start_time_upload_image != null) {
            fields[IssueCustomfield.fault_start_time_upload_image] = updates.fault_start_time_upload_image;
        }
        if (updates.fault_end_time) fields[IssueCustomfield.fault_end_time] = updates.fault_end_time;
        if (updates.fault_end_time_upload_image) fields[IssueCustomfield.fault_end_time_upload_image] = updates.fault_end_time_upload_image;

        if (updates.postmortem_is_gpu_down) fields[IssueCustomfield.postmortem_is_gpu_down] = updates.postmortem_is_gpu_down;
        if (updates.postmortem_server_sn != null) {
            fields[IssueCustomfield.postmortem_server_sn] = updates.postmortem_server_sn;
        }
        if (updates.postmortem_need_log) fields[IssueCustomfield.postmortem_need_log] = updates.postmortem_need_log;
        if (updates.postmortem_time) fields[IssueCustomfield.postmortem_time] = updates.postmortem_time;

        if (updates.collect_log_time) fields[IssueCustomfield.collect_log_time] = updates.collect_log_time;
        if (updates.collect_log_upload_image != null) {
            fields[IssueCustomfield.collect_log_upload_image] = updates.collect_log_upload_image;
        }

        if (updates.manual_confirm_resolved_time) fields[IssueCustomfield.manual_confirm_resolved_time] = updates.manual_confirm_resolved_time;
        if (updates.manual_confirm_resolved_upload_image) fields[IssueCustomfield.manual_confirm_resolved_upload_image] = updates.manual_confirm_resolved_upload_image;

        if (updates.order_response_time != undefined || updates.order_response_time != null) fields[IssueCustomfield.order_response_time] = updates.order_response_time;
        if (updates.pbd_finish_time != undefined || updates.pbd_finish_time != null) fields[IssueCustomfield.pbd_finish_time] = updates.pbd_finish_time;
        if (updates.rn_confirm_resolved_time != undefined || updates.rn_confirm_resolved_time != null) fields[IssueCustomfield.rn_confirm_resolved_time] = updates.rn_confirm_resolved_time;
        if (updates.rn_fault_id != undefined || updates.rn_fault_id != null) fields[IssueCustomfield.rn_fault_id] = updates.rn_fault_id;
        if (updates.isNetworkEffectServer != undefined || updates.isNetworkEffectServer != null) fields[IssueCustomfield.isNetworkEffectServer] = updates.isNetworkEffectServer;

        if (updates.postmortem_fault_type) fields[IssueCustomfield.postmortem_fault_type] = updates.postmortem_fault_type;
        if (updates.postmortem_maintenance_operation) fields[IssueCustomfield.postmortem_maintenance_operation] = updates.postmortem_maintenance_operation;

        if (updates.pbd_finish_timestamp != undefined || updates.pbd_finish_timestamp != null) fields[IssueCustomfield.pbd_finish_timestamp] = updates.pbd_finish_timestamp;
        if (updates.confirm_resolved_timestamp != undefined || updates.confirm_resolved_timestamp != null) fields[IssueCustomfield.confirm_resolved_timestamp] = updates.confirm_resolved_timestamp;
        if (updates.response_timestamp != undefined || updates.response_timestamp != null) fields[IssueCustomfield.response_timestamp] = updates.response_timestamp;
        if (updates.root_cause != undefined || updates.root_cause != null) fields[IssueCustomfield.root_cause] = updates.root_cause;
        if (updates.transceiver_result != undefined || updates.transceiver_result != null) fields[IssueCustomfield.transceiver_result] = updates.transceiver_result;
        if (updates.transceiver_node != undefined || updates.transceiver_node != null) fields[IssueCustomfield.transceiver_node] = updates.transceiver_node;
        if (updates.transceiver_attachments != undefined || updates.transceiver_attachments != null) fields[IssueCustomfield.transceiver_attachments] = updates.transceiver_attachments;
        if (updates.transceiver_cleanup_time != undefined || updates.transceiver_cleanup_time != null) fields[IssueCustomfield.transceiver_cleanup_time] = updates.transceiver_cleanup_time;
        if (updates.servers_tenant != undefined || updates.servers_tenant != null) fields[IssueCustomfield.servers_tenant] = updates.servers_tenant;

        const data = { fields };

        console.log(data);

        try {
            return await axios.put(url, data, { headers: await this.getHeaders() });
        } catch (err: any) {
            console.error(`Jira updateIssue error: `, err.response?.data || err.message);
            throw new Error(err.response?.data?.errorMessages?.join(', ') || err.message);
        }
    }


    async deleteIssue(issueIdOrKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.delete(issueIdOrKey)}`;
        return await axios.delete(url, { headers: await this.getHeaders() });
    }

    async getIssue(issueIdOrKey: string, needLog: boolean = false, needComment: boolean = false) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.get(issueIdOrKey)}`;
        let expands = [];
        if (needLog) {
            expands.push('changelog');
        }
        if (needComment) {
            expands.push('comment');
        }
        if (expands.length > 0) {
            return await axios.get(url, {
                headers: await this.getHeaders(),
                params: {
                    expand: expands.join(',')
                }
            });
        }
        else {
            return await axios.get(url, {
                headers: await this.getHeaders()
            });
        }
    }

    async getIssueWithLog(issueIdOrKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.get(issueIdOrKey)}`;
        const fullUrl = `${url}?expand=changelog`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    async getIssues(startAt: number, maxResults: number, jql: string) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.getIssuses(startAt, maxResults, jql)}`;
            console.log(url)
            return await axios.get(url, { headers: await this.getHeaders() });
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }




    async searchIssuesList(
        jql: string,
        startAt = 0,
        maxResults = 50,
        expand?: string
    ): Promise<{ total: number; issues: any[] }> {
        try {
            const url = `${process.env.JIRA_BASE_URL}/rest/api/2/search`;
            const body: any = { jql, startAt, maxResults };
            if (expand) body.expand = expand;

            const res = await axios.post(url, body, {
                headers: await this.getHeaders(),
                timeout: 60000
            });

            if (!res.data || !Array.isArray(res.data.issues)) {
                console.warn('Jira 返回异常:');
                console.dir(res.data, { depth: null, colors: true });
                return { total: 0, issues: [] };
            }

            // // 输出整个返回对象，安全处理循环引用
            // console.log('Jira 返回数据:');
            // console.dir(res.data, { depth: null, colors: true });

            return {
                total: res.data.total ?? 0,
                issues: res.data.issues
            };
        } catch (err: any) {
            console.error('查询 Jira Issue 失败, JQL:', jql, err.response?.data || err.message);
            return { total: 0, issues: [] };
        }
    }

    async searchIssuesListForExport(
        jql: string,
        startAt = 0,
        maxResults = 50,
        fields: string[]
    ): Promise<{ total: number; issues: any[] }> {
        try {
            const url = `${process.env.JIRA_BASE_URL}/rest/api/2/search`;
            const body: any = { jql, startAt, maxResults, fields: fields };

            const res = await axios.post(url, body, {
                headers: await this.getHeaders(),
                timeout: 60000
            });

            if (!res.data || !Array.isArray(res.data.issues)) {
                console.warn('Jira 返回异常:');
                console.dir(res.data, { depth: null, colors: true });
                return { total: 0, issues: [] };
            }

            return {
                total: res.data.total ?? 0,
                issues: res.data.issues
            };
        } catch (err: any) {
            console.error('查询 Jira Issue 失败, JQL:', jql, err.response?.data || err.message);
            return { total: 0, issues: [] };
        }
    }


    /** 指派问题给用户 */
    async assignIssue(issueIdOrKey: string, assignee: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.assign(issueIdOrKey)}`;
        const header = await this.getHeaders();
        return await axios.put(url, { name: assignee }, { headers: await this.getHeaders() });
    }

    /** 获取指定处理人的问题列表 */
    async getIssuesByAssignee(username: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.search(`assignee=${username}`)}`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    /** 按 JQL 搜索问题（分页） */
    async searchIssues(jql: string, pageIndex: number, pageSize: number) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.search(jql)}`;
            return await axios.get(url, {
                headers: await this.getHeaders(), params: {
                    pageIndex,
                    pageSize,
                },
            });
        } catch (error: any) {
            console.log(error.message);
            throw new Error(error.message);
        }
    }

    /** 更新问题解决结果 */
    async updateIssueResolution(issueIdOrKey: string, resolutionName: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.update(issueIdOrKey)}`;
        const data = {
            fields: {
                resolution: {
                    name: resolutionName,
                },
            },
        };
        return await axios.put(url, data, { headers: await this.getHeaders() });
    }

    // -------- 项目信息 --------

    async listProjects() {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.project.list}`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    async getProjectDetails(projectKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.project.getDetail(projectKey)}`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    async getProjectIssueTypes(projectKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.project.getDetail(projectKey)}`;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data.issueTypes.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            subtask: item.subtask,
        }));
    }

    async getTransitions(issueIdOrKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.transition(issueIdOrKey)}`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }



    /**
   * 状态流转
   * @param issueIdOrKey Issue Key 或 ID
   * @param targetStatusNameOrId 目标状态 ID 或名称，方法会自动找到对应 transitionId
   */
    public async transitionIssue(issueIdOrKey: string, targetStatusNameOrId: string, name?: string) {
        try {
            const headers = await this.getHeaders();

            // 1. 获取可用 transitions
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.transition(issueIdOrKey)}`;
            const res = await axios.get(url, { headers });
            const transitions = res.data.transitions;

            if (!transitions || transitions.length === 0) {
                throw new Error(`Issue ${issueIdOrKey} 当前没有可用 transitions`);
            }

            // 2. 根据目标状态 id 或名称找到 transition
            const transition = transitions.find((t: Transition) =>
                t.id === targetStatusNameOrId || t.to.id === targetStatusNameOrId || t.to.name === targetStatusNameOrId
            );

            if (!transition) {
                throw new Error(`找不到可用的 transition 匹配 ${targetStatusNameOrId}`);
            } else {
                const transitionId = transition.id;

                // 3. 调用 transition API
                await axios.post(
                    `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.transition(issueIdOrKey)}`,
                    { transition: { id: transitionId } },
                    { headers }
                );

                return { success: true, transitionId, toStatus: transition.to.name };
            }
        } catch (error: any) {
            console.log(error.message)
            throw new Error(error.message);
        }
    }

    /** 获取所有解决结果 */
    async getResolutions() {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.resolution.list}`;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    /** 根据名称查找解决结果 */
    async findResolutionByName(name: string) {
        const res = await this.getResolutions(); // 返回的是 AxiosResponse
        return await res.data.find((r: any) => r.name.toLowerCase() === name.toLowerCase());
    }

    // -------- 扩展功能：评论 --------

    async addComment(issueIdOrKey: string, body: string) {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.comments.add(issueIdOrKey)}`;
            return await axios.post(url, { body }, { headers: await this.getHeaders() });
        } catch (error) {
            console.error('上传附件并评论失败', error);
            throw error;
        }
    }

    //评论列表
    async listComments(issueIdOrKey: string, startAt: number, maxResults: number) {
        try {
            const headers = await this.getHeaders();

            // 1️⃣ 获取评论
            const commentsUrl = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.comments.list(issueIdOrKey)}?startAt=${startAt}&maxResults=${maxResults}`;
            const commentsRes = await axios.get(commentsUrl, { headers });
            const { comments, total } = commentsRes.data;

            // 2️⃣ 获取 issue 附件
            const issueUrl = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.get(issueIdOrKey)}`;
            const issueRes = await axios.get(issueUrl, { headers });
            const attachments = issueRes.data.fields.attachment || [];

            // 3️⃣ 解析评论正文中的附件引用
            // 解析评论正文中的附件引用（兼容尾部空格）
            const commentsWithAttachments = comments.map((comment: any) => {
                // 正则匹配 Jira Wiki 风格附件 !filename|可选说明!
                const regex = /!([^\|!\n]+?)\s*(?:\|[^!]*)?!/g;
                const matchedAttachments: any[] = [];
                let match: RegExpExecArray | null;

                while ((match = regex.exec(comment.body)) !== null) {
                    // 去掉文件名首尾空格
                    const filename = match[1].trim();

                    // 在 attachments 中查找匹配文件
                    const file = attachments.find((a: any) => a.filename === filename);

                    if (file) {
                        matchedAttachments.push({
                            ...file,
                            // Jira 真实 URL（调试用，可选）
                            jiraUrl: `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.attachments.getFile(file.id, file.filename)}`,
                            // 代理 URL（前端用）
                            proxyUrl: `/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`
                        });
                    }
                }

                return {
                    ...comment,
                    attachments: matchedAttachments,
                };
            });


            return {
                total,
                comments: commentsWithAttachments,
            };
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }


    // 删除单条评论
    async deleteComment(issueIdOrKey: string, commentId: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.comments.delete(issueIdOrKey, commentId)} `;
        return await axios.delete(url, { headers: await this.getHeaders() });
    }

    // 获取单条评论详情
    async getComment(issueIdOrKey: string, commentId: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.comments.get(issueIdOrKey, commentId)} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    // 获取最近评论详情
    async getLatestComment(issueIdOrKey: string) {
        try {
            const headers = await this.getHeaders();

            // 1️⃣ 获取评论
            const commentsUrl = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.comments.list(issueIdOrKey)}?&maxResults=1&orderBy=-created`;
            const commentsRes = await axios.get(commentsUrl, { headers });
            const { comments } = commentsRes.data;

            // 2️⃣ 获取 issue 附件
            const issueUrl = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.get(issueIdOrKey)}`;
            const issueRes = await axios.get(issueUrl, { headers });
            const attachments = issueRes.data.fields.attachment || [];

            // 3️⃣ 解析评论正文中的附件引用
            // 解析评论正文中的附件引用（兼容尾部空格）
            const commentsWithAttachments = comments.map((comment: any) => {
                // 正则匹配 Jira Wiki 风格附件 !filename|可选说明!
                const regex = /!([^\|!\n]+?)\s*(?:\|[^!]*)?!/g;
                const matchedAttachments: any[] = [];
                let match: RegExpExecArray | null;

                while ((match = regex.exec(comment.body)) !== null) {
                    // 去掉文件名首尾空格
                    const filename = match[1].trim();

                    // 在 attachments 中查找匹配文件
                    const file = attachments.find((a: any) => a.filename === filename);

                    if (file) {
                        matchedAttachments.push({
                            ...file,
                            // Jira 真实 URL（调试用，可选）
                            jiraUrl: `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.attachments.getFile(file.id, file.filename)}`,
                            // 代理 URL（前端用）
                            proxyUrl: `/issue/comment/attachment/${file.id}/${encodeURIComponent(file.filename)}`
                        });
                    }
                }

                return {
                    ...comment,
                    attachments: matchedAttachments,
                };
            });


            return commentsWithAttachments[0];
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }

    // -------- 扩展功能：带多个附件的评论 --------
    /**
     * 添加带多个附件的评论（会先批量上传附件再引用）
     */


    async addCommentWithAttachments(issueIdOrKey: string, filePaths: string[], commentBody?: string) {
        try {
            // 上传附件（你的方法返回的是axios响应）
            const response = await this.uploadAttachments(issueIdOrKey, filePaths);
            // 返回的附件数组通常在 response.data 里
            const uploadedAttachments = response.data;

            // 拼接评论内容，引用所有附件：!filename!
            const attachmentsReferences = uploadedAttachments
                .map((att: { filename: string }) => `!${att.filename} !`)
                .join('\n');

            // 组合最终评论body
            const body = `${commentBody || ''} \n${attachmentsReferences} `;

            // 发送评论
            return await this.addComment(issueIdOrKey, body);
        } catch (error) {
            console.error('上传附件并评论失败', error);
            throw error;
        }
    }



    // -------- 扩展功能：工时 --------

    async addWorklog(issueIdOrKey: string, timeSpent: string, comment?: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.worklog.add(issueIdOrKey)} `;
        const data: any = { timeSpent };
        if (comment) data.comment = comment;
        return await axios.post(url, data, { headers: await this.getHeaders() });
    }

    async listWorklogs(issueIdOrKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.worklog.list(issueIdOrKey)} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    // -------- 项目扩展 --------

    async getProjectComponents(projectKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.project.components(projectKey)} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    async getProjectVersions(projectKey: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.project.versions(projectKey)} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    async listCustomFields() {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.customField.metadata} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    //上传附件
    async uploadAttachment(issueIdOrKey: string, filePath: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.uploadAttachment(issueIdOrKey)} `;

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const headers = {
            ...await this.getHeaders(),
            ...form.getHeaders(),
            'X-Atlassian-Token': 'no-check', // 必须设置，否则报错
        };
        delete (headers as any)['Content-Type'];

        return await axios.post(url, form, { headers });
    }



    /** 上传附件到 Jira 问题 */
    async uploadAttachments(issueIdOrKey: string, filePaths: string[]) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.uploadAttachment(issueIdOrKey)} `;
        const form = new FormData();
        try {
            for (const filePath of filePaths) {
                const filename = filePath.split(/[\\/]/).pop();
                form.append('file', fs.createReadStream(filePath), filename);
            }

            const headers = await this.getFileUploadHeaders(form);

            return await axios.post(url, form, { headers });
        } catch (err) {
            console.error(`===================`, JSON.stringify(err));
            throw new Error(JSON.stringify(err));
        }
    }

    /** 设置用户属性 */
    async setUserProperty(username: string, key: string, value: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.userProperty.set(username, key)} `;
        return await axios.put(url, JSON.stringify(value), {
            headers: {
                ...await this.getHeaders(),
                'Content-Type': 'application/json',
            },
        });
    }

    /** 获取用户属性 */
    async getUserProperty(username: string, key: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.userProperty.get(username, key)} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    /** 获取用户所有属性 key 列表 */
    async getUserPropertyKeys(username: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.userProperty.listKeys(username)} `;
        return await axios.get(url, { headers: await this.getHeaders() });
    }

    /** 删除用户属性 */
    async deleteUserProperty(username: string, key: string) {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.userProperty.delete(username, key)} `;
        return await axios.delete(url, { headers: await this.getHeaders() });
    }

    // 🆕 获取所有全局优先级
    async getAllPriorities() {
        try {
            const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.priority.list} `;
            const res = await axios.get(url, { headers: await this.getHeaders() });

            // 确保返回的是数组
            if (Array.isArray(res.data)) {
                return res.data;
            } else if (res.data?.priorities && Array.isArray(res.data.priorities)) {
                return res.data.priorities;
            } else {
                console.warn('Jira getAllPriorities 返回的数据不是数组:', res.data);
                return [];
            }
        } catch (err: any) {
            console.log(err.message);
            throw new Error(err.message);
        }
    }


    // 🆕 获取所有字段信息
    async getFields() {
        const url = `${process.env.JIRA_BASE_URL}${jiraApiUrls.customField.metadata} `;
        const res = await axios.get(url, { headers: await this.getHeaders() });
        return res.data; // 返回字段数组
    }

    /**
     * 获取 Jira 附件二进制数据
     * @param attachmentUrl 完整的 Jira 附件 URL，例如：
     *  https://jira.example.com/secure/attachment/12345/image.png
     */
    // 获取附件二进制数据
    async getAttachment(id: string, filename: string) {
        const headers = await this.getHeaders();
        const attachmentUrl = `${process.env.JIRA_BASE_URL}${jiraApiUrls.issue.attachments.getFile(id, filename)} `;
        const res = await axios.get(attachmentUrl, {
            headers,
            responseType: 'arraybuffer'
        });
        return {
            data: res.data,
            contentType: res.headers['content-type'] || 'application/octet-stream'
        };
    }

    /**
     * 🆕 通用查询：根据任意自定义字段值查找 Issues
     */
    async searchIssuesByCustomField(
        customFieldName: string,
        fieldValue: string,
        projectKey?: string,
        options: {
            fuzzy?: boolean;           // 模糊搜索（默认 false）
            maxResults?: number;       // 最大结果（默认 50）
            startAt?: number;          // 起始位置（默认 0）
            additionalJql?: string;    // 额外 JQL 条件
        } = {}
    ): Promise<{ total: number; issues: any[] }> {
        try {
            const {
                fuzzy = false,
                maxResults = 50,
                startAt = 0,
                additionalJql = ''
            } = options;

            const project = projectKey || process.env.JIRA_PROJECT_KEY;
            if (!project) throw new Error('projectKey 必须提供（参数或 JIRA_PROJECT_KEY 环境变量）');

            // ✅ 构建 JQL：用 clauseNames 中的字段名
            const operator = customFieldName === 'alarmID' || customFieldName === 'rn_fault_id' ? '~' : (fuzzy ? '~' : '=');
            const escapedValue = `"${fieldValue.replace(/"/g, '\\"')}"`;
            let jql = `project = "${project}" AND ${customFieldName} ${operator} ${escapedValue}`;

            // 追加额外条件
            if (additionalJql) {
                jql += ` AND ${additionalJql}`;
            }

            console.log(`🔍 通用查询 JQL: ${jql}`);

            // 调用你的现有 searchIssuesList 方法
            return await this.searchIssuesList(
                jql,
                startAt,
                maxResults
            );

        } catch (err: any) {
            console.error(`❌ 自定义字段查询失败 [${customFieldName}=${fieldValue}]:`, err.response?.data || err.message);
            throw new Error(err.message);
        }
    }

    /**
     * 🆕 查询最近 N 条：Alarm 类型 + PBD-CANCELED 状态的 issue
     */
    async getRecentCanceledAlarmIssues(limit: number = 1000): Promise<{ total: number; issues: any[] }> {
        console.log(`🚀 查询最近 ${limit} 条 Alarm 已恢复 issue...`);

        const PAGE_SIZE = 100; // JIRA 单页最大
        let allIssues: any[] = [];
        let startAt = 0;

        while (allIssues.length < limit) {
            const remaining = limit - allIssues.length;
            const currentPageSize = Math.min(PAGE_SIZE, remaining);

            console.log(`📄 分页 ${Math.floor(startAt / PAGE_SIZE) + 1}: 获取 ${currentPageSize} 条...`);

            // 🔥 JQL：Alarm 类型 + 已恢复 + 最新优先
            const jql = `issuetype = Alarm AND status = "PBD-CANCELED" ORDER BY created DESC`;

            // 用你的 searchIssuesList 方法
            const result = await this.searchIssuesList(jql, startAt, currentPageSize);

            if (result.issues.length === 0) break;

            allIssues.push(...result.issues);
            startAt += currentPageSize;

            if (allIssues.length >= limit) break;
        }

        // 🔥 精确裁剪到 limit 条
        const finalIssues = allIssues.slice(0, limit);

        console.log(`\n🎉 查询完成！`);
        console.log(`📊 总计: ${finalIssues.length} 条 Alarm 已恢复 issue`);
        console.log(`🔑 示例: ${finalIssues.slice(0, 5).map(i => i.key).join(', ')}`);
        console.log(`⏰ 最早: ${finalIssues[finalIssues.length - 1]?.fields.created}`);

        return {
            total: finalIssues.length,
            issues: finalIssues
        };
    }

    /** 获取 Alarm 已指派问题列表（可限制条数） */
    async getAlarmAssignedIssues(limit: number = 1000): Promise<{ total: number; issues: any[] }> {
        const PAGE_SIZE = 100; // JIRA 单页最大
        let allIssues: any[] = [];
        let startAt = 0;

        while (allIssues.length < limit) {
            const remaining = limit - allIssues.length;
            const currentPageSize = Math.min(PAGE_SIZE, remaining);

            console.log(`📄 分页 ${Math.floor(startAt / PAGE_SIZE) + 1}: 获取 ${currentPageSize} 条...`);

            // 🔥 JQL：Alarm 类型 + 已恢复 + 最新优先
            const jql = `issuetype = Issue AND status = "PBD-ASSIGNED" AND alarmID is not EMPTY ORDER BY created DESC`;

            // 用你的 searchIssuesList 方法
            const result = await this.searchIssuesList(jql, startAt, currentPageSize);

            if (result.issues.length === 0) break;

            allIssues.push(...result.issues);
            startAt += currentPageSize;

            if (allIssues.length >= limit) break;
        }

        // 🔥 精确裁剪到 limit 条
        const finalIssues = allIssues.slice(0, limit);

        console.log(`\n🎉 查询完成！`);
        console.log(`📊 总计: ${finalIssues.length} 条 Alarm Assigned issue`);
        console.log(`🔑 示例: ${finalIssues.slice(0, 5).map(i => i.key).join(', ')}`);
        console.log(`⏰ 最早: ${finalIssues[finalIssues.length - 1]?.fields.created}`);

        return {
            total: finalIssues.length,
            issues: finalIssues
        };
    }

    /**
     * 🆕 查询最近 N Issue 类型 + PBD-CANCELED 状态的 issue
     */
    async getRecentCanceledIssues(limit: number = 1000): Promise<{ total: number; issues: any[] }> {
        console.log(`🚀 查询最近 ${limit} 条 Issue 已恢复 issue...`);

        const PAGE_SIZE = 100; // JIRA 单页最大
        let allIssues: any[] = [];
        let startAt = 0;

        while (allIssues.length < limit) {
            const remaining = limit - allIssues.length;
            const currentPageSize = Math.min(PAGE_SIZE, remaining);

            console.log(`📄 分页 ${Math.floor(startAt / PAGE_SIZE) + 1}: 获取 ${currentPageSize} 条...`);

            // 🔥 JQL：Alarm 类型 + 已恢复 + 最新优先
            const jql = `issuetype = Issue AND status = "PBD-CANCELED" AND alarmID is not EMPTY ORDER BY created DESC`;

            // 用你的 searchIssuesList 方法
            const result = await this.searchIssuesList(jql, startAt, currentPageSize);

            if (result.issues.length === 0) break;

            allIssues.push(...result.issues);
            startAt += currentPageSize;

            if (allIssues.length >= limit) break;
        }

        // 🔥 精确裁剪到 limit 条
        const finalIssues = allIssues.slice(0, limit);

        console.log(`\n🎉 查询完成！`);
        console.log(`📊 总计: ${finalIssues.length} 条 Alarm 已恢复 issue`);
        console.log(`🔑 示例: ${finalIssues.slice(0, 5).map(i => i.key).join(', ')}`);
        console.log(`⏰ 最早: ${finalIssues[finalIssues.length - 1]?.fields.created}`);

        return {
            total: finalIssues.length,
            issues: finalIssues
        };
    }

    /** 按日期范围获取问题列表（可限制条数） */
    async getIssuesBtDateRange(startDate: string, endDate: string, limit: number = 1000): Promise<{ total: number; issues: any[] }> {
        console.log(`🚀 查询最近 ${limit} 条 Alarm 已恢复 issue...`);

        const PAGE_SIZE = 100; // JIRA 单页最大
        let allIssues: any[] = [];
        let startAt = 0;

        while (allIssues.length < limit) {
            const remaining = limit - allIssues.length;
            const currentPageSize = Math.min(PAGE_SIZE, remaining);

            console.log(`📄 分页 ${Math.floor(startAt / PAGE_SIZE) + 1}: 获取 ${currentPageSize} 条...`);

            // 🔥 JQL：Alarm 类型 + 已恢复 + 最新优先
            const jql = 'created >= ' + startDate + ' AND created <= ' + endDate;

            // 用你的 searchIssuesList 方法
            const result = await this.searchIssuesList(jql, startAt, currentPageSize);

            if (result.issues.length === 0) break;

            allIssues.push(...result.issues);
            startAt += currentPageSize;

            if (allIssues.length >= limit) break;
        }

        // 🔥 精确裁剪到 limit 条
        const finalIssues = allIssues.slice(0, limit);

        console.log(`\n🎉 查询完成！`);
        console.log(`📊 总计: ${finalIssues.length} 条日期内 issue`);
        console.log(`🔑 示例: ${finalIssues.slice(0, 5).map(i => i.key).join(', ')}`);
        console.log(`⏰ 最早: ${finalIssues[finalIssues.length - 1]?.fields.created}`);

        return {
            total: finalIssues.length,
            issues: finalIssues
        };
    }
}
