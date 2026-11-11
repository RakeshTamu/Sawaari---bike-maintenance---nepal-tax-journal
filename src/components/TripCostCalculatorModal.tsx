import React, { useState } from 'react';
import {
  MapPin,
  Fuel,
  Compass,
  ArrowRight,
  RotateCcw,
  X,
  Sparkles,
  DollarSign,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { Bike } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  language: 'en' | 'ne';
}

interface DestinationPreset {
  nameEn: string;
  nameNe: string;
  oneWayKm: number;
  terrain: 'Highway' | 'Hilly' | 'Valley';
}

const PRESETS: DestinationPreset[] = [
  { nameEn: 'Kathmandu ↔ Pokhara', nameNe: 'काठमाडौं ↔ पोखरा (पृथ्वी लोकमार्ग)', oneWayKm: 200, terrain: 'Highway' },
  { nameEn: 'Kathmandu ↔ Chitwan/Narayangarh', nameNe: 'काठमाडौं ↔ नारायणगढ / चितवन', oneWayKm: 150, terrain: 'Highway' },
  { nameEn: 'Kathmandu ↔ Nagarkot Viewpoint', nameNe: 'काठमाडौं ↔ नगरकोट भ्युपोइन्ट', oneWayKm: 32, terrain: 'Hilly' },
  { nameEn: 'Kathmandu ↔ Dhulikhel / Namobuddha', nameNe: 'काठमाडौं ↔ धुलिखेल / नमोबुद्ध', oneWayKm: 40, terrain: 'Hilly' },
  { nameEn: 'Kathmandu ↔ Butwal', nameNe: 'काठमाडौं ↔ बुटवल', oneWayKm: 260, terrain: 'Highway' },
  { nameEn: 'Kathmandu ↔ Dharan', nameNe: 'काठमाडौं ↔ धरान', oneWayKm: 380, terrain: 'Highway' },
  { nameEn: 'Kathmandu Valley Ring Road Round', nameNe: 'काठमाडौं चक्रपथ १ फन्को', oneWayKm: 28, terrain: 'Valley' },
];

export const TripCostCalculatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bike,
  language
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(200);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);
  const [mileageKmpl, setMileageKmpl] = useState<number>(35);
  const [petrolRate, setPetrolRate] = useState<number>(170.5); // NOC current standard rate
  const [selectedPreset, setSelectedPreset] = useState<string>('Kathmandu ↔ Pokhara');

  if (!isOpen) return null;

  const totalDistance = isRoundTrip ? distanceKm * 2 : distanceKm;
  const fuelNeededLiters = mileageKmpl > 0 ? parseFloat((totalDistance / mileageKmpl).toFixed(2)) : 0;
  const estimatedCost = Math.round(fuelNeededLiters * petrolRate);
  const recommendedReserveLiters = parseFloat((fuelNeededLiters * 1.15).toFixed(2));
  const reserveCost = Math.round(recommendedReserveLiters * petrolRate);

  const handleSelectPreset = (preset: DestinationPreset) => {
    setSelectedPreset(preset.nameEn);
    setDistanceKm(preset.oneWayKm);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end transition-all animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg mx-auto bg-zinc-950 border-t border-x border-zinc-800 rounded-t-[32px] p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Slide-Up Drag Handle */}
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-3 shrink-0" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'ne' ? 'हाइवे यात्रा पेट्रोल खर्च क्यालकुलेटर' : 'Highway Fuel & Trip Estimator'}
              </h3>
              <p className="text-xs text-slate-400">
                {bike.name} ({bike.registrationNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1 py-1">
          {/* Quick Destination Route Buttons */}
          <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            {language === 'ne' ? 'रुट छान्नुहोस्' : 'Popular Highway Routes'}
          </label>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {PRESETS.map((p) => {
              const isSelected = selectedPreset === p.nameEn;
              return (
                <button
                  type="button"
                  key={p.nameEn}
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2 rounded-xl text-left border transition text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold truncate">
                    {language === 'ne' ? p.nameNe : p.nameEn}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono mt-1">
                    {p.oneWayKm} KM ({p.terrain})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trip Distance & Round Trip Toggle */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === 'ne' ? 'एकतर्फी दुरी (KM)' : 'One-Way Distance (KM)'}
            </label>
            <input
              type="number"
              value={distanceKm}
              onChange={(e) => {
                setDistanceKm(Math.max(1, Number(e.target.value)));
                setSelectedPreset('Custom');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === 'ne' ? 'यात्रा प्रकार' : 'Trip Type'}
            </label>
            <button
              type="button"
              onClick={() => setIsRoundTrip(!isRoundTrip)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isRoundTrip
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRoundTrip ? (language === 'ne' ? 'दोहोरो (Round Trip)' : 'Round Trip (2x)') : (language === 'ne' ? 'एकतर्फी (One Way)' : 'One Way')}</span>
            </button>
          </div>
        </div>

        {/* Bike Mileage & NOC Petrol Rate */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === 'ne' ? 'माइलेज (KM/L)' : 'Bike Mileage (KM/L)'}
            </label>
            <input
              type="number"
              value={mileageKmpl}
              onChange={(e) => setMileageKmpl(Math.max(5, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-cyan-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === 'ne' ? 'पेट्रोल दर (रु./लिटर)' : 'Petrol Rate (NPR/L)'}
            </label>
            <input
              type="number"
              step="0.5"
              value={petrolRate}
              onChange={(e) => setPetrolRate(Math.max(10, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Calculated Result Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">
              {language === 'ne' ? 'कुल यात्रा दुरी' : 'Total Trip Distance'}:
            </span>
            <span className="text-sm font-bold font-mono text-white">
              {totalDistance.toLocaleString()} KM
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
            <div>
              <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">
                {language === 'ne' ? 'अनुमानित पेट्रोल खर्च' : 'Estimated Petrol Cost'}
              </span>
              <span className="text-2xl font-black font-mono text-amber-300">
                Rs. {estimatedCost.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">
                {language === 'ne' ? 'इन्धन परिमाण' : 'Fuel Required'}
              </span>
              <span className="text-xl font-bold font-mono text-white">
                {fuelNeededLiters} <span className="text-xs font-normal text-slate-400">Liters</span>
              </span>
            </div>
          </div>

          {/* Hill Highway Safety Recommendation */}
          <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              {language === 'ne'
                ? `उकालो र जामका लागि १५% अतिरिक्त इन्धन (करिब ${recommendedReserveLiters} लिटर / रु. ${reserveCost}) ट्याङ्कीमा राख्न सुझाव दिइन्छ।`
                : `For hilly terrain and traffic delays, a 15% safety reserve (${recommendedReserveLiters} L / Rs. ${reserveCost}) is recommended.`}
            </p>
          </div>
        </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition shrink-0"
        >
          {language === 'ne' ? 'बन्द गर्नुहोस्' : 'Close Estimator'}
        </button>
      </div>
    </div>
  );
};
