/**
 * Skeleton — reserved space for content that is loading.
 *
 * Every skeleton mirrors the shape of what replaces it (same aspect ratio,
 * same line heights) so nothing shifts when the data arrives.
 */
function Skeleton({ className = '', rounded = 'rounded-md' }) {
  return <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />
}

export function SkeletonText({ lines = 3, className = '', lastLineWidth = '60%' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton h-3 rounded-full"
          style={{ width: index === lines - 1 ? lastLineWidth : '100%' }}
        />
      ))}
    </div>
  )
}

export default Skeleton
