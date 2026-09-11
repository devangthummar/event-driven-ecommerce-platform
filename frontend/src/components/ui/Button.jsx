import { forwardRef } from 'react'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-light',
  secondary: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white',
  text: 'bg-transparent text-primary hover:text-secondary',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-base',
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    type = 'button',
    ...props
  },
  ref
) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out rounded-[8px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = variants[variant] || variants.primary
  const sizeStyles = sizes[size] || sizes.md

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button