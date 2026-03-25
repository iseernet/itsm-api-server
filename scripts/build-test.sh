#!/bin/bash

# ============================================
# 构建测试环境镜像并推送到私有仓库
# ============================================

set -e  # 遇到错误立即退出

# # 确保从仓库根目录执行（避免找不到 Dockerfile / 上下文错误）
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# cd "${REPO_ROOT}"

# 配置
REGISTRY="10.137.208.6:19800"
NAMESPACE="pbdcommon"
IMAGE_NAME="itsm-api-server-test"

# 版本号
VERSION="v1.0.0"

# 完整镜像名称
FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${VERSION}"
TEMP_IMAGE="${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "  构建测试环境镜像"
echo "=========================================="
echo "镜像: ${FULL_IMAGE}"
echo ""

# 步骤 1: 安装依赖
echo "[1/6] 安装依赖..."
if [ ! -d "node_modules" ]; then
    echo "  检测到 node_modules 不存在，执行 npm install..."
    npm install
else
    echo "  检测到 node_modules 已存在，跳过安装（如需更新请手动运行 npm install）"
fi
echo "✅ 依赖检查完成"
echo ""

# 步骤 2: 构建代码
echo "[2/6] 构建代码..."
npm run build-qa
echo "✅ 代码构建完成"
echo ""

# 步骤 3: 构建 Docker 镜像
echo "[3/6] 构建 Docker 镜像..."
docker build -f Dockerfile -t ${TEMP_IMAGE} --build-arg NODE_ENV=qa .
echo "✅ 镜像构建完成"
echo ""

# 步骤 4: 登录到 Docker Registry
echo "[4/6] 登录到 Docker Registry..."
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

# 步骤 5: 标记镜像
echo "[5/6] 标记镜像..."
docker tag ${TEMP_IMAGE} ${FULL_IMAGE}
echo "✅ 镜像标记完成"
echo ""

# 步骤 6: 推送到仓库
echo "[6/6] 推送镜像到仓库..."
docker push ${FULL_IMAGE}
echo "✅ 镜像推送完成"
echo ""

echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "镜像地址: ${FULL_IMAGE}"
echo ""
echo "拉取镜像:"
echo "  docker pull ${FULL_IMAGE}"
echo ""
echo "运行容器:"
echo "  docker run -d --name itsm-api-server-test -p 3000:3000 --env-file .env.qa ${FULL_IMAGE}"
echo ""
