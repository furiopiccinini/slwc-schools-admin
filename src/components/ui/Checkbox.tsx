import React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              className={cn(
                "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 focus:ring-offset-0 transition-colors",
                error && "border-red-500 text-red-600 focus:ring-red-500",
                className
              )}
              {...props}
            />
          </div>
          {label && (
            <div className="ml-3">
              <label className="text-sm font-medium text-gray-900">
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600 ml-7">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 ml-7">{helperText}</p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"
