import React from 'react';
import { X, Clock, BookOpen, User, Calendar, Share2, Sparkles } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';

export default function JournalReaderModal({ article, isOpen, onClose, onExploreTrips }) {
  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#FAF8F2] rounded-3xl sm:rounded-[36px] border border-[#E8DFCE] shadow-2xl overflow-hidden text-[#172326] flex flex-col max-h-[92vh]">
        
        {/* Header Image */}
        <div className="relative h-64 sm:h-72 shrink-0 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors z-20 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#073B3A]/90 text-[#DFC07D] border border-white/20 mb-2 inline-block">
              {article.category}
            </span>
            <h3 className="font-display text-2xl sm:text-3xl text-[#F6F3EA] leading-tight">
              {article.title}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 bg-[#FAF8F2]">
          <div className="flex items-center justify-between border-b border-[#E8DFCE] pb-4 text-xs text-[#075E68] font-mono">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              <span>By {article.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readingTime}</span>
            </div>
          </div>

          <div className="prose prose-stone text-base sm:text-lg text-[#172326]/85 font-light leading-relaxed space-y-4">
            <p className="font-serif italic text-lg sm:text-xl text-[#073B3A] border-l-2 border-[#0B9FA8] pl-4 py-1">
              "{article.excerpt}"
            </p>
            <p>
              There is an ancient Pahadi proverb: The mountains do not belong to those who measure them, but to those who let the silence enter their chest. When traveling through these high altitude valleys, time operates on geological scales rather than clock ticks.
            </p>
            <p>
              Every ridge tells a story of tectonic collisions, ancient marine fossils resting at 14,000 feet, and nomadic shepherds who know the wind by name. To step onto these trails is not merely an adventure, but a deliberate unlearning of the noise of city life.
            </p>
          </div>

          <div className="pt-6 border-t border-[#E8DFCE] flex items-center justify-between">
            <span className="text-xs font-mono text-[#172326]/60">Published in Travel Coffee Journal</span>
            <MagneticButton
              variant="teal"
              size="sm"
              onClick={() => {
                onClose();
                onExploreTrips();
              }}
            >
              Explore Related Expeditions
            </MagneticButton>
          </div>
        </div>

      </div>
    </div>
  );
}
