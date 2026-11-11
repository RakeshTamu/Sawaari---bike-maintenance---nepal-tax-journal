import React, { useState } from 'react';
import {
  Wrench,
  CheckSquare,
  Square,
  Copy,
  Check,
  X,
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import { Bike } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  language: 'en' | 'ne';
}

const DEFAULT_ITEMS = [
  { id: 'oil', labelEn: 'Engine Oil Replacement (Full Synthetic 10W40 / 20W50)', labelNe: 'इन्जिन आयल फेर्ने (फुल सिन्थेटिक)', checked: true },
  { id: 'filter', labelEn: 'Oil Filter & O-Ring Replacement', labelNe: 'आयल फिल्टर फेर्ने', checked: true },
  { id: 'chain', labelEn: 'Chain Deep Cleaning, Lube & Slack Adjustment (20–30mm)', labelNe: 'चेन सफा, ल्युब र टाइट गर्ने', checked: true },
  { id: 'brakes', labelEn: 'Front & Rear Brake Pads inspection & bleed', labelNe: 'अगाडि/पछाडि ब्रेक प्याड जाँच', checked: true },
  { id: 'air', labelEn: 'Air Filter Cleaning or Replacement', labelNe: 'एयर फिल्टर सफा वा फेर्ने', checked: false },
  { id: 'plug', labelEn: 'Spark Plug Cleaning & Gap check', labelNe: 'स्पार्क प्लग सफा गर्ने', checked: false },
  { id: 'tire', labelEn: 'Tire Pressure Inspection (Front: 28 PSI, Rear: 32 PSI)', labelNe: 'टायर हावा प्रेसर जाँच (२८/३२ PSI)', checked: true },
  { id: 'cables', labelEn: 'Clutch & Throttle cable freeplay adjustment', labelNe: 'क्लच र थ्रोटल तार समायोजन', checked: false },
  { id: 'coolant', labelEn: 'Coolant & Battery electrolyte level inspection', labelNe: 'कुल्यान्ट वा ब्याट्री जाँच', checked: false },
  { id: 'lights', labelEn: 'Brake lights, indicators and horn inspection', labelNe: 'बत्ती, इन्डिकेटर र हर्न जाँच', checked: false }
];

export const MechanicChecklistModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bike,
  language
}) => {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleCopy = () => {
    const selected = items.filter(i => i.checked);
    const text = `🔧 Service Checklist for ${bike.name} (${bike.registrationNumber}):
Odometer: ${bike.odometerKm?.toLocaleString() || '---'} KM
Tasks Requested:
${selected.map((item, idx) => `${idx + 1}. ${item.labelEn}`).join('\n')}
${customNote ? `\nSpecial Instructions: ${customNote}` : ''}
Generated via Sawaari Bike Journal`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Unified Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
            aria-label="Back"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {language === 'ne' ? 'सर्भिस जब कार्ड तथा चेकलिस्ट' : 'Mechanic Service Job Card'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {bike.name} · {bike.registrationNumber}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs transition active:scale-95"
        >
          {language === 'ne' ? 'सकियो' : 'Done'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-lg w-full mx-auto space-y-4">
        {/* Checklist Items */}
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between select-none ${
                item.checked
                  ? 'bg-cyan-950/30 border-cyan-500/40 text-white'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className="text-xs font-medium">
                  {language === 'ne' ? item.labelNe : item.labelEn}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Mechanic Note */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            {language === 'ne' ? 'विशेष निर्देशन / समस्या (ऐच्छिक)' : 'Special Instructions for Mechanic (Optional)'}
          </label>
          <input
            type="text"
            placeholder="e.g. Front suspension squeak, handle pull slightly left"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? (language === 'ne' ? 'कपी भयो!' : 'Copied!') : (language === 'ne' ? 'ह्वाट्सएप / भाइबरमा पठाउन कपी' : 'Copy for WhatsApp')}</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-slate-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
