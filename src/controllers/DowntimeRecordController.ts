import { Request, Response } from 'express';
import { DowntimeRecordQueryPayload } from "../types/downtimeRecord";
import { getDowntimeRecordPage } from "../services/DowntimeRecordService";

//获取Downtime数据
export const getDowntimeRecord = async (req: Request<{}, {}, {}, DowntimeRecordQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        const params: DowntimeRecordQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as unknown as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as unknown as string) : 10,
            eventId: query.eventId,
            serverSn: query.serverSn,
            ticketId: query.ticketId,
            resolvedTimeStart: query.resolvedTimeStart ? query.resolvedTimeStart : undefined,
            resolvedTimeEnd: query.resolvedTimeEnd ? query.resolvedTimeEnd : undefined,
            sortField: query.sortField ? query.sortField : undefined,
            sortOrder: query.sortOrder ? query.sortOrder : undefined,
        };

        const ret = await getDowntimeRecordPage(params);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'get down time record fail', error: error.message || error });
    }
};








