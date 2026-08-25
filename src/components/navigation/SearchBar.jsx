import React, { useState } from 'react';
import { MapPin, Calendar, Users, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function SearchBar({ onSearchSubmit, className }) {
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  const destinationsList = [
    { label: 'Spiti Valley', state: 'Himachal · High Altitude' },
    { label: 'Kashmir Valley', state: 'Pir Panjal · Alpine Meadows' },
    { label: 'Leh Ladakh', state: 'Trans-Himalaya · Passes' },
    { label: 'Meghalaya Rainforests', state: 'Northeast · Living Roots' },
    { label: 'Himachal Hidden Valleys', state: 'Tirthan & Jibhi' },
    { label: 'Uttarakhand High Peaks', state: 'Garhwal Range' },
    { label: 'Rajasthan Thar Desert', state: 'Jaisalmer Dunes' }
  ];

  const seasonsList = [
    { label: 'May – Jun 2026', tag: 'Summer Passes Open' },
    { label: 'Jul – Aug 2026', tag: 'Monsoon Magic & Ladakh' },
    { label: 'Sep – Oct 2026', tag: 'Autumn Stargazing' },
    { label: 'Nov – Feb 2027', tag: 'Winter Snow Expeditions' },
    { label: 'Flexible Dates', tag: 'Anytime in 2026' }
  ];

  const stylesList = [
    { label: 'High Altitude Trek', sub: 'Passes, ridge camps, summits' },
    { label: 'Overland 4x4 Road Trip', sub: 'Scenic trans-Himalayan passes' },
    { label: 'Off-Grid & Stargazing', sub: 'Remote villages, zero signal' },
    { label: 'Small Tribe Group Tour', sub: 'Capped at 12–14 travelers' }
  ];

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleSearch = () => {
    setActiveDropdown(null);
    if (onSearchSubmit) {
      onSearchSubmit({
        destination: selectedDestination || 'All Destinations',
        month: selectedMonth || 'Anytime',
        style: selectedStyle || 'All Styles'
      });
    }
  };

  return (
    <div className={cn('w-full max-w-5xl mx-auto relative z-30', className)}>
      <div className="bg-[#FAF9F5] p-3 sm:p-4 rounded-2xl shadow-2xl border border-[#DDD4C1] text-[#003B24]">
        
        {/* Header Strip inside Search */}
        <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#075333] px-3 pb-2.5 mb-1 border-b border-[#DDD4C1]/60 flex items-center justify-between">
          <span>EXPEDITION PLANNER — WHERE ARE YOU HEADED?</span>
          <span className="text-[#B89A5A] hidden sm:inline">TAIFER ROUTE MATCHER</span>
        </div>

        {/* 3 Fields + Explore Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 items-center pt-1">
          
          {/* Field 1: Destination */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('destination')}
              className={cn(
                'w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3 border cursor-pointer',
                activeDropdown === 'destination' ? 'bg-white border-[#003B24] shadow-sm' : 'bg-[#F4F1E8]/70 hover:bg-white border-[#DDD4C1]'
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-[#003B24]/10 flex items-center justify-center text-[#003B24] shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden text-left flex-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#075333] font-bold block">Destination</span>
                <span className="text-xs sm:text-sm font-bold text-[#003B24] truncate block">
                  {selectedDestination || 'Select Destination'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#003B24]/40 shrink-0" />
            </button>

            {activeDropdown === 'destination' && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#DDD4C1] p-2 z-50 animate-fadeIn">
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {destinationsList.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setSelectedDestination(item.label);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F4F1E8] transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-[#003B24]">{item.label}</p>
                        <p className="text-[10px] text-[#003B24]/60">{item.state}</p>
                      </div>
                      {selectedDestination === item.label && <Check className="w-3.5 h-3.5 text-[#003B24]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Field 2: Dates */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('month')}
              className={cn(
                'w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3 border cursor-pointer',
                activeDropdown === 'month' ? 'bg-white border-[#003B24] shadow-sm' : 'bg-[#F4F1E8]/70 hover:bg-white border-[#DDD4C1]'
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-[#003B24]/10 flex items-center justify-center text-[#003B24] shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden text-left flex-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#075333] font-bold block">Dates</span>
                <span className="text-xs sm:text-sm font-bold text-[#003B24] truncate block">
                  {selectedMonth || 'Select Window'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#003B24]/40 shrink-0" />
            </button>

            {activeDropdown === 'month' && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#DDD4C1] p-2 z-50 animate-fadeIn">
                <div className="space-y-1">
                  {seasonsList.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setSelectedMonth(item.label);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F4F1E8] transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-[#003B24]">{item.label}</p>
                        <p className="text-[10px] text-[#B89A5A]">{item.tag}</p>
                      </div>
                      {selectedMonth === item.label && <Check className="w-3.5 h-3.5 text-[#003B24]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Field 3: Travel Style */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('style')}
              className={cn(
                'w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3 border cursor-pointer',
                activeDropdown === 'style' ? 'bg-white border-[#003B24] shadow-sm' : 'bg-[#F4F1E8]/70 hover:bg-white border-[#DDD4C1]'
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-[#003B24]/10 flex items-center justify-center text-[#003B24] shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden text-left flex-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#075333] font-bold block">Travel Style</span>
                <span className="text-xs sm:text-sm font-bold text-[#003B24] truncate block">
                  {selectedStyle || 'Travel Style'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#003B24]/40 shrink-0" />
            </button>

            {activeDropdown === 'style' && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#DDD4C1] p-2 z-50 animate-fadeIn">
                <div className="space-y-1">
                  {stylesList.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setSelectedStyle(item.label);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F4F1E8] transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-[#003B24]">{item.label}</p>
                        <p className="text-[10px] text-[#003B24]/60">{item.sub}</p>
                      </div>
                      {selectedStyle === item.label && <Check className="w-3.5 h-3.5 text-[#003B24]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Button: EXPLORE */}
          <div>
            <button
              onClick={handleSearch}
              className="w-full py-3 px-6 rounded-xl bg-[#003B24] hover:bg-[#075333] text-[#F4F1E8] text-xs font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <span>EXPLORE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
