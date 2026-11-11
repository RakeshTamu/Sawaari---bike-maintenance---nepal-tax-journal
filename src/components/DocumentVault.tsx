import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Camera,
  Eye,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Shield,
  Download,
  Plus,
  AlertTriangle,
  AlertCircle,
  Bike,
  User,
  Sparkles,
  Tag,
  ArrowLeft,
  Check,
  Save
} from 'lucide-react';
import { DocumentItem } from '../types';
import { db } from '../db/db';

interface Props {
  bikeId: number;
  documents: DocumentItem[];
  onRefresh: () => void;
  language: 'en' | 'ne';
  openAddTrigger?: number; // External trigger from persistent FAB
}

const BIKE_DOC_CATEGORIES = [
  { id: 'bluebook_front', labelEn: 'Blue Book: Vehicle Specs (P. 1-2)', labelNe: 'सवारी विवरण (पेज १-२)' },
  { id: 'bluebook_tax', labelEn: 'Blue Book: Tax Stamp Page (P. 3-4)', labelNe: 'कर दाखिला पाना (पेज ३-४)' },
  { id: 'insurance', labelEn: 'Insurance Policy Certificate', labelNe: 'बीमा कागजपत्र' },
  { id: 'pollution', labelEn: 'Pollution Test (Green Sticker)', labelNe: 'प्रदूषण जाँच हरियो स्टिकर' },
  { id: 'other', labelEn: 'Tax Receipt / Other Vehicle Slip', labelNe: 'कर रसिद वा अन्य रसिद' },
] as const;

const DRIVER_DOC_CATEGORIES = [
  { id: 'license_front', labelEn: 'Smart Driving License (Front)', labelNe: 'सवारी चालक अनुमतिपत्र (अगाडि)' },
  { id: 'license_back', labelEn: 'Smart Driving License (Back)', labelNe: 'सवारी चालक अनुमतिपत्र (पछाडि)' },
  { id: 'citizenship', labelEn: 'Citizenship / National ID (NID)', labelNe: 'नागरिकता / राष्ट्रिय परिचयपत्र' },
  { id: 'medical', labelEn: 'Emergency Blood Group / Medical Card', labelNe: 'रक्त समूह / आकस्मिक कार्ड' },
  { id: 'driver_other', labelEn: 'Other Rider Document', labelNe: 'अन्य व्यक्तिगत कागजात' },
] as const;

