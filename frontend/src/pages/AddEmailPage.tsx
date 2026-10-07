import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { submitEmail, uploadEmailFile } from '../services/api'
import ErrorState from '../components/ErrorState'

const ACCEPTED_EXTENSIONS = ['.txt', '.pdf', '.eml']

function hasValidExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export default function AddEmailPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: 'text' | 'file') {
    setMode(next)
    setFieldError(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setFieldError(null)
    if (selected && !hasValidExtension(selected.name)) {
      setFieldError(`Unsupported file type — use .txt, .pdf, or .eml`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    setApiError(null)

    if (mode === 'text') {
      if (!content.trim()) {
        setFieldError('Email content must not be empty')
        return
      }
    } else {
      if (!file) {
        setFieldError('Please select a file')
        return
      }
      if (!hasValidExtension(file.name)) {
        setFieldError(`Unsupported file type — use .txt, .pdf, or .eml`)
        return
      }
    }

    setSubmitting(true)
    try {
      if (mode === 'text') {
        await submitEmail(content)
      } else {
        await uploadEmailFile(file!)
      }
      navigate('/')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (apiError) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <ErrorState message={apiError} onRetry={() => setApiError(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-blue-100 px-4 py-3">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Add Email</h1>
      </div>

      <div className="p-4">
      <div className="mb-4 flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
        <button
          type="button"
          onClick={() => switchMode('text')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => switchMode('file')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === 'file'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload file
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'text' ? (
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setFieldError(null) }}
            placeholder="Paste raw email content here…"
            rows={12}
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <div>
            <label className="block text-sm text-gray-600">
              Select a .txt, .pdf, or .eml file
            </label>
            <input
              type="file"
              accept=".txt,.pdf,.eml"
              onChange={handleFileChange}
              className="mt-2 w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
        )}

        {fieldError && (
          <p className="text-sm text-red-600">{fieldError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
      </div>
    </div>
  )
}
