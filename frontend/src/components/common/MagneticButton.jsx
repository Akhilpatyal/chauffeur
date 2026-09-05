import React, { useRef, useState } from 'react';
import { cn } from '../../utils/helpers';

export default function MagneticButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  icon: Icon,
  disabled = false,
  ...props
}) {
  const btnRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!btnRef.current || disabled) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.16;
    const y = (clientY - (top + height / 2)) * 0.16;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variants = {
    primary: 'bg-[#012C18] text-[#F4F1E8] hover:bg-[#043A25] shadow-md border border-[#012C18]/50',
    forest: 'bg-[#043A25] text-[#F4F1E8] hover:bg-[#012C18] shadow-sm border border-[#043A25]/50',
    ivory: 'bg-[#F4F1E8] text-[#012C18] hover:bg-white border border-[#DDD4C1] shadow-sm font-semibold',
    accent: 'bg-[#D65A3A] text-white hover:bg-[#C24B2C] shadow-lg shadow-[#D65A3A]/25 border border-transparent',
    gold: 'bg-[#B89A5A] text-[#012C18] hover:bg-[#CBB073] font-semibold border border-transparent',
    outlineLight: 'bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/30 backdrop-blur-md',
    outlineDark: 'bg-transparent hover:bg-[#012C18]/5 text-[#012C18] border border-[#012C18]/30',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg',
    md: 'px-6 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase rounded-xl',
    lg: 'px-8 py-3.5 sm:py-4 text-sm font-bold tracking-wider uppercase rounded-xl',
    xl: 'px-10 py-5 text-base font-bold tracking-wider uppercase rounded-xl'
  };

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
      }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 active:scale-98 select-none disabled:opacity-50 disabled:pointer-events-none group font-sans',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {Icon && <Icon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />}
    </button>
  );
}
