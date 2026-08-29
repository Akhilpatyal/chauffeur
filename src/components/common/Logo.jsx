import React from 'react';
import { cn } from '../../utils/helpers';

/*
 * Transparent-background marks, cropped tight from the source art in /public
 * (white-logo-withoutbg.png and without-bg.png), so the height classes below
 * are the real height of the wordmark.
 */
const LOGO_SRC = {
  light: '/logo-taifer-white.png',
  dark: '/logo-taifer.png'
};

const sizeClasses = {
  sm: 'h-8 sm:h-9',
  md: 'h-9 sm:h-10',
  lg: 'h-12 sm:h-14',
  xl: 'h-16 sm:h-20'
};

export default function Logo({
  variant = 'light', // 'light' (white mark for dark bg) | 'dark' (green mark for light bg)
  size = 'md',
  className,
  showTagline = false
}) {
  const isLight = variant === 'light';

  return (
    <div className={cn('inline-flex items-center select-none', className)}>
      <img
        src={isLight ? LOGO_SRC.light : LOGO_SRC.dark}
        alt="TAIFER — The Great Outdoors"
        className={cn(
          'w-auto object-contain transition-transform duration-300',
          sizeClasses[size] || sizeClasses.md
        )}
      />
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
