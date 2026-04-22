import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/user/")({
  component: UserHome,
  head: () => ({
    meta: [
      {
        title: "用户中心",
      },
    ],
  }),
})

function UserHome() {
  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 p-6 md:p-8">
      <h1 className="text-3xl font-bold">欢迎来到心理测评系统</h1>
      <p className="text-muted-foreground">这里是您的个人中心，可以查看测评记录、进行新的测评等。</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">开始测评</h3>
          <p className="text-sm text-muted-foreground">选择适合您的心理测评项目</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">测评记录</h3>
          <p className="text-sm text-muted-foreground">查看您的历史测评结果</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">个人设置</h3>
          <p className="text-sm text-muted-foreground">管理您的账户信息</p>
        </div>
      </div>
    </div>
  )
}
