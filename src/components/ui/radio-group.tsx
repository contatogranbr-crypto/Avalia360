import React from 'react';

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ value, onValueChange, className, children }) => {
  return (
    <div className={className} data-radix-collection-item>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            _groupValue: value,
            _onGroupChange: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
  _groupValue?: string;
  _onGroupChange?: (value: string) => void;
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({ value, id, className, _groupValue, _onGroupChange }) => {
  const isSelected = _groupValue === value;
  
  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      <div 
        className={`
          h-5 w-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center
          ${isSelected 
            ? 'border-black bg-white' 
            : 'border-slate-300 bg-white'}
          ${className || ''}
        `}
      >
        {isSelected && (
          <div className="h-2.5 w-2.5 rounded-full bg-black scale-100 transition-transform" />
        )}
      </div>
    </div>
  );
};
