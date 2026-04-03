import { useState } from 'react';
import { dateToStr, MESES } from '../utils/format';

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface CalT {
  common: { occupied: string; available: string; past: string };
  detail: { available: string; occupied: string };
}

export default function MiniCalendar({ occupiedDays, T }: { occupiedDays: string[]; T: CalT }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isPast = (day: number | null) => {
    if (!day) return false;
    return (
      new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="bg-white border border-gray-300 px-2.5 py-1 cursor-pointer text-xs text-gray-700 hover:bg-gray-50 rounded"
        >
          ‹
        </button>
        <div className="font-serif text-lg text-navy font-bold">
          {MESES[month].charAt(0).toUpperCase() + MESES[month].slice(1)} {year}
        </div>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="bg-white border border-gray-300 px-2.5 py-1 cursor-pointer text-xs text-gray-700 hover:bg-gray-50 rounded"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-600">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dStr = day ? dateToStr(new Date(year, month, day)) : null;
          const occ = dStr && occupiedDays?.includes(dStr);
          const past = isPast(day);
          return (
            <div
              key={i}
              className={`flex items-center justify-center p-1 text-xs rounded ${!day ? 'bg-transparent' : past ? 'bg-gray-100 text-gray-400' : occ ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}
              title={day && !past ? (occ ? T.common.occupied : T.common.available) : ''}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 bg-blue-100 border border-blue-400 rounded" />
          {T.detail.available}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 bg-red-100 border border-red-600 rounded" />
          {T.detail.occupied}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 bg-gray-100 border border-gray-300 rounded" />
          {T.common.past}
        </div>
      </div>
    </div>
  );
}
