import React, { useState } from 'react';
import { CalendarDays, ChevronDown, MapPin, Search, Users } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function SearchBar({ onSearchSubmit, className }) {
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState('');
  const [travelers, setTravelers] = useState('2 Adults, 0 Child');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const options = {
    destination: ['Spiti Valley', 'Kashmir Valley', 'Leh Ladakh', 'Meghalaya Rainforests'],
    dates: ['May - Jun 2026', 'Jul - Aug 2026', 'Sep - Oct 2026', 'Flexible Dates'],
    travelers: ['1 Adult', '2 Adults, 0 Child', '2 Adults, 1 Child', '4 Adults, 2 Children'],
  };
  const fields = [
    { id: 'destination', label: 'Where to?', placeholder: 'Search destinations', icon: MapPin, value: destination, setValue: setDestination },
    { id: 'dates', label: 'Check in - Check out', placeholder: 'Select dates', icon: CalendarDays, value: dates, setValue: setDates },
    { id: 'travelers', label: 'Travelers', placeholder: '2 Adults, 0 Child', icon: Users, value: travelers, setValue: setTravelers },
  ];
  const submit = () => {
    setActiveDropdown(null);
    onSearchSubmit?.({ destination: destination || 'All Destinations', month: dates || 'Flexible Dates', style: travelers });
  };
  return (
    <div className={cn('mx-auto w-full max-w-[1025px]', className)}>
      <div className="rounded-[30px] border border-white/80 bg-white p-2.5 shadow-[0_18px_45px_rgba(0,39,58,.3)] sm:rounded-[38px] sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col sm:flex-row">
            {fields.map((field, index) => {
              const Icon = field.icon;
              const open = activeDropdown === field.id;
              return <div key={field.id} className="relative min-w-0 flex-1 border-b border-slate-200 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <button type="button" onClick={() => setActiveDropdown(open ? null : field.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4">
                  {index === 0 ? <Search className="h-5 w-5 shrink-0 text-slate-400" /> : <Icon className="h-5 w-5 shrink-0 text-slate-400" />}
                  <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold text-slate-700">{field.label}</span><span className="mt-1 block truncate text-sm text-slate-400">{field.value || field.placeholder}</span></span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-300 sm:hidden" />
                </button>
                {open && <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl">
                  {options[field.id].map((option) => <button key={option} type="button" onClick={() => { field.setValue(option); setActiveDropdown(null); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">{option}</button>)}
                </div>}
              </div>;
            })}
          </div>
          <button type="button" onClick={submit} className="m-1 rounded-full bg-[#04354e] px-7 py-4 text-sm font-bold text-white shadow-md transition hover:bg-[#07586a] sm:ml-3 sm:min-w-40">Search Now</button>
        </div>
      </div>
    </div>
  );
}