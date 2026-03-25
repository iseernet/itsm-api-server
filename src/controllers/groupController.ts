import { Request, Response } from 'express';
import * as groupService from '../services/groupService';
import { GroupQueryPayload } from '../types/group';
// 创建组
export const createGroup = async (
    req: Request<{}, {}, { role_ids?: number[]; group_name: string; description?: string }>,
    res: Response
) => {
    const { role_ids, group_name, description } = req.body;

    if (!group_name) {
        return res.send({ success: false, message: '组名称缺失' });
    }

    try {
        // 调用 service 创建组
        const group = await groupService.createGroup(group_name, description, role_ids || []);
        res.send({ success: true, data: group });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

// 删除组
export const deleteGroup = async (req: Request, res: Response) => {
    const { group_name } = req.params;
    if (!group_name) return res.send({ success: false, message: 'group_name is missing' });

    try {
        await groupService.deleteGroup((req as any).user, group_name as string);
        res.send({ success: true, data: { success: true } });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

// 获取所有组
export const listGroups = async (req: Request<{}, {}, GroupQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        // 安全转换 role_id
        let role_id: number | undefined;
        if (query.role_id) {
            const parsed = parseInt(query.role_id as string, 10);
            if (!isNaN(parsed)) {
                role_id = parsed;
            }
        }

        const params: GroupQueryPayload = {
            role_id,
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string, 10) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
            group_name: query.group_name as string | undefined,
        };

        const data = await groupService.getAllGroups((req as any).user, params);
        res.send({ success: true, data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

// 获取组内用户
export const listGroupUsers = async (req: Request<{ group_name: string }, {}, GroupQueryPayload>, res: Response) => {
    const { group_name } = req.params;
    if (!group_name) return res.send({ success: false, message: 'group_name is missing' });

    try {
        const query = req.query;
        const params: GroupQueryPayload = {
            group_name: group_name,
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as string) : 10,
            ...query,
        };
        const data = await groupService.getGroupUsers((req as any).user, params);
        res.send({ success: true, data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

// 添加用户到组
export const addUserToGroup = async (req: Request<{ group_name: string }, {}, { username: string }>, res: Response) => {
    const { group_name } = req.params;
    const { username } = req.body;
    if (!group_name) return res.send({ success: false, message: 'group_name is missing' });
    if (!username) return res.send({ success: false, message: 'username is missing' });

    try {
        const rs = await groupService.addUserToGroup((req as any).user, group_name, username);
        res.send({ success: true, data: rs.data });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

// 从组移除用户
export const removeUserFromGroup = async (req: Request<{ group_name: string; username: string }>, res: Response) => {
    const { group_name, username } = req.params;
    if (!group_name) return res.send({ success: false, message: 'role_name is missing' });
    if (!username) return res.send({ success: false, message: 'username is missing' });

    try {
        await groupService.removeUserFromGroup((req as any).user, group_name, username);
        res.send({ success: true, data: { success: true } });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};

export const getGroupdetail = async (req: Request<{ group_name: string }>, res: Response) => {
    const { group_name } = req.params;
    if (!group_name) return res.send({ success: false, message: 'group_name is missing' });

    try {
        const roleDetail = await groupService.getGroupDetail(group_name, process.env.JIRA_PROJECT_KEY!);
        res.send({ success: true, data: roleDetail });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};


// 更新组
export const updateGroup = async (
    req: Request<{ group_name: string }, {}, { description?: string; role_ids?: number[] }>,
    res: Response
) => {
    const { group_name } = req.params;
    const { description, role_ids } = req.body;

    if (!group_name) {
        return res.send({ success: false, message: 'group_name is missing' });
    }

    try {
        const updatedGroup = await groupService.updateGroup(
            group_name,
            description,
            role_ids || []
        );
        res.send({ success: true, data: updatedGroup });
    } catch (error: any) {
        res.send({ success: false, message: error.message });
    }
};
