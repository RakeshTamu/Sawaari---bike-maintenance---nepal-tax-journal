import React, { useState, useEffect } from 'react';
import {
  Bike as BikeIcon,
  Plus,
  Trash2,
  Check,
  Save,
  X,
  Upload,
  Camera,
  Star,
  Settings,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
  ArrowLeft
} from 'lucide-react';
import { Bike, VehicleCategory } from '../types';
import { db } from '../db/db';
import { formatAdDate, getCurrentNepaliDate } from '../utils/nepaliCalendar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bikes: Bike[];
  selectedBikeId: number;
  onSelectBike: (bikeId: number) => void;
  onRefresh: () => void;
  language: 'en' | 'ne';
}

const CATEGORIES: { id: VehicleCategory; labelEn: string; labelNe: string }[] = [
  { id: 'Bike', labelEn: 'Bike', labelNe: 'बाइक' },
  { id: 'Scooter', labelEn: 'Scooter', labelNe: 'स्कुटर' },
  { id: 'Electric', labelEn: 'Electric', labelNe: 'विद्युतीय' },
  { id: 'Car', labelEn: 'Car', labelNe: 'कार' },
  { id: 'Other', labelEn: 'Other', labelNe: 'अन्य' }
];

interface FormErrors {
  name?: string;
  registrationNumber?: string;
  cc?: string;
  boughtYearBS?: string;
  general?: string;
}

