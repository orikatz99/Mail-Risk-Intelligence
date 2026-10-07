import type { EmailDetail, EmailSummary } from '../types'

const BASE_URL = 'http://localhost:3000/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options)

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json() as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // keep the default message if the error body isn't JSON
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export function getEmails(): Promise<EmailSummary[]> {
  return apiFetch<EmailSummary[]>('/emails')
}

export function getEmail(id: string): Promise<EmailDetail> {
  return apiFetch<EmailDetail>(`/emails/${id}`)
}

// Stub — replaced by full implementation in T037 (US4)
export function retryEmail(_id: string): Promise<EmailSummary> {
  return Promise.resolve({} as EmailSummary)
}
