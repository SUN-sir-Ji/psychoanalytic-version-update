const DIFY_API_BASE = "http://localhost/v1"
const DIFY_API_KEY = import.meta.env.VITE_DIFY_API_KEY || ""

export interface DifyMessage {
  id: string
  conversation_id: string
  query: string
  answer: string
  created_at: number
}

export interface DifyConversation {
  id: string
  name: string
  created_at: number
  updated_at: number
}

export interface DifyAppInfo {
  name: string
  description: string
  opening_statement?: string
  suggested_questions?: string[]
}

export interface RetrieverResource {
  position: number
  dataset_id: string
  dataset_name: string
  document_id: string
  document_name: string
  segment_id: string
  score: number
  content: string
}

export interface SendMessageResult {
  conversation_id: string
  message_id: string
  retriever_resources?: RetrieverResource[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class DifyService {
  private apiKey: string

  constructor(apiKey: string = DIFY_API_KEY) {
    this.apiKey = apiKey
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }
  }

  async getAppInfo(): Promise<DifyAppInfo> {
    const response = await fetch(`${DIFY_API_BASE}/info`, {
      method: "GET",
      headers: this.getHeaders(),
    })
    if (!response.ok) throw new Error("获取应用信息失败")
    return response.json()
  }

  async getParameters(): Promise<{
    opening_statement?: string
    suggested_questions?: string[]
    speech_to_text?: { enabled: boolean }
    text_to_speech?: { enabled: boolean; voice?: string }
    retriever_resource?: { enabled: boolean }
  }> {
    const response = await fetch(`${DIFY_API_BASE}/parameters`, {
      method: "GET",
      headers: this.getHeaders(),
    })
    if (!response.ok) throw new Error("获取应用参数失败")
    return response.json()
  }

  async getConversations(
    userId: string,
  ): Promise<{ data: DifyConversation[]; has_more: boolean }> {
    const response = await fetch(
      `${DIFY_API_BASE}/conversations?user=${userId}&limit=50`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    )
    if (!response.ok) throw new Error("获取会话列表失败")
    return response.json()
  }

  async getMessages(
    userId: string,
    conversationId: string,
  ): Promise<{ data: DifyMessage[]; has_more: boolean }> {
    const response = await fetch(
      `${DIFY_API_BASE}/messages?user=${userId}&conversation_id=${conversationId}&limit=50`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    )
    if (!response.ok) throw new Error("获取消息历史失败")
    return response.json()
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const response = await fetch(
      `${DIFY_API_BASE}/conversations/${conversationId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({ user: userId }),
      },
    )
    if (!response.ok) throw new Error("删除会话失败")
  }

  async audioToText(file: File | Blob, userId: string): Promise<string> {
    const formData = new FormData()
    if (file instanceof Blob && !(file instanceof File)) {
      const fileObj = new File([file], "recording.webm", { type: file.type })
      formData.append("file", fileObj)
    } else {
      formData.append("file", file)
    }
    formData.append("user", userId)

    const response = await fetch(`${DIFY_API_BASE}/audio-to-text`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    })
    if (!response.ok) throw new Error("语音转文字失败")
    const data = await response.json()
    return data.text
  }

  async getSuggestedQuestions(
    messageId: string,
    userId: string,
  ): Promise<string[]> {
    const response = await fetch(
      `${DIFY_API_BASE}/messages/${messageId}/suggested?user=${userId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    )
    if (!response.ok) throw new Error("获取建议问题失败")
    const data = await response.json()
    return data.data || []
  }

  async feedbackMessage(
    messageId: string,
    userId: string,
    rating: "like" | "dislike" | null,
    content?: string,
  ): Promise<void> {
    const response = await fetch(
      `${DIFY_API_BASE}/messages/${messageId}/feedbacks`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          rating,
          user: userId,
          content: content || "",
        }),
      },
    )
    if (!response.ok) throw new Error("反馈失败")
  }

  async textToAudio(
    text: string,
    userId: string,
    messageId?: string,
  ): Promise<Blob> {
    const response = await fetch(`${DIFY_API_BASE}/text-to-audio`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        user: userId,
        message_id: messageId,
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`文字转语音失败: ${response.status} - ${errorText}`)
    }
    return response.blob()
  }

  async sendMessage(
    userId: string,
    query: string,
    conversationId?: string,
    onChunk?: (answer: string) => void,
  ): Promise<SendMessageResult> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        query,
        user: userId,
        response_mode: "streaming",
        conversation_id: conversationId || "",
        inputs: {},
      }

      fetch(`${DIFY_API_BASE}/chat-messages`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      })
        .then((response) => {
          if (!response.ok) {
            reject(
              new Error(
                `发送消息失败: ${response.status} ${response.statusText}`,
              ),
            )
            return null
          }
          return response.body?.getReader()
        })
        .then((reader) => {
          if (!reader) return

          const decoder = new TextDecoder()
          let buffer = ""
          let conversationIdResult = conversationId || ""
          let messageIdResult = ""
          let retrieverResources: RetrieverResource[] = []
          let usage: SendMessageResult["usage"]

          const read = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                if (messageIdResult) {
                  resolve({
                    conversation_id: conversationIdResult,
                    message_id: messageIdResult,
                    retriever_resources: retrieverResources,
                    usage,
                  })
                } else {
                  reject(new Error("未收到有效响应"))
                }
                return
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.event === "message") {
                      if (data.conversation_id)
                        conversationIdResult = data.conversation_id
                      if (data.message_id) messageIdResult = data.message_id
                      onChunk?.(data.answer)
                    } else if (data.event === "message_end") {
                      if (data.metadata?.retriever_resources) {
                        retrieverResources = data.metadata.retriever_resources
                      }
                      if (data.metadata?.usage) {
                        usage = data.metadata.usage
                      }
                      resolve({
                        conversation_id: conversationIdResult,
                        message_id: messageIdResult,
                        retriever_resources: retrieverResources,
                        usage,
                      })
                    } else if (data.event === "error") {
                      reject(new Error(data.message || "请求出错"))
                    }
                  } catch {
                    // ignore parse errors
                  }
                }
              }
              read()
            })
          }
          read()
        })
        .catch(reject)
    })
  }
}

export const difyService = new DifyService()
export default DifyService
