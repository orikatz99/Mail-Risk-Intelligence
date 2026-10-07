import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { EmailDetail } from '../types'
import { getEmail, retryEmail } from '../services/api'
import RiskBadge from '../components/RiskBadge'
import EntityPanel from '../components/EntityPanel'
import ErrorState from '../components/ErrorState'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  )
}

function Spinner() {
  return <div className="py-6 text-center text-sm text-gray-400">Processing…</div>
}

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await getEmail(id)
      setEmail(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!email) return
    if (email.status === 'done' || email.status === 'failed') return
    const intervalId = setInterval(load, 3000)
    return () => clearInterval(intervalId)
  }, [email, load])

  const handleRetry = useCallback(async () => {
    if (!id) return
    setRetrying(true)
    try {
      await retryEmail(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }, [id, load])

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>
  }

  if (error && !email) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  if (!email) return null

  const isProcessing = email.status === 'pending' || email.status === 'processing'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-blue-100 px-4 py-3">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back
        </Link>
        <RiskBadge risk_level={email.risk?.risk_level ?? null} />
        <span className="text-xs capitalize text-gray-400">{email.status}</span>
      </div>

      <div className="space-y-4 p-4">
      {email.status === 'failed' && (
        <ErrorState
          message={email.error_message ?? 'Processing failed'}
          onRetry={retrying ? undefined : handleRetry}
        />
      )}

      <SectionCard title="Original Content">
        <pre className="overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700">
          {email.raw_content}
        </pre>
      </SectionCard>

      <SectionCard title="Extraction">
        {isProcessing && !email.extraction ? (
          <Spinner />
        ) : email.extraction ? (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Sender</dt>
              <dd>{email.extraction.sender ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Recipients</dt>
              <dd>{email.extraction.recipients.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Date</dt>
              <dd>{email.extraction.date ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Subject</dt>
              <dd>{email.extraction.subject ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Summary</dt>
              <dd>{email.extraction.summary ?? '—'}</dd>
            </div>
            {email.extraction.key_facts.length > 0 && (
              <div>
                <dt className="font-medium text-gray-500">Key Facts</dt>
                <dd>
                  <ul className="mt-1 space-y-1">
                    {email.extraction.key_facts.map((fact, i) => (
                      <li key={i} className="text-xs">
                        <span className="rounded bg-gray-100 px-1 py-0.5 text-gray-600">
                          {fact.type}
                        </span>{' '}
                        {fact.value}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-400">No extraction data available.</p>
        )}
      </SectionCard>

      <SectionCard title="Risk Assessment">
        {isProcessing && !email.risk ? (
          <Spinner />
        ) : email.risk ? (
          <div className="space-y-2">
            <RiskBadge risk_level={email.risk.risk_level} />
            <p className="text-sm text-gray-700">{email.risk.rationale}</p>
            {email.risk.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {email.risk.tags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No risk assessment available.</p>
        )}
      </SectionCard>

      <SectionCard title="Entities & Relationships">
        {isProcessing && email.entities.length === 0 ? (
          <Spinner />
        ) : (
          <EntityPanel entities={email.entities} relationships={email.relationships} />
        )}
      </SectionCard>
      </div>
    </div>
  )
}
