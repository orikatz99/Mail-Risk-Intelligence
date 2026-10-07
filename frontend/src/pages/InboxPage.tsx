import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EmailSummary } from '../types'
import { getEmails } from '../services/api'
import EmailListItem from '../components/EmailListItem'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getEmails()
      setEmails(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const hasPending = emails.some(e => e.status === 'pending' || e.status === 'processing')
    if (!hasPending) return
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [emails, load])

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-gray-200 bg-blue-100 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Inbox</h1>
        <div className="flex items-center gap-3">
          <Link to="/graph" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Graph
          </Link>
          <Link to="/add" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            + Add Email
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : emails.length === 0 ? (
        <EmptyState message="No emails in your inbox." />
      ) : (
        <ul>
          {emails.map(email => (
            <li key={email.id}>
              <EmailListItem email={email} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
