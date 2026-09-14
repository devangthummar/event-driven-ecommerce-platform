/* ==========================================================================
   Icons
   --------------------------------------------------------------------------
   A small hand-rolled set (24px grid, 1.5 stroke, round caps) instead of an
   icon dependency: it keeps the bundle honest, guarantees one visual
   language, and every glyph inherits `currentColor` and `aria-hidden` by
   default so decorative icons never pollute the accessibility tree.
   ========================================================================== */

function Svg({ children, className = 'size-5', strokeWidth = 1.5, ...rest }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function BagIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  )
}

export function SearchIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </Svg>
  )
}

export function UserIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" />
    </Svg>
  )
}

export function MenuIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  )
}

export function CloseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

export function ChevronDownIcon(props) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <Svg {...props}>
      <path d="m14 6-6 6 6 6" />
    </Svg>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Svg {...props}>
      <path d="m10 6 6 6-6 6" />
    </Svg>
  )
}

export function ArrowRightIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />
    </Svg>
  )
}

export function StarIcon({ filled = false, ...props }) {
  return (
    <Svg {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.6Z" />
    </Svg>
  )
}

export function CheckIcon(props) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  )
}

export function CheckCircleIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </Svg>
  )
}

export function AlertIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4" />
      <path d="M12 16.8h.01" strokeWidth={props?.strokeWidth ?? 2} />
    </Svg>
  )
}

export function InfoIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" strokeWidth={2} />
    </Svg>
  )
}

export function RefreshIcon(props) {
  return (
    <Svg {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </Svg>
  )
}

export function PlusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function MinusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function TrashIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 7h14M10 7V5h4v2M6.5 7l.8 12h9.4l.8-12" />
      <path d="M10.5 11v4.5M13.5 11v4.5" />
    </Svg>
  )
}

export function EditIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </Svg>
  )
}

export function PackageIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
      <path d="M4 8l8 4.5L20 8M12 12.5v8" />
    </Svg>
  )
}

export function TruckIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </Svg>
  )
}

export function WalletIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H18a1 1 0 0 1 1 1v1" />
      <path d="M4 7.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7H5.5A1.5 1.5 0 0 1 4 8.5" />
      <path d="M16.5 13.5h.01" strokeWidth={2} />
    </Svg>
  )
}

export function ShieldIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6l7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  )
}

export function SlidersIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 8h14M5 16h14" />
      <circle cx="9" cy="8" r="2" />
      <circle cx="15" cy="16" r="2" />
    </Svg>
  )
}

export function SortIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 5v14m0 0-3-3m3 3 3-3" />
      <path d="M17 19V5m0 0-3 3m3-3 3 3" />
    </Svg>
  )
}

export function EyeIcon({ off = false, ...props }) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {off && <path d="M4 20 20 4" />}
    </Svg>
  )
}

export function InboxIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 13.5 6 5h12l2 8.5" />
      <path d="M4 13.5V18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4.5h-5a3 3 0 0 1-6 0H4Z" />
    </Svg>
  )
}

export function StoreIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 9.5V19h16V9.5" />
      <path d="M3.5 9.5 5 4.5h14l1.5 5a3 3 0 0 1-5.3 1.4A3 3 0 0 1 12 12.4a3 3 0 0 1-3.2-1.5A3 3 0 0 1 3.5 9.5Z" />
    </Svg>
  )
}

export function GridIcon(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Svg>
  )
}

export function ActivityIcon(props) {
  return (
    <Svg {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  )
}

export function LayersIcon(props) {
  return (
    <Svg {...props}>
      <path d="m12 2 10 5.5L12 13 2 7.5 12 2Z" />
      <path d="m2 12.5 10 5.5 10-5.5" />
      <path d="m2 17.5 10 5.5 10-5.5" />
    </Svg>
  )
}

export function ZapIcon(props) {
  return (
    <Svg {...props}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </Svg>
  )
}

export function DatabaseIcon(props) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </Svg>
  )
}

export function ClockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Svg>
  )
}
