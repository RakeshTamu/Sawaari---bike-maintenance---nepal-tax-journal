import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Plus,
  Calendar,
  AlertTriangle,
  Search,
  Check,
  Save,
  X,
  RotateCcw,
  MapPin,
  Camera,
  Eye,
  Trash2,
  FileText,
  Bell,
  Tag,
  ListPlus,
  FolderPlus,
  Layers,
  ArrowLeft,
  Edit2,
  Droplet,
  Disc,
  Link2,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ServiceRecord, Bike, ServiceSubItem } from '../types';
import { db } from '../db/db';
import { adToBs, formatAdDate, formatAdDisplayDate, diffDays } from '../utils/nepaliCalendar';
import { NepaliDatePicker } from './NepaliDatePicker';
import { downloadIcsFile } from '../utils/calendarExport';
import { translations } from '../utils/translations';

interface Props {
  bike: Bike;
  services: ServiceRecord[];
  onRefresh: () => void;
  language: 'en' | 'ne';
  openAddTrigger?: number; // External trigger from persistent FAB
}

export const INITIAL_DEFAULT_CATEGORIES = ['Engine Oil', 'Brake Pads', 'Air Filter'];

export function getCategoryIcon(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes('oil') || c.includes('इन्जिन') || c.includes('आयल')) {
    return <Droplet className="w-3.5 h-3.5 text-amber-400" />;
  }
  if (c.includes('brake') || c.includes('प्याड') || c.includes('ब्रेक')) {
    return <Disc className="w-3.5 h-3.5 text-rose-400" />;
  }
  if (c.includes('chain') || c.includes('चेन')) {
    return <Link2 className="w-3.5 h-3.5 text-cyan-400" />;
  }
  if (c.includes('filter') || c.includes('फिल्टर')) {
    return <Filter className="w-3.5 h-3.5 text-emerald-400" />;
  }
  return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
}

