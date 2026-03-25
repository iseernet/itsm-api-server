import {Request, Response} from 'express';
import {TransceiverCleanupLogPayload, TransceiverCleanupLogQueryPayload} from "../types/transceiverCleanupLog";
import {
    createTransceiverCleanupLog,
    deleteTransceiverCleanupLog,
    getTransceiverCleanupLogById,
    getTransceiverCleanupLogPage,
    hasCleanupInLast30Days,
    updateTransceiverCleanupLog
} from "../services/transceiverCleanupLogService";

export const getCleanupLogPage = async (req: Request<{}, {}, {}, TransceiverCleanupLogQueryPayload>, res: Response) => {
    try {
        const query = req.query;
        const params: TransceiverCleanupLogQueryPayload = {
            pageIndex: query.pageIndex ? parseInt(query.pageIndex as unknown as string) : 1,
            pageSize: query.pageSize ? parseInt(query.pageSize as unknown as string) : 10,
            serverSn: query.serverSn,
            idcTicketId: query.idcTicketId,
            result: query.result,
            cleanupTimeStart: query.cleanupTimeStart ? query.cleanupTimeStart : undefined,
            cleanupTimeEnd: query.cleanupTimeEnd ? query.cleanupTimeEnd : undefined,
            serviceType: query.serviceType,
        };

        const ret = await getTransceiverCleanupLogPage(params);
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'get transceiver cleanup log fail', error: error.message || error });
    }
};

export const getCleanupLogById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const ret = await getTransceiverCleanupLogById(id);
        if (!ret) return res.send({ success: false, message: 'no data' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'create transceiver cleanup log fail', error: error.message || error });
    }
};

export const createCleanupLog = async (req: Request, res: Response) => {
    try {

        let data: TransceiverCleanupLogPayload = req.body;
        if(data.p2p === ''){
            data.p2p = undefined;
        }

        //upload flie
        if (process.env.NODE_ENV === 'production') {
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                const baseUrl = process.env.ITSM_TRANSCEIVER_FILE_URL;

                data.attachment_url = files.map(file => {
                    return `${baseUrl}${file.filename}`;
                }).join(',');
            }
        }


        const ret = await createTransceiverCleanupLog(data);

        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'create transceiver cleanup log fail', error: error.message || error });
    }
};

export const updateCleanupLog = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        let data: TransceiverCleanupLogPayload = req.body;
        if(data.p2p === ''){
            data.p2p = undefined;
        }

        //upload flie
        if (process.env.NODE_ENV === 'production') {
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                const baseUrl = process.env.ITSM_TRANSCEIVER_FILE_URL;

                data.attachment_url = files.map(file => {
                    return `${baseUrl}${file.filename}`;
                }).join(',');
            }
        }

        const ret = await updateTransceiverCleanupLog(id, data);
        if (!ret) return res.send({ success: false, message: 'no data' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'update transceiver cleanup log fail', error: error.message || error });
    }
};

export const deleteCleanupLog = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const ret = await deleteTransceiverCleanupLog(id);
        if (!ret) return res.send({ success: false, message: 'no data' });
        return res.send({ success: true, data: ret });
    } catch (error: any) {
        return res.send({ success: false, message: 'delete transceiver cleanup log fail', error: error.message || error });
    }
};

export const checkNeedCleanup = async (req: Request, res: Response) => {
    try {
        const serverSn = req.body.serverSn as string;
        const serverSns = serverSn
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (serverSns.length === 0) {
            return res.send({ success: false, message: 'serverSn cannot be empty' });
        }
        const hasCleaned = await hasCleanupInLast30Days(serverSns);
        return res.send({ success: true, data: hasCleaned });
    } catch (error: any) {
        return res.send({ success: false, message: 'check transceiver has cleanup in last 30 days fail', error: error.message || error });
    }
};








