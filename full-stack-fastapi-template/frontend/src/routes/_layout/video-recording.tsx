import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/video-recording")({
  component: VideoRecording,
  head: () => ({
    meta: [
      {
        title: "在线视频录制 - 心理测评系统",
      },
    ],
  }),
})

export default function VideoRecording() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">在线视频录制</h1>
        <p className="text-muted-foreground">
          录制视频进行心理分析
        </p>
      </div>
      <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">视频录制功能开发中...</p>
      </div>
    </div>
  )
}
