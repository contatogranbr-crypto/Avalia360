import React from 'react';
export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }>(({ className, onCheckedChange, ...props }, ref) => (
  <input 
    type="checkbox" 
    ref={ref} 
    className={`h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer ${className || ''}`} 
    onChange={e => onCheckedChange && onCheckedChange(e.target.checked)}
    {...props} 
  />
));
Checkbox.displayName = "Checkbox";
