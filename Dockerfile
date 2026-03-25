# ============================================
# 多阶段构建 Dockerfile
# 阶段1: 构建阶段（包含所有依赖和构建工具）
# 阶段2: 运行阶段（只包含运行时需要的文件）
# ============================================

# ========== 阶段1: 构建阶段 ==========
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建项目（根据环境变量选择构建命令）
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# 根据 NODE_ENV 选择构建命令
RUN if [ "$NODE_ENV" = "qa" ]; then \
      npm run build-qa; \
    else \
      npm run build; \
    fi

# 删除开发依赖，只保留生产依赖
RUN npm prune --production

# ========== 阶段2: 运行阶段 ==========
FROM node:20-alpine AS runner

# 设置工作目录
WORKDIR /app

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从构建阶段复制必要的文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# 复制环境变量文件（如果需要）
# 注意：生产环境建议通过环境变量或 secrets 管理，而不是文件
# COPY --from=builder --chown=nodejs:nodejs /app/.env.production ./.env

# 创建应用运行时需要的目录并设置权限
# 注意：必须在切换到 nodejs 用户之前创建，使用 root 权限
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs uploads && \
    chmod -R 755 uploads

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# 启动应用
CMD ["node", "dist/app/server.js"]
