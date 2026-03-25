import path from 'path';
import dotenv from 'dotenv';

// 定义支持的环境类型
type EnvType = 'development' | 'test' | 'production' | 'qa';

// 获取当前环境，默认是 development
const env = (process.env.NODE_ENV || 'development') as EnvType;

// 环境变量文件映射
const envFileMap: Record<EnvType, string> = {
  development: '.env',
  test: '.env.test',
  qa: '.env.qa',
  production: '.env.production',
};

// 加载对应的 .env 文件
dotenv.config({
  path: path.resolve(process.cwd(), envFileMap[env]),
});

// 配置对象
export const config = {
  jiraBaseUrl: process.env.JIRA_BASE_URL || 'http://localhost:8080',
  adminToken: process.env.JIRA_ADMIN_TOKEN || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  signature: {
    appSecrets: {
      'web-client': process.env.APP_SECRET_WEB || 'web-default-secret',
      'alarm-dev': process.env.APP_SECRET_WEB || 'alarm-dev',
      'alarm-prod': process.env.APP_SECRET_WEB || 'alarm-prod',
      'mobile-client': process.env.APP_SECRET_MOBILE || 'mobile-default-secret',
      'openapi-rn': process.env.APP_SECRET_OPENAPI_RN || 'openapi-rn-secret',
      'rn-dev': process.env.APP_SECRET_OPENAPI_RN || 'rn-dev',
      'rn-prod': process.env.APP_SECRET_OPENAPI_RN || 'rn-prod',
    },
    allowedTimeDriftMs: parseInt(process.env.ALLOWED_TIME_DRIFT_MS || '300000', 10),
  },
  env, // 可导出当前环境
};
