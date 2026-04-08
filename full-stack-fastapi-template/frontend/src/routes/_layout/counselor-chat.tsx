import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/counselor-chat")({
  component: CounselorChat,
  head: () => ({
    meta: [
      {
        title: "心理医生咨询 - 心理测评系统",
      },
    ],
  }),
})

export default function CounselorChat() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">心理医生咨询</h1>
        <p className="text-muted-foreground">
          与专业心理咨询师在线沟通
        </p>
      </div>
      <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">咨询功能开发中...</p>
      </div>
    </div>
  )
}
