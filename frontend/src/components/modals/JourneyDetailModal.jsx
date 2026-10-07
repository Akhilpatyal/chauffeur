import React, { useState } from 'react';
import { X, Star, MapPin, Check, ArrowRight, MessageCircle } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';
import Badge from '../common/Badge';

export default function JourneyDetailModal({ journey, isOpen, onClose, onBookNow }) {
  const [activeTab, setActiveTab] = useState('itinerary');

  if (!isOpen || !journey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#FAF8F2] rounded-3xl sm:rounded-[36px] border border-[#E8DFCE] shadow-2xl overflow-hidden text-[#172326] flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar Image Header */}
        <div className="relative h-64 sm:h-80 shrink-0 overflow-hidden">
          <img
            src={journey.image}
            alt={journey.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors z-20 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Floating tags */}
          <div className="absolute top-5 left-5 flex gap-2">
            <Badge variant="coral">{journey.discount || 'Special Expedition'}</Badge>
            <Badge variant="ivory">{journey.duration}</Badge>
          </div>

          {/* Title & Location Overlay */}
          <div className="absolute bottom-5 left-6 right-6 text-white">
            <div className="flex items-center gap-2 text-xs text-[#DFC07D] font-mono mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{journey.location}</span>
            </div>
            <h3 className="font-display text-2xl sm:text-4xl text-[#F6F3EA] leading-tight">
              {journey.title}
            </h3>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8 bg-[#FAF8F2]">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-[#E8DFCE]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#075E68] block">Duration</span>
              <span className="text-xs sm:text-sm font-bold text-[#172326]">{journey.duration}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#075E68] block">Max Altitude</span>
              <span className="text-xs sm:text-sm font-bold text-[#172326]">{journey.elevation || '10,500 ft'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#075E68] block">Rating</span>
              <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#172326]">
                <Star className="w-3.5 h-3.5 text-[#DFC07D] fill-[#DFC07D]" />
                <span>{journey.rating} / 5.0</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#075E68] block">Group Cap</span>
              <span className="text-xs sm:text-sm font-bold text-[#172326]">{journey.groupSize || '12-14 Max'}</span>
            </div>
          </div>

          {/* Itinerary & Inclusions Tabs */}
          <div>
            <div className="flex border-b border-[#E8DFCE] mb-6">
              <button
                onClick={() => setActiveTab('itinerary')}
                className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'itinerary'
                    ? 'text-[#073B3A] border-b-2 border-[#073B3A]'
                    : 'text-[#172326]/60 hover:text-[#172326]'
                }`}
              >
                Day-by-Day Trail
              </button>
              <button
                onClick={() => setActiveTab('inclusions')}
                className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'inclusions'
                    ? 'text-[#073B3A] border-b-2 border-[#073B3A]'
                    : 'text-[#172326]/60 hover:text-[#172326]'
                }`}
              >
                What's Included
              </button>
            </div>

            {/* Tab 1: Day-by-Day Trail */}
            {activeTab === 'itinerary' && (
              <div className="space-y-4">
                {journey.itinerary && journey.itinerary.length > 0 ? (
                  journey.itinerary.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white border border-[#E8DFCE]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#073B3A] text-[#DFC07D] font-mono text-xs font-bold h-fit shrink-0">
                        {item.day}
                      </span>
                      <div>
                        <h4 className="font-display text-base font-bold text-[#172326] mb-1">
                          {item.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-[#172326]/75 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-white border border-[#E8DFCE] text-sm text-[#172326]/75">
                    {journey.description}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Inclusions */}
            {activeTab === 'inclusions' && (
              <div className="space-y-3 p-4 rounded-2xl bg-white border border-[#E8DFCE]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#075E68] mb-3">
                  All-Inclusive Wilderness Standards:
                </h4>
                {(journey.inclusions || [
                  'High clearance 4x4 overland transfers',
                  'Handpicked authentic boutique homestays & glamping',
                  'All meals (Mountain breakfast & hot dinners)',
                  'Certified senior expedition lead and mountain guide',
                  'Oxygen cylinder backup & inner-line permits'
                ]).map((inc, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#172326]/80">
                    <Check className="w-4 h-4 text-[#0B9FA8] shrink-0" />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Bottom Price & Booking Footer */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#E8DFCE] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#172326]/50 block">Total Expedition Fare</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#073B3A]">{journey.price}</span>
              <span className="text-xs text-[#172326]/60">/ person (inclusive of all permits & stays)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/919876543210?text=Hi%20Travel%20Coffee,%20I%20am%20interested%20in%20${encodeURIComponent(journey.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full border border-[#E8DFCE] hover:bg-[#F6F3EA] text-[#25D366] transition-colors"
              title="Chat with Expedition Guide"
            >
              <MessageCircle className="w-5 h-5" />
            </a>

            <MagneticButton
              variant="coral"
              size="md"
              onClick={() => onBookNow(journey)}
              icon={ArrowRight}
              className="w-full sm:w-auto"
            >
              Reserve Seat · Instant Confirmation
            </MagneticButton>
          </div>
        </div>

      </div>
    </div>
  );
}
