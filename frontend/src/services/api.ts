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

export function submitEmail(content: string): Promise<EmailSummary> {
  return apiFetch<EmailSummary>('/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export function uploadEmailFile(file: File): Promise<EmailSummary> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<EmailSummary>('/emails', { method: 'POST', body: form })
}

export function retryEmail(id: string): Promise<EmailSummary> {
  return apiFetch<EmailSummary>(`/emails/${id}/retry`, { method: 'POST' })
}
