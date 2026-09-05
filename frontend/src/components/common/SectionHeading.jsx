import React from 'react';
import { cn } from '../../utils/helpers';

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  variant = 'light',
  className,
  actionText,
  onActionClick
}) {
  const isDark = variant === 'dark';

  return (
    <div
      className={cn(
        'max-w-4xl section-header',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            'section-eyebrow inline-flex items-center gap-2.5 text-xs font-mono font-bold tracking-[0.25em] uppercase mb-3.5',
            isDark ? 'text-[#B89A5A]' : 'text-[#075333]'
          )}
        >
          <span className="w-5 h-px bg-current opacity-60"></span>
          <span>{eyebrow}</span>
          <span className="w-5 h-px bg-current opacity-60"></span>
        </div>
      )}

      {title && (
        <h2
          className={cn(
            'section-title font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.12] tracking-tight mb-4',
            isDark ? 'text-[#F4F1E8]' : 'text-[#012C18]'
          )}
        >
          {title}
        </h2>
      )}

      {subtitle && (
        <p
          className={cn(
            'section-subtitle text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-2xl',
            align === 'center' ? 'mx-auto' : '',
            isDark ? 'text-[#DDD4C1]/80' : 'text-[#141E18]/75'
          )}
        >
          {subtitle}
        </p>
      )}

      {actionText && (
        <div className="mt-5">
          <button
            onClick={onActionClick}
            className={cn(
              'inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase pb-0.5 border-b transition-colors cursor-pointer',
              isDark
                ? 'text-[#DDD4C1] hover:text-[#B89A5A] border-[#DDD4C1]/30 hover:border-[#B89A5A]'
                : 'text-[#012C18] hover:text-[#075333] border-[#012C18]/30 hover:border-[#075333]'
            )}
          >
            <span>{actionText}</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
