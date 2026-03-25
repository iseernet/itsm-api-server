import { builtInGroups } from '../enums/groupEnum';
import { AuthUserPayload } from '../middleware/auth';
import { User, UserQueryPayload } from '../types/user';
import { JiraClient } from '../utils/jira/JiraClient';

// export const addUser = async (
//     user: AuthUserPayload,
//     data: User
// ) => {

//     try {
//         const jira = new JiraClient(user.username as string);

//         // const user = await jira.getUserInfo(data.username);
//         // if (user) {
//         //     return res.send({
//         //         success: false,
//         //         message: "User already exists",
//         //     });
//         // }
//         const creatUserRes = await jira.createUser(data);
//         const base64Token = Buffer.from(data.username + ':' + data.password).toString('base64');
//         // // 设置 token 属性
//         await jira.setUserProperty(data.username, 'token', base64Token);
//         if (data.groups) {
//             const groups = data.groups.split(',').map(g => g.trim()); // ['1','2','3']

//             for (const group of groups) {
//                 await jira.addUserToGroup(data.username, group);
//             }
//         }


//         // 将 用户 添加到项目 指定的角色中 角色中

//         data.role = process.env.JIRA_ROLE;
//         await jira.addUserToRole(process.env.JIRA_PROJECT_KEY as string, data.role as string, data.username);


//         // .then(() => console.log('用户添加成功'))
//         // .catch(err => console.error('添加失败:', err.response?.data || err.message));

//         return creatUserRes.data;
//     } catch (error: any) {
//         console.error("JIRA login failed：", error.response?.data || error.message);
//         throw new Error(error.message);
//     }
// };

export const addUser = async (
    user: AuthUserPayload,
    data: User
) => {
    try {
        const jira = new JiraClient(user.username as string);

        const creatUserRes = await jira.createUser(data);
        const base64Token = Buffer.from(data.username + ':' + data.password).toString('base64');
        await jira.setUserProperty(data.username, 'token', base64Token);

        // 添加用户到组
        await jira.addUserToGroup(data.username, "jira-administrators");
        // if (data.groups) {
        //     const groups = data.groups.split(',').map(g => g.trim());
        //     for (const group of groups) {
        //         await jira.addUserToGroup(data.username, group);
        //     }
        // }

        // 添加用户到项目角色
        if (data.role_ids) {
            const roles = data.role_ids!.split(',').map(g => g.trim());
            for (const role_id of roles) {
                await jira.addUserToProjectRole(process.env.JIRA_PROJECT_KEY!, parseInt(role_id), data.username);
            }
            // data.role = process.env.JIRA_ROLE;
        }

        // await jira.addUserToRole(process.env.JIRA_PROJECT_KEY as string, data.role as string, data.username);

        // ⭐ 设置头像（如果有上传文件）
        if (data.avatar) {
            try {
                const tmpRes = await jira.uploadTemporaryUserAvatar(data.username, data.avatar);
                const fileId = tmpRes.temporaryAvatarId;
                await jira.confirmUserAvatar(data.username, fileId);
            } catch (err: any) {
                console.error("设置头像失败:", err.response?.data || err.message);
            }
        }

        if(data.feishu){
            await setUserFeishuPhone(data.username, data.feishu);
        }

        return creatUserRes.data;
    } catch (error: any) {
        console.error("JIRA login failed：", error.response?.data || error.message);
        throw new Error(error.message);
    }
};

export const getUserList = async (
    user: AuthUserPayload,
    params: UserQueryPayload
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        // // 动态构建 JQL
        // const conditions = [];
        // if (params.username) conditions.push(`user ~ "${params.username}"`);
        // if (params.emailAddress) conditions.push(`email ~ "${params.emailAddress}"`);
        // if (params.displayName) conditions.push(`displayName ~ "${params.displayName}"`);
        // if (params.group) conditions.push(`membersOf("${params.group}")`);
        // if (params.project) conditions.push(`project = "${params.project}"`);
        // if (params.role) conditions.push(`projectRole = "${params.role}"`);
        // const jql = conditions.join(' AND ');

        const pageIndex = params.pageIndex || 1;
        const pageSize = params.pageSize || 50;
        const startAt = (pageIndex - 1) * pageSize;

        const rs = await jira.getUserListByPayload(params, startAt, pageSize);


        return {
            totalCount: rs.total || 0,
            list: rs.users || []
        };
    } catch (error: any) {
        console.error('search Users failed:', error.message);
        throw new Error(error.message);
    }
};



export const getUserInfo = async (
    user: AuthUserPayload,
    Key: string,
    projectKey: string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

        // 1️⃣ 获取用户基本信息
        const rs = await jira.getUserByKey(Key);

        const feishuPhone = await getUserFeishuPhone(rs.name);
        rs['feishu'] = feishuPhone;

        // 2️⃣ 获取用户组信息
        let groups: string[] = [];
        try {
            const detailRes = await jira.getUserAndGroupByName(rs.name, { expandGroups: true });
            groups = detailRes.groups.filter((g: any) => !builtInGroups.includes(g));
        } catch (err: any) {
            console.error('获取用户组失败:', err.message);
        }

        // 3️⃣ 获取用户在项目的角色信息
        let roles: Array<{ id: string; name: string }> = [];

        try {
            const projectRolesMap = await jira.getProjectRoles(projectKey);

            for (const [roleName, roleData] of Object.entries(projectRolesMap)) {
                // roleData: { id, users: [...] }
                const matchedUser = roleData.users.find(u => u.accountId === (rs.accountId || rs.name));
                if (matchedUser) {
                    roles.push({ id: roleData.id, name: roleName });
                }
            }
        } catch (err: any) {
            console.error('获取用户角色失败:', err.message);
        }

        // 4️⃣ 返回结果
        return {
            ...rs,
            groups,
            roles
        };
    } catch (error: any) {
        console.error('getUserInfo failed:', error.message);
        throw new Error(error.message);
    }
};



