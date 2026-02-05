import { cn } from '../../lib/utils';
import { Loader2Icon } from 'lucide-react';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return <Loader2Icon className={cn('animate-spin', sizeClasses[size], className)} />;
}
