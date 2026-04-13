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
  return (
    <input
      type="radio"
      id={id}
      value={value}
      checked={_groupValue === value}
      onChange={() => _onGroupChange && _onGroupChange(value)}
      className={`h-4 w-4 accent-primary cursor-pointer ${className || ''}`}
    />
  );
};
