import * as React from 'react';
import { cn } from '../../lib/utils';
import { CheckIcon } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            'h-4 w-4 shrink-0 rounded border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 peer-checked:bg-orange-500 peer-checked:border-orange-500 flex items-center justify-center',
            className
          )}
        >
          {checked && <CheckIcon className="h-3 w-3 text-white" />}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
