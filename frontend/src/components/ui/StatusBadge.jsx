import Badge from './Badge'
import { orderStatusMeta } from '../../lib/orderStatus'

/**
 * StatusBadge — renders one of the five real backend order states.
 * The plain-language label is paired with the raw enum on request so admin
 * screens can show exactly what the server stores.
 */
function StatusBadge({ status, size = 'md', showRaw = false, className = '' }) {
  const meta = orderStatusMeta(status)

  return (
    <Badge tone={meta.tone} size={size} dot className={className} title={meta.summary}>
      {meta.label}
      {showRaw && (
        <span className="font-mono text-[10px] font-normal opacity-70">{status}</span>
      )}
    </Badge>
  )
}

export default StatusBadge
