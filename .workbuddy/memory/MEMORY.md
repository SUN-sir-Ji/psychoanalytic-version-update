# 项目长期记忆

## 项目基本信息
- **项目名**: psychoanalytic-version-update（心理健康助手）
- **分支**: feature-CN
- **开发者**: 孙浩冉（JAVA3班，学号20233005375）

## 技术栈
- 前端：React + TypeScript + Vite + Tailwind v4 + TanStack Router（文件路由）
- 后端：FastAPI
- AI 平台：Dify（Chatflow 模式）
- 部署：openEuler + Docker + minikube
- 图标：Lucide React
- UI 组件：shadcn/ui（Button、Card、Avatar 等）
- 路径别名：`@` → `src/`

## 项目结构关键路径
- 前端路由目录：`full-stack-fastapi-template/frontend/src/routes/`
- Dify API 服务：`full-stack-fastapi-template/frontend/src/services/difyApi.ts`
- 侧边栏：`full-stack-fastapi-template/frontend/src/components/Sidebar/UserSidebar.tsx`
- 路由树（自动生成）：`full-stack-fastapi-template/frontend/src/routeTree.gen.ts`

## Dify API 关键信息
- Base URL: `import.meta.env.VITE_DIFY_API_URL` (默认 `http://localhost/v1`)
- API Key: `import.meta.env.VITE_DIFY_API_KEY`
- 端点: POST `/chat-messages`，SSE 流式，Authorization: Bearer {token}
- `sendMessageStream` 支持完整 SSE 回调（onMessage/onMessageEnd/onError 等）

## 已实现页面
- `/user/ai-doctor`：智能心理医生（多模态分析，文件上传）
- `/user/test`：心理测评（Dify 对话 + TEST_JSON 答题 + RESULT_JSON 提交）
- `/_layout/psychological-test`：已从 commit aab42f1 恢复的原版测评页

## TEST_JSON / RESULT_JSON 协议
- AI 发送 `TEST_JSON::{...}` → 前端解析 TestData 接口渲染答题界面
- 用户提交 → 前端构造 `RESULT_JSON::{test_id, title, answers[]}` 静默发送
- 状态流转：提交成功 → 开始分析 → 分析完成

## 开发偏好
- 简洁直接、分步骤指导
- 倾向直接修改代码/YAML，而非手动 UI 配置
- 工作流：发现问题 → 询问原因 → 请求修复
- 中文输出

## Git 历史关键节点
- `500bae7`：用户端及管理端分化、用户端增加智能心理医生页面（ai-doctor.tsx 干净版本）
- `aab42f1`：psychological-test.tsx 存在的最后一个版本
