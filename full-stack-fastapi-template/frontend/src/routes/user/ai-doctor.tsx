import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import useAuth from "@/hooks/useAuth"
import {
  getMessages,
  sendMessageStream,
  type DifyMessage,
  type DifyMessageFile,
  uploadFile,
} from "@/services/difyApi"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import {
  Stethoscope,
  Send,
  Paperclip,
  X,
  Loader2,
  Brain,
  FileText,
  Video,
  Mic,
  Upload,
  FlaskConical,
} from "lucide-react"
import { useConversation } from "@/components/contexts/ConversationContext"

export const Route = createFileRoute("/user/ai-doctor")({
  component: AiDoctor,
  head: () => ({
    meta: [{ title: "智能心理医生" }],
  }),
})

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  files?: DifyMessageFile[]
  isStreaming?: boolean
}

function AiDoctor() {
  const { user } = useAuth()
  const userId = user?.id || "anonymous"
  const { activeConvId, setActiveConvId, loadConversations } = useConversation()

  // 消息
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  // UI
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载某个会话的消息
  const loadMessages = useCallback(
    async (convId: string) => {
      try {
        const result = await getMessages(userId, convId)
        const chatMsgs: ChatMessage[] = []
        // messages 返回是倒序，需要正过来，并且分 user 和 assistant
        const sorted = [...result.data].sort((a, b) => a.created_at - b.created_at)
        for (const msg of sorted) {
          if (msg.query) {
            chatMsgs.push({ role: "user", content: msg.query, files: msg.message_files })
          }
          if (msg.answer) {
            chatMsgs.push({ role: "assistant", content: msg.answer, files: msg.message_files })
          }
        }
        setMessages(chatMsgs)
      } catch {
        setMessages([])
      }
    },
    [userId]
  )

  // 当 activeConvId 变化时加载消息
  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId)
    } else {
      setMessages([])
    }
  }, [activeConvId, loadMessages])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // 发送消息
  const handleSend = async (extraFiles?: File[]) => {
    const text = inputText.trim()
    const filesToSend = [...(extraFiles || []), ...attachedFiles]
    if (!text && filesToSend.length === 0) return
    if (isStreaming) return

    const userMsg: ChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInputText("")
    setStreamingContent("")
    setIsStreaming(true)

    // 添加 streaming 占位消息
    const assistantMsg: ChatMessage = { role: "assistant", content: "", isStreaming: true }
    setMessages((prev) => [...prev, assistantMsg])

    // 上传文件
    const uploadedFiles: { type: string; transfer_method: string; url: string; upload_file_id?: string }[] = []
    for (const file of filesToSend) {
      try {
        const result = await uploadFile(file, userId)
        uploadedFiles.push({
          type: file.type.startsWith("audio")
            ? "audio"
            : file.type.startsWith("video")
              ? "video"
              : file.type.startsWith("image")
                ? "image"
                : "document",
          transfer_method: "local_file",
          url: result.id,
          upload_file_id: result.id,
        })
      } catch {
        // skip failed uploads
      }
    }
    setAttachedFiles([])

    // 临时变量来拼接流式内容
    let accumulated = ""
    let streamHandledEnd = false

    try {
      await sendMessageStream(
        text,
        userId,
        {
          onMessage(answer) {
            accumulated += answer
            setMessages((prev) => {
              const newMsgs = [...prev]
              const last = newMsgs[newMsgs.length - 1]
              if (last && last.isStreaming) {
                newMsgs[newMsgs.length - 1] = { ...last, content: accumulated }
              }
              return newMsgs
            })
          },
          onMessageEnd(_messageId, conversationId) {
            streamHandledEnd = true
            setIsStreaming(false)
            setMessages((prev) => {
              const newMsgs = [...prev]
              const last = newMsgs[newMsgs.length - 1]
              if (last && last.isStreaming) {
                newMsgs[newMsgs.length - 1] = { ...last, isStreaming: false }
              }
              return newMsgs
            })
            if (conversationId && !activeConvId) {
              setActiveConvId(conversationId)
            }
            loadConversations()
          },
          onWorkflowStarted() {
            // 工作流开始时可以显示 loading
            setMessages((prev) => {
              const newMsgs = [...prev]
              const last = newMsgs[newMsgs.length - 1]
              if (last && last.isStreaming) {
                newMsgs[newMsgs.length - 1] = {
                  ...last,
                  content: "正在分析中，请稍候...\n",
                }
              }
              return newMsgs
            })
            accumulated = "正在分析中，请稍候...\n"
          },
          onError(message) {
            streamHandledEnd = true
            setIsStreaming(false)
            setMessages((prev) => {
              const newMsgs = [...prev]
              const last = newMsgs[newMsgs.length - 1]
              if (last && last.isStreaming) {
                newMsgs[newMsgs.length - 1] = {
                  ...last,
                  content: `错误: ${message}`,
                  isStreaming: false,
                }
              }
              return newMsgs
            })
          },
        },
        {
          conversationId: activeConvId || undefined,
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        }
      )
    } catch (err) {
      if (!streamHandledEnd) {
        setIsStreaming(false)
        setMessages((prev) => {
          const newMsgs = [...prev]
          const last = newMsgs[newMsgs.length - 1]
          if (last && last.isStreaming) {
            newMsgs[newMsgs.length - 1] = {
              ...last,
              content: `发送失败: ${err instanceof Error ? err.message : "未知错误"}`,
              isStreaming: false,
            }
          }
          return newMsgs
        })
      }
    }
  }

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 移除附件
  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 文件图标
  const getFileIcon = (file: File) => {
    if (file.type.startsWith("audio")) return <Mic className="size-4 text-purple-400" />
    if (file.type.startsWith("video")) return <Video className="size-4 text-blue-400" />
    return <FileText className="size-4 text-green-400" />
  }

  // 文件分析栏状态
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([])

  // 统计各类型已选文件数
  const textFileCount = analysisFiles.filter(f =>
    !f.type.startsWith("audio/") && !f.type.startsWith("video/")
  ).length
  const audioFileCount = analysisFiles.filter(f => f.type.startsWith("audio/")).length
  const videoFileCount = analysisFiles.filter(f => f.type.startsWith("video/")).length

  // 文件分析栏：点击卡片 → 动态创建 input 弹出文件选择器
  const handleAnalysisFileSelect = (type: "text" | "audio" | "video") => {
    const acceptMap = {
      text: ".txt,.md,.pdf,.doc,.docx",
      audio: "audio/*",
      video: "video/*",
    }
    const input = document.createElement("input")
    input.type = "file"
    input.accept = acceptMap[type]
    input.multiple = true
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        setAnalysisFiles((prev) => [...prev, ...Array.from(target.files!)])
      }
    }
    input.click()
  }

  // 文件分析栏：移除已选文件
  const removeAnalysisFile = (index: number) => {
    setAnalysisFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 文件分析栏：点击「开始分析」→ 直接发送文件
  const handleStartAnalysis = () => {
    if (analysisFiles.length === 0 || isStreaming) return
    const files = [...analysisFiles]
    setAnalysisFiles([])
    handleSend(files)
  }

  // 开场白
  const openingStatement = "您好呀，我是您专属的心理医生朋友，您可以上传音频、视频甚至输入一段话来帮我分析您现在的心理状态，也可以输入「智能问答」让我来为您生成你想要的题目进行测试哦！"

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 聊天区域 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {/* 顶栏 */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Stethoscope className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">智能心理医生</h1>
              <p className="text-xs text-muted-foreground">多模态心理状况分析</p>
            </div>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Brain className="size-8 text-primary" />
              </div>
              <div className="max-w-md text-center">
                <h2 className="mb-2 text-lg font-semibold">多模态心理状况分析</h2>
                <p className="text-sm text-muted-foreground">{openingStatement}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Card
                  className="cursor-pointer p-3 text-center transition-colors hover:bg-accent"
                  onClick={() => {
                    setInputText("我最近压力很大，总是睡不好觉，感觉对什么都没兴趣")
                    inputRef.current?.focus()
                  }}
                >
                  <FileText className="mx-auto mb-1.5 size-5 text-blue-500" />
                  <span className="text-xs">文本分析</span>
                </Card>
                <Card
                  className="cursor-pointer p-3 text-center transition-colors hover:bg-accent"
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                >
                  <Mic className="mx-auto mb-1.5 size-5 text-purple-500" />
                  <span className="text-xs">音频分析</span>
                </Card>
                <Card
                  className="cursor-pointer p-3 text-center transition-colors hover:bg-accent"
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                >
                  <Video className="mx-auto mb-1.5 size-5 text-green-500" />
                  <span className="text-xs">视频分析</span>
                </Card>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <Avatar className="mt-0.5 size-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Stethoscope className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[80%] space-y-1`}>
                    {/* 消息文件 */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.files.map((f) => (
                          <div key={f.id} className="text-xs text-muted-foreground">
                            {f.type === "image" ? (
                              <img
                                src={f.url}
                                alt="附件"
                                className="max-h-48 rounded-md"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded border px-2 py-1">
                                <FileText className="size-3" />
                                文件
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 消息内容 */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content || (msg.isStreaming ? "" : "...")}
                      {msg.isStreaming && msg.content && (
                        <span className="ml-0.5 inline-block animate-pulse">|</span>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="mt-0.5 size-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {(user?.full_name || "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isStreaming && !messages[messages.length - 1]?.content && (
                <div className="flex gap-3">
                  <Avatar className="mt-0.5 size-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Stethoscope className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">思考中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 附件预览 */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-t px-4 py-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs"
              >
                {getFileIcon(file)}
                <span className="max-w-24 truncate">{file.name}</span>
                <button
                  type="button"
                  className="ml-1 rounded p-0.5 hover:bg-destructive/20"
                  onClick={() => removeAttachment(idx)}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入区域 */}
        <div className="border-t p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2">
              {/* 文件上传按钮 */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.md"
                multiple
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
              >
                <Paperclip className="size-4" />
              </Button>

              {/* 文本输入 */}
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，或上传音频/视频/文本进行分析..."
                className="flex-1 resize-none border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                rows={1}
                disabled={isStreaming}
                style={{ maxHeight: "120px", minHeight: "24px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "24px"
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />

              {/* 发送按钮 */}
              <Button
                size="icon-sm"
                onClick={() => handleSend()}
                disabled={isStreaming || (!inputText.trim() && attachedFiles.length === 0)}
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Enter 发送 / Shift+Enter 换行</span>
              <span>支持音频、视频、图片、文档文件</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧文件分析栏 */}
      <div className="flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
        {/* 栏标题 */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <FlaskConical className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">文件分析</h2>
            <p className="text-xs text-muted-foreground">上传文件进行心理分析</p>
          </div>
        </div>

        {/* 上传卡片区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* 文本分析卡片 */}
            <Card
              className={`cursor-pointer p-4 transition-colors ${textFileCount > 0 ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-accent"}`}
              onClick={() => handleAnalysisFileSelect("text")}
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg ${textFileCount > 0 ? "bg-blue-200" : "bg-blue-100"}`}>
                  <FileText className={`size-5 ${textFileCount > 0 ? "text-blue-600" : "text-blue-500"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">文本分析</p>
                  <p className="text-xs text-muted-foreground">.txt .md .pdf .doc</p>
                </div>
                {textFileCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {textFileCount}
                  </span>
                )}
              </div>
            </Card>

            {/* 音频分析卡片 */}
            <Card
              className={`cursor-pointer p-4 transition-colors ${audioFileCount > 0 ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-accent"}`}
              onClick={() => handleAnalysisFileSelect("audio")}
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg ${audioFileCount > 0 ? "bg-purple-200" : "bg-purple-100"}`}>
                  <Mic className={`size-5 ${audioFileCount > 0 ? "text-purple-600" : "text-purple-500"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">音频分析</p>
                  <p className="text-xs text-muted-foreground">.mp3 .wav .m4a</p>
                </div>
                {audioFileCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {audioFileCount}
                  </span>
                )}
              </div>
            </Card>

            {/* 视频分析卡片 */}
            <Card
              className={`cursor-pointer p-4 transition-colors ${videoFileCount > 0 ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-accent"}`}
              onClick={() => handleAnalysisFileSelect("video")}
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg ${videoFileCount > 0 ? "bg-green-200" : "bg-green-100"}`}>
                  <Video className={`size-5 ${videoFileCount > 0 ? "text-green-600" : "text-green-500"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">视频分析</p>
                  <p className="text-xs text-muted-foreground">.mp4 .mov .avi</p>
                </div>
                {videoFileCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {videoFileCount}
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* 已选文件列表 */}
          {analysisFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">已选文件</p>
              {analysisFiles.map((file, idx) => (
                <div
                  key={`analysis-${file.name}-${idx}`}
                  className="flex items-center gap-2 rounded-md border bg-muted px-2 py-1.5 text-xs"
                >
                  {getFileIcon(file)}
                  <span className="flex-1 truncate">{file.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-destructive/20"
                    onClick={() => removeAnalysisFile(idx)}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部开始分析按钮 */}
        <div className="border-t p-4">
          <Button
            className="w-full"
            onClick={handleStartAnalysis}
            disabled={analysisFiles.length === 0 || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            开始分析
          </Button>
        </div>
      </div>

    </div>
  )
}
