import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/config';
import { ParsedQs } from 'qs';
import { keepStringKeys } from '../enums/signatureEnum';

const usedNonces = new Set<string>();
const { appSecrets, allowedTimeDriftMs } = config.signature;

export const isValidAppKey = (
    key: string,
    secrets: Record<string, string>
): key is keyof typeof secrets => {
    return key in secrets;
};

// 对参数对象进行正序排序
export function sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj).sort().reduce((result: Record<string, any>, key) => {
        result[key] = obj[key];
        return result;
    }, {});
}

export function parseParamTypes(obj: Record<string, any>): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};

    for (const key in obj) {
        let value = obj[key];

        if (typeof value !== 'string') {
            result[key] = value;
            continue;
        }

        // 先检查是否在保持字符串列表里
        if (keepStringKeys.includes(key)) {
            if (!isNaN(Number(value)) && value.trim() !== '') {
                result[key] = Number(value);
            }
            continue;
        }

        // // Convert to number if numeric
        // if (!isNaN(Number(value)) && value.trim() !== '') {
        //     result[key] = Number(value);
        // }
        // Convert to boolean
        else if (value === 'true') {
            result[key] = true;
        } else if (value === 'false') {
            result[key] = false;
        }
        // Keep as string
        else {
            result[key] = value;
        }
    }

    return result;
}


export const signatureMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let { timestamp, signature, nonce, appkey } = req.headers;
    const clientId = req.headers["client-id"];

    // console.log("signatureMiddleware headers:", req.headers);
    // console.log("signatureMiddleware query:", req.query);
    // console.log("signatureMiddleware body:", req.body);

    if (!timestamp || !signature || !nonce) {
        return res.status(400).json({ message: 'Missing signature parameters' });
    }

    if (!appkey) {
        if (clientId) {
            // 兼容老的 client-id 头
            appkey = clientId;
        } else {
            return res.status(400).json({ message: 'Missing appkey' });
        }
    }

    const ts = Number(timestamp);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > allowedTimeDriftMs) {
        return res.status(408).json({ message: 'Timestamp expired or invalid' });
    }

    if (usedNonces.has(nonce as string)) {
        return res.status(409).json({ message: 'Replay attack detected: nonce reused' });
    }

    usedNonces.add(nonce as string);
    setTimeout(() => usedNonces.delete(nonce as string), allowedTimeDriftMs);

    const key = appkey as string;
    if (!isValidAppKey(key, appSecrets)) {
        return res.status(403).json({ message: 'Invalid appkey' });
    }

    const secret = appSecrets[key as keyof typeof appSecrets];

    // ✅ 获取正序参数：GET 使用 query，POST 使用 body
    // const params = req.method === 'GET'
    //     ? sortObject(req.query as Record<string, string | number | boolean | ParsedQs>)
    //     : sortObject(req.body || {});
    const rawParams = req.method === 'GET'
        ? req.query
        : req.body || {};
    const parsedParams = parseParamTypes(rawParams);
    const sortedParams = sortObject(parsedParams);

    const paramString = JSON.stringify(sortedParams);

    // let paramString = JSON.stringify(params);
    // paramString = paramString.replace(/\\/g, '\\\\'); // escape backslashes

    // ✅ 获取 URL 路径，排除 query 字符串
    const path = req.originalUrl.split('?')[0];
    // const path = req.path;
    // ✅ 构造签名字符串
    const dataToSign = `timestamp=${timestamp}&nonce=${nonce}&key=${key}&path=${path}&queryString=${paramString}`;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

    if (expectedSignature !== signature) {
        console.log("invalid signature, expect:", expectedSignature);
        return res.status(401).json({ message: 'Invalid signature' });
    }

    next();
};

// import { Request, Response, NextFunction } from 'express';
// import crypto from 'crypto';
// import { config } from '../config/config';
// import { ParsedQs } from 'qs';

// const usedNonces = new Set<string>();
// const { appSecrets, allowedTimeDriftMs } = config.signature;

// const isValidAppKey = (
//     key: string,
//     secrets: Record<string, string>
// ): key is keyof typeof secrets => {
//     return key in secrets;
// };

// // 对对象按 key 正序排序
// function sortObject(obj: Record<string, any>): Record<string, any> {
//     return Object.keys(obj).sort().reduce((result: Record<string, any>, key) => {
//         result[key] = obj[key];
//         return result;
//     }, {});
// }

// // 参数类型解析：number/boolean/string
// export function parseParamTypes(obj: Record<string, any>): Record<string, string | number | boolean> {
//     const result: Record<string, string | number | boolean> = {};
//     for (const key in obj) {
//         let value = obj[key];
//         if (typeof value !== 'string') {
//             result[key] = value;
//             continue;
//         }

//         if (!isNaN(Number(value)) && value.trim() !== '') {
//             result[key] = Number(value);
//         } else if (value === 'true') {
//             result[key] = true;
//         } else if (value === 'false') {
//             result[key] = false;
//         } else {
//             result[key] = value;
//         }
//     }
//     return result;
// }

// export const signatureMiddleware = (req: Request, res: Response, next: NextFunction) => {
//     const { timestamp, signature, nonce, appkey } = req.headers;

//     if (!timestamp || !signature || !nonce || !appkey) {
//         return res.status(400).json({ message: 'Missing signature parameters' });
//     }

//     const ts = Number(timestamp);
//     if (isNaN(ts) || Math.abs(Date.now() - ts) > allowedTimeDriftMs) {
//         return res.status(408).json({ message: 'Timestamp expired or invalid' });
//     }

//     if (usedNonces.has(nonce as string)) {
//         return res.status(409).json({ message: 'Replay attack detected: nonce reused' });
//     }

//     usedNonces.add(nonce as string);
//     setTimeout(() => usedNonces.delete(nonce as string), allowedTimeDriftMs);

//     const key = appkey as string;
//     if (!isValidAppKey(key, appSecrets)) {
//         return res.status(403).json({ message: 'Invalid appkey' });
//     }

//     const secret = appSecrets[key as keyof typeof appSecrets];

//     // GET 使用 query，POST 使用 body
//     const rawParams = req.method === 'GET' ? req.query : req.body || {};
//     const parsedParams = parseParamTypes(rawParams);

//     // 包含动态路由参数
//     const allParams = { ...parsedParams, ...req.params };
//     const sortedParams = sortObject(allParams);
//     const paramString = JSON.stringify(sortedParams);

//     // 构造签名字符串（不包含 path）
//     const dataToSign = `timestamp=${timestamp}&nonce=${nonce}&key=${key}&params=${paramString}`;

//     const expectedSignature = crypto
//         .createHmac('sha256', secret)
//         .update(dataToSign)
//         .digest('hex');

//     if (expectedSignature !== signature) {
//         return res.status(401).json({ message: 'Invalid signature' });
//     }

//     next();
// };
