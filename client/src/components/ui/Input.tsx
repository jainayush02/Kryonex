import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-slate-200/50 bg-white/30 backdrop-blur-xl px-4 py-2 text-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 focus-visible:bg-white/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus-visible:ring-blue-500/30 dark:focus-visible:border-blue-500/50 dark:focus-visible:bg-white/10 dark:shadow-[0_0_20px_rgba(59,130,246,0.05)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
