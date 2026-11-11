import React, { useState } from 'react';
import {
  Fuel,
  X,
  Plus,
  TrendingUp,
  Check,
  Calculator,
  Gauge,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Bike, ExpenseRecord } from '../types';
import { db } from '../db/db';
import { adToBs, formatAdDate } from '../utils/nepaliCalendar';
import { NepaliDatePicker } from './NepaliDatePicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  pastFuelExpenses: ExpenseRecord[];
  onRefresh: () => void;
  language: 'en' | 'ne';
}

export const QuickRefuelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bike,
  pastFuelExpenses,
  onRefresh,
  language
}) => {
  const [petrolRate, setPetrolRate] = useState<number>(170.5); // Current standard Nepal NOC rate
  const [amount, setAmount] = useState<number>(1000);
  const [liters, setLiters] = useState<number>(parseFloat((1000 / 170.5).toFixed(2)));
  const [odometerKm, setOdometerKm] = useState<number>(bike.odometerKm || 0);
  const [dateAD, setDateAD] = useState<string>(formatAdDate(new Date()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Find last fuel fill to calculate KM/L
  const sortedFuel = [...pastFuelExpenses].sort(
    (a, b) => new Date(b.dateAD).getTime() - new Date(a.dateAD).getTime()
  );
  const lastFill = sortedFuel[0];

  const kmDifference = lastFill && lastFill.odometerKm
    ? Math.max(0, odometerKm - lastFill.odometerKm)
    : 0;

  const estimatedKmpl = kmDifference > 0 && liters > 0
    ? (kmDifference / liters).toFixed(1)
    : null;

  const handleAmountChange = (val: number) => {
    setAmount(val);
    setLiters(parseFloat((val / petrolRate).toFixed(2)));
  };

  const handleLitersChange = (val: number) => {
    setLiters(val);
    setAmount(Math.round(val * petrolRate));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setError(language === 'ne' ? 'कृपया कुल रकम उल्लेख गर्नुहोस्।' : 'Please enter a valid fuel amount.');
      return;
    }

    if (!liters || Number(liters) <= 0) {
      setError(language === 'ne' ? 'कृपया इन्धन परिमाण (लिटर) उल्लेख गर्नुहोस्।' : 'Please enter valid fuel liters.');
      return;
    }

    if (odometerKm === undefined || Number(odometerKm) < 0) {
      setError(language === 'ne' ? 'कृपया हालको ओडोमिटर कि.मी. उल्लेख गर्नुहोस्।' : 'Please enter valid current odometer KM.');
      return;
    }

    const bsDate = adToBs(dateAD).formatted;

    await db.expenses.add({
      bikeId: bike.id!,
      dateAD,
      dateBS: bsDate,
      category: 'fuel',
      amount: Number(amount),
      description: `Petrol Refuel: ${liters}L @ Rs. ${petrolRate}/L${estimatedKmpl ? ` (${estimatedKmpl} KM/L)` : ''}`,
      odometerKm: Number(odometerKm),
      fuelLiters: Number(liters)
    });

    if (Number(odometerKm) > (bike.odometerKm || 0)) {
      await db.bikes.update(bike.id!, { odometerKm: Number(odometerKm) });
    }

    setError(null);
    onRefresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end transition-all animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md mx-auto bg-zinc-950 border-t border-x border-zinc-800 rounded-t-[32px] p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Slide-Up Drag Handle */}
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-3 shrink-0" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'ne' ? 'इन्धन / पेट्रोल दर्ता' : 'Log Petrol & Mileage'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ne' ? 'माइलेज तथा पेट्रोल खर्च हिसाब' : 'Quick pump entry & KM/L calculation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-1 py-1">
          
          {/* Quick Amount Preset Chips */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {language === 'ne' ? 'रकम छान्नुहोस् (रु.)' : 'Quick Amount (NPR)'}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[500, 1000, 1500, 2000].map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => {
                    handleAmountChange(val);
                    setError(null);
                  }}
                  className={`py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
                    amount === val
                      ? 'bg-pink-500 text-black border-pink-400 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Rs.{val}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Liters Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'ne' ? 'कुल रकम (रु.)' : 'Amount (NPR)'}
                <span className="text-rose-400 font-bold ml-1">* Required</span>
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => {
                  handleAmountChange(Number(e.target.value));
                  setError(null);
                }}
                className={`w-full bg-black border rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none transition ${
                  error && (!amount || amount <= 0)
                    ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                    : 'border-zinc-800 focus:border-pink-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'ne' ? 'परिमाण (लिटर)' : 'Fuel (Liters)'}
                <span className="text-rose-400 font-bold ml-1">* Required</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={liters}
                onChange={(e) => {
                  handleLitersChange(Number(e.target.value));
                  setError(null);
                }}
                className={`w-full bg-black border rounded-xl px-3 py-2 text-sm font-bold font-mono text-cyan-400 focus:outline-none transition ${
                  error && (!liters || liters <= 0)
                    ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                    : 'border-zinc-800 focus:border-pink-500'
                }`}
              />
            </div>
          </div>

          {/* Refuel Date with Nepali / English selection */}
          <NepaliDatePicker
            label={language === 'ne' ? 'इन्धन हालेको मिति' : 'Refueling Date'}
            valueAD={dateAD}
            onChange={(ad) => setDateAD(ad)}
            required={true}
            language={language}
          />

          {/* Current Odometer */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-300">
                {language === 'ne' ? 'हालको ओडोमिटर कि.मी.' : 'Current Odometer (KM)'}
                <span className="text-rose-400 font-bold ml-1">* Required</span>
              </label>
              {lastFill?.odometerKm && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Last: {lastFill.odometerKm.toLocaleString()} KM
                </span>
              )}
            </div>
            <input
              type="number"
              required
              value={odometerKm}
              onChange={(e) => {
                setOdometerKm(Number(e.target.value));
                setError(null);
              }}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Computed Mileage Box */}
          {estimatedKmpl && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Calculated Mileage
                </span>
                <span className="text-xl font-black font-mono text-emerald-300">
                  {estimatedKmpl} <span className="text-xs font-normal">KM/L</span>
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-300 font-mono">
                {kmDifference} KM travelled<br />
                on {liters} Ltrs
              </div>
            </div>
          )}

          {/* Rate note */}
          <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
            <span>NOC Petrol Rate: Rs. {petrolRate}/L</span>
            <span>Date: {dateAD}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-pink-500/20"
            >
              Save Refuel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
