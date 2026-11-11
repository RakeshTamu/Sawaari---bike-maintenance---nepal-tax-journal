import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  FileText,
  Calendar,
  Settings as SettingsIcon,
  Plus,
  Bike as BikeIcon,
  ChevronDown,
  Sparkles,
  Lock,
  Globe,
  Upload,
  Download,
  AlertTriangle,
  MapPin,
  LifeBuoy,
  Palette,
  Shield,
  Gauge,
  Check,
  Save,
  Edit2,
  Smartphone,
  WifiOff,
  X
} from 'lucide-react';
import { Bike, ServiceRecord, RenewalRecord, DocumentItem, AppSettings, TaxStatusResult, AppTheme } from './types';
import { db, seedInitialDataIfEmpty } from './db/db';
import { calculateNepalTaxStatus, getEstimatedBaseTax } from './utils/nepalTax';
import { adToBs, getCurrentNepaliDate, formatAdDate, formatAdDisplayDate, formatBsDisplayDate, diffDays } from './utils/nepaliCalendar';
import { translations, Language } from './utils/translations';
import { THEMES } from './utils/theme';
import { ServiceTracker } from './components/ServiceTracker';
import { TaxRenewalSystem } from './components/TaxRenewalSystem';
import { DocumentVault } from './components/DocumentVault';
import { BikeManagementModal } from './components/BikeManagementModal';
import { SettingsModal } from './components/SettingsModal';
import { PinLockModal } from './components/PinLockModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TrafficCheckModal } from './components/TrafficCheckModal';
import { MechanicChecklistModal } from './components/MechanicChecklistModal';
import { EmergencyDirectoryModal } from './components/EmergencyDirectoryModal';
import { HomeWidgetCard } from './components/HomeWidgetCard';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'tax' | 'vault'>('dashboard');

  // Database State
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedBikeId, setSelectedBikeId] = useState<number>(1);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    isPinEnabled: false,
    isBiometricEnabled: false,
    language: 'en',
    theme: 'oled',
    autoLockMinutes: 0
  });

  // Security Lock
  const [isLocked, setIsLocked] = useState(false);

  // Modals & Inline Controls
  const [showBikeManager, setShowBikeManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrafficCheck, setShowTrafficCheck] = useState(false);
  const [showMechanicChecklist, setShowMechanicChecklist] = useState(false);
  const [showEmergencyDirectory, setShowEmergencyDirectory] = useState(false);
  const [showQuickThemePicker, setShowQuickThemePicker] = useState(false);
  const [showWidgetPreview, setShowWidgetPreview] = useState(false);

  // Quick Inline Odometer State & Pending Increment Workflow
  const [isEditingOdoInline, setIsEditingOdoInline] = useState(false);
  const [inlineOdoInput, setInlineOdoInput] = useState<number>(0);
  const [pendingOdoTotal, setPendingOdoTotal] = useState<number | null>(null);

  // Persistent FAB external triggers
  const [maintenanceAddTrigger, setMaintenanceAddTrigger] = useState(0);
  const [taxAddTrigger, setTaxAddTrigger] = useState(0);
  const [vaultAddTrigger, setVaultAddTrigger] = useState(0);
  const [showFabQuickMenu, setShowFabQuickMenu] = useState(false);

  // Load database
  const loadData = async () => {
    try {
      await seedInitialDataIfEmpty().catch(() => {});

      const loadedBikes = await db.bikes.toArray().catch(() => []);
      setBikes(loadedBikes || []);

      // Select primary bike or first
      let currentId = selectedBikeId;
      if (loadedBikes && loadedBikes.length > 0 && !loadedBikes.some(b => b.id === currentId)) {
        const primary = loadedBikes.find(b => b.isPrimary) || loadedBikes[0];
        currentId = primary ? primary.id! : 1;
        setSelectedBikeId(currentId);
      }

      // Load records for selected bike
      const loadedServices = await db.services.where('bikeId').equals(currentId).toArray().catch(() => []);
      setServices(loadedServices || []);

      const loadedRenewals = await db.renewals.where('bikeId').equals(currentId).toArray().catch(() => []);
      setRenewals(loadedRenewals || []);

      const loadedDocs = await db.documents.where('bikeId').equals(currentId).toArray().catch(() => []);
      setDocuments(loadedDocs || []);

      // Settings
      const savedSettings = await db.settings.get('app_settings').catch(() => null);
      if (savedSettings && savedSettings.value) {
        setSettings(savedSettings.value);
        if (savedSettings.value.language) {
          setLanguage(savedSettings.value.language);
        }
        if (savedSettings.value.isPinEnabled && savedSettings.value.pinHash) {
          setIsLocked(true);
        }
      }
    } catch (err) {
      console.error('Database load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBikeId]);

  const activeBike = bikes.find(b => b.id === selectedBikeId) || bikes[0];
  const t = translations[language];
  const todayBs = getCurrentNepaliDate();
  const currentTheme = THEMES[settings.theme || 'oled'] || THEMES.oled;

  // Sync inline odo input when active bike changes
  useEffect(() => {
    if (activeBike) {
      setInlineOdoInput(activeBike.odometerKm || 0);
    }
  }, [activeBike?.id, activeBike?.odometerKm]);

  // Tax calculations
  const sortedRenewals = [...renewals].sort(
    (a, b) => new Date(b.validUntilAD).getTime() - new Date(a.validUntilAD).getTime()
  );
  const latestRenewal = sortedRenewals[0];
  const baseTax = activeBike ? getEstimatedBaseTax(activeBike.cc, activeBike.category) : 6500;
  const taxStatus: TaxStatusResult = latestRenewal
    ? calculateNepalTaxStatus(latestRenewal.validUntilAD, baseTax)
    : {
        status: 'EXPIRED',
        badgeLabel: 'NO DATE SET',
        badgeColor: 'rose',
        daysRemaining: 0,
        daysOverdue: 0,
        daysLeftInGrace: 0,
        fineMultiplierPercent: 0,
        estimatedFineAmount: 0,
        message: language === 'ne' ? 'कुनै कर नवीकरण मिति तोकिएको छैन।' : 'No Blue Book tax renewal recorded yet.',
        reminderAlert: 'none'
      };

  // Next service calculations
  const sortedServices = [...services].sort(
    (a, b) => new Date(b.serviceDateAD).getTime() - new Date(a.serviceDateAD).getTime()
  );
  const latestService = sortedServices[0];
  const nextTargetKm = latestService?.nextServiceKm || ((activeBike?.odometerKm || 0) + 3000);
  const kmRemaining = nextTargetKm - (activeBike?.odometerKm || 0);



  // Quick Inline Odometer Pending Workflow (+100, +500, +1000, +3000)
  const handleQuickAddOdo = (deltaKm: number) => {
    if (!activeBike) return;
    const current = pendingOdoTotal !== null ? pendingOdoTotal : (activeBike.odometerKm || 0);
    setPendingOdoTotal(current + deltaKm);
  };

  const handleCommitPendingOdo = async () => {
    if (!activeBike?.id || pendingOdoTotal === null) return;
    await db.bikes.update(activeBike.id, { odometerKm: pendingOdoTotal });
    setPendingOdoTotal(null);
    loadData();
  };

  const handleCancelPendingOdo = () => {
    setPendingOdoTotal(null);
  };

  const handleSaveInlineOdo = async () => {
    if (!activeBike?.id) return;
    if (inlineOdoInput < 0) return;
    await db.bikes.update(activeBike.id, { odometerKm: Number(inlineOdoInput) });
    setIsEditingOdoInline(false);
    setPendingOdoTotal(null);
    loadData();
  };

  const handleThemeChange = async (newTheme: AppTheme) => {
    const updated = { ...settings, theme: newTheme };
    setSettings(updated);
    await db.settings.put({ key: 'app_settings', value: updated });
    setShowQuickThemePicker(false);
  };

  // Progress Ring Calculation (r = 32)
  const ringCircumference = 2 * Math.PI * 32;
  let ringDashoffset = 0;
  let ringColor = '#10b981'; // Green (Valid)

  if (taxStatus.status === 'VALID') {
    const ratio = Math.max(0, Math.min(1, taxStatus.daysRemaining / 365));
    ringDashoffset = ringCircumference - ratio * ringCircumference;
    ringColor = '#10b981';
  } else if (taxStatus.status === 'GRACE_PERIOD') {
    const ratio = Math.max(0, Math.min(1, taxStatus.daysLeftInGrace / 90));
    ringDashoffset = ringCircumference - ratio * ringCircumference;
    ringColor = '#f59e0b'; // Amber (Grace)
  } else {
    ringDashoffset = 0;
    ringColor = '#ef4444'; // Red (Fined/Overdue)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
          <BikeIcon className="w-9 h-9" />
        </div>
        <div className="text-white font-black text-lg tracking-wide">Sawaari (सवारी)</div>
        <p className="text-xs text-slate-400 mt-1">Loading offline bike journal...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentTheme.bgClass} flex flex-col pb-24 md:pb-8 select-none font-sans transition-colors duration-200`}>
      
      {/* Optional PIN Lock Overlay */}
      {isLocked && settings.pinHash && (
        <PinLockModal
          storedPinHash={settings.pinHash}
          isBiometricEnabled={settings.isBiometricEnabled}
          onUnlocked={() => setIsLocked(false)}
          language={language}
        />
      )}

      {/* Top App Bar */}
      <header className={`sticky top-0 z-30 ${currentTheme.surfaceClass} backdrop-blur-md px-4 py-3 border-b`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Brand Wordmark & Active Bike Selector */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowBikeManager(true)}
              className="flex items-center gap-2.5 group text-left"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition shadow-md"
                style={{
                  backgroundColor: `${currentTheme.primaryColorHex}15`,
                  borderColor: `${currentTheme.primaryColorHex}40`,
                  color: currentTheme.primaryColorHex
                }}
              >
                <BikeIcon className="w-5 h-5" />
              </div>
              <div className="truncate max-w-[140px] sm:max-w-xs">
                <div className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{activeBike ? activeBike.name : 'Sawaari'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition shrink-0" />
                </div>
                <div className="text-[11px] font-mono text-cyan-400 font-bold truncate">
                  {activeBike?.registrationNumber || 'No Plate'}
                </div>
              </div>
            </button>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* PWA Home Screen Widget Launcher */}
            {activeBike && (
              <button
                onClick={() => setShowWidgetPreview(true)}
                title={language === 'ne' ? 'गृह स्क्रिन विजेट' : 'Home Screen Widget'}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-slate-300 hover:text-white transition"
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
              </button>
            )}

            {/* Quick Theme Picker */}
            <button
              onClick={() => setShowQuickThemePicker(true)}
              title={language === 'ne' ? 'थिम बदल्नुहोस्' : 'Change Theme Palette'}
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-slate-300 hover:text-white transition"
            >
              <Palette className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => {
                const nextLang = language === 'en' ? 'ne' : 'en';
                setLanguage(nextLang);
                db.settings.put({
                  key: 'app_settings',
                  value: { ...settings, language: nextLang }
                });
              }}
              title="Toggle Language (English / नेपाली)"
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-black text-cyan-400 transition"
            >
              {language === 'en' ? 'नेपाली' : 'EN'}
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettings(true)}
              title="Settings & Privacy"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-slate-300 hover:text-white transition"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Desktop Navigation Tabs (Clean 4 Tabs) */}
        <nav className="hidden md:flex items-center gap-1.5 p-1.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-md">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-zinc-800 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t.dashboard}</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'services'
                ? 'bg-zinc-800 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{t.services}</span>
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'tax'
                ? 'bg-zinc-800 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.taxRenewal}</span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'vault'
                ? 'bg-zinc-800 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.vault}</span>
          </button>
        </nav>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && activeBike && (
          <div className="space-y-5 animate-in fade-in">
            
            {/* 1. Legal & Police Peace-of-Mind Banner (Minimalist Glow + Info Tooltip) */}
            <div className={`p-3.5 sm:p-4 rounded-3xl border shadow-xl flex items-center justify-between gap-3 ${
              taxStatus.status === 'VALID'
                ? 'bg-gradient-to-r from-emerald-950/60 via-zinc-950 to-zinc-950 border-emerald-500/30 text-emerald-300'
                : taxStatus.status === 'GRACE_PERIOD'
                ? 'bg-gradient-to-r from-amber-950/60 via-zinc-950 to-zinc-950 border-amber-500/30 text-amber-300'
                : 'bg-gradient-to-r from-rose-950/60 via-zinc-950 to-zinc-950 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  taxStatus.status === 'VALID'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : taxStatus.status === 'GRACE_PERIOD'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/20'
                }`}>
                  {taxStatus.status === 'VALID' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : taxStatus.status === 'GRACE_PERIOD' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <AlertOctagon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <span>
                      {taxStatus.status === 'VALID'
                        ? (language === 'ne' ? 'कर वैध' : 'Tax Valid')
                        : taxStatus.status === 'GRACE_PERIOD'
                        ? (language === 'ne' ? '९०-दिने ग्रेस' : '90-Day Grace')
                        : (language === 'ne' ? 'कर म्याद नाघेको' : 'Tax Overdue')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">
                      · {latestRenewal ? formatBsDisplayDate(latestRenewal.validUntilAD, language) : ''} BS
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80 font-medium mt-0.5">
                    {taxStatus.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTrafficCheck(true)}
                className="shrink-0 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs transition active:scale-95 flex items-center gap-1.5 shadow-sm"
                title={language === 'ne' ? 'ट्राफिक चेकिङ कार्ड' : 'Spot Check Card'}
              >
                <span>🚨</span>
                <span className="text-[11px] font-bold hidden sm:inline">{language === 'ne' ? 'चेकिङ कार्ड' : 'Spot Card'}</span>
              </button>
            </div>

            {/* 2. Primary Bike Hero Card with Visual Progress Ring & Quick Odometer */}
            <div className={`rounded-3xl ${currentTheme.surfaceClass} border p-5 sm:p-6 space-y-5 shadow-2xl`}>
              
              {/* Header with Visual Ring Avatar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Progress Ring around Bike Image */}
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        className="text-zinc-800"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke={ringColor}
                        strokeWidth="6"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    <div className="absolute inset-0 m-2 rounded-full overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                      {activeBike.photoUrl ? (
                        <img src={activeBike.photoUrl} alt={activeBike.name} className="w-full h-full object-cover" />
                      ) : (
                        <BikeIcon className="w-8 h-8 text-cyan-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {activeBike.name}
                      </h2>
                      <span className="text-xs text-slate-400 font-mono font-bold">
                        {activeBike.cc}cc
                      </span>
                    </div>

                    {/* Nepal License Plate Styling or Physical Plate Photo */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {activeBike.platePhotoUrl && activeBike.showPlateAsPhoto ? (
                        <div className="relative rounded-lg overflow-hidden border-2 border-amber-400/90 bg-black h-9 px-1 flex items-center shadow-sm">
                          <img src={activeBike.platePhotoUrl} alt="License Plate" className="h-7 w-auto object-contain" />
                        </div>
                      ) : (
                        <div className="inline-block px-3 py-1 rounded-lg bg-black border-2 border-amber-400/90 font-mono text-xs font-black text-amber-300 shadow-sm tracking-wide">
                          🇳🇵 {activeBike.registrationNumber}
                        </div>
                      )}

                      {/* Clean toggle button if plate photo is uploaded */}
                      {activeBike.platePhotoUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            const newMode = !activeBike.showPlateAsPhoto;
                            await db.bikes.update(activeBike.id!, { showPlateAsPhoto: newMode });
                            loadData();
                          }}
                          className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-cyan-400 transition"
                          title={language === 'ne' ? 'फोटो वा अक्षर बदल्नुहोस्' : 'Toggle Plate Text / Photo'}
                        >
                          {activeBike.showPlateAsPhoto ? (language === 'ne' ? 'अक्षर' : 'Text') : (language === 'ne' ? 'फोटो' : 'Photo')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge: Glowing Icon + Subtle Info */}
                <div
                  onClick={() => setActiveTab('tax')}
                  className={`cursor-pointer self-start sm:self-center px-3.5 py-1.5 rounded-2xl border text-xs font-black tracking-wider uppercase transition hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 ${
                    taxStatus.status === 'VALID'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                      : taxStatus.status === 'GRACE_PERIOD'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                      : 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-rose-500/10'
                  }`}
                  title={language === 'ne' ? 'कर तथा नवीकरण विवरण हेर्नुहोस्' : 'View tax renewal details'}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: ringColor }}
                  />
                  <span>
                    {taxStatus.status === 'VALID'
                      ? (language === 'ne' ? 'कर वैध' : 'Tax Valid')
                      : taxStatus.status === 'GRACE_PERIOD'
                      ? (language === 'ne' ? '९०-दिने ग्रेस' : '90-Day Grace')
                      : (language === 'ne' ? 'कर म्याद नाघेको' : 'Tax Overdue')}
                  </span>
                </div>
              </div>

              {/* Quick Odometer Inline Updater Bar (+100, +500, +1000, +3000 KM) */}
              <div className="p-4 rounded-2xl bg-black/80 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {language === 'ne' ? 'ओडोमिटर छिटो अपडेट' : 'Quick Odometer Updater'}
                    </span>
                  </div>

                  {/* Icon-Only Manual Entry / Cancel Button */}
                  <button
                    onClick={() => setIsEditingOdoInline(!isEditingOdoInline)}
                    className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-800 transition active:scale-95"
                    title={isEditingOdoInline ? (language === 'ne' ? 'रद्द' : 'Cancel') : (language === 'ne' ? 'म्यानुअल इन्ट्री' : 'Manual Entry')}
                    aria-label={isEditingOdoInline ? 'Cancel' : 'Manual Entry'}
                  >
                    {isEditingOdoInline ? (
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Edit2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {isEditingOdoInline ? (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <input
                      type="number"
                      value={inlineOdoInput}
                      onChange={(e) => setInlineOdoInput(Number(e.target.value))}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                    {/* Icon-Only Save KM button */}
                    <button
                      onClick={handleSaveInlineOdo}
                      className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black transition active:scale-95 shadow-md shadow-cyan-500/20"
                      title={language === 'ne' ? 'कि.मी. सेभ' : 'Save KM'}
                      aria-label="Save KM"
                    >
                      <Save className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-2xl font-black text-white font-mono tracking-tight">
                          {pendingOdoTotal !== null
                            ? pendingOdoTotal.toLocaleString()
                            : activeBike.odometerKm?.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-400 font-sans">KM</span>
                        </div>
                        {pendingOdoTotal !== null && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300 animate-pulse">
                            +{pendingOdoTotal - (activeBike.odometerKm || 0)} KM {language === 'ne' ? 'बाँकी' : 'pending'}
                          </span>
                        )}
                      </div>

                      {/* Single-tap inline adjustment buttons (+100, +500, +1000, +3000) as clean horizontal scroll strip */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <span className="text-[10px] text-slate-400 mr-1 shrink-0 font-bold">
                          {language === 'ne' ? 'कि.मी.:' : 'Add KM:'}
                        </span>
                        {[100, 500, 1000, 3000].map(delta => (
                          <button
                            key={delta}
                            onClick={() => handleQuickAddOdo(delta)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono font-bold text-slate-200 transition active:scale-95 shrink-0"
                          >
                            +{delta}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Staged Pending Commit Bar: Icon-Only Cancel & Save Actions */}
                    {pendingOdoTotal !== null && (
                      <div className="flex items-center justify-between gap-2 pt-1 p-2 rounded-xl bg-zinc-900/90 border border-cyan-500/30 animate-in fade-in slide-in-from-top-1">
                        <span className="text-xs text-slate-300 font-medium">
                          {language === 'ne' ? 'नयाँ ओडोमिटर पुष्टि गर्नुहोस्:' : 'Confirm new odometer reading:'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleCancelPendingOdo}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-white transition active:scale-95"
                            title={language === 'ne' ? 'रद्द' : 'Cancel'}
                            aria-label="Cancel"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCommitPendingOdo}
                            className="p-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition active:scale-95 shadow-md shadow-cyan-500/20"
                            title={language === 'ne' ? 'सुरक्षित गर्नुहोस्' : 'Save'}
                            aria-label="Save"
                          >
                            <Save className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Key Expiry & Service Metrics Row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                
                {/* Tax Expiry Date Card */}
                <div
                  onClick={() => setActiveTab('tax')}
                  className="p-3.5 rounded-2xl bg-black/80 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition"
                >
                  <span className="text-[11px] text-slate-400 font-bold uppercase">
                    {language === 'ne' ? 'कर म्याद' : 'Blue Book Expiry'}
                  </span>
                  <div className="text-sm font-black text-white font-mono mt-1 truncate">
                    {latestRenewal ? formatBsDisplayDate(latestRenewal.validUntilAD, language) : 'Not Set'} BS
                  </div>
                  <div className="text-[11px] mt-0.5 font-bold">
                    {taxStatus.status === 'VALID' ? (
                      <span className="text-emerald-400 font-mono">
                        {taxStatus.daysRemaining} {language === 'ne' ? 'दिन बाँकी' : 'days left'}
                      </span>
                    ) : taxStatus.status === 'GRACE_PERIOD' ? (
                      <span className="text-amber-400 font-mono">
                        {taxStatus.daysLeftInGrace} {language === 'ne' ? 'दिन ग्रेस बाँकी' : 'days grace left'}
                      </span>
                    ) : (
                      <span className="text-rose-400 font-mono">
                        {taxStatus.daysOverdue} {language === 'ne' ? 'दिन म्याद नाघेको' : 'days overdue'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Next Service Due Card (CONDITIONAL: only if services exist) */}
                {services.length > 0 ? (
                  <div
                    onClick={() => setActiveTab('services')}
                    className="p-3.5 rounded-2xl bg-black/80 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition"
                  >
                    <span className="text-[11px] text-slate-400 font-bold uppercase">
                      {language === 'ne' ? 'अर्को सर्भिस' : 'Next Service'}
                    </span>
                    <div className="text-sm font-black text-white font-mono mt-1">
                      {nextTargetKm.toLocaleString()} KM
                    </div>
                    <div className="text-[11px] font-bold mt-0.5">
                      {kmRemaining > 0 ? (
                        <span className="text-cyan-400 font-mono">
                          {kmRemaining.toLocaleString()} {language === 'ne' ? 'कि.मी. बाँकी' : 'KM left'}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-mono">
                          {language === 'ne' ? 'अहिले नै आवश्यक!' : 'Due Now!'}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveTab('services')}
                    className="p-3.5 rounded-2xl bg-black/80 border border-zinc-800/80 cursor-pointer hover:border-cyan-500/50 transition group"
                  >
                    <span className="text-[11px] text-slate-400 font-bold uppercase">
                      {language === 'ne' ? 'सर्भिस स्थिति' : 'Service Status'}
                    </span>
                    <div className="text-xs font-bold text-cyan-400 mt-1 flex items-center gap-1">
                      <span>{language === 'ne' ? 'सर्भिस दर्ता छैन' : 'No Records Yet'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 group-hover:text-cyan-300 transition">
                      {language === 'ne' ? 'दर्ता गर्न थिच्नुहोस्' : 'Tap to log first service'}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Compact Nepal Emergency Hotlines Card (Icon-First & Directory Trigger) */}
            <div className={`p-4 rounded-3xl ${currentTheme.surfaceClass} border space-y-3 shadow-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      {t.emergencyHotlines}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {language === 'ne' ? '२४/७ तत्काल फोन डायल गर्नुहोस्' : 'Direct 24/7 hotline dialers'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowEmergencyDirectory(true)}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-400 hover:text-white text-[11px] font-bold transition active:scale-95 shrink-0"
                >
                  {language === 'ne' ? 'सबै हेर्नुहोस्' : 'View All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {/* 103 Traffic Police */}
                <a
                  href="tel:103"
                  className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition group flex items-center justify-between active:scale-[0.98]"
                  title={language === 'ne' ? 'काठमाडौं ट्राफिक प्रहरी (१०३)' : 'Traffic Police (103)'}
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider truncate">
                      {language === 'ne' ? 'ट्राफिक' : 'Traffic'}
                    </div>
                    <div className="text-base font-black font-mono text-white group-hover:text-cyan-300">103</div>
                  </div>
                  <span className="text-xl shrink-0 group-hover:scale-110 transition">🚨</span>
                </a>

                {/* 102 Ambulance */}
                <a
                  href="tel:102"
                  className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition group flex items-center justify-between active:scale-[0.98]"
                  title={language === 'ne' ? 'नेपाल एम्बुलेन्स सेवा (१०२)' : 'Ambulance (102)'}
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider truncate">
                      {language === 'ne' ? 'एम्बुलेन्स' : 'Ambulance'}
                    </div>
                    <div className="text-base font-black font-mono text-white group-hover:text-rose-300">102</div>
                  </div>
                  <span className="text-xl shrink-0 group-hover:scale-110 transition">🚑</span>
                </a>

                {/* 100 Police Control */}
                <a
                  href="tel:100"
                  className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition group flex items-center justify-between active:scale-[0.98]"
                  title={language === 'ne' ? 'प्रहरी कन्ट्रोल (१००)' : 'Police Emergency (100)'}
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate">
                      {language === 'ne' ? 'प्रहरी' : 'Police'}
                    </div>
                    <div className="text-base font-black font-mono text-white group-hover:text-blue-300">100</div>
                  </div>
                  <span className="text-xl shrink-0 group-hover:scale-110 transition">👮</span>
                </a>

                {/* 1144 Breakdown / Towing */}
                <a
                  href="tel:1144"
                  className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition group flex items-center justify-between active:scale-[0.98]"
                  title={language === 'ne' ? 'सवारी उद्धार (११४४)' : 'Highway Towing (1144)'}
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
                      {language === 'ne' ? 'उद्धार' : 'Towing'}
                    </div>
                    <div className="text-base font-black font-mono text-white group-hover:text-amber-300">1144</div>
                  </div>
                  <span className="text-xl shrink-0 group-hover:scale-110 transition">🛠️</span>
                </a>
              </div>
            </div>

            {/* 4. Nepal Tax Grace Period Timeline */}
            <div className={`p-5 rounded-3xl ${currentTheme.surfaceClass} border space-y-3 shadow-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇳🇵</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {language === 'ne' ? 'नेपाल सवारी कर तथा ९०-दिने ग्रेस अवधि' : 'Nepal Tax & 90-Day Grace Timeline'}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('tax')}
                  className="text-[11px] text-cyan-400 font-bold hover:underline"
                >
                  {language === 'ne' ? 'विस्तृत' : 'Details'}
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <div className="h-3 w-full rounded-full bg-black overflow-hidden flex p-0.5 gap-1 border border-zinc-800">
                  <div
                    className={`h-full rounded-l-full transition-all ${
                      taxStatus.status === 'VALID' ? 'bg-emerald-500 flex-1' : 'bg-emerald-950 w-1/3'
                    }`}
                  />
                  <div
                    className={`h-full transition-all ${
                      taxStatus.status === 'GRACE_PERIOD' ? 'bg-amber-500 flex-1' : 'bg-amber-950 w-1/3'
                    }`}
                  />
                  <div
                    className={`h-full rounded-r-full transition-all ${
                      taxStatus.status === 'FINED' ? 'bg-rose-500 flex-1' : 'bg-rose-950 w-1/3'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <span className="text-emerald-400">🟢 Tax Valid</span>
                  <span className="text-amber-400">🟠 90-Day Grace (0% Fine)</span>
                  <span className="text-rose-400">🔴 Overdue (5%–100%)</span>
                </div>
              </div>
            </div>



          </div>
        )}

        {/* TAB 2: SERVICES */}
        {activeTab === 'services' && activeBike && (
          <div className="animate-in fade-in">
            <ServiceTracker
              bike={activeBike}
              services={services}
              onRefresh={loadData}
              language={language}
              openAddTrigger={maintenanceAddTrigger}
            />
          </div>
        )}

        {/* TAB 3: TAX & BLUE BOOK RENEWAL */}
        {activeTab === 'tax' && activeBike && (
          <div className="animate-in fade-in">
            <TaxRenewalSystem
              bike={activeBike}
              renewals={renewals}
              onRefresh={loadData}
              language={language}
              onOpenVault={() => setActiveTab('vault')}
              openAddTrigger={taxAddTrigger}
            />
          </div>
        )}

        {/* TAB 4: GLOVEBOX (BIKE & DRIVER DOCUMENTS) */}
        {activeTab === 'vault' && activeBike && (
          <div className="animate-in fade-in">
            <DocumentVault
              bikeId={activeBike.id!}
              documents={documents}
              onRefresh={loadData}
              language={language}
              openAddTrigger={vaultAddTrigger}
            />
          </div>
        )}

        {/* Empty State when no vehicle is registered */}
        {!activeBike && (
          <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/80 border border-zinc-800 text-center space-y-4 my-6 shadow-2xl animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
              <BikeIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {language === 'ne' ? 'कुनै सवारी दर्ता गरिएको छैन' : 'No Vehicle Registered Yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {language === 'ne'
                  ? 'सवारी मर्मत तथा कर नवीकरण सुरु गर्न आफ्नो बाइक वा स्कुटर दर्ता गर्नुहोस्।'
                  : 'Register your motorcycle or scooter to start tracking maintenance and Blue Book renewals.'}
              </p>
            </div>
            <button
              onClick={() => setShowBikeManager(true)}
              className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ne' ? 'नयाँ सवारी थप्नुहोस्' : 'Register Vehicle Now'}</span>
            </button>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar (4 Primary Tabs) */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${currentTheme.surfaceClass} backdrop-blur-xl border-t px-2 py-1`}>
        <div className="grid grid-cols-4 items-center max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'dashboard' ? currentTheme.accentTextClass : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 truncate">{t.dashboard}</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'services' ? currentTheme.accentTextClass : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 truncate">{language === 'ne' ? 'मर्मत' : 'Maintenance'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tax')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'tax' ? currentTheme.accentTextClass : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 truncate">{language === 'ne' ? 'कर' : 'Tax'}</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'vault' ? currentTheme.accentTextClass : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 truncate">{language === 'ne' ? 'कागजात' : 'Documents'}</span>
          </button>
        </div>
      </nav>

      {/* Persistent Floating Action Button (FAB) - Strictly on Secondary Tabs (Maintenance, Tax, Documents) */}
      {activeBike && activeTab !== 'dashboard' && (
        <div className="fixed bottom-20 md:bottom-8 right-5 z-40 flex flex-col items-end">
          <button
            onClick={() => {
              if (activeTab === 'services') {
                setMaintenanceAddTrigger(prev => prev + 1);
              } else if (activeTab === 'tax') {
                setTaxAddTrigger(prev => prev + 1);
              } else if (activeTab === 'vault') {
                setVaultAddTrigger(prev => prev + 1);
              }
            }}
            className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-2xl shadow-cyan-500/40 border-2 border-cyan-300/40 active:scale-90 transition-all cursor-pointer group z-40"
            title={language === 'ne' ? 'छिटो दर्ता (+)' : 'Quick Add (+)'}
            aria-label="Add entry"
          >
            <Plus className="w-7 h-7 stroke-[2.7] group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* Quick Theme Switcher - Full-Screen Slide-In Page */}
      {showQuickThemePicker && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
          <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowQuickThemePicker(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
                aria-label="Back"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    {language === 'ne' ? 'आकर्षक थिम छान्नुहोस्' : 'Select Visual Theme'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ne' ? 'रंग तथा डिस्प्ले शैली बदल्नुहोस्' : 'Customize palette and contrast profile'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-md w-full mx-auto space-y-3">
            {(Object.keys(THEMES) as AppTheme[]).map(tKey => {
              const th = THEMES[tKey];
              const isSelected = (settings.theme || 'oled') === tKey;
              return (
                <button
                  key={tKey}
                  onClick={() => handleThemeChange(tKey)}
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-zinc-900 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full border border-white/20 shadow-md shrink-0"
                      style={{ backgroundColor: th.previewColor }}
                    />
                    <div>
                      <div className="text-sm font-bold text-white">
                        {language === 'ne' ? th.nameNe : th.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {th.badge} Mode
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs text-cyan-400 font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PWA Home Screen Widget Preview - Full-Screen Slide-In Page */}
      {showWidgetPreview && activeBike && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
          <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowWidgetPreview(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
                aria-label="Back"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    {language === 'ne' ? 'गृह स्क्रिन / लक स्क्रिन विजेट' : 'Home / Lock Screen Widget'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ne' ? 'हाम्रो पात्रो शैलीमा सवारी स्थिति' : 'Hamro Patro Style at-a-glance card'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-md w-full mx-auto space-y-4">
            <HomeWidgetCard
              bike={activeBike}
              taxStatus={taxStatus}
              latestRenewal={latestRenewal}
              latestService={latestService}
              language={language}
              onClose={() => setShowWidgetPreview(false)}
            />
          </div>
        </div>
      )}

      {/* Traffic Check Modal */}
      {activeBike && (
        <TrafficCheckModal
          isOpen={showTrafficCheck}
          onClose={() => setShowTrafficCheck(false)}
          bike={activeBike}
          taxStatus={taxStatus}
          latestRenewal={latestRenewal}
          documents={documents}
          language={language}
        />
      )}

      {/* Mechanic Checklist Modal */}
      {activeBike && (
        <MechanicChecklistModal
          isOpen={showMechanicChecklist}
          onClose={() => setShowMechanicChecklist(false)}
          bike={activeBike}
          language={language}
        />
      )}

      {/* Emergency Directory Modal */}
      <EmergencyDirectoryModal
        isOpen={showEmergencyDirectory}
        onClose={() => setShowEmergencyDirectory(false)}
        language={language}
      />

      {/* Bike Management Modal */}
      <BikeManagementModal
        isOpen={showBikeManager}
        onClose={() => setShowBikeManager(false)}
        bikes={bikes}
        selectedBikeId={selectedBikeId}
        onSelectBike={(id) => setSelectedBikeId(id)}
        onRefresh={loadData}
        language={language}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsUpdate={(newSettings) => setSettings(newSettings)}
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          setSettings(prev => ({ ...prev, language: lang }));
        }}
        onRefreshAll={loadData}
      />

    </div>
  );
}
