import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Calendar,
  X,
  History,
  ChevronDown,
  ChevronUp,
  Receipt,
  Scale,
  Sparkles,
  AlertTriangle,
  Camera,
  Eye,
  Trash2,
  Search,
  Bell,
  Coins,
  ArrowLeft,
  Check,
  Save,
  Edit2
} from 'lucide-react';
import { Bike, RenewalRecord, TaxStatusResult } from '../types';
import { db } from '../db/db';
import { calculateNepalTaxStatus, getEstimatedBaseTax } from '../utils/nepalTax';
import { adToBs, formatAdDate, formatAdDisplayDate, formatBsDisplayDate } from '../utils/nepaliCalendar';
import { NepaliDatePicker } from './NepaliDatePicker';
import { downloadIcsFile } from '../utils/calendarExport';

interface Props {
  bike: Bike;
  renewals: RenewalRecord[];
  onRefresh: () => void;
  language: 'en' | 'ne';
  onOpenVault: () => void;
  openAddTrigger?: number; // External trigger from persistent FAB
}

export const TaxRenewalSystem: React.FC<Props> = ({
  bike,
  renewals,
  onRefresh,
  language,
  onOpenVault,
  openAddTrigger
}) => {
  // Full-Screen Slide-In Page state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRenewalId, setEditingRenewalId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'tax' | 'reminders'>('tax');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRenewals, setShowAllRenewals] = useState(false);

  // Accordion states
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  // Digital Receipt Modal & Delete confirmation
  const [activeReceiptView, setActiveReceiptView] = useState<{ title: string; imageBase64: string } | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<RenewalRecord | null>(null);

  // Form State: Single consolidated renewal cycle date
  const defaultBaseTax = getEstimatedBaseTax(bike.cc, bike.category);
  const [validUntilAD, setValidUntilAD] = useState(
    formatAdDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
  );
  const [taxAmount, setTaxAmount] = useState<number>(defaultBaseTax);
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [officeLocation, setOfficeLocation] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [enableReminder, setEnableReminder] = useState<boolean>(true);
  const [reminderInterval, setReminderInterval] = useState<'today' | '1_week' | '2_weeks' | '4_weeks'>('1_week');
  const [formError, setFormError] = useState<string | null>(null);

  // Open Full-Screen Slide-In Page with fresh state
  const handleOpenAddModal = () => {
    setEditingRenewalId(null);
    setModalTab('tax');
    setValidUntilAD(formatAdDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)));
    setTaxAmount(defaultBaseTax);
    setFineAmount(0);
    setOfficeLocation('');
    setReceiptPhoto(undefined);
    setNotes('');
    setEnableReminder(true);
    setReminderInterval('1_week');
    setFormError(null);
    setHasAttemptedSubmit(false);
    setIsAddModalOpen(true);
  };

  // Open Full-Screen Slide-In Page pre-populated for editing
  const handleEditRenewal = (record: RenewalRecord) => {
    setEditingRenewalId(record.id || null);
    setModalTab('tax');
    setValidUntilAD(record.validUntilAD);
    setTaxAmount(record.taxAmount || defaultBaseTax);
    setFineAmount(record.fineAmount || 0);
    setOfficeLocation(record.officeLocation || '');
    setReceiptPhoto(record.receiptPhoto);
    setNotes(record.notes || '');
    setEnableReminder(record.enableReminder ?? true);
    setReminderInterval(record.reminderInterval || '1_week');
    setFormError(null);
    setHasAttemptedSubmit(false);
    setIsAddModalOpen(true);
  };

  // Listen to external trigger from FAB - guarded by ref so it never fires on tab remount
  const lastTriggerRef = useRef<number | undefined>(openAddTrigger);
  useEffect(() => {
    if (openAddTrigger !== undefined && openAddTrigger > (lastTriggerRef.current || 0)) {
      handleOpenAddModal();
    }
    lastTriggerRef.current = openAddTrigger;
  }, [openAddTrigger]);

  // Handle Photo upload for tax receipt using standard Camera icon
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'ne' ? 'कृपया तस्बिर मात्र छान्नुहोस्।' : 'Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        setReceiptPhoto(compressedBase64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Sort renewals newest first
  const sortedRenewals = [...renewals].sort((a, b) => 
    new Date(b.validUntilAD).getTime() - new Date(a.validUntilAD).getTime()
  );
  const latestRenewal = sortedRenewals[0] || null;

  // Search filter for past tax renewals
  const filteredRenewals = sortedRenewals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const office = (r.officeLocation || '').toLowerCase();
    const noteText = (r.notes || '').toLowerCase();
    const dateBS = (r.validUntilBS || '').toLowerCase();
    const dateAD = (r.validUntilAD || '').toLowerCase();
    const total = (r.totalPaid || 0).toString();
    return (
      office.includes(q) ||
      noteText.includes(q) ||
      dateBS.includes(q) ||
      dateAD.includes(q) ||
      total.includes(q)
    );
  });

  const taxStatus: TaxStatusResult = latestRenewal
    ? calculateNepalTaxStatus(latestRenewal.validUntilAD, defaultBaseTax)
    : {
        status: 'EXPIRED',
        badgeLabel: 'NO DATE SET',
        badgeColor: 'rose',
        daysRemaining: 0,
        daysOverdue: 0,
        daysLeftInGrace: 0,
        fineMultiplierPercent: 0,
        estimatedFineAmount: 0,
        message:
          language === 'ne'
            ? 'कृपया आफ्नो ब्लुबुकको म्याद मिति दर्ता गर्नुहोस्।'
            : 'No Blue Book tax renewal recorded yet. Please log your renewal cycle.',
        reminderAlert: 'none'
      };

  // Circular progress calculations for the status ring
  const circumference = 2 * Math.PI * 40; // r = 40
  let strokeDashoffset = 0;
  let ringColor = '#10b981';

  if (taxStatus.status === 'VALID') {
    const ratio = Math.max(0, Math.min(1, taxStatus.daysRemaining / 365));
    strokeDashoffset = circumference - ratio * circumference;
    ringColor = '#10b981';
  } else if (taxStatus.status === 'GRACE_PERIOD') {
    const ratio = Math.max(0, Math.min(1, taxStatus.daysLeftInGrace / 90));
    strokeDashoffset = circumference - ratio * circumference;
    ringColor = '#f59e0b';
  } else {
    strokeDashoffset = 0;
    ringColor = '#ef4444';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validUntilAD) {
      setFormError(
        language === 'ne'
          ? 'कृपया नयाँ नवीकरण म्याद मिति छान्नुहोस्।'
          : 'Please select your Blue Book expiry date.'
      );
      setModalTab('tax');
      return;
    }

    if (!taxAmount || Number(taxAmount) <= 0) {
      setFormError(
        language === 'ne'
          ? 'कृपया मान्य सवारी कर रकम प्रविष्ट गर्नुहोस्।'
          : 'Please enter a valid tax amount.'
      );
      setModalTab('tax');
      return;
    }

    setFormError(null);
    const today = new Date();
    const renewedDateAD = formatAdDate(today);
    const renewedDateBS = adToBs(today).formatted;
    const validUntilBS = adToBs(validUntilAD).formatted;
    const totalPaid = Number(taxAmount) + Number(fineAmount || 0);

    if (editingRenewalId) {
      await db.renewals.update(editingRenewalId, {
        validUntilAD,
        validUntilBS,
        taxAmount: Number(taxAmount),
        fineAmount: Number(fineAmount || 0),
        totalPaid,
        officeLocation: officeLocation.trim() || (language === 'ne' ? 'यातायात व्यवस्था कार्यालय' : 'Transport Management Office'),
        receiptPhoto,
        notes: notes.trim(),
        enableReminder,
        reminderInterval
      });
    } else {
      await db.renewals.add({
        bikeId: bike.id!,
        renewedDateAD,
        renewedDateBS,
        validUntilAD,
        validUntilBS,
        taxAmount: Number(taxAmount),
        fineAmount: Number(fineAmount || 0),
        totalPaid,
        officeLocation: officeLocation.trim() || (language === 'ne' ? 'यातायात व्यवस्था कार्यालय' : 'Transport Management Office'),
        bluebookPages: [],
        receiptPhoto,
        notes: notes.trim(),
        enableReminder,
        reminderInterval
      });
    }

    setIsAddModalOpen(false);
    setEditingRenewalId(null);
    setHasAttemptedSubmit(false);
    setReceiptPhoto(undefined);
    onRefresh();
  };

  const executeDeleteRenewal = async () => {
    if (!confirmDeleteRecord?.id) return;
    await db.renewals.delete(confirmDeleteRecord.id);
    setConfirmDeleteRecord(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              {language === 'ne' ? 'ब्लुबुक कर तथा नवीकरण' : 'Blue Book & Tax Renewal'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'ne' ? '९०-दिने ग्रेस अवधि तथा जरिवाना ट्र्याकर' : '1-year cycle, 90-day grace & fine tracker'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Tax Hero Card with Progress Ring */}
      <div
        className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
          taxStatus.status === 'VALID'
            ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-950 border-emerald-500/30'
            : taxStatus.status === 'GRACE_PERIOD'
            ? 'bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 border-amber-500/30'
            : 'bg-gradient-to-br from-rose-950/40 via-zinc-950 to-zinc-950 border-rose-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Left: Status Ring & Details */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-zinc-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black font-mono text-white">
                  {taxStatus.status === 'VALID'
                    ? taxStatus.daysRemaining
                    : taxStatus.status === 'GRACE_PERIOD'
                    ? taxStatus.daysLeftInGrace
                    : taxStatus.daysOverdue}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold">
                  {language === 'ne' ? 'दिन' : 'Days'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">
                  {bike.name} ({bike.cc}cc)
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5 tracking-tight">
                {latestRenewal ? formatBsDisplayDate(latestRenewal.validUntilAD, language) : 'Not Set'} BS
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {latestRenewal ? `${formatAdDisplayDate(latestRenewal.validUntilAD)} AD` : 'No renewal logged'}
              </p>
            </div>
          </div>

          {/* Right: Status Badge & Estimated Slabs */}
          <div className="flex flex-col sm:items-end gap-2">
            <div
              className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider border self-start sm:self-end ${
                taxStatus.status === 'VALID'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  : taxStatus.status === 'GRACE_PERIOD'
                  ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                  : 'bg-rose-950 text-rose-300 border-rose-500/50'
              }`}
            >
              {taxStatus.badgeLabel}
            </div>

            <div className="text-left sm:text-right text-xs">
              <span className="text-slate-400 block text-[11px]">
                {language === 'ne' ? 'अनुमानित आधार कर:' : 'Estimated Base Tax:'}
              </span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                Rs. {defaultBaseTax.toLocaleString()} / year
              </span>
            </div>

            {/* Quick Export to Calendar (.ics) */}
            {latestRenewal && (
              <button
                type="button"
                onClick={() =>
                  downloadIcsFile({
                    title: `Nepal Vehicle Tax Renewal Due (${bike.registrationNumber})`,
                    description: `Blue book renewal expiry for ${bike.name}. Base tax: Rs. ${defaultBaseTax}.`,
                    startDate: latestRenewal.validUntilAD,
                    location: latestRenewal.officeLocation || 'Transport Office'
                  })
                }
                className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
              >
                <Calendar className="w-3 h-3" />
                <span>{language === 'ne' ? 'पात्रोमा थप्नुहोस् (.ics)' : 'Export to Calendar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Informative Status Banner */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <p className="text-slate-300 flex items-center gap-1.5">
            {taxStatus.status === 'VALID' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : taxStatus.status === 'GRACE_PERIOD' ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{taxStatus.message}</span>
          </p>

          <button
            type="button"
            onClick={onOpenVault}
            className="text-cyan-400 hover:text-cyan-300 font-bold shrink-0 text-xs ml-2"
          >
            {language === 'ne' ? 'कागजात हेर्नुहोस्' : 'Open Documents'} →
          </button>
        </div>
      </div>

      {/* 3. Renewal History Accordion Slide Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {language === 'ne' ? 'नवीकरण इतिहास' : 'Renewal History'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {renewals.length} {renewals.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder={language === 'ne' ? 'कार्यालय, मिति वा भौचर खोज्नुहोस्...' : 'Search office, date, or notes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {filteredRenewals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-xs text-slate-400">
            {language === 'ne' ? 'कुनै कर नवीकरण रेकर्ड भेटिएन।' : 'No renewal history recorded yet.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {(showAllRenewals ? filteredRenewals : filteredRenewals.slice(0, 2)).map((item) => {
              const isExpanded = expandedRecordId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden transition-all shadow-md"
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => setExpandedRecordId(isExpanded ? null : item.id!)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white font-mono">
                          {item.validUntilBS} BS
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({formatAdDisplayDate(item.validUntilAD)})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        {item.officeLocation || 'Transport Office'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-cyan-400">
                          Rs. {(item.totalPaid || item.taxAmount || 0).toLocaleString()}
                        </div>
                        {item.fineAmount && item.fineAmount > 0 && (
                          <span className="text-[10px] text-rose-400 font-mono">
                            (+Rs. {item.fineAmount} fine)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Action Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRenewal(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-zinc-900 transition active:scale-95"
                          title={language === 'ne' ? 'सम्पादन' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete Action Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteRecord(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-zinc-900 transition active:scale-95"
                          title={language === 'ne' ? 'मेटाउनुहोस्' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Expanded Slide Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-900 bg-black/40 space-y-2.5 text-xs animate-in fade-in">
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2">
                        <div>
                          <span className="text-slate-500 block">Payment Office:</span>
                          <span className="text-slate-200 font-semibold">{item.officeLocation || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Base Tax:</span>
                          <span className="text-slate-200 font-mono">
                            Rs. {(item.taxAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-slate-300">
                          <span className="text-slate-500 block font-bold text-[10px] uppercase">Notes:</span>
                          {item.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                        {item.receiptPhoto ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReceiptView({
                                title: `Tax Renewal ${item.validUntilBS} BS - Receipt`,
                                imageBase64: item.receiptPhoto!
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-cyan-300 transition active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{language === 'ne' ? 'कर रसिद हेर्नुहोस्' : 'View Tax Receipt / Stamp'}</span>
                            <Eye className="w-3 h-3 ml-0.5 opacity-70" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">No receipt attached</span>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRecord(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredRenewals.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllRenewals(!showAllRenewals)}
                className="w-full py-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-cyan-400 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <span>
                  {showAllRenewals
                    ? (language === 'ne' ? 'कम देखाउनुहोस्' : 'Show Recent Only')
                    : (language === 'ne' ? `सबै नवीकरण इतिहास हेर्नुहोस् (${filteredRenewals.length})` : `View All History (${filteredRenewals.length})`)}
                </span>
                {showAllRenewals ? (
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Nepal Motor Vehicle Act Slabs & 90-Day Grace Rules Accordion */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden transition-all shadow-md">
        <button
          type="button"
          onClick={() => setIsScheduleOpen(!isScheduleOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span>{language === 'ne' ? 'नेपाल सवारी ऐन: ९०-दिने ग्रेस र जरिवाना नियम' : 'Nepal Motor Vehicle Act: 90-Day Grace & Fine Rules'}</span>
          </div>
          {isScheduleOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isScheduleOpen && (
          <div className="p-4 pt-0 border-t border-zinc-900 text-xs text-slate-300 space-y-3 bg-black/40 animate-in fade-in">
            <p className="text-[11px] text-slate-400">
              नेपाल सवारी तथा यातायात व्यवस्था ऐन अनुसार आर्थिक वर्ष समाप्त भएको वा म्याद सकिएको ९० दिनसम्म बिना कुनै जरिवाना कर तिर्न पाइन्छ।
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="font-bold text-emerald-400">० देखि ९० दिन (ग्रेस अवधि):</span>
                <p className="text-slate-400 mt-0.5">०% जरिवाना (साधारण कर मात्र)</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="font-bold text-amber-400">ग्रेस अवधि सकिएपछिको पहिलो ३० दिन:</span>
                <p className="text-slate-400 mt-0.5">५% जरिवाना</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="font-bold text-rose-400">त्यसपछिको ४५ दिन:</span>
                <p className="text-slate-400 mt-0.5">१०% जरिवाना</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="font-bold text-rose-500">आर्थिक वर्षको अन्त्यसम्म वा त्यसपछि:</span>
                <p className="text-slate-400 mt-0.5">२०% देखि १००% सम्म जरिवाना</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. FULL-SCREEN SLIDE-IN PAGE FOR LOGGING / EDITING RENEWAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Top Unified Navigation Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingRenewalId(null);
                  setFormError(null);
                  setHasAttemptedSubmit(false);
                  setReceiptPhoto(undefined);
                }}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
                title={language === 'ne' ? 'पछाडि' : 'Back'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">
                  {editingRenewalId
                    ? (language === 'ne' ? 'कर नवीकरण सम्पादन' : 'Edit Tax Renewal')
                    : (language === 'ne' ? 'सवारी कर तथा १-वर्षे नवीकरण दर्ता' : 'Log Blue Book Tax Renewal')}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {language === 'ne'
                    ? 'आफ्नो ब्लुबुकमा छापिएको नयाँ म्याद मिति छान्नुहोस्'
                    : 'Select your new Blue Book expiry date & tax details'}
                </p>
              </div>
            </div>

            {/* Standardized Primary Action Button: Save Icon + 'Save' Label */}
            <button
              type="button"
              onClick={handleSubmit}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
              title={editingRenewalId ? (language === 'ne' ? 'अद्यावधिक' : 'Update') : (language === 'ne' ? 'सेभ' : 'Save')}
              aria-label="Save"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>
                {editingRenewalId
                  ? (language === 'ne' ? 'अद्यावधिक' : 'Update')
                  : (language === 'ne' ? 'सेभ' : 'Save')}
              </span>
            </button>
          </header>

          {/* Stepped Clean Internal Tabs */}
          <div className="max-w-2xl w-full mx-auto px-4 pt-3 shrink-0">
            <div className="flex items-center p-1 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('tax')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'tax'
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'म्याद र कर' : 'Cycle & Tax'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('reminders')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'reminders'
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'रिमाइन्डर र रसिद' : 'Receipt & Reminders'}</span>
              </button>
            </div>
          </div>

          {/* Form Error Banner */}
          {hasAttemptedSubmit && formError && (
            <div className="max-w-2xl w-full mx-auto px-4 pt-3 shrink-0">
              <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{formError}</span>
              </div>
            </div>
          )}

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-4">
            
            {/* TAB 1: CYCLE, ROAD TAX, FINE & OFFICE */}
            {modalTab === 'tax' && (
              <div className="space-y-3.5 animate-in fade-in">
                
                {/* Strict BS Date Picker */}
                <NepaliDatePicker
                  label={
                    language === 'ne'
                      ? 'नयाँ ब्लुबुक म्याद मिति (Valid-Through Date)'
                      : 'Blue Book Expiry / Valid-Through Date'
                  }
                  valueAD={validUntilAD}
                  onChange={(ad) => {
                    setValidUntilAD(ad);
                    setFormError(null);
                  }}
                  required={true}
                  error={hasAttemptedSubmit && !validUntilAD}
                  errorMessage={language === 'ne' ? 'म्याद मिति अनिवार्य छ।' : 'Expiry date is required.'}
                  showQuickPresets={true}
                  language={language}
                  helperText={
                    language === 'ne'
                      ? 'नेपालमा कर नवीकरण १ आर्थिक वर्षको हुन्छ (+१ वर्ष थिच्नुहोस्)'
                      : 'Use "+1 Year" button for standard annual renewal cycle.'
                  }
                />

                {/* Tax Amount & Fine Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {language === 'ne' ? 'सवारी कर रकम (रु.)' : 'Road Tax Amount (Rs.)'}
                    </label>
                    <input
                      type="number"
                      value={taxAmount}
                      onChange={(e) => {
                        setTaxAmount(Number(e.target.value));
                        setFormError(null);
                      }}
                      className={`w-full bg-zinc-900 border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none transition ${
                        hasAttemptedSubmit && (!taxAmount || taxAmount <= 0)
                          ? 'border-rose-500 ring-2 ring-rose-500/40'
                          : 'border-zinc-800 focus:border-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {language === 'ne' ? 'जरिवाना (यदि छ भने रु.)' : 'Fine Penalty (Rs.)'}
                    </label>
                    <input
                      type="number"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Transport Office Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    {language === 'ne' ? 'यातायात कार्यालय / भुक्तानी माध्यम' : 'Transport Office / Payment Method'}
                  </label>
                  <input
                    type="text"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: REMINDERS & RECEIPT PHOTO */}
            {modalTab === 'reminders' && (
              <div className="space-y-3.5 animate-in fade-in">
                
                {/* REMINDERS WITH PRESET OPTIONS */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        {language === 'ne' ? 'नवीकरण रिमाइन्डर सक्रिय गर्नुहोस्' : 'Enable Renewal Reminder'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableReminder}
                      onChange={(e) => setEnableReminder(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {enableReminder && (
                    <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {language === 'ne' ? 'रिमाइन्डर पूर्वसूचना समय:' : 'Reminder Alert Timing:'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: 'today', en: 'On the day', ne: 'सोही दिन' },
                          { id: '1_week', en: '1 weeks before', ne: '१ हप्ता अगाडि' },
                          { id: '2_weeks', en: '2 weeks before', ne: '२ हप्ता अगाडि' },
                          { id: '4_weeks', en: '4 weeks before', ne: '४ हप्ता अगाडि' }
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setReminderInterval(preset.id as any)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                              reminderInterval === preset.id
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-zinc-900 text-slate-400 border-zinc-800'
                            }`}
                          >
                            {language === 'ne' ? preset.ne : preset.en}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* DIGITAL RECEIPT ATTACHMENT FIELD */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {language === 'ne'
                          ? 'कर रसिद / भौचर / स्ट्याम्प फोटो (ऐच्छिक)'
                          : 'Tax Receipt / Bank Slip / Stamp Photo (Optional)'}
                      </span>
                    </label>
                    {receiptPhoto && (
                      <button
                        type="button"
                        onClick={() => setReceiptPhoto(undefined)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{language === 'ne' ? 'हटाउनुहोस्' : 'Remove'}</span>
                      </button>
                    )}
                  </div>

                  {receiptPhoto ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700 max-w-xs group">
                      <img src={receiptPhoto} alt="Tax receipt preview" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReceiptView({ title: 'Tax Slip Preview', imageBase64: receiptPhoto })
                          }
                          className="p-2 rounded-xl bg-cyan-500 text-black text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 hover:border-cyan-500/80 rounded-2xl cursor-pointer bg-zinc-900/50 hover:bg-zinc-900 transition text-center group">
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition mb-1" />
                      <span className="text-xs font-bold text-slate-300">
                        {language === 'ne'
                          ? 'कर रसिद वा ब्लुबुक पानाको फोटो खिच्नुहोस्'
                          : 'Snap tax voucher or blue book stamp'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Optional Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    {language === 'ne' ? 'टिप्पणी (ऐच्छिक)' : 'Notes / Remarks (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 6. FULLSCREEN RECEIPT VIEWER */}
      {activeReceiptView && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 max-w-2xl w-full mx-auto">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-black text-white truncate max-w-xs sm:max-w-md">
                {activeReceiptView.title}
              </h3>
            </div>
            <button
              onClick={() => setActiveReceiptView(null)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-auto max-w-2xl w-full mx-auto">
            <img
              src={activeReceiptView.imageBase64}
              alt="Tax Receipt"
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-zinc-800 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION DIALOG */}
      {confirmDeleteRecord && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            {/* Top-Right Cross Icon */}
            <button
              type="button"
              onClick={() => setConfirmDeleteRecord(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-slate-400 hover:text-white transition active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {language === 'ne' ? 'नवीकरण रेकर्ड मेटाउने?' : 'Delete Renewal Record?'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {confirmDeleteRecord.validUntilBS} BS ({confirmDeleteRecord.validUntilAD})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'ne'
                ? 'के तपाईं यो कर नवीकरण रेकर्ड मेटाउन निश्चित हुनुहुन्छ? यो कार्य फिर्ता गर्न सकिँदैन।'
                : 'Are you sure you want to permanently delete this renewal record?'}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                className="p-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition flex items-center justify-center"
                title={language === 'ne' ? 'रद्द' : 'Cancel'}
                aria-label="Cancel"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={executeDeleteRenewal}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'ne' ? 'मेटाउनुहोस्' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
