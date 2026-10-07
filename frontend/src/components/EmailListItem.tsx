import { Link } from 'react-router-dom'
import type { EmailSummary } from '../types'
import RiskBadge from './RiskBadge'

interface Props {
  email: EmailSummary
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function EmailListItem({ email }: Props) {
  return (
    <Link
      to={`/emails/${email.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-200"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {email.sender ?? <span className="text-gray-400 italic">Pending…</span>}
        </p>
        <p className="truncate text-sm text-gray-600">
          {email.subject ?? <span className="text-gray-400 italic">Pending…</span>}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <RiskBadge risk_level={email.risk_level} />
        {email.date && (
          <span className="text-xs text-gray-400">{formatDate(email.date)}</span>
        )}
      </div>
    </Link>
  )
}
