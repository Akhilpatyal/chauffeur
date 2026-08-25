import React, { useEffect, useState } from 'react';
import Logo from './Logo';
import { runPageIntro } from '../../animations/pageIntro';

export default function Preloader({ onFinish }) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    runPageIntro(() => {
      setActive(false);
      if (onFinish) onFinish();
    });
  }, []);

  if (!active) return null;

  return (
    <div
      id="taifer-preloader"
      className="fixed inset-0 z-50 bg-[#012C18] text-[#F4F1E8] flex flex-col items-center justify-center pointer-events-none select-none"
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Animated Logo Mark */}
        <div id="taifer-intro-logo" className="transform">
          <Logo variant="light" size="xl" showTagline={false} />
        </div>

        {/* Animated Tagline */}
        <div
          id="taifer-intro-tag"
          className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-[#B89A5A] font-bold"
        >
          THE GREAT OUTDOORS
        </div>
      </div>
    </div>
  );
}
