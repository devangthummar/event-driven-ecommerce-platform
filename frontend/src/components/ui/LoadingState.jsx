/**
 * LoadingState — minimal, tasteful loading indicator.
 * Uses subtle pulse animation consistent with the quiet-luxury design.
 */
function LoadingState({ message = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      {/* Three subtle dots pulsing */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse [animation-delay:200ms]" />
        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse [animation-delay:400ms]" />
      </div>
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

/**
 * SkeletonGrid — placeholder grid while products load.
 */
function SkeletonGrid({ count = 8, columns = 4 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${columns} gap-6 lg:gap-8`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-bg-tertiary mb-4" />
          <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
          <div className="h-4 bg-bg-tertiary rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

export { LoadingState, SkeletonGrid }
