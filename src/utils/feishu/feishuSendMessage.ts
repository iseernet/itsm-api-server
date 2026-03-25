import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
dotenv.config({});

import * as lark from '@larksuiteoapi/node-sdk';
import {getUserFeishuPhone} from "../../services/userService";

// 飞书消息内容
interface FeishuMessage {
    receive_id: string;
    msg_type: string;
    content: string;
}

interface UserBatchGetIdResponse {
    code: number;
    msg: string;
    data: {
        user_list: Array<{
            user_id: string;
            mobile?: string;
            email?: string;
            name?: string;
        }>;
    };
}

// 获取 tenant_access_token 的函数
async function getTenantAccessToken(): Promise<string> {
    try {
        const response: AxiosResponse = await axios.post(
            process.env.FEISHU_API_URL + '/auth/v3/tenant_access_token/internal',
            {
                app_id: process.env.FEISHU_APP_ID,
                app_secret: process.env.FEISHU_APP_SECRET,
            }
        );

        const { tenant_access_token } = response.data;
        if (!tenant_access_token) {
            throw new Error('Failed to obtain tenant_access_token');
        }
        return tenant_access_token;
    } catch (error) {
        console.error('Error getting tenant_access_token:', error);
        throw error;
    }
}

// 根据手机号或邮箱获取 open_id
async function getOpenIdByMobileOrEmail(mobile?: string, email?: string): Promise<string | null> {
    if (!mobile && !email) {
        throw new Error('Either mobile or email must be provided');
    }

    try {
        const token = await getTenantAccessToken();
        console.log(token);
        const requestBody: { mobiles?: string[]; emails?: string[] } = {};
        if (mobile) requestBody.mobiles = [mobile];
        if (email) requestBody.emails = [email];

        console.log(process.env.FEISHU_API_URL + '/contact/v3/users/batch_get_id?user_id_type=open_id');

        const response: AxiosResponse<UserBatchGetIdResponse> = await axios.post(
            process.env.FEISHU_API_URL + '/contact/v3/users/batch_get_id?user_id_type=open_id',
            requestBody,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.code !== 0) {
            throw new Error(`Failed to get open_id: ${response.data.msg}`);
        }

        const userList = response.data.data.user_list;
        if (userList.length === 0) {
            return null; // 未找到用户
        }

        return userList[0].user_id; // 返回 open_id
    } catch (error:any) {
        throw new Error("Error fetching open_id:" + error.toString());
    }
}

export async function getOpenIdBySdk(mobile?: string, email?: string) {
    const client = new lark.Client({
        appId: process.env.FEISHU_APP_ID || "",
        appSecret: process.env.FEISHU_APP_SECRET || "",
        // disableTokenCache为true时，SDK不会主动拉取并缓存token，这时需要在发起请求时，调用lark.withTenantToken("token")手动传递
        // disableTokenCache为false时，SDK会自动管理租户token的获取与刷新，无需使用lark.withTenantToken("token")手动传递token
        disableTokenCache: true
    });
    const token = await getTenantAccessToken();

    const data:any = {
        include_resigned: true,
    }

    if(mobile != null){
        data["mobiles"] = [mobile]
    }

    if(email != null){
        data["emails"] = [email]
    }

    return new Promise((resolve, reject) => {
        client.contact.v3.user.batchGetId({
                params: {
                    user_id_type: 'open_id',
                },
                data: data,
            },
            lark.withTenantToken(token)
        ).then(res => {
            if(res.code == 0){
                resolve(res.data?.user_list);
            }
        }).catch(e => {
            console.error(JSON.stringify(e.response.data, null, 4));
            reject(e);
        });
    })
}

export async function sendMessageWithLink(title:string, content:any, phone?:string, email?:string) {
    try {
        const accessToken = await getTenantAccessToken();
        const apiUrl = process.env.FEISHU_API_URL+ '/im/v1/messages?receive_id_type=open_id';

        const user_open_ids:any = await getOpenIdBySdk(phone, email);
        if(user_open_ids){
            for(const user of user_open_ids){
                const messageContent = {
                    receive_id: user.user_id,
                    msg_type: 'post',
                    content: JSON.stringify({
                            en_us: {
                                title: title,
                                content: content
                            }
                    })
                };

                const response = await axios.post(apiUrl, messageContent, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    }
                });
                console.log('Message sent successfully:', response.data);

            }
        }
    } catch (error:any) {
        console.error('Failed to send message:', error.response?.data || error.message);
    }
}

// 发送飞书消息的函数
async function sendMessage(message: FeishuMessage): Promise<void> {
    try {
        // 获取 tenant_access_token
        const token = await getTenantAccessToken();

        // 发送消息
        const response: AxiosResponse = await axios.post(
            process.env.FEISHU_API_URL+ '/im/v1/messages?receive_id_type=open_id',
            message,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.code === 0) {
            console.log('Message sent successfully:', response.data);
        } else {
            console.error('Failed to send message:', response.data);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

export async function sendFeishuMessage( message: string, phone?:string, email?:string): Promise<void> {
    const user_open_ids:any = await getOpenIdBySdk(phone, email);
    if(user_open_ids){
        for(const user of user_open_ids){
            const newMessage: FeishuMessage = {
                receive_id: user.user_id, // 替换为目标用户的 open_id
                msg_type: 'text',
                content: JSON.stringify({ text: message }),
            };
            sendMessage(newMessage);
        }
    }
}
