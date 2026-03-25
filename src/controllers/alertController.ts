import { Request, Response } from 'express';
import {getAlertDetail} from "../utils/pbdalert/pbdAlert";

//告警详情
export const alertDetail = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.send({
            success: false,
            message: 'id is missing'
        });
    }

    try {
        const ret = await getAlertDetail(id as string);

        if(ret.code == 1000){
            return res.send({
                success: true,
                data: ret.data
            });
        }
        else{
            return res.send({
                success: false,
                message: ret.msg
            });
        }

    } catch (error: any) {
        return res.send({
            success: false,
            message: error.message
        });
    }
};
