# 项目启动文档

本文档介绍如何从零开始启动「心理健康助手」项目。

---

## 目录结构说明

```
psychoanalytic-version-update/
├── full-stack-fastapi-template/   # 主项目（前端 + 后端）
│   ├── frontend/                  # 前端（React + Vite）
│   └── backend/                   # 后端（FastAPI + SQLAlchemy）
├── environment/                   # 环境配置文件夹
│   ├── environment.yml            # Conda 环境导出文件
│   ├── 多模态心理状况分析(改).yml  # Dify 工作流1
│   ├── 智能问答json .yml          # Dify 工作流2
│   └── 测试数据/                 # 数据库测试数据
└── SETUP.md                      # 本文档
```

---

## 一、前置准备

### 1.1 克隆项目

```bash
git clone <-b 分支> <你的仓库地址>
cd psychoanalytic-version-update
```

### 1.2 安装依赖

| 工具 | 版本要求 | 说明 |
|---|---|---|
| Node.js | 18+ | 前端开发 |
| Python | 3.9+ | 后端开发 |
| Conda | 最新版 | Python 环境管理 |
| Docker | 最新版 | 容器化部署 |
| Git | 最新版 | 版本控制 |

---

## 二、后端环境搭建

### 2.1 使用 Conda 环境（推荐）

项目已提供 `environment/environment.yml`，直接创建环境：

```bash
conda env create -f environment/environment.yml
conda activate full-stack-fastapi-template-backend
```

### 2.2 手动安装（备用方案）

如果 Conda 环境创建失败，可以手动安装：

```bash
# 创建并激活 Conda 环境
conda create -n my-backend-env python=3.9
conda activate my-backend-env

# 安装后端依赖
cd full-stack-fastapi-template/backend
pip install -r requirements.txt
# 或者手动安装核心依赖：
# pip install fastapi uvicorn sqlalchemy alembic python-dotenv
```

### 2.3 数据库初始化

```bash
cd full-stack-fastapi-template/backend

# 运行数据库迁移（会创建所有表结构）
alembic upgrade head
```

> ⚠️ **注意**：迁移只会创建空表，不会导入测试数据。
> 如需测试数据，请手动将 `environment/测试数据/` 目录下的数据导入数据库。

---

## 三、前端环境搭建

```bash
cd full-stack-fastapi-template/frontend
npm install
```

---

## 四、Dify 工作流配置

项目依赖 Dify 的两个工作流（AI 心理医生 + 心理测评），配置文件在 `environment/` 目录：

| 文件 | 说明 |
|---|---|
| `多模态心理状况分析(改).yml` | AI 心理医生工作流（文件分析 + 对话） |
| `智能问答json .yml` | 心理测评工作流（TEST_JSON / RESULT_JSON 协议） |

### 4.1 导入工作流到 Dify

1. 打开 Dify 控制台（本地或云端）
2. 创建两个新的 **Chatflow** 应用
3. 分别导入上述两个 YAML 文件
4. 记录每个应用的 **API Key**

### 4.2 配置前端环境变量

在 `full-stack-fastapi-template/frontend/` 目录下创建 `.env` 文件：

```env
# AI 心理医生 Dify API Key
VITE_DIFY_AI_DOCTOR_API_KEY=your_ai_doctor_api_key

# 心理测评 Dify API Key
VITE_DIFY_TEST_API_KEY=your_test_api_key

# Dify API 地址（默认本地）
VITE_DIFY_API_URL=http://localhost/v1
```

---

## 五、本地开发启动流程

> 💡 **推荐开发流程**：先通过 Docker 启动完整服务，然后关闭前后端容器，在本地启动前后端进行开发。

### 5.1 第一步：Docker 启动（仅首次或需要完整环境时）

```bash
cd full-stack-fastapi-template
docker compose up -d
```

等待所有容器启动完成，然后：

- 停止前端容器：`docker compose stop frontend`
- 停止后端容器：`docker compose stop backend`

> ✅ 这样做可以确保数据库、Redis 等依赖服务正常运行，而前后端由本地启动方便开发调试。

### 5.2 第二步：本地启动后端

打开 **Anaconda Prompt** 或 PowerShell：

```bash
# 激活 Conda 环境
conda activate full-stack-fastapi-template-backend
# 或者你手动创建的环境名
# conda activate my-backend-env

# 切换到后端目录
cd "D:\HuaweiMoveData\Users\30337\Documents\GitHub\psychoanalytic-version-update\full-stack-fastapi-template\backend"

# 启动后端（开发模式，支持热重载）
fastapi dev app/main.py
# 或使用 uvicorn：
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端启动后，访问 `http://localhost:8000/docs` 可以看到 API 文档。

### 5.3 第三步：本地启动前端

打开**新的终端窗口**：

```bash
cd "D:\HuaweiMoveData\Users\30337\Documents\GitHub\psychoanalytic-version-update\full-stack-fastapi-template\frontend"
npm run dev
```

前端启动后，访问 `http://localhost:5173` 即可看到页面。

---

## 六、验证启动成功

| 服务 | 地址 | 验证方式 |
|---|---|---|
| 后端 API 文档 | `http://localhost:8000/docs` | 能打开 Swagger 页面 |
| 前端页面 | `http://localhost:5173` | 能打开首页 |
| Dify API（需配置） | `http://localhost/v1` | 后端能调用 Dify |

---

## 七、常见问题

### Q1：数据库表不存在？

```bash
cd full-stack-fastapi-template/backend
alembic upgrade head
```

### Q2：前端启动报错 `MODULE_NOT_FOUND`？

```bash
cd full-stack-fastapi-template/frontend
rm -rf node_modules package-lock.json
npm install
```

### Q3：后端启动报错 `MODULENOTFOUNDERROR`？

检查 Conda 环境是否激活：

```bash
conda activate full-stack-fastapi-template-backend
pip list  # 查看已安装的包
```

### Q4：Dify 调用失败？

检查 `frontend/.env` 中的 API Key 是否正确，以及 Dify 服务是否正常运行。

---

## 八、项目端口汇总

| 服务 | 端口 | 说明 |
|---|---|---|
| 前端（Vite） | `5173` | 开发服务器 |
| 后端（FastAPI） | `8000` | API 服务 |
| 数据库（PostgreSQL） | `5432` | Docker 容器内 |
| Redis | `6379` | Docker 容器内 |
| Dify API | `80` / `443` | 本地或云端 |

---

*最后更新：2026-04-28*
