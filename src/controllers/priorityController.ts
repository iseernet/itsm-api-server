import { Request, Response } from 'express';
import { getPriorityList } from '../services/priorityService';
import { PriorityQueryPayload } from '../types/priority';


//查询Priority 列表
export const getPriorities = async (req: Request<{}, {}, {}>, res: Response) => {

    try {
        const ret = await getPriorityList();
        return res.send({
            success: true,
            data: ret
        });
    } catch (error: any) {
        // return res.status(500).json({ message: error.message });
        return res.send({
            success: false,
            message: error.message
        });
    }


};














