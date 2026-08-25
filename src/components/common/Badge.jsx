import React from 'react';
import { cn } from '../../utils/helpers';

export default function Badge({ children, variant = 'forest', className, icon: Icon }) {
  const variants = {
    forest: 'bg-[#043A25]/15 text-[#012C18] border-[#043A25]/30',
    moss: 'bg-[#526B45]/15 text-[#043A25] border-[#526B45]/30',
    gold: 'bg-[#B89A5A]/15 text-[#8A713C] border-[#B89A5A]/40',
    terracotta: 'bg-[#D65A3A]/15 text-[#D65A3A] border-[#D65A3A]/30',
    dark: 'bg-[#012C18]/90 text-[#F4F1E8] border-white/15 backdrop-blur-md',
    ivory: 'bg-[#FAF9F5] text-[#012C18] border-[#DDD4C1] shadow-xs'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wider uppercase border select-none',
        variants[variant] || variants.forest,
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}
