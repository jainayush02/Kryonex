import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-graphite text-white hover:bg-slate-800 shadow-[0_10px_20px_-10px_rgba(51,65,85,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(51,65,85,0.6)] dark:bg-white dark:text-obsidian dark:hover:bg-slate-200 dark:shadow-[0_10px_20px_-10px_rgba(255,255,255,0.2)]',
      secondary: 'bg-white/40 backdrop-blur-xl text-graphite hover:bg-white/60 border border-slate-200 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:bg-white/10 dark:text-white dark:border-graphite dark:hover:bg-white/20',
      outline: 'border border-slate-200/50 bg-transparent hover:bg-slate-100/50 text-graphite dark:border-graphite dark:text-slate-300 dark:hover:bg-white/10',
      ghost: 'hover:bg-slate-100/50 text-graphite dark:text-slate-300 dark:hover:bg-white/10',
    };

    const sizes = {
      sm: 'h-8 px-4 text-xs',
      md: 'h-10 px-5 py-2 text-sm',
      lg: 'h-12 px-8 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700/30 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
