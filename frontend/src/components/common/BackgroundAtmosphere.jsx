import React from 'react';
import { Compass } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function BackgroundAtmosphere({ variant = 'light', showMountainLine = false, className }) {
  const isDark = variant === 'dark';

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden select-none z-0', className)}>
      {/* Topographic Contour Overlay */}
      <div className={`absolute inset-0 ${isDark ? 'topographic-bg-dark' : 'topographic-bg'} opacity-70`} />

      {/* Subtle Grain / Expedition Texture */}
      <div className={`absolute inset-0 ${isDark ? 'bg-expedition-grain-dark' : 'bg-expedition-grain'} opacity-60`} />

      {/* Expedition Coordinates & Altitude Labels */}
      <div className={`absolute top-10 left-8 font-mono text-[10px] tracking-[0.25em] uppercase ${isDark ? 'text-white/10' : 'text-[#012C18]/15'} hidden md:block`}>
        32°14'12"N 77°10'18"E · HIMALAYAN RANGE · ALT. 4,270M
      </div>
      
      <div className={`absolute bottom-12 right-10 font-mono text-[10px] tracking-[0.25em] uppercase ${isDark ? 'text-white/10' : 'text-[#012C18]/15'} hidden md:block`}>
        TRANS-HIMALAYAN EXPEDITION SECTOR · TAIFER EXP-08
      </div>

      {/* Faint Compass graphic watermark from logo */}
      <div className={`absolute -right-20 top-1/4 w-80 h-80 ${isDark ? 'text-white/4' : 'text-[#012C18]/4'} transform rotate-45 hidden lg:block`}>
        <Compass className="w-full h-full stroke-[0.5]" />
      </div>

      {/* Slow Animated Route Line */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M-50,220 C320,60 620,380 1120,140 S1640,420 2100,200"
          fill="none"
          stroke={isDark ? '#DDD4C1' : '#043A25'}
          strokeWidth="1.2"
          className="animate-route-path"
        />
        <circle cx="620" cy="380" r="2.5" fill={isDark ? '#B89A5A' : '#012C18'} />
        <circle cx="1120" cy="140" r="2.5" fill={isDark ? '#B89A5A' : '#012C18'} />
      </svg>

      {/* Optional Mountain Silhouette Divider */}
      {showMountainLine && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-5 overflow-hidden">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-current">
            <path d="M0,120 L0,70 L120,40 L240,90 L380,20 L480,75 L600,10 L740,65 L880,30 L1020,80 L1140,45 L1200,90 L1200,120 Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
