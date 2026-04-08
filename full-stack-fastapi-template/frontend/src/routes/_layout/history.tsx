import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/history")({
  component: History,
  head: () => ({
    meta: [
      {
        title: "历史分析记录 - 心理测评系统",
      },
    ],
  }),
})

export default function History() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">历史分析记录</h1>
        <p className="text-muted-foreground">
          查看过往的心理分析记录
        </p>
      </div>
      <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">历史记录功能开发中...</p>
      </div>
    </div>
  )
}
