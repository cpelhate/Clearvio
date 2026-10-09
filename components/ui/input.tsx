import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md'
  error?: boolean
  label?: string
  hint?: string
  errorMessage?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  error,
  label,
  hint,
  errorMessage,
  className,
  id,
  ...props
}, ref) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
    {label && (
      <label htmlFor={id} className="form-label">
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      className={cn(
        'form-input',
        size === 'sm' && 'form-input-sm',
        error && 'error',
        className,
      )}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
    {errorMessage && <span className="form-error" role="alert">{errorMessage}</span>}
    {hint && !errorMessage && <span className="form-hint">{hint}</span>}
  </div>
))

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  label?: string
  hint?: string
  errorMessage?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  error,
  label,
  hint,
  errorMessage,
  className,
  id,
  ...props
}, ref) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
    {label && (
      <label htmlFor={id} className="form-label">
        {label}
      </label>
    )}
    <textarea
      ref={ref}
      id={id}
      className={cn('form-textarea', error && 'error', className)}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
    {errorMessage && <span className="form-error" role="alert">{errorMessage}</span>}
    {hint && !errorMessage && <span className="form-hint">{hint}</span>}
  </div>
))

Textarea.displayName = 'Textarea'

export { Input, Textarea }
export type { InputProps, TextareaProps }