// export const getUserInfo = async (
//     user: AuthUserPayload,
//     Key: string
// ) => {
//     try {
//         const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);

//         // 1️⃣ 调用 REST API 获取用户基本信息（avatar, groups 等）
//         const rs = await jira.getUserByKey(Key);

//         // 2️⃣ 查询 Jira PostgreSQL 获取 created_date
//         let createdDate: string | null = null;
//         if (rs && rs.name) { // Jira Data Center 返回的用户标识是 name
//             const query = `
//                 SELECT created_date
//                 FROM cwd_user
//                 WHERE user_name = $1
//                 LIMIT 1
//             `;
//             const result = await jiraDbPool.query(query, [rs.name]);
//             if (result.rows.length > 0) {
//                 createdDate = result.rows[0].created_date;
//             }
//         }

//         // 3️⃣ 返回合并结果
//         return {
//             ...rs,
//             createdDate
//         };
//     } catch (error: any) {
//         console.error('getUserInfo failed:', error.message);
//         throw new Error(error.message);
//     }
// };



export const delUserInfo = async (
    user: AuthUserPayload,
    username: string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        return await jira.deleteUser(username);
    } catch (error: any) {
        throw new Error(error.message);
    }

};

export const setUserFeishuPhone = async (
    username:string,
    feishuPhone:string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        await jira.setUserProperty(username, 'feishu', feishuPhone);
    } catch (error: any) {
        throw new Error(error.message);
    }
};

export const getUserFeishuPhone = async (
    username:string
) => {
    try {
        const jira = new JiraClient(process.env.JIRA_ADMIN_USERNAME as string);
        const res = await jira.getUserProperty(username, 'feishu');
        return res.data.value;
    } catch (error: any) {
        return "";
    }
};

export const updateUserInfo = async (
    user: AuthUserPayload,
    username: string,
    data: User
) => {
    try {
        const jira = new JiraClient(user.username);

        // 1️⃣ 更新用户基本信息
        await jira.updateUser(username, data);

        // // 2️⃣ 更新用户组
        // if (data.groups) {
        //     const groups = data.groups.split(',').map(g => g.trim());

        //     // 先移除用户不在的新组
        //     const currentDetail = await jira.getUserAndGroupByName(username, { expandGroups: true });
        //     const currentGroups = currentDetail.groups || [];
        //     const groupsToRemove = currentGroups.filter((g: any) => !groups.includes(g));
        //     for (const g of groupsToRemove) {
        //         await jira.removeUserFromGroup(username, g);
        //     }

        //     // 添加用户到新组
        //     for (const g of groups) {
        //         if (!currentGroups.includes(g)) {
        //             await jira.addUserToGroup(username, g);
        //         }
        //     }
        // }

        // 修改用户到项目角色
        if (data.role_ids) {
            const roles = data.role_ids.split(',').map(r => r.trim());

            try {
                const projectKey = process.env.JIRA_PROJECT_KEY!;

                // 1️⃣ 获取项目所有角色
                const projectRolesMap = await jira.getProjectRoles(projectKey);

                // 2️⃣ 获取用户当前所在角色 ID
                const currentRoleIds: string[] = [];
                for (const [roleName, roleData] of Object.entries(projectRolesMap)) {
                    const userInRole = roleData.users.find(
                        (u: any) => u.accountId === username || u.name === username
                    );
                    if (userInRole) {
                        currentRoleIds.push(roleData.id);
                    }
                }

                // 3️⃣ 计算差异
                const targetRoleIds = roles.map(r => r.toString());
                const toRemove = currentRoleIds.filter(id => !targetRoleIds.includes(id));
                const toAdd = targetRoleIds.filter(id => !currentRoleIds.includes(id));

                // 4️⃣ 移除用户
                for (const roleId of toRemove) {
                    await jira.removeUsersFromRoleFunc(projectKey, parseInt(roleId), username);
                }

                // 5️⃣ 添加用户
                for (const roleId of toAdd) {
                    await jira.addUserToProjectRole(projectKey, parseInt(roleId), username);
                }

            } catch (err: any) {
                console.error('修改用户项目角色失败:', err.message);
                throw err;
            }
        }


        // 4️⃣ 更新头像（如果有上传文件）
        if (data.avatar) {
            try {
                const tmpRes = await jira.uploadTemporaryUserAvatar(username, data.avatar);
                const fileId = tmpRes.temporaryAvatarId;
                await jira.confirmUserAvatar(username, fileId);
            } catch (err: any) {
                console.error("更新头像失败:", err.response?.data || err.message);
            }
        }

        if(data.feishu){
            await setUserFeishuPhone(username, data.feishu);
        }

        return { success: true };
    } catch (error: any) {
        console.error("更新用户失败:", error.response?.data || error.message);
        throw new Error(error.message);
    }
};
