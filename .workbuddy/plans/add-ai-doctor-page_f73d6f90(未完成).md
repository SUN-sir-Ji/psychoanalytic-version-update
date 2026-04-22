---
name: add-ai-doctor-page
overview: 在用户页新增"智能心理医生"页面，包含路由文件创建、路由树注册、侧边栏导航项添加
todos:
  - id: create-ai-doctor-route
    content: 创建 _user-layout/ai-doctor.tsx 路由页面文件
    status: pending
  - id: register-route
    content: 更新 routeTree.gen.ts 注册新路由及类型声明
    status: pending
    dependencies:
      - create-ai-doctor-route
  - id: add-sidebar-entry
    content: 在 UserSidebar.tsx 添加"智能心理医生"导航项
    status: pending
---

## 用户需求

在用户页侧边栏新加一个"智能心理医生"页面，点击后可正常访问。

## 产品概述

在现有的用户侧边栏导航中新增"智能心理医生"入口，路由路径为 `/user/ai-doctor`，页面为占位页面，后续可扩展为 AI 心理咨询对话功能。

## 核心功能

- 侧边栏新增"智能心理医生"导航项
- 新增路由页面 `/user/ai-doctor`
- 页面内容为占位展示，与现有用户页风格一致

## 技术栈

沿用项目现有技术栈：React + TypeScript + TanStack Router + Tailwind CSS + shadcn/ui

## 实现方案

1. 新建路由文件 `_user-layout/ai-doctor.tsx`，使用 `createFileRoute("/_user-layout/ai-doctor")` 定义路由，页面结构与 `user.tsx` / `settings.tsx` 保持一致
2. 在 `routeTree.gen.ts` 中注册新路由，注意 `_user-layout` 是 pathless layout，path 必须写 `/user/ai-doctor`（之前踩坑经验）
3. 在 `UserSidebar.tsx` 的 `userItems` 数组中新增导航项，图标选用 `Bot`（lucide-react），放在"心理测评"之后

## 关键踩坑经验

- `_user-layout` 是 pathless layout，子路由的 path 不会自动拼接前缀
- `routeTree.gen.ts` 中 `path` 字段必须写完整路径 `/user/ai-doctor`
- `FileRoutesByPath` 声明中 `path` 为 `/ai-doctor`，`fullPath` 为 `/user/ai-doctor`
- `id` 为 `/_user-layout/ai-doctor`

## 目录结构

```
full-stack-fastapi-template/frontend/src/
├── routes/_user-layout/
│   └── ai-doctor.tsx          # [NEW] 智能心理医生页面，占位内容
├── routeTree.gen.ts           # [MODIFY] 注册新路由 + 类型声明
└── components/Sidebar/
    └── UserSidebar.tsx        # [MODIFY] 新增导航项
```