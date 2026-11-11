import React, { useState } from 'react';
import {
  Bike as BikeIcon,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Wrench,
  Gauge,
  Calendar,
  Sparkles,
  Maximize2,
  X,
  Smartphone,
  Share2,
  Check
} from 'lucide-react';
import { Bike, RenewalRecord, TaxStatusResult, ServiceRecord } from '../types';
import { getCurrentNepaliDate, formatBsDisplayDate, toDevanagariNumerals, NEPALI_MONTHS_NE, NEPALI_DAYS_NE } from '../utils/nepaliCalendar';

interface Props {
  bike: Bike;
  taxStatus: TaxStatusResult;
  latestRenewal?: RenewalRecord;
  latestService?: ServiceRecord;
  language: 'en' | 'ne';
  onClose?: () => void;
  isStandalone?: boolean;
}

export const HomeWidgetCard: React.FC<Props> = ({
  bike,
  taxStatus,
  latestRenewal,
  latestService,
  language,
  onClose,
  isStandalone = false
}) => {
  const [widgetSize, setWidgetSize] = useState<'compact' | 'wide'>('wide');
  const [copied, setCopied] = useState(false);
  const todayBs = getCurrentNepaliDate();

  const nextServiceKm = latestService?.nextServiceKm || ((bike.odometerKm || 0) + 3000);
  const kmToService = Math.max(0, nextServiceKm - (bike.odometerKm || 0));

  const dayOfWeek = new Date().getDay();
  const nepaliDateStr = `${toDevanagariNumerals(todayBs.day)} ${NEPALI_MONTHS_NE[todayBs.month - 1]} ${toDevanagariNumerals(todayBs.year)}, ${NEPALI_DAYS_NE[dayOfWeek]}`;

  const handleShareWidget = () => {
    const text = `🛵 Sawaari Status Widget:
${bike.name} (${bike.registrationNumber})
• Odometer: ${bike.odometerKm?.toLocaleString()} KM
• Tax Status: ${taxStatus.badgeLabel} (${taxStatus.daysRemaining} days left)
• Next Service: ${nextServiceKm.toLocaleString()} KM (${kmToService} KM left)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`space-y-4 ${isStandalone ? 'p-4 max-w-md mx-auto min-h-screen flex flex-col justify-center' : ''}`}>
      {/* Widget Size Selector Controls */}
      {!isStandalone && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>{language === 'ne' ? 'हाम्रो पात्रो शैलीको विजेट' : 'Hamro Patro Style Widget'}</span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setWidgetSize('compact')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                widgetSize === 'compact'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2x2
            </button>
            <button
              type="button"
              onClick={() => setWidgetSize('wide')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                widgetSize === 'wide'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4x2 Wide
            </button>
          </div>
        </div>
      )}

      {/* THE WIDGET CONTAINER */}
      <div
        className={`relative overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          widgetSize === 'compact' ? 'max-w-[280px] p-4 mx-auto' : 'w-full p-5'
        } ${
          taxStatus.status === 'VALID'
            ? 'bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-emerald-950/40 border-emerald-500/40 shadow-emerald-500/10'
            : taxStatus.status === 'GRACE_PERIOD'
            ? 'bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-amber-950/40 border-amber-500/40 shadow-amber-500/10'
            : 'bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-rose-950/40 border-rose-500/40 shadow-rose-500/10'
        }`}
      >
        {/* Subtle Nepal Flag / Hamro Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 font-mono">
            <span>🇳🇵</span>
            <span className="truncate">{nepaliDateStr}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-black text-cyan-400/80">
            सवारी
          </span>
        </div>

        {/* Vehicle Header & Plate */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <BikeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white truncate">{bike.name}</h3>
              <div className="inline-block px-1.5 py-0.2 rounded bg-black/80 border border-amber-400/80 font-mono text-[10px] font-black text-amber-300 tracking-wider">
                {bike.registrationNumber}
              </div>
            </div>
          </div>

          {/* Tax Status Pill */}
          <div
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 ${
              taxStatus.status === 'VALID'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                : taxStatus.status === 'GRACE_PERIOD'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/60'
            }`}
          >
            {taxStatus.status === 'VALID'
              ? (language === 'ne' ? 'कर वैध' : 'Tax Valid')
              : taxStatus.status === 'GRACE_PERIOD'
              ? (language === 'ne' ? '९०-दिने ग्रेस' : '90-Day Grace')
              : (language === 'ne' ? 'कर म्याद नाघेको' : 'Tax Overdue')}
          </div>
        </div>

        {/* At-a-Glance Metrics Grid */}
        <div className={`mt-3.5 gap-2.5 ${widgetSize === 'compact' ? 'grid grid-cols-1' : 'grid grid-cols-2'}`}>
          {/* Metric 1: Odometer & Tax Expiry */}
          <div className="p-2.5 rounded-2xl bg-black/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-bold">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>{language === 'ne' ? 'ओडोमिटर' : 'Odometer'}</span>
              </span>
              <span className="font-mono font-bold text-white">
                {bike.odometerKm?.toLocaleString()} KM
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-zinc-900">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>{language === 'ne' ? 'कर म्याद' : 'Tax Expiry'}</span>
              </span>
              <span className="font-mono text-slate-200 font-bold">
                {latestRenewal ? `${latestRenewal.validUntilBS} BS` : 'Not Set'}
              </span>
            </div>
          </div>

          {/* Metric 2: Next Service Due */}
          <div className="p-2.5 rounded-2xl bg-black/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-bold">
                <Wrench className="w-3 h-3 text-cyan-400" />
                <span>{language === 'ne' ? 'अर्को सर्भिस' : 'Next Due'}</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {nextServiceKm.toLocaleString()} KM
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-zinc-900">
              <span>{language === 'ne' ? 'बाँकी दूरी' : 'Remaining'}:</span>
              <span className="font-mono font-bold text-emerald-400">
                {kmToService > 0 ? `${kmToService.toLocaleString()} KM` : 'Due Now!'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Glance bar */}
        <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-medium truncate">
            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">{taxStatus.message}</span>
          </span>

          <button
            type="button"
            onClick={handleShareWidget}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition active:scale-95 shrink-0"
            title="Copy Widget Status"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
