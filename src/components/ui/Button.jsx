import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-primary hover:bg-primary-dark text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-text',
  danger: 'bg-danger hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-text',
  outline: 'border border-border hover:bg-gray-50 text-text',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
