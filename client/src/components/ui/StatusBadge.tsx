import { CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react'
import clsx from 'clsx'

const configs: Record<string, { label: string; className: string; Icon: typeof CheckCircle }> = {
  ON_TARGET:  { label: 'On Target',  className: 'bg-green-100 text-green-800',   Icon: CheckCircle },
  EXCEEDED:   { label: 'Exceeded',   className: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle },
  WARNING:    { label: 'Warning',    className: 'bg-yellow-100 text-yellow-800',  Icon: AlertTriangle },
  CRITICAL:   { label: 'Critical',   className: 'bg-red-100 text-red-800',        Icon: XCircle },
  NO_DATA:    { label: 'No Data',    className: 'bg-gray-100 text-gray-600',      Icon: Minus },
  ACTIVE:     { label: 'Active',     className: 'bg-blue-100 text-blue-800',      Icon: CheckCircle },
  INACTIVE:   { label: 'Inactive',   className: 'bg-gray-100 text-gray-600',      Icon: Minus },
  OPEN:       { label: 'Open',       className: 'bg-red-100 text-red-800',        Icon: AlertTriangle },
  CLOSED:     { label: 'Closed',     className: 'bg-gray-100 text-gray-600',      Icon: CheckCircle },
  MITIGATED:  { label: 'Mitigated',  className: 'bg-green-100 text-green-800',   Icon: CheckCircle },
  IN_PROGRESS:{ label: 'In Progress',className: 'bg-blue-100 text-blue-800',      Icon: CheckCircle },
  PLANNING:   { label: 'Planning',   className: 'bg-purple-100 text-purple-800',  Icon: CheckCircle },
  COMPLETED:  { label: 'Completed',  className: 'bg-green-100 text-green-800',   Icon: CheckCircle },
  ON_HOLD:    { label: 'On Hold',    className: 'bg-yellow-100 text-yellow-800',  Icon: AlertTriangle },
  CANCELLED:  { label: 'Cancelled',  className: 'bg-gray-100 text-gray-600',      Icon: Minus },
  DRAFT:      { label: 'Draft',      className: 'bg-gray-100 text-gray-600',      Icon: Minus },
  APPROVED:   { label: 'Approved',   className: 'bg-green-100 text-green-800',   Icon: CheckCircle },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = configs[status] || { label: status, className: 'bg-gray-100 text-gray-600', Icon: Minus }
  const { Icon, label, className } = cfg
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>
      <Icon size={11} />
      {label}
    </span>
  )
}
