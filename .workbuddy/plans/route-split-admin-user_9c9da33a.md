---
name: route-split-admin-user
overview: 将前端路由从文件结构层面彻底分离为 /admin 和 /user 两套独立布局，登录后根据角色自动重定向，共用认证页和后端 API。
todos:
  - id: reorganize-routes
    content: 重构路由目录结构：创建 _admin-layout 和 _user-layout 目录，迁移/创建页面文件
    status: completed
  - id: create-admin-layout
    content: 创建 _admin-layout.tsx 管理员布局壳，集成现有 Sidebar 和权限守卫
    status: completed
    dependencies:
      - reorganize-routes
  - id: create-user-layout
    content: 创建 _user-layout.tsx 普通用户布局壳，设计全新独立布局
    status: completed
    dependencies:
      - reorganize-routes
  - id: migrate-admin-pages
    content: 将现有 _layout/admin.tsx 等管理员页面迁移到 _admin-layout/ 目录
    status: completed
    dependencies:
      - create-admin-layout
  - id: create-user-pages
    content: 创建 _user-layout/index.tsx 和 settings.tsx 用户页面
    status: completed
    dependencies:
      - create-user-layout
  - id: update-login-redirect
    content: 修改 useAuth.ts 登录成功后按 is_superuser 跳转 /admin 或 /user
    status: completed
    dependencies:
      - create-admin-layout
      - create-user-layout
  - id: update-route-guards
    content: 完善路由守卫：admin 布局拦截非超管，user 布局处理超管访问策略
    status: completed
    dependencies:
      - update-login-redirect
  - id: cleanup-old-layout
    content: 删除旧的 _layout.tsx 和 _layout/ 目录，验证路由生成正确
    status: completed
    dependencies:
      - migrate-admin-pages
---

## 产品概述

实现管理员和普通用户前端页面的完全分离，从源文件层面解耦两套布局系统。管理员继续使用当前左右布局，普通用户启用全新的独立布局，两者互不影响。

## 核心功能

- 认证页面统一入口（/login, /signup, /recover-password, /reset-password），登录后根据角色自动重定向
- 管理员专属布局（/admin/*）：沿用当前 Sidebar 布局，包含首页、用户管理、测评项目管理、设置
- 普通用户专属布局（/user/*）：全新独立布局，包含首页、设置等页面
- 路由守卫：未登录统一跳登录页，普通用户访问 /admin 自动重定向，管理员访问 /user 自动重定向

## 技术栈

- 前端框架：React + TypeScript + TanStack Router（File-based routing）
- UI 组件：shadcn/ui
- 状态管理：TanStack Query + localStorage（JWT Token）
- 后端：FastAPI（共用，无需修改）

## 实现方案

采用 TanStack Router 的嵌套布局特性，通过文件目录结构实现物理隔离：

```
routes/
├── __root.tsx              # 根路由，全局 Outlet
├── (auth)/                 # 认证路由组（可选，保持当前平级也可）
│   ├── login.tsx
│   ├── signup.tsx
│   ├── recover-password.tsx
│   └── reset-password.tsx
├── _admin-layout.tsx       # 管理员布局壳（继承现有 _layout 逻辑）
├── _admin-layout/          # 管理员页面
│   ├── index.tsx           # /admin
│   ├── user-manage.tsx     # /admin/user-manage
│   ├── items.tsx           # /admin/items
│   └── settings.tsx        # /admin/settings
└── _user-layout.tsx        # 普通用户布局壳（全新设计）
    └── _user-layout/       # 用户页面
        ├── index.tsx       # /user
        └── settings.tsx    # /user/settings
```

### 关键改动点

1. **登录重定向逻辑**：修改 `useAuth.ts` 中的 `loginMutation.onSuccess`，调用 `UsersService.readUserMe()` 获取用户信息后，按 `is_superuser` 跳转 `/admin` 或 `/user`
2. **布局守卫分离**：

- `_admin-layout.tsx`：检查登录 + 超管身份，非超管重定向到 `/user`
- `_user-layout.tsx`：检查登录，已登录超管可选择重定向到 `/admin` 或允许访问

3. **现有 `_layout` 处理**：保留作为过渡或删除，建议将现有 `_layout` 和 `_layout/admin.tsx` 内容迁移到 `_admin-layout` 体系
4. **路由自动生成**：TanStack Router 根据文件结构自动生成 routeTree，无需手动维护

### 目录结构

```
frontend/src/routes/
├── __root.tsx                      # [KEEP] 根路由
├── login.tsx                       # [MODIFY] 修改重定向逻辑
├── signup.tsx                      # [KEEP] 注册页
├── recover-password.tsx            # [KEEP] 密码恢复
├── reset-password.tsx              # [KEEP] 密码重置
├── _layout.tsx                     # [DELETE] 删除旧统一布局
├── _layout/                        # [DELETE] 删除旧布局页面
│   ├── index.tsx
│   ├── admin.tsx
│   ├── items.tsx
│   ├── settings.tsx
│   └── ... (其他占位页)
├── _admin-layout.tsx               # [NEW] 管理员布局壳
├── _admin-layout/                  # [NEW] 管理员页面目录
│   ├── index.tsx                   # /admin 首页
│   ├── user-manage.tsx             # /admin/user-manage 用户管理
│   ├── items.tsx                   # /admin/items 测评项目管理
│   └── settings.tsx                # /admin/settings 设置
├── _user-layout.tsx                # [NEW] 普通用户布局壳
└── _user-layout/                   # [NEW] 用户页面目录
    ├── index.tsx                   # /user 首页
    └── settings.tsx                # /user/settings 设置

frontend/src/hooks/
└── useAuth.ts                      # [MODIFY] 登录成功后按角色跳转
```

### 实现细节

- **路由守卫模式**：每个布局壳的 `beforeLoad` 中完成权限检查，利用 TanStack Router 的 loader 阻塞特性确保路由切换前完成验证
- **布局隔离**：`_admin-layout.tsx` 和 `_user-layout.tsx` 完全独立，可分别引入不同的 Sidebar、Header、Footer 组件
- **组件复用**：通用组件（如 DataTable、Form 控件）仍放在 `components/` 下共享，仅布局级组件分离
- **API 复用**：前后端 API 调用层（`client/` 目录）完全复用，无需修改