import React from 'react';
import { X, Sparkles, Volume2, Heart, Share2 } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';

export default function TravelerStoryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#042423] text-white rounded-3xl sm:rounded-[36px] border border-white/20 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video / Visual Container */}
        <div className="relative h-80 sm:h-[450px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=85"
            alt="Travelers in Himalayas"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#042423] via-black/20 to-black/40" />

          {/* Playing overlay bar */}
          <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#E85D4A] animate-pulse"></span>
            <span className="font-mono text-[#DFC07D]">03:42 · 4K CINEMATIC REEL</span>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <span className="text-[10px] uppercase tracking-widest text-[#0B9FA8] font-bold block mb-1">
              EXPEDITION HIGHLIGHT
            </span>
            <h3 className="font-display text-2xl sm:text-3xl text-[#F6F3EA]">
              Under the Milky Way: Spiti Autumn Odyssey
            </h3>
          </div>
        </div>

        {/* Story Metadata & Caption */}
        <div className="p-6 sm:p-8 bg-[#042423] border-t border-white/10 space-y-4">
          <p className="text-sm sm:text-base text-[#E8DFCE]/85 leading-relaxed font-light">
            "When we reached Chandratal Lake at sunset, nobody pulled out their phone for five minutes. We just stood there in the wind, looking at the water reflecting 18,000-foot peaks. That was the moment I realized why we travel."
          </p>

          <div className="flex items-center justify-between pt-2 text-xs text-[#DFC07D] font-mono">
            <span>Captured by Aryan Sen · Canon EOS R5</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#0B9FA8] hover:bg-[#075E68] text-white font-bold transition-colors cursor-pointer"
            >
              Explore This Expedition
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