export const DocumentVault: React.FC<Props> = ({ bikeId, documents, onRefresh, language, openAddTrigger }) => {
  const [activeSection, setActiveSection] = useState<'bike' | 'driver'>('bike');
  const [isUploading, setIsUploading] = useState(false);
  const [modalTab, setModalTab] = useState<'photo' | 'details'>('photo');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('bluebook_front');
  const [docTitle, setDocTitle] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // In-app deletion confirmation modal state
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentItem | null>(null);

  // Fullscreen Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Split documents into Bike vs Driver
  const isDriverDoc = (cat?: string) =>
    Boolean(cat && (cat.startsWith('license') || cat === 'citizenship' || cat === 'medical' || cat === 'driver_other'));

  const bikeDocs = (documents || []).filter(d => !isDriverDoc(d?.category));
  const driverDocs = (documents || []).filter(d => isDriverDoc(d?.category));
  const activeDocs = activeSection === 'bike' ? bikeDocs : driverDocs;

  const currentCategories = activeSection === 'bike' ? BIKE_DOC_CATEGORIES : DRIVER_DOC_CATEGORIES;

  const handleOpenUpload = (section: 'bike' | 'driver') => {
    setActiveSection(section);
    setSelectedCategory(section === 'bike' ? 'bluebook_front' : 'license_front');
    setModalTab('photo');
    setPreviewImage(null);
    setDocTitle('');
    setDocNotes('');
    setIsUploading(true);
    setHasAttemptedSubmit(false);
    setUploadError(null);
  };

  // Listen to external trigger from FAB - guarded by ref so it never fires on tab remount
  const lastTriggerRef = useRef<number | undefined>(openAddTrigger);
  useEffect(() => {
    if (openAddTrigger !== undefined && openAddTrigger > (lastTriggerRef.current || 0)) {
      handleOpenUpload(activeSection);
    }
    lastTriggerRef.current = openAddTrigger;
  }, [openAddTrigger, activeSection]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // Compress & convert to Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!previewImage) {
      setUploadError(
        language === 'ne'
          ? 'कृपया पहिले क्यामेरा वा ग्यालरीबाट कागजपत्रको फोटो छान्नुहोस्।'
          : 'Please capture or select a photo of the document.'
      );
      setModalTab('photo');
      return;
    }

    const matchedCat = [...BIKE_DOC_CATEGORIES, ...DRIVER_DOC_CATEGORIES].find(c => c.id === selectedCategory);
    const defaultTitle = matchedCat ? (language === 'ne' ? matchedCat.labelNe : matchedCat.labelEn) : 'Document';

    await db.documents.add({
      bikeId,
      title: docTitle.trim() || defaultTitle,
      category: selectedCategory as any,
      imageBase64: previewImage,
      uploadDate: new Date().toISOString().slice(0, 10),
      notes: docNotes.trim()
    });

    setPreviewImage(null);
    setDocTitle('');
    setDocNotes('');
    setUploadError(null);
    setHasAttemptedSubmit(false);
    setIsUploading(false);
    onRefresh();
  };

  const executeDeleteDoc = async () => {
    if (!confirmDeleteDoc?.id) return;
    const docId = confirmDeleteDoc.id;
    await db.documents.delete(docId);
    if (viewingDoc?.id === docId) {
      setViewingDoc(null);
    }
    setConfirmDeleteDoc(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Documents Title (Header + button removed - anchored to bottom-right FAB) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              {language === 'ne' ? 'कागजात भल्ट' : 'Documents Vault'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'ne'
                ? 'अफलाइन सुरक्षित: ट्राफिक प्रहरी चेकिङमा तुरुन्त देखाउन मिल्ने'
                : 'Stored 100% locally in IndexedDB for traffic spot-checks'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Segmented Section Switcher: Bike Documents vs Driver Documents */}
      <div className="flex items-center p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-md">
        <button
          type="button"
          onClick={() => {
            setActiveSection('bike');
            if (isUploading) setSelectedCategory('bluebook_front');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
            activeSection === 'bike'
              ? 'bg-zinc-800 text-cyan-400 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>{language === 'ne' ? 'सवारी कागजपत्र (ब्लुबुक)' : 'Bike Documents'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/60 text-slate-300 font-mono">
            {bikeDocs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('driver');
            if (isUploading) setSelectedCategory('license_front');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
            activeSection === 'driver'
              ? 'bg-zinc-800 text-cyan-400 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{language === 'ne' ? 'चालक कागजपत्र (लाइसेन्स)' : 'Driver Documents'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/60 text-slate-300 font-mono">
            {driverDocs.length}
          </span>
        </button>
      </div>

      {/* 3. Documents Grid */}
      {activeDocs.length === 0 ? (
        <div className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto text-slate-500 border border-zinc-800">
            {activeSection === 'bike' ? <Bike className="w-7 h-7" /> : <User className="w-7 h-7" />}
          </div>
          <div className="text-sm font-black text-white">
            {activeSection === 'bike'
              ? (language === 'ne' ? 'कुनै सवारी कागजपत्र थपिएको छैन' : 'No Bike Documents Added Yet')
              : (language === 'ne' ? 'कुनै चालक कागजपत्र थपिएको छैन' : 'No Driver Documents Added Yet')}
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeSection === 'bike'
              ? (language === 'ne'
                  ? 'ट्राफिक जाँचका लागि आफ्नो ब्लुबुक, प्रदूषण हरियो स्टिकर र बीमा फोटो सुरक्षित राख्नुहोस्।'
                  : 'Keep your Blue Book pages, pollution test sticker, and insurance policy certificate ready.')
              : (language === 'ne'
                  ? 'आफ्नो स्मार्ट लाइसेन्स (अगाडि/पछाडि) र नागरिकता फोटो सुरक्षित राख्नुहोस्।'
                  : 'Save your Smart Driving License front and back photos for traffic spot-checks.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {activeDocs.map((doc) => {
            const allCats = [...BIKE_DOC_CATEGORIES, ...DRIVER_DOC_CATEGORIES];
            const catLabel = allCats.find(c => c.id === doc.category)?.[language === 'ne' ? 'labelNe' : 'labelEn'] || doc.category;

            return (
              <div
                key={doc.id}
                className="group relative rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-md hover:border-cyan-500/40 transition flex flex-col"
              >
                {/* Thumbnail Image */}
                <div
                  onClick={() => {
                    setViewingDoc(doc);
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="h-36 bg-black flex items-center justify-center cursor-pointer relative overflow-hidden"
                >
                  <img
                    src={doc.imageBase64}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition" />
                  <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 text-white backdrop-blur-sm border border-zinc-800">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-cyan-400 font-semibold truncate mt-0.5">
                      {catLabel}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {doc.uploadDate}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-900">
                    <button
                      onClick={() => {
                        setViewingDoc(doc);
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="text-[11px] text-slate-300 hover:text-cyan-400 font-bold"
                    >
                      {language === 'ne' ? 'हेर्नुहोस्' : 'View'}
                    </button>

                    <button
                      onClick={() => setConfirmDeleteDoc(doc)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. FULL-SCREEN SLIDE-IN PAGE FOR ADDING DOCUMENT */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Top Unified Navigation Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsUploading(false);
                  setUploadError(null);
                  setHasAttemptedSubmit(false);
                }}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition active:scale-95"
                title={language === 'ne' ? 'पछाडि' : 'Back'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">
                  {activeSection === 'bike'
                    ? (language === 'ne' ? 'सवारी कागजपत्र थप्नुहोस्' : 'Add Vehicle Document')
                    : (language === 'ne' ? 'चालक कागजपत्र थप्नुहोस्' : 'Add Driver Document')}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {language === 'ne' ? 'क्यामेराबाट फोटो वा ग्यालरी' : 'Stored locally for instant spot checks'}
                </p>
              </div>
            </div>

            {/* Standardized Primary Action Button: Save Icon + 'Save' Label */}
            <button
              type="button"
              onClick={handleSaveDocument}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
              title={language === 'ne' ? 'सेभ' : 'Save'}
              aria-label="Save"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'ne' ? 'सेभ' : 'Save'}</span>
            </button>
          </header>

          <div className="max-w-2xl w-full mx-auto px-4 pt-3 shrink-0">

            {/* Compact Internal Tabs */}
            <div className="flex items-center p-1 my-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('photo')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'photo'
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'फोटो र प्रकार' : 'Photo & Category'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'details'
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'विवरण र कैफियत' : 'Details & Notes'}</span>
              </button>
            </div>

            {/* Error Banner */}
            {hasAttemptedSubmit && uploadError && (
              <div className="p-3 mb-2 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDocument} className="space-y-4 overflow-y-auto pr-1 flex-1 flex flex-col justify-between">
              
              {/* TAB 1: PHOTO CAPTURE & CATEGORY */}
              {modalTab === 'photo' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {language === 'ne' ? 'कागजपत्र प्रकार' : 'Document Category'}
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                    >
                      {currentCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {language === 'ne' ? cat.labelNe : cat.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Photo Capture Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                      {language === 'ne' ? 'फोटो खिच्नुहोस् वा फाइल छान्नुहोस्' : 'Capture or Select Photo'}
                    </label>
                    <label
                      className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-2xl cursor-pointer bg-zinc-900/60 transition group ${
                        hasAttemptedSubmit && !previewImage
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                          : 'border-zinc-800 hover:border-cyan-500/50'
                      }`}
                    >
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="h-full w-full object-contain rounded-2xl p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <Camera className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 mb-2 transition" />
                          <p className="text-xs text-slate-200 font-bold">
                            {language === 'ne' ? 'क्यामेरा वा ग्यालरीबाट फोटो लिनुहोस्' : 'Tap to snap photo or choose image'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">JPEG, PNG, WebP (Optimized locally)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM TITLE & REMARKS */}
              {modalTab === 'details' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {language === 'ne' ? 'कस्टम शीर्षक (ऐच्छिक)' : 'Custom Title (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={activeSection === 'bike' ? 'e.g. 2082 Tax Stamp Page' : 'e.g. Smart License Category A'}
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {language === 'ne' ? 'कैफियत / टिप्पणी (ऐच्छिक)' : 'Notes / Remarks (Optional)'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Verified at Ekantakuna, Valid until Ashadh 2083"
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN DOCUMENT VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {viewingDoc.title}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {viewingDoc.uploadDate}
              </p>
            </div>

            {/* Controls: Zoom, Rotate, Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered Image with Transform */}
          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            <img
              src={viewingDoc.imageBase64}
              alt={viewingDoc.title}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain border border-zinc-800 shadow-2xl"
            />
          </div>

          {viewingDoc.notes && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-slate-300 max-w-lg mx-auto w-full text-center">
              {viewingDoc.notes}
            </div>
          )}
        </div>
      )}

      {/* 6. CONFIRM DELETE MODAL */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            {/* Top-Right Cross Icon */}
            <button
              type="button"
              onClick={() => setConfirmDeleteDoc(null)}
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
                <h4 className="text-sm font-black text-white">
                  {language === 'ne' ? 'कागजपत्र मेटाउने पुष्टि' : 'Delete Document'}
                </h4>
                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                  {confirmDeleteDoc.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              {language === 'ne'
                ? 'के तपाईं यो कागजपत्र साँच्चै मेटाउन चाहनुहुन्छ? यो अफलाइन कागजात भल्टबाट हट्नेछ।'
                : 'Are you sure you want to delete this document from your offline storage?'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="p-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 hover:text-white transition flex items-center justify-center"
                title={language === 'ne' ? 'रद्द' : 'Cancel'}
                aria-label="Cancel"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={executeDeleteDoc}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'ne' ? 'मेटाउनुहोस्' : 'Delete Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
