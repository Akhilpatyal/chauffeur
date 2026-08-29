import React from 'react';
import {
  BedDouble,
  Coffee,
  DoorOpen,
  Dumbbell,
  Flame,
  Flower2,
  Mountain,
  SquareParking,
  Users,
  Utensils,
  Waves,
  Wifi,
} from 'lucide-react';

export const money = (n) => `₹${n.toLocaleString('en-IN')}`;

const amenityIcons = {
  'Wi-Fi': Wifi,
  Breakfast: Coffee,
  Parking: SquareParking,
  'Mountain View': Mountain,
  Bonfire: Flame,
  Restaurant: Utensils,
  Spa: Flower2,
  'Infinity Pool': Waves,
  Riverside: Waves,
  Gym: Dumbbell,
  'Family Friendly': Users,
  'Private Balcony': DoorOpen,
};

export function AmenityIcon({ label, className = 'h-3 w-3' }) {
  const Icon = amenityIcons[label] || BedDouble;
  return <Icon className={className} strokeWidth={1.75} />;
}

/* Small pill listing one amenity, used on every stay card */
export function AmenityChip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3DDCB] bg-[#F4F1E8]/70 px-2.5 py-1 text-[10.5px] font-medium text-[#4A5B50]">
      <AmenityIcon label={label} />
      {label}
    </span>
  );
}
