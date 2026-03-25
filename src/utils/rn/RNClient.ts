import {v4 as uuid_v4} from 'uuid';
import { createHmac } from 'crypto';
import { randomUUID } from 'crypto';
import {RNEventPayload, RNPbdEventPayload} from "../../types/rnEvent";
import XhsHwrisSignature from './xhs-hwris-signature';
import {rejects} from "node:assert";

export function sortJsonKeys(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(sortJsonKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        const sortedObj: { [key: string]: any } = {};
        Object.keys(obj)
            .sort() // 按字母顺序排序键
            .forEach(key => {
                sortedObj[key] = sortJsonKeys(obj[key]);
            });
        return sortedObj;
    }
    return obj;
}

export function rnGenerateSignature(httpMethod:string, requestUri:string, queryString:string, requestBody:any, nonce:string, timestamp:string){
    const requestData = `${httpMethod}\n${requestUri}\n${nonce}\n${timestamp}\n${queryString}${requestBody}`;
    const hashedRequest = createHmac('md5', '').update(requestData).digest('hex');
    const stringToSign = `${timestamp}\n${hashedRequest}`;

    const secretKey = process.env.RN_API_SECRET_KEY || '';
    return createHmac('md5', secretKey).update(stringToSign).digest('hex');
}

function rnCreateRequestHeader(httpMethod:string, requestUri:string, queryString:string, requestBody:any){
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const timestamp =  Math.floor((new Date()).getTime()/1000);
    headers.append("x-hwris-timestamp", timestamp.toString());
    const nonce = uuid_v4().toString().replace(/-/g, "");
    headers.append("x-hwris-nonce", nonce);
    const secretId = process.env.RN_API_SECRET_ID || "";
    headers.append("x-hwris-secretId", secretId);

    let bodyStr = '';
    if(requestBody != null && requestBody != ""){
        bodyStr = JSON.stringify(requestBody);
    }

    const xhsHwrisSignature = new XhsHwrisSignature();
    const signature = xhsHwrisSignature.signCalculate(bodyStr, queryString, httpMethod, requestUri, timestamp.toString(), nonce);
    //const signature = rnGenerateSignature(httpMethod, requestUri, queryString, requestBody, nonce, timestamp.toString());
    headers.append("x-hwris-signature", signature);
    return headers;
}


export async function rnCreateEvent(eventInfo:RNEventPayload){
    const cmd = '/dcoc-api/openapi/v1/event';
    const httpMethod = 'POST';
    const apiUrl = process.env.RN_API_URL + cmd;
    const requestBody = eventInfo;
    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        }).catch(error => {
            console.log("rnCreateEvent:", error);
            rejects(error);
        })
    })
}

export async function rnUpdateEvent(eventInfo:RNEventPayload){
    const cmd = '/dcoc-api/openapi/v1/event/' + eventInfo.ticketId;
    const httpMethod:string = 'POST';
    const apiUrl:string = process.env.RN_API_URL + cmd;
    const requestBody = eventInfo;
    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log(response);
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        }).catch(error => {
            console.log("rnCreateEvent:", error);
            rejects(error);
        })
    })
}

export async function rnGetFaultType(code:any){
    const cmd = '/dcoc-api/openapi/v1/faultTypes';
    const httpMethod = 'GET';
    const apiUrl = process.env.RN_API_URL + cmd;
    let queryString = '';
    if(code){
        queryString = `?code=${code}`;
    }
    const headers = rnCreateRequestHeader(httpMethod, cmd, queryString, null);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })
}


export async function rnGetOperationPermission(eventType:string){
    const cmd = '/dcoc-api/openapi/v1/operationPermissions';

    const httpMethod = 'GET';
    const apiUrl = process.env.RN_API_URL + cmd;
    const requestBody = {
        eventType: eventType
    }
    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })
}

export function rnGetEvents(){
    const cmd = `/dcoc-api/openapi/v1/event`;
    const httpMethod = 'GET';
    const apiUrl = process.env.RN_API_URL + cmd;
    const headers = rnCreateRequestHeader(httpMethod, cmd, '', '');
    // 发送请求
    return new Promise(resolve => {
        fetch(cmd, {
            method: httpMethod,
            headers: headers
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    });
}

export async function rnGetEventDetail(eventId:string){
    const cmd = `/dcoc-api/openapi/v1/event/${eventId}`;
    const httpMethod = 'GET';
    const apiUrl = process.env.RN_API_URL + cmd;
    const headers = rnCreateRequestHeader(httpMethod, cmd, '', '');
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })
}

export async function rnReportPDBIssueCompletion(issueId:string){
    const cmd = `/dcoc-api/openapi/v1/pbd/ticket/${issueId}/completion`;
    const httpMethod = 'POST';
    const apiUrl = process.env.RN_API_URL + cmd;

    const headers = rnCreateRequestHeader(httpMethod, cmd, '', '');
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })
}