export const ServiceTracker: React.FC<Props> = ({
  bike,
  services,
  onRefresh,
  language,
  openAddTrigger
}) => {
  // Full-Screen Slide-In Page state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [sheetTab, setSheetTab] = useState<'items' | 'reminders'>('items');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Dynamic Categories (stored in IndexedDB settings)
  const [categories, setCategories] = useState<string[]>(INITIAL_DEFAULT_CATEGORIES);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Digital Receipt Modal & Delete confirmation
  const [activeReceiptView, setActiveReceiptView] = useState<{ title: string; imageBase64: string } | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<ServiceRecord | null>(null);

  // Form State - strictly NO hardcoded default prices
  const [serviceDateAD, setServiceDateAD] = useState(formatAdDate(new Date()));
  const [odometerKm, setOdometerKm] = useState<number>(bike.odometerKm || 0);
  const [nextServiceKm, setNextServiceKm] = useState<number>((bike.odometerKm || 0) + 3000);
  const [nextServiceDateAD, setNextServiceDateAD] = useState(
    formatAdDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
  );
  const [serviceCenter, setServiceCenter] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [enableReminder, setEnableReminder] = useState<boolean>(true);
  const [reminderInterval, setReminderInterval] = useState<'today' | '1_week' | '2_weeks' | '4_weeks'>('1_week');
  const [formError, setFormError] = useState<string | null>(null);

  // Itemized Sub-Entries: strictly manual entry, NO hardcoded default prices
  const [subItems, setSubItems] = useState<ServiceSubItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('Engine Oil');
  const [newItemCost, setNewItemCost] = useState<number | ''>('');

  // Pending Next Service Target Workflow
  const [pendingTargetKm, setPendingTargetKm] = useState<number | null>(null);
  const [pendingSnoozeDays, setPendingSnoozeDays] = useState<number | null>(null);

  const t = translations[language];

  // Load custom categories from IndexedDB
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const stored = await db.settings.get('maintenance_categories');
        if (stored && Array.isArray(stored.value) && stored.value.length > 0) {
          setCategories(stored.value);
          setNewItemCategory(stored.value[0]);
        } else {
          setCategories(INITIAL_DEFAULT_CATEGORIES);
          await db.settings.put({
            key: 'maintenance_categories',
            value: INITIAL_DEFAULT_CATEGORIES
          });
        }
      } catch (err) {
        setCategories(INITIAL_DEFAULT_CATEGORIES);
      }
    };
    loadCategories();
  }, []);

  // Listen to external trigger from FAB - guarded by ref so it never fires on tab remount
  const lastTriggerRef = useRef<number | undefined>(openAddTrigger);
  useEffect(() => {
    if (openAddTrigger !== undefined && openAddTrigger > (lastTriggerRef.current || 0)) {
      handleOpenAddSheet();
    }
    lastTriggerRef.current = openAddTrigger;
  }, [openAddTrigger]);

  // Dynamic live total calculation strictly from user-entered sub-items
  const calculatedItemsTotal = subItems.reduce((acc, item) => acc + (Number(item.cost) || 0), 0);

  // Open Log Full-Screen Page with fresh state
  const handleOpenAddSheet = () => {
    setEditingServiceId(null);
    setSheetTab('items');
    setServiceDateAD(formatAdDate(new Date()));
    setOdometerKm(bike.odometerKm || 0);
    setNextServiceKm((bike.odometerKm || 0) + 3000);
    setNextServiceDateAD(formatAdDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)));
    setServiceCenter('');
    setWorkDone('');
    setReceiptPhoto(undefined);
    setNotes('');
    setSubItems([]);
    setNewItemName('');
    setNewItemCost('');
    setNewItemCategory(categories[0] || 'Engine Oil');
    setEnableReminder(true);
    setReminderInterval('1_week');
    setFormError(null);
    setHasAttemptedSubmit(false);
    setIsAddSheetOpen(true);
  };

  // Open Edit Full-Screen Page pre-populated with existing record data
  const handleEditService = (record: ServiceRecord) => {
    setEditingServiceId(record.id || null);
    setSheetTab('items');
    setServiceDateAD(record.serviceDateAD);
    setOdometerKm(record.odometerKm || 0);
    setNextServiceKm(record.nextServiceKm || ((record.odometerKm || 0) + 3000));
    setNextServiceDateAD(record.nextServiceDateAD || formatAdDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)));
    setServiceCenter(record.serviceCenter || '');
    setWorkDone(record.workDone || '');
    setReceiptPhoto(record.receiptPhoto);
    setNotes(record.notes || '');
    setSubItems(record.subItems ? [...record.subItems] : []);
    setNewItemName('');
    setNewItemCost('');
    setNewItemCategory(categories[0] || 'Engine Oil');
    setEnableReminder(record.enableReminder ?? true);
    setReminderInterval(record.reminderInterval || '1_week');
    setFormError(null);
    setHasAttemptedSubmit(false);
    setIsAddSheetOpen(true);
  };

  // Add Itemized Sub-Entry via inline "+" button
  const handleAddSubItem = () => {
    if (!newItemName.trim()) {
      setFormError(
        language === 'ne'
          ? 'कृपया सामान वा पार्टपुर्जाको नाम लेख्नुहोस्।'
          : 'Please enter the item / part name.'
      );
      return;
    }

    if (newItemCost === '' || Number(newItemCost) < 0) {
      setFormError(
        language === 'ne'
          ? 'कृपया सामानको मान्य मूल्य (रु.) प्रविष्ट गर्नुहोस्।'
          : 'Please enter a valid price for the item.'
      );
      return;
    }

    setFormError(null);
    setSubItems([
      ...subItems,
      {
        id: String(Date.now() + Math.random()),
        name: newItemName.trim(),
        category: newItemCategory || categories[0] || 'General',
        cost: Number(newItemCost)
      }
    ]);
    setNewItemName('');
    setNewItemCost('');
  };

  const handleRemoveSubItem = (id: string) => {
    setSubItems(subItems.filter(item => item.id !== id));
  };

  // Create new custom category on the fly
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const trimmed = newCatName.trim();
    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      setNewItemCategory(trimmed);
      await db.settings.put({
        key: 'maintenance_categories',
        value: updated
      });
    }
    setNewCatName('');
    setShowNewCatInput(false);
  };

  // Handle Photo upload for receipt using universal Camera icon
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'ne' ? 'कृपया तस्बिर मात्र छान्नुहोस्।' : 'Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
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

  // Sort services newest first
  const sortedServices = [...services].sort((a, b) => 
    new Date(b.serviceDateAD).getTime() - new Date(a.serviceDateAD).getTime()
  );

  // Filter services by search text and selected dynamic category
  const filteredServices = sortedServices.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.workDone || '').toLowerCase().includes(q) ||
      (s.serviceCenter || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q) ||
      (s.categories || []).some(c => c.toLowerCase().includes(q)) ||
      (s.subItems || []).some(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (selectedCategoryFilter === 'ALL') return true;

    const filterTarget = selectedCategoryFilter.toLowerCase();
    const inCategories = (s.categories || []).some(c => c.toLowerCase().includes(filterTarget));
    const inSubItems = (s.subItems || []).some(i => i.category.toLowerCase() === filterTarget || i.name.toLowerCase().includes(filterTarget));
    const inWorkDone = (s.workDone || '').toLowerCase().includes(filterTarget);

    return inCategories || inSubItems || inWorkDone;
  });

  const hasServiceRecords = sortedServices.length > 0;
  const latestService = hasServiceRecords ? sortedServices[0] : null;
  const rawTargetKm = latestService?.nextServiceKm || ((bike.odometerKm || 0) + 3000);
  const activeNextTargetKm = pendingTargetKm !== null ? pendingTargetKm : rawTargetKm;
  const kmRemaining = activeNextTargetKm - (bike.odometerKm || 0);

  const baseNextDate = latestService?.nextServiceDateAD || formatAdDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const rawSnoozeDays = latestService?.snoozeDays || 0;
  const activeSnoozeDays = pendingSnoozeDays !== null ? pendingSnoozeDays : rawSnoozeDays;
  const effectiveNextDate = new Date(new Date(baseNextDate).getTime() + activeSnoozeDays * 24 * 60 * 60 * 1000);
  const daysUntilService = diffDays(effectiveNextDate, new Date());

  // Pending Target Increments
  const handleStageTargetKm = (delta: number) => {
    const base = pendingTargetKm !== null ? pendingTargetKm : rawTargetKm;
    setPendingTargetKm(base + delta);
  };

  const handleStageSnooze = (days: number) => {
    const base = pendingSnoozeDays !== null ? pendingSnoozeDays : rawSnoozeDays;
    setPendingSnoozeDays(base + days);
  };

  const handleCommitPendingServiceDue = async () => {
    if (!latestService?.id) return;
    const updates: Partial<ServiceRecord> = {};
    if (pendingTargetKm !== null) updates.nextServiceKm = pendingTargetKm;
    if (pendingSnoozeDays !== null) updates.snoozeDays = pendingSnoozeDays;
    await db.services.update(latestService.id, updates);
    setPendingTargetKm(null);
    setPendingSnoozeDays(null);
    onRefresh();
  };

  const handleCancelPendingServiceDue = () => {
    setPendingTargetKm(null);
    setPendingSnoozeDays(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (subItems.length === 0 && !workDone.trim()) {
      setFormError(
        language === 'ne' 
          ? 'कृपया कम्तिमा एउटा सामान/पार्टपुर्जा थप्नुहोस् वा मर्मत विवरण लेख्नुहोस्।'
          : 'Please add at least one item/part or enter work performed.'
      );
      setSheetTab('items');
      return;
    }

    setFormError(null);
    const bsDate = adToBs(serviceDateAD).formatted;
    
    const uniqueItemCategories = Array.from(new Set(subItems.map(i => i.category)));
    const itemNames = subItems.map(i => `${i.name} (${i.category})`);
    const summaryWorkDone = workDone.trim() || itemNames.join(', ') || 'Maintenance Visit';

    if (editingServiceId) {
      await db.services.update(editingServiceId, {
        serviceDateAD,
        serviceDateBS: bsDate,
        odometerKm: Number(odometerKm),
        nextServiceKm: Number(nextServiceKm),
        nextServiceDateAD,
        cost: Number(calculatedItemsTotal || 0),
        serviceCenter: serviceCenter.trim() || (language === 'ne' ? 'वर्कसप' : 'Authorized Workshop'),
        workDone: summaryWorkDone,
        categories: uniqueItemCategories,
        subItems,
        receiptPhoto,
        notes: notes.trim(),
        enableReminder,
        reminderInterval
      });
    } else {
      await db.services.add({
        bikeId: bike.id!,
        serviceDateAD,
        serviceDateBS: bsDate,
        odometerKm: Number(odometerKm),
        nextServiceKm: Number(nextServiceKm),
        nextServiceDateAD,
        snoozeDays: 0,
        cost: Number(calculatedItemsTotal || 0),
        serviceCenter: serviceCenter.trim() || (language === 'ne' ? 'वर्कसप' : 'Authorized Workshop'),
        workDone: summaryWorkDone,
        categories: uniqueItemCategories,
        subItems,
        receiptPhoto,
        notes: notes.trim(),
        enableReminder,
        reminderInterval
      });
    }

    if (Number(odometerKm) > (bike.odometerKm || 0)) {
      await db.bikes.update(bike.id!, {
        odometerKm: Number(odometerKm)
      });
    }

    setIsAddSheetOpen(false);
    setEditingServiceId(null);
    setHasAttemptedSubmit(false);
    setWorkDone('');
    setReceiptPhoto(undefined);
    setNotes('');
    setSubItems([]);
    setFormError(null);
    onRefresh();
  };

  const executeDeleteService = async () => {
    if (!confirmDeleteRecord?.id) return;
    await db.services.delete(confirmDeleteRecord.id);
    setConfirmDeleteRecord(null);
    onRefresh();
  };

  const handleSetTargetKmIncrement = (delta: number) => {
    const base = Number(odometerKm) || (bike.odometerKm || 0);
    setNextServiceKm(base + delta);
  };

  const handleSetTargetDateIncrement = (days: number) => {
    const baseDate = new Date(serviceDateAD || Date.now());
    const newDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setNextServiceDateAD(formatAdDate(newDate));
  };

  const hasPendingServiceDue = pendingTargetKm !== null || pendingSnoozeDays !== null;

  return (
    <div className="space-y-6">
      
      {/* 1. SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              {language === 'ne' ? 'मर्मत' : 'Maintenance'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'ne' ? 'पार्टपुर्जा, बिल र मर्मत डायरी' : 'Parts replaced, itemized costs & logs'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. UPCOMING SERVICE REMINDER SUMMARY WITH FLUID PENDING INCREMENTS & EXPLICIT SAVE */}
      {hasServiceRecords ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t.nextServiceDue}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {activeNextTargetKm.toLocaleString()} KM Target
              </span>
              {pendingTargetKm !== null && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  +{pendingTargetKm - rawTargetKm} KM pending
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-black/80 border border-zinc-850">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {language === 'ne' ? 'बाँकी दूरी' : 'Distance Left'}
              </span>
              <div className="text-base font-black font-mono mt-0.5 text-white">
                {kmRemaining > 0 ? `${kmRemaining.toLocaleString()} KM left` : 'Due now!'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/80 border border-zinc-850">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {language === 'ne' ? 'लक्षित मिति' : 'Target Date'}
              </span>
              <div className="text-base font-black font-mono mt-0.5 text-white">
                {daysUntilService > 0 ? `${daysUntilService}d left` : `${Math.abs(daysUntilService)}d ago`}
              </div>
            </div>
          </div>

          {/* Target KM Increment Pills */}
          <div className="pt-2 border-t border-zinc-900 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px] font-bold">
                {language === 'ne' ? 'लक्षित कि.मी. सार्नुहोस्:' : 'Postpone Target KM:'}
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[200, 500, 1000, 3000].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleStageTargetKm(inc)}
                    className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-slate-200 hover:text-cyan-400 active:scale-95 transition shrink-0"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>

            {/* Postpone Days & Export */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.snoozeReminder}:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[3, 7, 15].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleStageSnooze(d)}
                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-slate-300 border border-zinc-800 active:scale-95 transition"
                  >
                    +{d}d
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => downloadIcsFile({
                    title: `${bike.name} Service Due (${activeNextTargetKm} KM)`,
                    description: `Maintenance reminder for ${bike.name}. Target odometer: ${activeNextTargetKm} KM.`,
                    startDate: formatAdDate(effectiveNextDate),
                    location: 'Workshop'
                  })}
                  className="px-2 py-1 rounded-lg bg-cyan-500/10 text-[11px] font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1 active:scale-95 transition"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Cal</span>
                </button>
              </div>
            </div>

            {/* Explicit Save Bar when pending changes exist: Icon-Only X and Check */}
            {hasPendingServiceDue && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 animate-in fade-in">
                <span className="text-[11px] text-cyan-300 font-bold">
                  {language === 'ne' ? 'परिवर्तन सुरक्षित गर्नुहोस्?' : 'Save staged changes?'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCancelPendingServiceDue}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 active:scale-95 transition"
                    title={language === 'ne' ? 'रद्द' : 'Cancel'}
                    aria-label="Cancel"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitPendingServiceDue}
                    className="p-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20 active:scale-95 transition"
                    title={language === 'ne' ? 'सुरक्षित गर्नुहोस्' : 'Save'}
                    aria-label="Save"
                  >
                    <Save className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 3. LOGGED SERVICES LIST & SEARCH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            {language === 'ne' ? 'मर्मत इतिहास' : 'Maintenance History'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {services.length} {services.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder={language === 'ne' ? 'पार्टपुर्जा, वर्कसप वा विवरण खोज्नुहोस्...' : 'Search parts, workshop, or notes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Pills for Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
            }`}
          >
            {language === 'ne' ? 'सबै' : 'All'}
          </button>
          {categories.map(cat => {
            const isSelected = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {filteredServices.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-xs text-slate-400">
            {language === 'ne' ? 'कुनै मर्मत रेकर्ड भेटिएन।' : 'No matching maintenance records found.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {(showAllHistory ? filteredServices : filteredServices.slice(0, 2)).map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition shadow-md space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {record.workDone}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        {record.serviceCenter || 'Workshop'}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {(record.odometerKm || 0).toLocaleString()} KM
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-white font-mono">
                      Rs. {(record.cost || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatAdDisplayDate(record.serviceDateAD)}
                    </div>
                  </div>
                </div>

                {/* Itemized Sub-Entries List Breakdown with Category Icons */}
                {record.subItems && record.subItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {language === 'ne' ? 'पार्टपुर्जा तथा खर्च विवरण:' : 'Itemized Parts & Costs:'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                      {record.subItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300 pr-1">
                          <span className="truncate flex items-center gap-1.5">
                            <span className="p-0.5 rounded bg-zinc-900 border border-zinc-750" title={item.category || 'Part'}>
                              {getCategoryIcon(item.category || '')}
                            </span>
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="font-mono text-cyan-300 font-bold ml-2">
                            Rs. {item.cost.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receipt Attachment & Record Edit/Delete Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    {record.receiptPhoto ? (
                      <button
                        type="button"
                        onClick={() => setActiveReceiptView({
                          title: `${record.workDone} - Receipt`,
                          imageBase64: record.receiptPhoto!
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-cyan-300 transition active:scale-95 shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t.viewReceipt}</span>
                        <Eye className="w-3 h-3 ml-0.5 opacity-70" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">No receipt</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Record Edit Action */}
                    <button
                      type="button"
                      onClick={() => handleEditService(record)}
                      className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-cyan-400 border border-zinc-800 transition active:scale-95"
                      title={language === 'ne' ? 'सम्पादन' : 'Edit'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Record Delete Action */}
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRecord(record)}
                      className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-400 hover:text-rose-400 border border-zinc-800 transition active:scale-95"
                      title={language === 'ne' ? 'मेटाउनुहोस्' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredServices.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="w-full py-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-cyan-400 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <span>
                  {showAllHistory
                    ? (language === 'ne' ? 'कम देखाउनुहोस्' : 'Show Recent Only')
                    : (language === 'ne' ? `सबै इतिहास हेर्नुहोस् (${filteredServices.length})` : `View All History (${filteredServices.length})`)}
                </span>
                {showAllHistory ? (
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. FULL-SCREEN SLIDE-IN PAGE FOR LOGGING / EDITING MAINTENANCE */}
      {isAddSheetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Top Unified Navigation Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddSheetOpen(false);
                  setEditingServiceId(null);
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
                  {editingServiceId
                    ? (language === 'ne' ? 'मर्मत विवरण सम्पादन' : 'Edit Maintenance')
                    : (language === 'ne' ? 'नयाँ मर्मत दर्ता' : 'Log Maintenance')}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {language === 'ne' ? 'पार्टपुर्जा, वर्ग र प्रत्यक्ष कुल खर्च' : 'Itemized parts, categories & live total'}
                </p>
              </div>
            </div>

            {/* Standardized Primary Action Button: Save Icon + 'Save' Label */}
            <button
              type="button"
              onClick={handleSubmit}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
              title={editingServiceId ? (language === 'ne' ? 'अद्यावधिक' : 'Update') : (language === 'ne' ? 'सेभ' : 'Save')}
              aria-label="Save"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>
                {editingServiceId
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
                onClick={() => setSheetTab('items')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  sheetTab === 'items'
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'पार्टपुर्जा र खर्च' : 'Parts & Live Total'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSheetTab('reminders')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  sheetTab === 'reminders'
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'रिमाइन्डर र रसिद' : 'Reminders & Receipt'}</span>
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
            
            {/* TAB 1: DATE, ODOMETER & MANUAL ITEMIZED SUB-ENTRIES WITH DYNAMIC CATEGORIES */}
            {sheetTab === 'items' && (
              <div className="space-y-3.5 animate-in fade-in">
                
                {/* Nepali BS Date Component with Converted AD preview */}
                <NepaliDatePicker
                  label={language === 'ne' ? 'मर्मत गरिएको मिति' : 'Maintenance Date'}
                  valueAD={serviceDateAD}
                  onChange={(ad) => {
                    setServiceDateAD(ad);
                    setFormError(null);
                  }}
                  required={true}
                  language={language}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {language === 'ne' ? 'हालको ओडोमिटर (KM)' : 'Odometer (KM)'}
                    </label>
                    <input
                      type="number"
                      value={odometerKm}
                      onChange={(e) => {
                        setOdometerKm(Number(e.target.value));
                        setFormError(null);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {t.serviceCenter}
                    </label>
                    <input
                      type="text"
                      value={serviceCenter}
                      onChange={(e) => setServiceCenter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* ITEMIZED SUB-ENTRIES WITH DYNAMIC CATEGORIES & LIVE TOTAL */}
                <div className="p-4 rounded-2xl bg-black/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'ne' ? 'सामान/पार्टपुर्जा (Itemized):' : 'Parts & Services Bought:'}</span>
                    </span>

                    {/* Prominent Live Calculated Total Display */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        {language === 'ne' ? 'प्रत्यक्ष कुल खर्च' : 'Live Total Cost'}
                      </span>
                      <span className="text-base font-black font-mono text-cyan-400">
                        Rs. {calculatedItemsTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Sub-Items Added List */}
                  {subItems.length === 0 ? (
                    <div className="py-4 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-slate-400">
                      {language === 'ne'
                        ? 'हालसम्म कुनै सामान थपिएको छैन। तलबाट नाम, वर्ग र मूल्य लेखेर "+" थिच्नुहोस्।'
                        : 'No items added yet. Enter part name, category and price below then tap "+".'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {subItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="p-1 rounded-lg bg-black border border-zinc-700 shrink-0" title={item.category}>
                              {getCategoryIcon(item.category)}
                            </span>
                            <span className="text-slate-200 font-medium truncate">{item.name}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-cyan-300">
                              Rs. {item.cost.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubItem(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Entry Row with Category Selector & Inline "+" Button */}
                  <div className="space-y-2 pt-2 border-t border-zinc-850">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>{language === 'ne' ? 'पार्टपुर्जा वर्ग छान्नुहोस्:' : 'Select Category:'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setShowNewCatInput(!showNewCatInput)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>{showNewCatInput ? 'Cancel' : '+ New Category'}</span>
                      </button>
                    </div>

                    {showNewCatInput && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-cyan-500/40 animate-in fade-in">
                        <input
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="flex-1 bg-black border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="px-3 py-1 rounded-lg bg-cyan-500 text-black text-xs font-bold shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    {/* Item Name (flex-1 min-w-0) & Price (Rs. w-24) */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubItem();
                          }
                        }}
                      />
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-bold pointer-events-none">Rs.</span>
                        <input
                          type="number"
                          value={newItemCost}
                          onChange={(e) => setNewItemCost(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-right"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubItem();
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSubItem}
                        className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center font-black shrink-0 transition active:scale-95 shadow-md shadow-cyan-500/20"
                        title="Add item"
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    {language === 'ne' ? 'थप विवरण / कैफियत (ऐच्छिक)' : 'Work Summary / Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: REMINDERS & RECEIPT PHOTO */}
            {sheetTab === 'reminders' && (
              <div className="space-y-3.5 animate-in fade-in">
                
                {/* NEXT INTERVAL TARGETS WITH QUICK INCREMENTS */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-200">
                        {t.targetOdometer}
                      </label>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        Quick increments:
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      {[500, 1000, 2000, 3000].map(inc => (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => handleSetTargetKmIncrement(inc)}
                          className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-slate-200 hover:text-cyan-400 active:scale-95 transition"
                        >
                          +{inc}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      value={nextServiceKm}
                      onChange={(e) => setNextServiceKm(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-200">
                        {t.targetDate}
                      </label>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        Quick intervals:
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => handleSetTargetDateIncrement(30)}
                        className="flex-1 py-1 px-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-slate-200 hover:text-cyan-400 active:scale-95 transition"
                      >
                        +1 Mo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTargetDateIncrement(90)}
                        className="flex-1 py-1 px-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 active:scale-95 transition"
                      >
                        +3 Mo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTargetDateIncrement(180)}
                        className="flex-1 py-1 px-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-slate-200 hover:text-cyan-400 active:scale-95 transition"
                      >
                        +6 Mo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTargetDateIncrement(365)}
                        className="flex-1 py-1 px-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-slate-200 hover:text-cyan-400 active:scale-95 transition"
                      >
                        +1 Yr
                      </button>
                    </div>

                    <NepaliDatePicker
                      label={language === 'ne' ? 'लक्षित मिति चयन' : 'Select Target Date'}
                      valueAD={nextServiceDateAD}
                      onChange={(ad) => setNextServiceDateAD(ad)}
                      showQuickPresets={false}
                      language={language}
                    />
                  </div>
                </div>

                {/* REMINDER PRESETS */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'ne' ? 'रिमाइन्डर सक्रिय गर्नुहोस्' : 'Enable Next Service Reminder'}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enableReminder}
                      onChange={(e) => setEnableReminder(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {enableReminder && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
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
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition ${
                            reminderInterval === preset.id
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                              : 'bg-zinc-900 text-slate-400 border-zinc-800'
                          }`}
                        >
                          {language === 'ne' ? preset.ne : preset.en}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DIGITAL RECEIPT ATTACHMENT FIELD */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t.attachReceipt}</span>
                    </label>
                    {receiptPhoto && (
                      <button
                        type="button"
                        onClick={() => setReceiptPhoto(undefined)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.delete}</span>
                      </button>
                    )}
                  </div>

                  {receiptPhoto ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700 max-w-xs group">
                      <img src={receiptPhoto} alt="Receipt preview" className="w-full h-28 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReceiptView({ title: 'Receipt Preview', imageBase64: receiptPhoto })}
                          className="p-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-zinc-700 hover:border-cyan-500/80 rounded-xl cursor-pointer bg-zinc-900/50 hover:bg-zinc-900 transition text-center group">
                      <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
                      <span className="text-xs font-bold text-slate-300">
                        {language === 'ne' ? 'बिल वा रसिद फोटो खिच्नुहोस्' : 'Snap bill or invoice photo'}
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
              </div>
            )}
          </form>
        </div>
      )}

      {/* 5. FULLSCREEN RECEIPT VIEWER */}
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
              alt="Receipt"
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-zinc-800 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION DIALOG */}
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
                  {language === 'ne' ? 'मर्मत रेकर्ड मेटाउने?' : 'Delete Record?'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {confirmDeleteRecord.workDone} ({confirmDeleteRecord.serviceDateAD})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'ne'
                ? 'के तपाईं यो मर्मत रेकर्ड मेटाउन निश्चित हुनुहुन्छ? यो कार्य फिर्ता गर्न सकिँदैन।'
                : 'Are you sure you want to permanently delete this service entry?'}
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
                onClick={executeDeleteService}
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
