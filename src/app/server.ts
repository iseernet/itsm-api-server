import dotenv from 'dotenv';
dotenv.config({});

import express from 'express';
import * as process from "process";
import jiraRoutes from '../routes/jiraRoutes'; // 导入路由文件
import authRoutes from '../routes/authRoutes'; // 导入路由文件
import orderRoutes from '../routes/orderRoutes'; // 导入路由文件
import issueRoutes from '../routes/issueRoutes'; // 导入路由文件
import idcIssueRoutes from '../routes/idcIssueRoutes'; // 导入路由文件
import openApiRoutes from '../routes/openApiRoutes'; // 导入路由文件
import serviceRoutes from '../routes/serviceRoutes'; // 导入路由文件
import priorityRoutes from '../routes/priorityRoutes'; // 导入路由文件
import userRoutes from '../routes/userRoutes';
import menuRoutes from '../routes/menuRoutes';
import roleRoutes from '../routes/roleRoutes';
// import fileUpload from 'express-fileupload';
import cors from 'cors';
import serviceCategoryRoutes from '../routes/serviceCategoryRoutes';
import groupRoutes from '../routes/groupRoutes';
import slaRuleRoutes from '../routes/slaRuleRoutes';
import serviceFaultTypeRoutes from '../routes/serviceFaultTypeRoutes';
import alertRoutes from "../routes/alertRoutes";
import downtimeRecordRoutes from "../routes/downtimeRecordRoutes";
import slaDayRoutes from "../routes/slaDayRoutes";
import { IssueCustomfield } from "../enums/issueEnum";
import finalServiceFaultTypeRoutes from '../routes/finalServiceFaultTypeRoutes';
import transceiverCleanupLogRoutes from "../routes/transceiverCleanupLogRoutes";


export const app = express();
async function startServer() {
  console.log(process.env.NODE_ENV);
  console.log(process.env.DB_HOST)

  const app = express();
  // ✅ 允许所有跨域请求（开发环境建议开启）
  app.use(cors());
  // ✅ 更严格的配置（生产环境建议使用）
  /*
  app.use(cors({
    origin: 'http://localhost:5173', // 前端地址
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  */
  // 解析 application/json 请求体
  app.use(express.json());
  // 解析 application/x-www-form-urlencoded 请求体
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    return res.status(200).json({ status: 'ok' });
  });

  // 挂载路由
  app.use('/api/jira', jiraRoutes);
  app.use('/oauth', authRoutes);
  app.use('/api/order', orderRoutes);
  app.use('/issue', issueRoutes);
  app.use('/idcIssue', idcIssueRoutes);
  app.use('/open', openApiRoutes);
  app.use('/service', serviceRoutes);
  app.use('/priority', priorityRoutes);
  app.use('/user', userRoutes);
  app.use('/menu', menuRoutes);
  app.use('/role', roleRoutes);
  app.use('/group', groupRoutes);
  app.use('/service-categories', serviceCategoryRoutes);
  app.use('/sla-rules', slaRuleRoutes);
  app.use('/service-fault-types', serviceFaultTypeRoutes);
  app.use('/alert', alertRoutes);
  app.use('/downtimeRecord', downtimeRecordRoutes);
  app.use('/sla-day', slaDayRoutes);
  app.use('/final-service-fault-types', finalServiceFaultTypeRoutes);
  app.use('/cleanup', transceiverCleanupLogRoutes);
  // 监听端口
  const PORT = process.env.SERVER_PORT || 3000;
  console.log(PORT);

  (Object.keys(IssueCustomfield) as Array<keyof typeof IssueCustomfield>).forEach(key => {
    const envValue = process.env[`jira_${key}`];
    if (envValue) {
      (IssueCustomfield as any)[key] = envValue;
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer();