export async function rnReportPDBIDCIssueState(issueId:string, state:string, finalFaultTypeCode:any, finalMaintenanceOps:any,rootCause:any){
    const cmd = `/dcoc-api/openapi/v1/pbd/ticket/callback`;
    const httpMethod = 'POST';
    const apiUrl = process.env.RN_API_URL + cmd;

    let reportState = "";
    switch (state) {
        case 'PBD-PENDING':
            reportState = 'Open';
            break;
        case 'PBD-ASSIGNED':
            reportState = 'Assigned';
            break;
        case 'PBD-INPRORESS':
            reportState = 'In Progress';
            break;
        case 'PBD-RESOLVED':
            reportState = 'Finished';
            break;
        case 'PBD-CLOSED':
            reportState = 'Resolved';
            break;
        case 'PBD-CANCELED':
            reportState = 'Canceled';
            break;
        default:
            break;
    }

    const requestBody:any = {
        id: issueId,
        state:reportState
    }

    if(finalFaultTypeCode != null){
        requestBody.finalFaultTypeCode = finalFaultTypeCode;
    }

    if(finalMaintenanceOps != null){
        requestBody.finalMaintenanceOps = finalMaintenanceOps;
    }

    if(rootCause != null){
        requestBody.rootCause = rootCause;
    }

    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    console.log(apiUrl);
    console.log(headers);
    console.log(requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })
}

export async function rnCreatePbdEvent(eventInfo:RNPbdEventPayload){
    const cmd = '/dcoc-api/openapi/v1/pbd/event';
    const httpMethod:string = 'POST';
    const apiUrl:string = process.env.RN_API_URL + cmd;
    const requestBody = eventInfo;
    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    console.log(apiUrl);
    console.log(headers);
    console.log(requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log(response);
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        }).catch(error => {
            console.log("rnCreateEvent:", error);
            rejects(error);
        })
    })
}

export async function rnReportPbdEventState(issueId:string, state:string,  finalFaultTypeCode:any, finalMaintenanceOps:any){
    const cmd = '/dcoc-api/openapi/v1/pbd/event/callback';
    const httpMethod = 'POST';
    const apiUrl = process.env.RN_API_URL + cmd;

    let reportState = "";
    switch (state) {
        case 'PBD-PENDING':
            reportState = 'Open';
            break;
        case 'PBD-ASSIGNED':
            reportState = 'Assigned';
            break;
        case 'PBD-INPRORESS':
            reportState = 'In Progress';
            break;
        case 'PBD-RESOLVED':
            reportState = 'Finished';
            break;
        case 'PBD-CLOSED':
            reportState = 'Resolved';
            break;
        case 'PBD-CANCELED':
            reportState = 'Canceled';
            break;
        default:
            break;
    }

    const requestBody:any = {
        id: issueId,
        state:reportState
    }

    if(finalFaultTypeCode != null){
        requestBody.finalFaultTypeCode = finalFaultTypeCode;
    }

    if(finalMaintenanceOps != null){
        requestBody.finalMaintenanceOps = finalMaintenanceOps;
    }

    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    console.log(apiUrl);
    console.log(headers);
    console.log(requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })
}

export async function rnPbdEventSupplement(rnIssueId:string, idcIssueId:string, startTime:string, endTime:string, remark:string){
    const cmd = '/dcoc-api/openapi/v1/pbd/ticket/supplement';
    const httpMethod = 'POST';
    const apiUrl = process.env.RN_API_URL + cmd;

    const requestBody = {
        rnId: rnIssueId,
        refId:idcIssueId,
        incidentStartTime: startTime,
        incidentResolvedTime: endTime,
        remark: remark
    }

    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    console.log(apiUrl);
    console.log(headers);
    console.log(requestBody);
    // 发送请求
    return new Promise(resolve => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data); // 返回解析后的数据
            });
        })
    })

}

export interface RNReportAutoProcessFailurePayload {
    rnId: string;
    pbdId: string;
    serverSn: string;
    actionType: 'AUTO_REBOOT' | 'OS_INSTALL' | 'FIRMWARE_UPGRADE';
    recoverTrigger?: boolean;
    errorCode?: string;
    errorMessage?: string;
}

export async function rnReportAutoProcessFailure(payload: RNReportAutoProcessFailurePayload) {
    const cmd = `/dcoc-api/openapi/v1/pbd/autoCapacity/process/report-failure`;
    const httpMethod = 'POST';
    const apiUrl = process.env.RN_API_URL + cmd;

    const requestBody = {
        rnId: payload.rnId,
        pbdId: payload.pbdId,
        serverSn: payload.serverSn,
        actionType: payload.actionType,
        recoverTrigger: payload.recoverTrigger,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
    };

    const headers = rnCreateRequestHeader(httpMethod, cmd, '', requestBody);
    console.log(apiUrl);
    console.log(headers);
    console.log(requestBody);
    // 发送请求
    return new Promise((resolve, reject) => {
        fetch(apiUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestBody)
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(data => {
                console.log(data);
                resolve(data);
            });
        }).catch(error => {
            console.log("rnReportAutoProcessFailure:", error);
            reject(error);
        })
    })
}
