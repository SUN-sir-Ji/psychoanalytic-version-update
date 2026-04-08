import { OpenAPI } from "./core/OpenAPI"

export interface AnalysisRecord {
  record_id: string
  user_id: string
  person_name: string
  gender: "male" | "female" | "other"
  age?: number
  birth_date?: string
  remarks?: string
  analysis_result?: string
  text_analysis_result?: string
  audio_analysis_result?: string
  video_analysis_result?: string
  record_time?: string
  files?: FileInfo[]
}

export interface FileInfo {
  file_id: string
  record_id: string
  file_name: string
  file_path: string
  file_type?: string
  file_size?: number
  created_at?: string
}

export interface AnalysisRecordCreate {
  person_name: string
  gender: "male" | "female" | "other"
  age?: number
  birth_date?: string
  remarks?: string
}

const BASE_URL = OpenAPI.BASE || "/api/v1"

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("access_token")
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    let errorMsg = `请求失败 (${response.status})`
    try {
      const error = JSON.parse(text)
      if (error.detail) errorMsg = error.detail
    } catch {
      if (text) errorMsg = text.slice(0, 200)
    }
    throw new Error(errorMsg)
  }

  return response.json()
}

export const AnalysisService = {
  createRecord: async (data: AnalysisRecordCreate): Promise<AnalysisRecord> => {
    return fetchAPI<AnalysisRecord>("/analysis-records/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  getRecords: async (skip = 0, limit = 100): Promise<{ data: AnalysisRecord[]; count: number }> => {
    return fetchAPI<{ data: AnalysisRecord[]; count: number }>(
      `/analysis-records/?skip=${skip}&limit=${limit}`
    )
  },

  getRecord: async (recordId: string): Promise<AnalysisRecord> => {
    return fetchAPI<AnalysisRecord>(`/analysis-records/${recordId}`)
  },

  deleteRecord: async (recordId: string): Promise<void> => {
    await fetchAPI(`/analysis-records/${recordId}`, { method: "DELETE" })
  },

  uploadFile: async (recordId: string, file: File): Promise<FileInfo> => {
    const token = localStorage.getItem("access_token")
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${BASE_URL}/analysis-records/${recordId}/files/`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }
    return response.json()
  },

  getRecordFiles: async (recordId: string): Promise<{ data: FileInfo[]; count: number }> => {
    return fetchAPI<{ data: FileInfo[]; count: number }>(
      `/analysis-records/${recordId}/files/`
    )
  },

  deleteFile: async (recordId: string, fileId: string): Promise<void> => {
    await fetchAPI(`/analysis-records/${recordId}/files/${fileId}`, { method: "DELETE" })
  },

  getFileDownloadUrl: (fileId: string): string => {
    const token = localStorage.getItem("access_token")
    return `${BASE_URL}/analysis-records/files/${fileId}${token ? `?token=${token}` : ""}`
  },

  simulateAnalysis: async (recordId: string): Promise<AnalysisRecord> => {
    return fetchAPI<AnalysisRecord>(`/analysis-records/${recordId}/simulate-analysis`, {
      method: "POST",
    })
  },
}
