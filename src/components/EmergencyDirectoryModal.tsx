import React from 'react';
import {
  PhoneCall,
  X,
  ShieldAlert,
  AlertTriangle,
  LifeBuoy,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'ne';
}

const EMERGENCY_CONTACTS = [
  {
    number: '103',
    titleEn: 'Nepal Traffic Police Hotline',
    titleNe: 'काठमाडौं उपत्यका ट्राफिक प्रहरी हटलाइन',
    descEn: '24/7 traffic control, accident reports & vehicle verification',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  },
  {
    number: '100',
    titleEn: 'Nepal Police Emergency Control',
    titleNe: 'नेपाल प्रहरी आपतकालीन नियन्त्रण कक्ष',
    descEn: 'Immediate emergency police dispatch anywhere in Nepal',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  },
  {
    number: '102',
    titleEn: 'Nepal Ambulance Service (NAS)',
    titleNe: 'नेपाल एम्बुलेन्स सेवा',
    descEn: 'Emergency medical assistance and hospital transit',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  },
  {
    number: '1144',
    titleEn: 'Valley Traffic Accident Control',
    titleNe: 'दुर्घटना उद्धार तथा ट्राफिक व्यवस्थापन',
    descEn: 'Highway breakdown, obstruction & towing support',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  }
];

export const EmergencyDirectoryModal: React.FC<Props> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

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
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {language === 'ne' ? 'आपतकालीन सेवा तथा हटलाइन' : 'Emergency & Traffic Hotlines'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'ne' ? 'सिधै फोन सम्पर्क गर्नुहोस्' : 'Direct emergency dialers for riders in Nepal'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-lg w-full mx-auto space-y-4">
        {/* Hotlines List */}
        <div className="space-y-2.5">
          {EMERGENCY_CONTACTS.map(contact => (
            <a
              key={contact.number}
              href={`tel:${contact.number}`}
              className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between transition group shadow-sm"
            >
              <div className="pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {language === 'ne' ? contact.titleNe : contact.titleEn}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {contact.descEn}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono font-black text-sm text-white px-2.5 py-1 rounded-xl bg-black border border-zinc-700">
                  {contact.number}
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500 text-black flex items-center justify-center group-hover:scale-110 transition shadow-sm">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Legal Defense Tips for Riders */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>{language === 'ne' ? 'ट्राफिक जाँचमा काम लाग्ने नियमहरू' : 'Rider Rights at Traffic Checkpoints'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {language === 'ne'
              ? 'सवारी तथा यातायात व्यवस्था ऐन अनुसार कर म्याद नाघेको ९० दिनसम्म कुनै जरिवाना लाग्दैन। चैकिङमा परेमा आफ्नो सवारीको "ट्राफिक चेकिङ कार्ड" र ब्लुबुक देखाउनुहोस्।'
              : 'Under the Nepal Motor Vehicle Act, you have a statutory 90-day grace period with zero fines after tax expiry. If questioned, open the "Spot-Check Card" in Sawaari.'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-slate-300 hover:text-white transition"
        >
          {language === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
        </button>
      </div>
    </div>
  );
};
