import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  FileText,
  X,
  ExternalLink,
  Sun,
  Camera,
  CheckCircle2,
  Copy,
  Info,
  ArrowLeft
} from 'lucide-react';
import { Bike, RenewalRecord, DocumentItem, TaxStatusResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  taxStatus: TaxStatusResult;
  latestRenewal?: RenewalRecord;
  documents: DocumentItem[];
  language: 'en' | 'ne';
}

export const TrafficCheckModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bike,
  taxStatus,
  latestRenewal,
  documents,
  language
}) => {
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('bluebook_tax');
  const [flashlightMode, setFlashlightMode] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const relevantDoc = documents.find(d => d.category === selectedDocCategory) || documents[0];

  const handleCopyDetails = () => {
    const text = `Sawaari Vehicle Details:
Plate: ${bike.registrationNumber}
Model: ${bike.name} (${bike.cc}cc)
Tax Expiry: ${latestRenewal?.validUntilBS || 'N/A'} BS (${latestRenewal?.validUntilAD || 'N/A'} AD)
Engine No: ${bike.engineNo || 'On Bluebook'}
Chassis No: ${bike.chassisNo || 'On Bluebook'}
Office: ${latestRenewal?.officeLocation || 'Yatayat Karyalaya'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (flashlightMode) {
    return (
      <div
        onClick={() => setFlashlightMode(false)}
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-black cursor-pointer text-center"
      >
        <Sun className="w-16 h-16 text-amber-500 animate-spin mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-wider">{bike.registrationNumber}</h2>
        <p className="text-sm font-bold mt-2">Night Inspection White Light (Tap anywhere to return)</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Top Unified Navigation Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
            title={language === 'ne' ? 'पछाडि' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🇳🇵</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {language === 'ne' ? 'ट्राफिक चेकिङ कार्ड' : 'Traffic Spot-Check Card'}
              </h2>
              <p className="text-[10px] font-mono text-cyan-400">
                Official DoTM Vehicle & Tax Record
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFlashlightMode(true)}
            title="Night Flashlight Screen"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 transition"
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-lg w-full mx-auto space-y-4">

        {/* Big Official High-Contrast Plate Badge */}
        <div className="p-4 rounded-2xl bg-black border-2 border-amber-400/80 shadow-lg text-center space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80">
            {language === 'ne' ? '🇳🇵 सवारी दर्ता नम्बर' : '🇳🇵 VEHICLE REGISTRATION NUMBER'}
          </div>

          {bike.platePhotoUrl ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-zinc-700 max-h-36 mx-auto flex items-center justify-center bg-zinc-900">
                <img src={bike.platePhotoUrl} alt="License Plate" className="w-full h-auto max-h-36 object-contain" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-wider text-amber-300">
                {bike.registrationNumber}
              </div>
            </div>
          ) : (
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-amber-300">
              {bike.registrationNumber}
            </div>
          )}

          <div className="text-xs font-semibold text-slate-300">
            {bike.name} · <span className="font-mono text-cyan-400">{bike.cc}cc</span>
          </div>
        </div>

        {/* Real-Time Tax Status Badge (Minimalist Glow + Status Icon) */}
        <div className={`p-4 rounded-3xl border text-center space-y-1.5 shadow-xl ${
          taxStatus.status === 'VALID'
            ? 'bg-gradient-to-b from-emerald-950/70 to-zinc-950 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
            : taxStatus.status === 'GRACE_PERIOD'
            ? 'bg-gradient-to-b from-amber-950/70 to-zinc-950 border-amber-500/40 text-amber-200 shadow-amber-500/10'
            : 'bg-gradient-to-b from-rose-950/70 to-zinc-950 border-rose-500/40 text-rose-200 shadow-rose-500/10'
        }`}>
          <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider">
            {taxStatus.status === 'VALID' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : taxStatus.status === 'GRACE_PERIOD' ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-rose-400" />
            )}
            <span>
              {taxStatus.status === 'VALID'
                ? (language === 'ne' ? 'कर वैध' : 'Tax Valid')
                : taxStatus.status === 'GRACE_PERIOD'
                ? (language === 'ne' ? '९०-दिने ग्रेस' : '90-Day Grace')
                : (language === 'ne' ? 'कर म्याद नाघेको' : 'Tax Overdue')}
            </span>
          </div>

          <div className="text-xl font-black font-mono text-white">
            {latestRenewal?.validUntilBS ? `${latestRenewal.validUntilBS} BS` : 'Not Set'}
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            ({latestRenewal?.validUntilAD || 'N/A'} AD) ·{' '}
            {taxStatus.daysRemaining > 0
              ? `${taxStatus.daysRemaining} ${language === 'ne' ? 'दिन बाँकी' : 'Days Left'}`
              : taxStatus.message}
          </div>
        </div>

        {/* Technical Specs Checklist for Police */}
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Engine No:</span>
            <span className="font-bold text-white">{bike.engineNo || 'See Bluebook page'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Chassis No:</span>
            <span className="font-bold text-white">{bike.chassisNo || 'See Bluebook page'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Renewed Office:</span>
            <span className="font-bold text-white truncate max-w-[200px]">{latestRenewal?.officeLocation || 'Ekantakuna Lalitpur'}</span>
          </div>
        </div>

        {/* Blue Book Page Quick Viewer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Attached Documents</span>
            <button
              onClick={handleCopyDetails}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy Info'}</span>
            </button>
          </div>

          {/* Document Category Selector Pills */}
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <button
              onClick={() => setSelectedDocCategory('bluebook_tax')}
              className={`p-1.5 rounded-lg border text-center transition ${
                selectedDocCategory === 'bluebook_tax'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                  : 'bg-zinc-900 text-slate-400 border-zinc-800'
              }`}
            >
              Tax Stamps
            </button>
            <button
              onClick={() => setSelectedDocCategory('bluebook_front')}
              className={`p-1.5 rounded-lg border text-center transition ${
                selectedDocCategory === 'bluebook_front'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                  : 'bg-zinc-900 text-slate-400 border-zinc-800'
              }`}
            >
              Blue Book P.1-2
            </button>
            <button
              onClick={() => setSelectedDocCategory('pollution')}
              className={`p-1.5 rounded-lg border text-center transition ${
                selectedDocCategory === 'pollution'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                  : 'bg-zinc-900 text-slate-400 border-zinc-800'
              }`}
            >
              Pollution
            </button>
          </div>

          {/* Image Display */}
          <div className="h-44 rounded-2xl bg-black border border-zinc-800 overflow-hidden flex items-center justify-center relative">
            {relevantDoc ? (
              <img
                src={relevantDoc.imageBase64}
                alt={relevantDoc.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-4">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 font-medium">No photo uploaded in this category</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Use Blue Book Vault to upload photos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
