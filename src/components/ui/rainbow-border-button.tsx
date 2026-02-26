import React from 'react';
import { cn } from '@/lib/utils';

interface RainbowBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const RainbowBorderButton = ({ children, className, ...props }: RainbowBorderButtonProps) => {
  return (
    <button 
      className={cn(
        "rainbow-border relative w-[140px] h-10 flex items-center justify-center gap-2.5 px-4 bg-black rounded-xl border-none text-white cursor-pointer font-black transition-all duration-200 hover:scale-105",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
