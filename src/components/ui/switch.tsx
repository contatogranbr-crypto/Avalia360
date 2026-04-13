import React from 'react';
export const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }>(({ className, checked, onCheckedChange, ...props }, ref) => (
  <div 
    className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-primary' : 'bg-slate-300'} ${className || ''}`}
    onClick={() => onCheckedChange && onCheckedChange(!checked)}
  >
    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    <input type="checkbox" ref={ref} checked={checked} onChange={e => onCheckedChange && onCheckedChange(e.target.checked)} className="hidden" {...props} />
  </div>
));
Switch.displayName = "Switch";
