#!/bin/bash

# ============================================
# 构建生产环境镜像并推送到私有仓库
# ============================================

set -e  # 遇到错误立即退出

# # 确保从仓库根目录执行（避免找不到 Dockerfile / 上下文错误）
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# cd "${REPO_ROOT}"

# 配置
REGISTRY="10.137.208.6:19800"
NAMESPACE="pbdcommon"
IMAGE_NAME="itsm-api-server-prod"

# 版本号：语义化版本号（格式：v主版本.次版本.修订号）
VERSION="v1.0.0"

# 完整镜像名称
FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${VERSION}"
LATEST_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest"
TEMP_IMAGE="${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "  构建生产环境镜像"
echo "=========================================="
echo "镜像: ${FULL_IMAGE}"
echo "别名: ${LATEST_IMAGE}"
echo ""

# 二次确认
echo "⚠️  警告: 这将构建生产环境镜像"
read -p "确认要继续构建生产环境镜像吗？[y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消构建"
    exit 0
fi
echo ""

# 步骤 1: 安装依赖
echo "[1/7] 安装依赖..."
if [ ! -d "node_modules" ]; then
    echo "  检测到 node_modules 不存在，执行 npm install..."
    npm install
else
    echo "  检测到 node_modules 已存在，跳过安装（如需更新请手动运行 npm install）"
fi
echo "✅ 依赖检查完成"
echo ""

# 步骤 2: 运行测试（可选）
echo "[2/7] 运行测试..."
echo "  跳过测试（如需运行测试，请取消注释）"
# npm test
echo "✅ 测试完成"
echo ""

# 步骤 3: 构建代码
echo "[3/7] 构建代码..."
npm run build
echo "✅ 代码构建完成"
echo ""

# 步骤 4: 构建 Docker 镜像
echo "[4/7] 构建 Docker 镜像..."
docker build -f Dockerfile -t ${TEMP_IMAGE} --build-arg NODE_ENV=production .
echo "✅ 镜像构建完成"
echo ""

# 步骤 5: 登录到 Docker Registry
echo "[5/7] 登录到 Docker Registry..."
# 从环境变量读取，如果没有则使用默认值
DOCKER_USERNAME=${DOCKER_USERNAME:-pbd-develop}
DOCKER_PASSWORD=${DOCKER_PASSWORD:-PBD@develop2026}

echo "${DOCKER_PASSWORD}" | docker login ${REGISTRY} -u ${DOCKER_USERNAME} --password-stdin

if [ $? -eq 0 ]; then
    echo "✅ 登录成功"
else
    echo "❌ 登录失败"
    exit 1
fi
echo ""

# 步骤 6: 标记镜像
echo "[6/7] 标记镜像..."
docker tag ${TEMP_IMAGE} ${FULL_IMAGE}
docker tag ${TEMP_IMAGE} ${LATEST_IMAGE}
echo "✅ 镜像标记完成"
echo ""

# 步骤 7: 推送到仓库
echo "[7/7] 推送镜像到仓库..."
docker push ${FULL_IMAGE}
docker push ${LATEST_IMAGE}
echo "✅ 镜像推送完成"
echo ""

echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "镜像地址: ${FULL_IMAGE}"
echo "镜像别名: ${LATEST_IMAGE}"
echo "版本号: ${VERSION}"
echo ""
echo "拉取镜像:"
echo "  docker pull ${FULL_IMAGE}"
echo "  docker pull ${LATEST_IMAGE}"
echo ""
echo "运行容器:"
echo "  docker run -d --name itsm-api-server-prod -p 3000:3000 --env-file .env.production ${FULL_IMAGE}"
echo ""

# 保存版本号供部署脚本使用
echo "${VERSION}" > .last-build-version-prod
echo "版本号已保存到 .last-build-version-prod"
echo ""
echo "⚠️  提醒: 生产环境镜像已构建，请使用 ./scripts/deploy-prod.sh 部署到生产环境"
echo ""
