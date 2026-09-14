/**
 * Container — the single page gutter/width rule.
 * Every horizontal band in the app uses it, so alignment holds across pages.
 */
function Container({ children, className = '', as: Tag = 'div', size = 'default' }) {
  const widths = {
    default: 'max-w-[1320px]',
    narrow: 'max-w-4xl',
    wide: 'max-w-[1560px]',
  }

  return (
    <Tag className={`mx-auto w-full ${widths[size] || widths.default} px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </Tag>
  )
}

export default Container
