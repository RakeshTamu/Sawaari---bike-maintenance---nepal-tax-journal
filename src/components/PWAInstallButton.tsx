import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

interface Props {
  language?: 'en' | 'ne';
}

export const PWAInstallButton: React.FC<Props> = ({ language = 'en' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium transition active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{language === 'ne' ? 'एप इन्स्टल' : 'Install PWA'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 text-xs font-medium transition active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{language === 'ne' ? 'iOS मा इन्स्टल' : 'Install iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-white">
                  {language === 'ne' ? 'iPhone / iPad मा इन्स्टल गर्नुहोस्' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">1</div>
                  <p>
                    {language === 'ne' 
                      ? 'Safari को तल रहेको शेयर (Share) बटन थिच्नुहोस्।'
                      : 'Tap the Share icon at the bottom of Safari.'}
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">2</div>
                  <p>
                    {language === 'ne' 
                      ? 'तल स्क्रोल गरी "Add to Home Screen" मा थिच्नुहोस्।'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">3</div>
                  <p>
                    {language === 'ne' 
                      ? 'माथि दायाँपट्टि रहेको "Add" थिची सुरक्षित गर्नुहोस्।'
                      : 'Tap "Add" in the top right. Sawaari will open like a native app!'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2.5 text-xs font-semibold text-slate-950 transition"
              >
                {language === 'ne' ? 'बुझें' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
