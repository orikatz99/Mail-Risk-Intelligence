import type { RiskLevel } from '../types'

interface Props {
  risk_level: RiskLevel | null
}

const colorMap: Record<RiskLevel, string> = {
  high:   'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low:    'bg-blue-100 text-blue-800',
  none:   'bg-gray-100 text-gray-600',
}

export default function RiskBadge({ risk_level }: Props) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'

  if (risk_level === null) {
    return <span className={`${base} bg-gray-100 text-gray-500`}>Processing</span>
  }

  const label = risk_level.charAt(0).toUpperCase() + risk_level.slice(1)
  return <span className={`${base} ${colorMap[risk_level]}`}>{label}</span>
}
