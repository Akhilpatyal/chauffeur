import React from 'react';
import logoLight from '../../assets/images/logo-light.jpg';
import logoDark from '../../assets/images/logo-dark.jpg';
import { cn } from '../../utils/helpers';

export default function Logo({
  variant = 'light', // 'light' (white logo for dark bg) | 'dark' (green logo for light bg)
  size = 'md',       // 'sm' | 'md' | 'lg' | 'xl'
  className,
  showTagline = false
}) {
  const isLight = variant === 'light'; // white logo for dark bg

  const sizeClasses = {
    sm: 'h-9 sm:h-10',
    md: 'h-12 sm:h-14',
    lg: 'h-16 sm:h-20',
    xl: 'h-24 sm:h-28'
  };

  return (
    <div className={cn('inline-flex items-center select-none', className)}>
      <div className={cn('relative overflow-hidden flex items-center justify-center', sizeClasses[size] || sizeClasses.md)}>
        <img
          src={isLight ? logoLight : logoDark}
          alt="TAIFER — The Great Outdoors"
          className={cn(
            'h-full w-auto object-contain transition-transform duration-300',
            isLight ? 'mix-blend-screen' : 'mix-blend-multiply'
          )}
        />
      </div>
      {showTagline && (
        <span
          className={cn(
            'ml-3 pl-3 border-l text-[10px] font-mono tracking-[0.25em] uppercase font-bold hidden sm:inline-block',
            isLight ? 'border-white/20 text-[#DDD4C1]' : 'border-[#012C18]/20 text-[#043A25]'
          )}
        >
          The Great Outdoors
        </span>
      )}
    </div>
  );
}
