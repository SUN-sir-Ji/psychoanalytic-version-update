---
name: fix-chat-send-bug
overview: 修复对话发送消息的 bug：handleSend 函数缺少 try/catch/finally，当 sendMessageStream 抛出未处理的错误时，isStreaming 永远不会重置，导致界面卡死无法再次发送。需要包裹 try/finally 确保 isStreaming 始终被重置。
todos:
  - id: fix-sendmessagestream-error-handling
    content: 在 difyApi.ts 的 sendMessageStream 中添加顶层 try/catch，将 fetch 网络异常转为 onError 回调
    status: pending
  - id: fix-handlesend-safety-guard
    content: 在 ai-doctor.tsx 的 handleSend 中用 try/finally 包裹 sendMessageStream，确保 isStreaming 一定被重置
    status: pending
    dependencies:
      - fix-sendmessagestream-error-handling
---

## 问题描述

用户在智能心理医生页面的输入框输入文字后，点击发送按钮没有反应，必须先在右侧文件分析栏上传文件才能发送消息。

## 根因分析

`ai-doctor.tsx` 的 `handleSend` 函数（第 99-207 行）存在**未捕获的异步异常**问题：

1. 第 109 行 `setIsStreaming(true)` 锁定了发送状态
2. 第 141 行 `await sendMessageStream(...)` 调用 Dify API，但整个 `sendMessageStream` 调用**没有 try/catch 包裹**
3. `sendMessageStream` 内部第 76 行的 `fetch` 调用如果发生网络异常（连接失败、CORS 错误等），会直接抛出未被捕获的异常
4. `onError` 回调（第 186 行）只处理 Dify 返回的 HTTP 错误（4xx/5xx），不处理网络层面的异常
5. 异常抛出后 `isStreaming` 永远不会重置为 `false`，后续所有发送被第 103 行 `if (isStreaming) return` 阻止，按钮也被第 486 行的 `disabled` 锁定
6. 用户上传文件后看似"恢复了"，实际是因为 `handleStartAnalysis` 内部也调用了 `handleSend`，而之前未捕获的 Promise rejection 可能导致组件状态被 React 的错误边界重置

## 修复范围

- **ai-doctor.tsx**：`handleSend` 函数添加 try/catch/finally，确保 `isStreaming` 一定被重置
- **difyApi.ts**：`sendMessageStream` 函数添加顶层 try/catch，将网络异常转为 `onError` 回调

## Tech Stack

- React + TypeScript
- TanStack Router
- Tailwind CSS
- Dify API (SSE 流式响应)

## Implementation Approach

采用**双层防御**策略修复：

1. **底层（difyApi.ts）**：在 `sendMessageStream` 的 fetch 调用外包裹 try/catch，将网络异常统一通过 `onError` 回调通知调用方，而不是抛出未捕获异常。这样 `sendMessageStream` 永远不会向调用方抛异常，行为一致。

2. **上层（ai-doctor.tsx）**：在 `handleSend` 中用 try/finally 包裹 `sendMessageStream` 调用，作为安全兜底。即使 `sendMessageStream` 未来出现未预见的异常路径，也能确保 `isStreaming` 被重置。同时在 catch 中显示用户可见的错误提示。

## Implementation Notes

- 保持现有 `onMessage`/`onMessageEnd`/`onError` 回调逻辑不变，只在异常路径添加安全处理
- `finally` 块中需要判断 `isStreaming` 是否仍为 `true`，避免与正常 `onMessageEnd` 回调重复设置
- 错误提示通过修改最后一条 assistant 消息内容实现，复用现有的 UI 模式
- 不修改任何状态管理、路由或样式相关代码