import { AlertIcon, CheckCircleIcon, InfoIcon } from './Icons'

const TONES = {
  neutral: {
    wrapper: 'border-line bg-canvas text-ink-soft',
    icon: 'text-ink-muted',
    Icon: InfoIcon,
  },
  info: {
    wrapper: 'border-info/20 bg-info-soft text-ink-soft',
    icon: 'text-info',
    Icon: InfoIcon,
  },
  success: {
    wrapper: 'border-success/20 bg-success-soft text-ink-soft',
    icon: 'text-success',
    Icon: CheckCircleIcon,
  },
  warning: {
    wrapper: 'border-warning/20 bg-warning-soft text-ink-soft',
    icon: 'text-warning',
    Icon: AlertIcon,
  },
  danger: {
    wrapper: 'border-danger/20 bg-danger-soft text-ink-soft',
    icon: 'text-danger',
    Icon: AlertIcon,
  },
}

/**
 * Alert — inline, non-blocking message.
 * `role="alert"` for failures so assistive tech announces them; quieter tones
 * stay in the normal reading order.
 */
function Alert({ tone = 'neutral', title, children, className = '', actions = null }) {
  const config = TONES[tone] || TONES.neutral
  const { Icon } = config

  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={[
        'flex gap-3 rounded-lg border px-4 py-3 text-sm',
        config.wrapper,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${config.icon}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export default Alert