export const BikeManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bikes,
  selectedBikeId,
  onSelectBike,
  onRefresh,
  language
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);

  // Deletion Confirmation Dialog State
  const [confirmDeleteBike, setConfirmDeleteBike] = useState<Bike | null>(null);
  const [deleteRelatedRecords, setDeleteRelatedRecords] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success Notification
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const todayBs = getCurrentNepaliDate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<VehicleCategory>('Bike');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [boughtYearBS, setBoughtYearBS] = useState(String(todayBs.year));
  const [boughtYearAD, setBoughtYearAD] = useState(String(new Date().getFullYear()));
  const [cc, setCc] = useState<number>(150);
  const [engineNo, setEngineNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [odometerKm, setOdometerKm] = useState<number>(1000);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [platePhotoUrl, setPlatePhotoUrl] = useState<string>('');
  const [showPlateAsPhoto, setShowPlateAsPhoto] = useState<boolean>(false);

  // Interactive Validation Errors State
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Reset state to vehicle list view whenever opened or closed
  useEffect(() => {
    if (isOpen) {
      setIsAdding(false);
      setEditingBike(null);
      setErrors({});
      setTouched({});
      setConfirmDeleteBike(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAdding(false);
    setEditingBike(null);
    setErrors({});
    setTouched({});
    setConfirmDeleteBike(null);
    onClose();
  };

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePlatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPlatePhotoUrl(canvas.toDataURL('image/jpeg', 0.82));
        setShowPlateAsPhoto(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStartAdd = () => {
    setEditingBike(null);
    setName('');
    setCategory('Bike');
    setRegistrationNumber('');
    setBoughtYearBS(String(todayBs.year));
    setBoughtYearAD(String(new Date().getFullYear()));
    setCc(150);
    setEngineNo('');
    setChassisNo('');
    setOdometerKm(1000);
    setPhotoUrl('');
    setPlatePhotoUrl('');
    setShowPlateAsPhoto(false);
    setErrors({});
    setTouched({});
    setIsAdding(true);
  };

  const handleStartEdit = (b: Bike) => {
    setEditingBike(b);
    setName(b.name);
    setCategory(b.category);
    setRegistrationNumber(b.registrationNumber);
    setBoughtYearBS(b.boughtYearBS);
    setBoughtYearAD(b.boughtYearAD);
    setCc(b.cc);
    setEngineNo(b.engineNo || '');
    setChassisNo(b.chassisNo || '');
    setOdometerKm(b.odometerKm || 0);
    setPhotoUrl(b.photoUrl || '');
    setPlatePhotoUrl(b.platePhotoUrl || '');
    setShowPlateAsPhoto(b.showPlateAsPhoto || false);
    setErrors({});
    setTouched({});
    setIsAdding(true);
  };

  // Field change handlers that clear errors on input
  const handleNameChange = (val: string) => {
    setName(val);
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined, general: undefined }));
    }
  };

  const handlePlateChange = (val: string) => {
    setRegistrationNumber(val);
    if (errors.registrationNumber) {
      setErrors(prev => ({ ...prev, registrationNumber: undefined, general: undefined }));
    }
  };

  const handleCcChange = (val: number) => {
    setCc(val);
    if (errors.cc) {
      setErrors(prev => ({ ...prev, cc: undefined, general: undefined }));
    }
  };

  const handleBoughtYearChange = (val: string) => {
    setBoughtYearBS(val);
    if (errors.boughtYearBS) {
      setErrors(prev => ({ ...prev, boughtYearBS: undefined, general: undefined }));
    }
  };

  // Form Submission with Strict Interactive Validation
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = language === 'ne' ? 'सवारीको नाम अनिवार्य छ।' : 'Vehicle model name is required.';
    }
    if (!registrationNumber.trim()) {
      newErrors.registrationNumber = language === 'ne' ? 'नम्बर प्लेट अनिवार्य छ।' : 'License plate number is required.';
    }
    if (!cc || Number(cc) <= 0) {
      newErrors.cc = language === 'ne' ? 'इन्जिन क्षमता (CC) अनिवार्य छ।' : 'Engine capacity (CC) is required.';
    }
    if (!boughtYearBS.trim()) {
      newErrors.boughtYearBS = language === 'ne' ? 'खरिद वर्ष अनिवार्य छ।' : 'Purchase year is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      newErrors.general = language === 'ne' 
        ? 'कृपया रातो तारा (*) चिन्ह लगाइएका सबै अनिवार्य विवरण भर्नुहोस्।'
        : 'Please fill in all required fields indicated with the red asterisk (*).';
      setErrors(newErrors);
      setTouched({ name: true, registrationNumber: true, cc: true, boughtYearBS: true });
      return;
    }

    try {
      if (editingBike && editingBike.id) {
        await db.bikes.update(editingBike.id, {
          name: name.trim(),
          category,
          registrationNumber: registrationNumber.trim(),
          platePhotoUrl: platePhotoUrl || editingBike.platePhotoUrl,
          showPlateAsPhoto: Boolean(showPlateAsPhoto),
          boughtYearBS: boughtYearBS.trim(),
          boughtYearAD: boughtYearAD.trim(),
          cc: Number(cc),
          engineNo: engineNo.trim(),
          chassisNo: chassisNo.trim(),
          odometerKm: Number(odometerKm),
          photoUrl: photoUrl || editingBike.photoUrl
        });
        showToast(language === 'ne' ? 'सवारी विवरण सफलतापूर्वक अपडेट भयो!' : 'Vehicle updated successfully!');
      } else {
        const isFirst = bikes.length === 0;
        const newId = await db.bikes.add({
          name: name.trim(),
          category,
          registrationNumber: registrationNumber.trim(),
          platePhotoUrl,
          showPlateAsPhoto: Boolean(showPlateAsPhoto),
          boughtYearBS: boughtYearBS.trim(),
          boughtYearAD: boughtYearAD.trim(),
          cc: Number(cc),
          engineNo: engineNo.trim(),
          chassisNo: chassisNo.trim(),
          odometerKm: Number(odometerKm),
          photoUrl,
          isPrimary: isFirst,
          createdDate: formatAdDate(new Date())
        });
        onSelectBike(newId as number);
        showToast(language === 'ne' ? 'नयाँ सवारी सफलतापूर्वक दर्ता भयो!' : 'New vehicle registered successfully!');
      }

      setIsAdding(false);
      setEditingBike(null);
      setErrors({});
      onRefresh();
    } catch (err: any) {
      setErrors({ general: 'Failed to save vehicle: ' + (err.message || 'Database error') });
    }
  };

  // Safe Interactive Deletion Execution
  const executeDelete = async () => {
    if (!confirmDeleteBike || !confirmDeleteBike.id) return;
    setIsDeleting(true);

    try {
      const bikeId = confirmDeleteBike.id;
      
      // Delete vehicle from db.bikes
      await db.bikes.delete(bikeId);

      // If requested, cascade delete related records
      if (deleteRelatedRecords) {
        await db.services.where('bikeId').equals(bikeId).delete();
        await db.renewals.where('bikeId').equals(bikeId).delete();
        await db.expenses.where('bikeId').equals(bikeId).delete();
        await db.documents.where('bikeId').equals(bikeId).delete();
      }

      const remaining = bikes.filter(b => b.id !== bikeId);
      
      if (remaining.length > 0) {
        // If we deleted the active bike, pick another
        if (selectedBikeId === bikeId) {
          const newPrimary = remaining.find(b => b.isPrimary) || remaining[0];
          onSelectBike(newPrimary.id!);
        }
      } else {
        // All bikes removed! Switch to add mode so user can register a new one
        handleStartAdd();
      }

      showToast(
        language === 'ne' 
          ? `सवारी "${confirmDeleteBike.name}" सफलतापूर्वक हटाइयो।` 
          : `Vehicle "${confirmDeleteBike.name}" has been removed.`
      );

      setConfirmDeleteBike(null);
      onRefresh();
    } catch (err: any) {
      showToast('Error removing vehicle: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async (id?: number) => {
    if (!id) return;
    await db.transaction('rw', db.bikes, async () => {
      const all = await db.bikes.toArray();
      for (const b of all) {
        await db.bikes.update(b.id!, { isPrimary: b.id === id });
      }
    });
    onSelectBike(id);
    onRefresh();
    showToast(language === 'ne' ? 'मुख्य सवारी सेट भयो!' : 'Primary vehicle updated!');
  };

  const handleBackOrClose = () => {
    if (isAdding || editingBike) {
      setIsAdding(false);
      setEditingBike(null);
      setErrors({});
      setTouched({});
    } else {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Top Unified Navigation Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackOrClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
            title={language === 'ne' ? 'पछाडि' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white">
              {isAdding
                ? (editingBike ? (language === 'ne' ? 'सवारी सम्पादन' : 'Edit Vehicle') : (language === 'ne' ? 'नयाँ सवारी थप्नुहोस्' : 'Add Vehicle'))
                : (language === 'ne' ? 'सवारी प्रोफाइल' : 'Vehicle Profiles')}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isAdding
                ? (language === 'ne' ? 'सवारीको सम्पूर्ण विवरण' : 'Enter specifications & number plate')
                : (language === 'ne' ? 'सवारी छान्नुहोस् वा नयाँ थप्नुहोस्' : 'Select or register your vehicles')}
            </p>
          </div>
        </div>

        <div>
          {isAdding ? (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
              title={language === 'ne' ? 'सेभ' : 'Save'}
              aria-label="Save"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'ne' ? 'सेभ' : 'Save'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditingBike(null);
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1 transition active:scale-95 shadow-md shadow-cyan-500/20"
              title={language === 'ne' ? 'सवारी थप्नुहोस्' : 'Add Vehicle'}
              aria-label="Add Vehicle"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">{language === 'ne' ? 'सवारी थप्नुहोस्' : 'Add'}</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-4">

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div className={`mt-3 p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
          }`}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {isAdding ? (
          /* Add / Edit Form with Interactive Required Messages */
          <form onSubmit={handleSave} className="space-y-4 pt-3 overflow-y-auto pr-1 flex-1 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {editingBike
                  ? (language === 'ne' ? 'सवारी सम्पादन' : 'Edit Vehicle Details')
                  : (language === 'ne' ? 'नयाँ सवारी थप्नुहोस्' : 'Add New Vehicle')}
              </span>
              <span className="text-[11px] text-amber-400 font-bold bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-md">
                * Indicates Required Field
              </span>
            </div>

            {/* General Validation Error Summary */}
            {errors.general && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5 animate-bounce">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{errors.general}</span>
              </div>
            )}

            {/* Photo Picker */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="w-20 h-20 rounded-2xl bg-black border border-zinc-800 overflow-hidden relative flex items-center justify-center shrink-0 shadow-inner">
                {photoUrl ? (
                  <img src={photoUrl} alt="Bike" className="w-full h-full object-cover" />
                ) : (
                  <BikeIcon className="w-8 h-8 text-zinc-600" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-slate-200 cursor-pointer border border-zinc-700 transition active:scale-95">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === 'ne' ? 'तस्बिर अपलोड' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  {language === 'ne'
                    ? 'ड्यासबोर्ड प्रोफाइल कार्डको लागि ऐच्छिक तस्बिर'
                    : 'Optional image for dashboard profile card'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Field 1: Model Name (REQUIRED) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'ne' ? 'सवारीको नाम / मोडल' : 'Vehicle Model / Name'}
                  <span className="text-rose-400 font-bold ml-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pulsar 220F, Hunter 350"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full bg-black border rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition ${
                    errors.name
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-zinc-800 focus:border-cyan-500'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Field 2: Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'ne' ? 'सवारीको वर्ग' : 'Category'}
                  <span className="text-rose-400 font-bold ml-1">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VehicleCategory)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {language === 'ne' ? c.labelNe : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Field 3: Plate Number (REQUIRED) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'ne' ? 'नम्बर प्लेट (Nepal Plate)' : 'Plate Number'}
                  <span className="text-rose-400 font-bold ml-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ba 02-031 Pa 4521"
                  value={registrationNumber}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  className={`w-full bg-black border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none transition ${
                    errors.registrationNumber
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-zinc-800 focus:border-cyan-500'
                  }`}
                />
                {errors.registrationNumber && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.registrationNumber}</span>
                  </p>
                )}
              </div>

              {/* Field 4: Engine CC (REQUIRED) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'ne' ? 'इन्जिन क्षमता (CC)' : 'Engine Capacity (CC)'}
                  <span className="text-rose-400 font-bold ml-1">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={cc || ''}
                  onChange={(e) => handleCcChange(Number(e.target.value))}
                  className={`w-full bg-black border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none transition ${
                    errors.cc
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-zinc-800 focus:border-cyan-500'
                  }`}
                />
                {errors.cc && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.cc}</span>
                  </p>
                )}
              </div>
            </div>

            {/* License Plate Photo & Card Display Option */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    {language === 'ne' ? 'नम्बर प्लेटको वास्तविक फोटो (ऐच्छिक)' : 'License Plate Photo (Optional)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'ne'
                      ? 'सवारी कार्डमा अक्षर वा फोटोमध्ये जुन पनि देखाउन सकिन्छ'
                      : 'Display either typed text plate or actual plate photo on dashboard'}
                  </span>
                </div>
                {platePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlatePhotoUrl('');
                      setShowPlateAsPhoto(false);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{language === 'ne' ? 'हटाउनुहोस्' : 'Remove'}</span>
                  </button>
                )}
              </div>

              {platePhotoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-32 h-16 rounded-xl overflow-hidden border border-zinc-700 bg-black flex items-center justify-center shrink-0 shadow-sm">
                    <img src={platePhotoUrl} alt="Plate" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={showPlateAsPhoto}
                        onChange={(e) => setShowPlateAsPhoto(e.target.checked)}
                        className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                      />
                      <span>{language === 'ne' ? 'सवारी कार्डमा फोटो प्लेट देखाउनुहोस्' : 'Show plate photo on vehicle card'}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-zinc-700 hover:border-cyan-500/80 rounded-xl cursor-pointer bg-black/40 hover:bg-black/60 transition group text-center">
                  <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-semibold text-slate-300">
                    {language === 'ne' ? 'नम्बर प्लेटको फोटो खिच्नुहोस् / छान्नुहोस्' : 'Take or upload physical plate photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePlatePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Field 5: Purchase Year BS with BS/AD selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'ne' ? 'खरिद / दर्ता वर्ष (वि.सं.)' : 'Purchase / Reg Year (BS)'}
                  <span className="text-rose-400 font-bold ml-1">*</span>
                </label>
                <select
                  value={boughtYearBS}
                  onChange={(e) => {
                    const bsY = e.target.value;
                    handleBoughtYearChange(bsY);
                    setBoughtYearAD(String(Number(bsY) - 57));
                  }}
                  className={`w-full bg-black border rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none transition ${
                    errors.boughtYearBS
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                      : 'border-zinc-800 focus:border-cyan-500'
                  }`}
                >
                  <option value="">{language === 'ne' ? 'वर्ष छान्नुहोस्' : 'Select BS Year'}</option>
                  {Array.from({ length: 30 }, (_, i) => 2090 - i).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} BS ({yr - 57} AD)
                    </option>
                  ))}
                </select>
                {errors.boughtYearBS && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.boughtYearBS}</span>
                  </p>
                )}
              </div>

              {/* Field 6: Current Odometer */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'ne' ? 'हालको ओडोमिटर (कि.मी.)' : 'Current Odometer (KM)'}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 9850"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'ne' ? 'इन्जिन नम्बर (ऐच्छिक)' : 'Engine No (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ne' ? 'ब्लुबुकबाट हेरी लेख्नुहोस्' : 'From Blue Book'}
                  value={engineNo}
                  onChange={(e) => setEngineNo(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'ne' ? 'चेसिस नम्बर (ऐच्छिक)' : 'Chassis No (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ne' ? 'ब्लुबुकबाट हेरी लेख्नुहोस्' : 'From Blue Book'}
                  value={chassisNo}
                  onChange={(e) => setChassisNo(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </form>
        ) : (
          /* Bike List View */
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {language === 'ne' ? 'तपाईंका सवारीहरू' : 'Your Registered Vehicles'} ({bikes.length})
              </span>
            </div>

            {bikes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center space-y-3">
                <BikeIcon className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  {language === 'ne' ? 'कुनै सवारी दर्ता गरिएको छैन।' : 'No vehicles registered currently.'}
                </p>
                <button
                  onClick={handleStartAdd}
                  className="w-10 h-10 rounded-2xl bg-cyan-500 text-black font-black flex items-center justify-center mx-auto shadow-md transition active:scale-95"
                  title="Add Vehicle"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {bikes.map(b => {
                  const isSelected = b.id === selectedBikeId;
                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border transition shadow-sm flex items-center justify-between ${
                        isSelected
                          ? 'bg-zinc-900 border-cyan-500/60 ring-1 ring-cyan-500/30'
                          : 'bg-zinc-950 border-zinc-800/90 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        onClick={() => {
                          onSelectBike(b.id!);
                          onClose();
                        }}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                          {b.photoUrl ? (
                            <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <BikeIcon className="w-6 h-6 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{b.name}</h4>
                            {b.isPrimary && (
                              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-bold">
                                {language === 'ne' ? 'मुख्य' : 'Primary'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-cyan-400 font-bold mt-0.5">
                            {b.registrationNumber} · {b.cc}cc
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {language === 'ne' ? 'ओडोमिटर' : 'Odometer'}: {b.odometerKm?.toLocaleString()} KM · {language === 'ne' ? 'खरिद' : 'Bought'}: {b.boughtYearBS} BS
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        {!b.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(b.id)}
                            title="Set as Primary Bike"
                            className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-zinc-800 transition"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(b)}
                          title="Edit Details"
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-zinc-800 transition"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {/* Always opens in-app confirmation modal */}
                        <button
                          onClick={() => setConfirmDeleteBike(b)}
                          title="Remove Vehicle"
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ALWAYS CONFIRM BEFORE REMOVING VEHICLE (IN-APP MODAL) */}
        {confirmDeleteBike && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border-2 border-rose-500/60 p-6 shadow-2xl text-slate-100 space-y-4">
              
              {/* Top-Right Cross Icon */}
              <button
                type="button"
                onClick={() => setConfirmDeleteBike(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-slate-400 hover:text-white transition active:scale-95"
                aria-label="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {language === 'ne' ? 'सवारी हटाउने पुष्टि गर्नुहोस्' : 'Confirm Vehicle Removal'}
                  </h3>
                  <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">
                    Irreversible Action
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-sm font-bold text-white">
                  {confirmDeleteBike.name}
                </div>
                <div className="font-mono text-xs text-amber-300 font-bold">
                  Plate: {confirmDeleteBike.registrationNumber}
                </div>
                <div className="text-[11px] text-slate-400">
                  {confirmDeleteBike.cc}cc · Bought {confirmDeleteBike.boughtYearBS} BS
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {language === 'ne'
                  ? `के तपाईं पक्का "${confirmDeleteBike.name}" सवारीलाई जर्नलबाट हटाउन चाहनुहुन्छ?`
                  : `Are you sure you want to remove "${confirmDeleteBike.name}" from your vehicle journal?`}
              </p>

              {/* Checkbox for related records */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRelatedRecords}
                  onChange={(e) => setDeleteRelatedRecords(e.target.checked)}
                  className="mt-0.5 rounded text-rose-500 focus:ring-rose-500 bg-black border-zinc-700"
                />
                <span className="text-[11px] text-slate-300">
                  {language === 'ne'
                    ? 'यस सवारीसँग सम्बन्धित सबै सर्भिस, कर नवीकरण तथा ब्लुबुक तस्बिरहरू पनि मेटाउनुहोस्'
                    : 'Also safely delete all service logs, tax renewals, and Blue Book vault photos for this vehicle'}
                </span>
              </label>

              {bikes.length <= 1 && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-[11px] flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'ne'
                      ? 'यो तपाईंको एक मात्र सवारी हो। हटाए पश्चात तपाईंले नयाँ सवारी दर्ता गर्न सक्नुहुनेछ।'
                      : 'This is your only registered vehicle. Removing it will allow you to register a fresh vehicle profile.'}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteBike(null)}
                  className="p-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white transition flex items-center justify-center"
                  title={language === 'ne' ? 'रद्द' : 'Cancel'}
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition active:scale-95 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : (language === 'ne' ? 'हो, हटाउनुहोस्' : 'Delete Vehicle')}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
