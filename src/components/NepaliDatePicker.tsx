import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  adToBs,
  bsToAd,
  formatAdDate,
  formatAdDisplayDate,
  formatBsDisplayDate,
  getDaysInBsMonth,
  toDevanagariNumerals,
  NEPALI_MONTHS_EN,
  NEPALI_MONTHS_NE
} from '../utils/nepaliCalendar';

export interface NepaliDatePickerProps {
  label: string;
  valueAD: string; // YYYY-MM-DD
  onChange: (valueAD: string, valueBS: string) => void;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  language?: 'en' | 'ne';
  minYearBS?: number;
  maxYearBS?: number;
  showQuickPresets?: boolean;
  helperText?: string;
  className?: string;
}

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  label,
  valueAD,
  onChange,
  required = false,
  error = false,
  errorMessage,
  language = 'en',
  minYearBS = 2070,
  maxYearBS = 2095,
  showQuickPresets = true,
  helperText,
  className = ''
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Parse BS values from valueAD
  const initialBs = adToBs(valueAD || formatAdDate(new Date()));
  const [currentBsYear, setCurrentBsYear] = useState<number>(initialBs.year);
  const [currentBsMonth, setCurrentBsMonth] = useState<number>(initialBs.month);
  const [selectedBsDay, setSelectedBsDay] = useState<number>(initialBs.day);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state if external valueAD changes
  useEffect(() => {
    if (valueAD) {
      const bs = adToBs(valueAD);
      setCurrentBsYear(bs.year);
      setCurrentBsMonth(bs.month);
      setSelectedBsDay(bs.day);
    }
  }, [valueAD]);

  // Click outside to dismiss calendar popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Select day in BS Calendar
  const handleSelectBsDate = (y: number, m: number, d: number) => {
    const validMax = getDaysInBsMonth(y, m);
    const validDay = Math.min(d, validMax);
    setCurrentBsYear(y);
    setCurrentBsMonth(m);
    setSelectedBsDay(validDay);

    const convertedAd = bsToAd(y, m, validDay);
    const adStr = formatAdDate(convertedAd);
    const mm = String(m).padStart(2, '0');
    const dd = String(validDay).padStart(2, '0');
    const bsStr = `${y}-${mm}-${dd}`;

    onChange(adStr, bsStr);
    setIsCalendarOpen(false);
  };

  // Month navigation in BS Calendar
  const handlePrevMonth = () => {
    if (currentBsMonth === 1) {
      if (currentBsYear > minYearBS) {
        setCurrentBsYear(prev => prev - 1);
        setCurrentBsMonth(12);
      }
    } else {
      setCurrentBsMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentBsMonth === 12) {
      if (currentBsYear < maxYearBS) {
        setCurrentBsYear(prev => prev + 1);
        setCurrentBsMonth(1);
      }
    } else {
      setCurrentBsMonth(prev => prev + 1);
    }
  };

  // Quick preset: Set to Today
  const handleSetToday = () => {
    const today = new Date();
    const adStr = formatAdDate(today);
    const bs = adToBs(today);
    setCurrentBsYear(bs.year);
    setCurrentBsMonth(bs.month);
    setSelectedBsDay(bs.day);
    onChange(adStr, bs.formatted);
    setIsCalendarOpen(false);
  };

  // Quick preset: Add 1 Year
  const handleAddOneYear = () => {
    const nextYear = Math.min(maxYearBS, currentBsYear + 1);
    handleSelectBsDate(nextYear, currentBsMonth, selectedBsDay);
  };

  // Calculation for BS Calendar Grid:
  const firstDayAd = bsToAd(currentBsYear, currentBsMonth, 1);
  const startingDayOfWeek = firstDayAd.getDay(); // 0 = Sunday
  const totalDaysInMonth = getDaysInBsMonth(currentBsYear, currentBsMonth);

  const currentDisplayBs = formatBsDisplayDate(valueAD, language);
  const currentDisplayAd = formatAdDisplayDate(valueAD);
  const todayBs = adToBs(new Date());

  return (
    <div ref={containerRef} className={`space-y-1.5 relative ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-400 font-bold">*</span>}
        </label>
        <span className="text-[10px] font-mono text-cyan-400/80 font-bold px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/30">
          वि.सं. (BS)
        </span>
      </div>

      {/* Strict Nepali (BS) Date Picker Field */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className={`w-full bg-zinc-900 border rounded-xl px-3 py-2.5 text-left text-xs text-white flex items-center justify-between transition group ${
            error
              ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
              : isCalendarOpen
              ? 'border-cyan-500 ring-1 ring-cyan-500/40'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition shrink-0" />
            <span className="font-bold text-white tracking-wide">
              {currentDisplayBs} BS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {language === 'ne' ? 'पात्रो छान्नुहोस्' : 'Pick Date'}
          </span>
        </button>

        {/* Passive Converted English (AD) Date Preview String & Quick Presets */}
        <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
          <span className="font-medium text-slate-300 truncate">
            = <strong className="text-cyan-300 font-bold">{currentDisplayAd}</strong> AD
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-slate-300 text-[10px] font-bold transition active:scale-95"
            >
              {language === 'ne' ? 'आज' : 'Today'}
            </button>
            {showQuickPresets && (
              <button
                type="button"
                onClick={handleAddOneYear}
                className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-black transition active:scale-95"
              >
                +1 {language === 'ne' ? 'वर्ष' : 'Year'}
              </button>
            )}
          </div>
        </div>

        {/* Interactive Popover Nepali Calendar Grid */}
        {isCalendarOpen && (
          <div className="absolute left-0 right-0 z-50 mt-1 p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-3">
            {/* Month & Year Navigation Row */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={currentBsMonth}
                  onChange={(e) => setCurrentBsMonth(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {language === 'ne' ? NEPALI_MONTHS_NE[m - 1] : NEPALI_MONTHS_EN[m - 1]}
                    </option>
                  ))}
                </select>

                <select
                  value={currentBsYear}
                  onChange={(e) => setCurrentBsYear(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-bold text-cyan-400 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {Array.from({ length: maxYearBS - minYearBS + 1 }, (_, i) => maxYearBS - i).map((y) => (
                    <option key={y} value={y}>
                      {language === 'ne' ? `${toDevanagariNumerals(y)} BS` : `${y} BS`}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              {(language === 'ne'
                ? ['आइत', 'सोम', 'मंग', 'बुध', 'बिही', 'शुक्र', 'शनि']
                : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
              ).map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`py-1 ${idx === 6 ? 'text-rose-400 font-black' : ''}`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Monthly Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs font-mono">
              {Array.from({ length: startingDayOfWeek }, (_, idx) => (
                <div key={`empty-${idx}`} className="h-8" />
              ))}

              {Array.from({ length: totalDaysInMonth }, (_, idx) => {
                const dayNum = idx + 1;
                const isSelected =
                  currentBsYear === initialBs.year &&
                  currentBsMonth === initialBs.month &&
                  dayNum === selectedBsDay;

                const isToday =
                  currentBsYear === todayBs.year &&
                  currentBsMonth === todayBs.month &&
                  dayNum === todayBs.day;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectBsDate(currentBsYear, currentBsMonth, dayNum)}
                    className={`h-8 rounded-xl font-bold flex items-center justify-center transition active:scale-90 text-[11px] ${
                      isSelected
                        ? 'bg-cyan-500 text-black font-black shadow-md shadow-cyan-500/25 ring-2 ring-cyan-300'
                        : isToday
                        ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/50'
                        : 'text-slate-200 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {language === 'ne' ? toDevanagariNumerals(dayNum) : dayNum}
                  </button>
                );
              })}
            </div>

            {/* Calendar Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
              <button
                type="button"
                onClick={handleSetToday}
                className="text-[11px] text-cyan-400 hover:underline font-bold"
              >
                {language === 'ne' ? 'आजको मिति' : 'Select Today'}
              </button>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-slate-300 text-[11px] font-bold"
              >
                {language === 'ne' ? 'बन्द' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error Message */}
      {error && errorMessage && (
        <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 px-1 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {helperText && !error && (
        <p className="text-[10px] text-slate-400 px-1">{helperText}</p>
      )}
    </div>
  );
};
