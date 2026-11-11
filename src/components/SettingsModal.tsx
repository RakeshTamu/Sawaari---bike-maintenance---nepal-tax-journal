import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Lock,
  KeyRound,
  Fingerprint,
  Download,
  Upload,
  Globe,
  FileCode,
  ShieldCheck,
  Smartphone,
  Check,
  Save,
  AlertCircle,
  Palette,
  Trash2,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  Plus,
  Edit2,
  ArrowLeft
} from 'lucide-react';
import { AppSettings, AppTheme } from '../types';
import { db } from '../db/db';
import { hashPin, isBiometricAvailable, authenticateWithBiometrics } from '../utils/security';
import { exportJsonBackup, importJsonBackup, exportStandaloneHtmlFile } from '../utils/exportImport';
import { THEMES } from '../utils/theme';
import { PWAInstallButton } from './PWAInstallButton';
import { INITIAL_DEFAULT_CATEGORIES } from './ServiceTracker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsUpdate: (newSettings: AppSettings) => void;
  language: 'en' | 'ne';
  onLanguageChange: (lang: 'en' | 'ne') => void;
  onRefreshAll: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdate,
  language,
  onLanguageChange,
  onRefreshAll
}) => {
  // CRITICAL: All React hooks declared unconditionally at the very top of the functional component
  const [activeTab, setActiveTab] = useState<'security' | 'categories' | 'display' | 'backup'>('security');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [categories, setCategories] = useState<string[]>(INITIAL_DEFAULT_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ original: string; current: string } | null>(null);

  const bioAvailable = isBiometricAvailable();

  // Load categories from IndexedDB
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const stored = await db.settings.get('maintenance_categories');
        if (stored && Array.isArray(stored.value) && stored.value.length > 0) {
          setCategories(stored.value);
        } else {
          setCategories(INITIAL_DEFAULT_CATEGORIES);
        }
      } catch (err) {
        setCategories(INITIAL_DEFAULT_CATEGORIES);
      }
    };
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Guard condition strictly after hook declarations
  if (!isOpen) return null;

  const handleSavePin = async () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinError(language === 'ne' ? 'पिन ठ्याक्कै ४ अंकको हुनुपर्छ।' : 'PIN must be exactly 4 digits.');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError(language === 'ne' ? 'पिन मिलेन।' : 'PINs do not match.');
      return;
    }

    const hash = await hashPin(pinInput);
    const updated: AppSettings = {
      ...settings,
      isPinEnabled: true,
      pinHash: hash
    };
    await db.settings.put({ key: 'app_settings', value: updated });
    onSettingsUpdate(updated);
    setIsSettingPin(false);
    setPinInput('');
    setPinConfirm('');
    setPinError('');
    setSuccessMsg(language === 'ne' ? 'पिन सफलतापूर्वक सेट भयो!' : 'PIN successfully activated!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDisablePin = async () => {
    const updated: AppSettings = {
      ...settings,
      isPinEnabled: false,
      pinHash: undefined,
      isBiometricEnabled: false
    };
    await db.settings.put({ key: 'app_settings', value: updated });
    onSettingsUpdate(updated);
    setSuccessMsg(language === 'ne' ? 'पिन लक हटाइयो।' : 'PIN Lock disabled.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleBio = async () => {
    if (!settings.isBiometricEnabled) {
      if (bioAvailable) {
        try {
          const success = await authenticateWithBiometrics();
          const updated: AppSettings = { ...settings, isBiometricEnabled: true };
          await db.settings.put({ key: 'app_settings', value: updated });
          onSettingsUpdate(updated);
          setSuccessMsg(
            language === 'ne'
              ? 'बायोमेट्रिक प्रमाणीकरण सक्रिय भयो!'
              : success
              ? 'Biometric verified & enabled!'
              : 'Biometric unlock enabled!'
          );
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (_) {
          const updated: AppSettings = { ...settings, isBiometricEnabled: true };
          await db.settings.put({ key: 'app_settings', value: updated });
          onSettingsUpdate(updated);
        }
      } else {
        setPinError(
          language === 'ne'
            ? 'यस डिभाइसमा बायोमेट्रिक उपलब्ध छैन।'
            : 'Biometric sensor (Touch ID / Face ID / Fingerprint) not detected.'
        );
        setTimeout(() => setPinError(''), 4000);
      }
    } else {
      const updated: AppSettings = { ...settings, isBiometricEnabled: false };
      await db.settings.put({ key: 'app_settings', value: updated });
      onSettingsUpdate(updated);
      setSuccessMsg(language === 'ne' ? 'बायोमेट्रिक प्रमाणीकरण बन्द गरियो।' : 'Biometric unlock disabled.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleAutoLockChange = async (minutes: number) => {
    const updated: AppSettings = { ...settings, autoLockMinutes: minutes };
    await db.settings.put({ key: 'app_settings', value: updated });
    onSettingsUpdate(updated);
  };

  // Add custom category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const trimmed = newCategoryName.trim();
    if (categories.includes(trimmed)) {
      setPinError(language === 'ne' ? 'यो वर्ग पहिल्यै छ।' : 'Category already exists.');
      setTimeout(() => setPinError(''), 3000);
      return;
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategoryName('');
    await db.settings.put({
      key: 'maintenance_categories',
      value: updated
    });
    setSuccessMsg(language === 'ne' ? 'नयाँ वर्ग थपियो!' : 'New category created!');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Update existing category
  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.current.trim()) return;
    const newName = editingCategory.current.trim();
    const updated = categories.map(c => (c === editingCategory.original ? newName : c));
    setCategories(updated);
    setEditingCategory(null);
    await db.settings.put({
      key: 'maintenance_categories',
      value: updated
    });
    setSuccessMsg(language === 'ne' ? 'वर्ग सम्पादन भयो!' : 'Category updated!');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Delete custom category
  const handleDeleteCategory = async (catName: string) => {
    const updated = categories.filter(c => c !== catName);
    setCategories(updated);
    await db.settings.put({
      key: 'maintenance_categories',
      value: updated
    });
    setSuccessMsg(language === 'ne' ? 'वर्ग हटाइयो।' : 'Category removed.');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleResetCategoriesToDefault = async () => {
    setCategories(INITIAL_DEFAULT_CATEGORIES);
    await db.settings.put({
      key: 'maintenance_categories',
      value: INITIAL_DEFAULT_CATEGORIES
    });
    setSuccessMsg(language === 'ne' ? 'पूर्वनिर्धारित वर्गहरू रिसेट गरियो।' : 'Reset to default categories.');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importJsonBackup(file);
    if (res.success) {
      setSuccessMsg(res.message);
      onRefreshAll();
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setPinError(res.message);
      setTimeout(() => setPinError(''), 4000);
    }
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      await db.bikes.clear();
      await db.services.clear();
      await db.renewals.clear();
      await db.expenses.clear();
      await db.documents.clear();
      try {
        if (db.components) await db.components.clear();
      } catch (_) {}
      setShowResetConfirm(false);
      setSuccessMsg(language === 'ne' ? 'सबै डेटा सफलतापूर्वक हटाइयो।' : 'All data wiped successfully.');
      onRefreshAll();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setPinError('Failed to reset: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

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
          <div>
            <h2 className="text-sm sm:text-base font-black text-white">
              {language === 'ne' ? 'सेटिङहरू' : 'Settings'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {language === 'ne' ? 'सुरक्षा, वर्ग व्यवस्थापन र ब्याकअप' : 'Security, categories & offline backup'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-4">

        {/* Compact Internal Tabs (Cashew-Style) */}
        <div className="flex items-center p-1 my-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'सुरक्षा' : 'Security'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'पार्टपुर्जा वर्ग' : 'Categories'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 ${
              activeTab === 'display'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'थिम' : 'Theme'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'ब्याकअप' : 'Backup'}</span>
          </button>
        </div>

        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="p-3 mb-2 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}
        {pinError && (
          <div className="p-3 mb-2 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{pinError}</span>
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* TAB 1: SECURITY & BIOMETRIC AUTHENTICATION */}
          {activeTab === 'security' && (
            <div className="space-y-3.5 animate-in fade-in">
              
              {/* Biometric Unlock Option */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {language === 'ne' ? 'बायोमेट्रिक अनलक (फिंगरप्रिन्ट / फेस आइडी)' : 'Biometric Authentication'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {bioAvailable
                          ? language === 'ne'
                            ? 'तपाईंको डिभाइसको फिंगरप्रिन्ट वा फेस आइडी तयार छ'
                            : 'Touch ID, Face ID or Fingerprint sensor ready'
                          : language === 'ne'
                          ? 'ब्राउजरमा बायोमेट्रिक उपलब्ध छ'
                          : 'Web Authentication API supported'}
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isBiometricEnabled}
                      onChange={handleToggleBio}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {settings.isBiometricEnabled && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>
                      {language === 'ne'
                        ? 'बायोमेट्रिक सक्रिय छ: एप खोल्दा फिंगरप्रिन्ट वा फेस मागिनेछ।'
                        : 'Biometric active: Instant biometric prompt on app startup.'}
                    </span>
                  </div>
                )}
              </div>

              {/* PIN Code Setup */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {language === 'ne' ? '४-अंकको सुरक्षा पिन' : '4-Digit App PIN Lock'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {settings.isPinEnabled
                          ? (language === 'ne' ? 'पिन लक सक्रिय छ' : 'PIN Protection is ACTIVE')
                          : (language === 'ne' ? 'पिन निष्क्रिय छ' : 'No PIN configured')}
                      </span>
                    </div>
                  </div>

                  {settings.isPinEnabled ? (
                    <button
                      onClick={handleDisablePin}
                      className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition active:scale-95"
                    >
                      {language === 'ne' ? 'निष्क्रिय' : 'Disable'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSettingPin(!isSettingPin)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition active:scale-95 shadow-md"
                    >
                      {isSettingPin ? (language === 'ne' ? 'बन्द' : 'Close') : (language === 'ne' ? 'सेट गर्नुहोस्' : 'Set PIN')}
                    </button>
                  )}
                </div>

                {isSettingPin && !settings.isPinEnabled && (
                  <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {language === 'ne' ? '४-अंकको पिन' : 'New 4-digit PIN'}
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="••••"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {language === 'ne' ? 'पिन पुष्टि गर्नुहोस्' : 'Confirm PIN'}
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="••••"
                          value={pinConfirm}
                          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSettingPin(false)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-slate-300"
                      >
                        {language === 'ne' ? 'रद्द' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePin}
                        className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{language === 'ne' ? 'पिन सेभ गर्नुहोस्' : 'Activate PIN'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-Lock Interval */}
              {settings.isPinEnabled && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'ne' ? 'स्वतः लक हुने समय:' : 'Auto-Lock Timeout:'}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 5, 15].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleAutoLockChange(mins)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                            (settings.autoLockMinutes ?? 5) === mins
                              ? 'bg-cyan-500 text-black border-cyan-400'
                              : 'bg-zinc-800 text-slate-400 border-zinc-700 hover:text-white'
                          }`}
                        >
                          {mins === 0 ? (language === 'ne' ? 'तुरुन्त' : 'Now') : `${mins}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CASHEW-STYLE DYNAMIC CATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-3.5 animate-in fade-in">
              
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {language === 'ne' ? 'मर्मत तथा पार्टपुर्जा वर्गहरू' : 'Maintenance Categories'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {language === 'ne' ? 'नयाँ वर्ग थप्नुहोस्, सम्पादन वा हटाउनुहोस्' : 'Create, edit or delete dynamic categories'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetCategoriesToDefault}
                    className="text-[10px] text-slate-400 hover:text-cyan-400 transition"
                    title="Reset to defaults"
                  >
                    Reset Defaults
                  </button>
                </div>

                {/* Add New Category Row */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <input
                    type="text"
                    placeholder="New category (e.g. Tyres, Battery, Chain)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-black border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1 active:scale-95 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Categories List */}
                <div className="space-y-1.5 pt-1 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isDefault = INITIAL_DEFAULT_CATEGORIES.includes(cat);
                    const isEditing = editingCategory?.original === cat;

                    if (isEditing) {
                      return (
                        <div key={cat} className="flex items-center gap-2 p-2 rounded-xl bg-zinc-850 border border-cyan-500/60">
                          <input
                            type="text"
                            value={editingCategory.current}
                            onChange={(e) => setEditingCategory({ ...editingCategory, current: e.target.value })}
                            className="flex-1 bg-black rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleUpdateCategory}
                            className="p-1.5 rounded-lg bg-cyan-500 text-black text-xs font-bold"
                            title={language === 'ne' ? 'सुरक्षित गर्नुहोस्' : 'Save'}
                            aria-label="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-white font-medium">{cat}</span>
                          {isDefault && (
                            <span className="text-[9px] bg-zinc-900 text-slate-400 border border-zinc-800 px-1.5 py-0.2 rounded font-mono">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingCategory({ original: cat, current: cat })}
                            className="p-1 text-slate-400 hover:text-cyan-400 transition"
                            title="Edit name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                              title="Delete category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY, LANGUAGE & THEME */}
          {activeTab === 'display' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Language Switcher */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'ne' ? 'एपको भाषा' : 'App Language'}
                    </span>
                    <span className="text-[11px] text-slate-400">English / नेपाली</span>
                  </div>
                </div>

                <div className="flex p-0.5 bg-black rounded-xl border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => onLanguageChange('en')}
                    className={`px-3 py-1.5 rounded-lg transition font-bold ${
                      language === 'en' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange('ne')}
                    className={`px-3 py-1.5 rounded-lg transition font-bold ${
                      language === 'ne' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    नेपाली
                  </button>
                </div>
              </div>

              {/* Visual Themes Palette */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'ne' ? 'रङ तथा थिम शैली' : 'Color Theme & Style'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {language === 'ne' ? 'आकर्षक गाढा वा उज्यालो रङ छान्नुहोस्' : 'Deep OLED blacks, KTM Racing Amber & Neon'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {(Object.keys(THEMES) as AppTheme[]).map((tKey) => {
                    const th = THEMES[tKey];
                    const isSelected = (settings.theme || 'oled') === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={async () => {
                          const updated = { ...settings, theme: tKey };
                          await db.settings.put({ key: 'app_settings', value: updated });
                          onSettingsUpdate(updated);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-900 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md'
                            : 'bg-black/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: th.previewColor }}
                          />
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {language === 'ne' ? th.nameNe : th.nameEn}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            {th.badge}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA & BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Standalone HTML File Export */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'ne' ? 'अफलाइन HTML फाइल डाउनलोड' : 'Standalone HTML Offline Backup'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {language === 'ne' ? 'कुनै पनि ब्राउजर वा फोनमा सिधै खुल्ने' : 'Single portable .html file that runs anywhere without internet'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await exportStandaloneHtmlFile();
                    setSuccessMsg(language === 'ne' ? 'HTML फाइल डाउनलोड भयो!' : 'Standalone HTML backup saved!');
                    setTimeout(() => setSuccessMsg(''), 3000);
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'ne' ? 'अफलाइन .html डाउनलोड' : 'Download Portable .html Backup'}</span>
                </button>
              </div>

              {/* JSON Export & Import */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'ne' ? 'JSON डाटा ब्याकअप तथा रिस्टोर' : 'Raw JSON Backup & Migration'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {language === 'ne' ? 'नयाँ फोनमा सार्नका लागि' : 'Transfer entire journal between devices'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await exportJsonBackup();
                      setSuccessMsg(language === 'ne' ? 'JSON ब्याकअप डाउनलोड भयो!' : 'JSON backup downloaded!');
                      setTimeout(() => setSuccessMsg(''), 3000);
                    }}
                    className="py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language === 'ne' ? 'ब्याकअप (.json)' : 'Export JSON'}</span>
                  </button>

                  <label className="py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 text-center">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language === 'ne' ? 'रिस्टोर गर्नुहोस्' : 'Restore JSON'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* PWA Home Screen Install */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <PWAInstallButton language={language} />
              </div>

              {/* Danger Zone: Wipe / Reset Data */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <div>
                      <span className="text-xs font-bold text-rose-300 block">
                        {language === 'ne' ? 'सबै स्थानीय डाटा मेटाउनुहोस्' : 'Wipe All Local Data'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'ne' ? 'सावधानी: यो प्रक्रिया उल्टाउन सकिँदैन' : 'Clears all bikes, logs & receipts in IndexedDB'}
                      </span>
                    </div>
                  </div>

                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold transition active:scale-95"
                    >
                      {language === 'ne' ? 'डेटा खाली' : 'Wipe All'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 text-slate-300 text-xs"
                      >
                        {language === 'ne' ? 'रद्द' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={isResetting}
                        onClick={handleResetAllData}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                      >
                        {isResetting ? 'Wiping...' : (language === 'ne' ? 'पुष्टि' : 'Confirm')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
