import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

interface Order {
    id: number;
    user: string;
    ordertype: string;
    ordertime: string; // ISO string
    detail: string;
}

const orders: Order[] = [
    { id: 1, user: 'alice', ordertype: 'normal', ordertime: '2025-07-31T08:00:00Z', detail: 'Order 1 detail' },
    { id: 2, user: 'bob', ordertype: 'express', ordertime: '2025-07-30T10:00:00Z', detail: 'Order 2 detail' },
    { id: 3, user: 'alice', ordertype: 'normal', ordertime: '2025-07-29T12:00:00Z', detail: 'Order 3 detail' },
    // 更多订单...
];

export const getOrders = (req: AuthRequest, res: Response) => {
    const { username, role } = req.user || {};
    const { ordertype, ordertime } = req.body;

    if (!username) return res.status(401).json({ message: 'Unauthorized' });

    if (!ordertype || !ordertime) {
        return res.status(400).json({ message: 'ordertype and ordertime are required' });
    }

    // 过滤订单：
    // - 管理员查看所有满足条件的订单
    // - 普通用户只能查看自己的订单
    const filteredOrders = orders.filter(order => {
        const matchType = order.ordertype === ordertype;
        const matchTime = order.ordertime >= ordertime;
        const matchUser = role === 'admin' || order.user === username;
        return matchType && matchTime && matchUser;
    });

    res.json({ message: 'Orders fetched successfully', data: filteredOrders });
};
