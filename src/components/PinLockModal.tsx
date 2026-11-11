import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Delete, ShieldCheck, AlertCircle } from 'lucide-react';
import { verifyPin, authenticateWithBiometrics, isBiometricAvailable } from '../utils/security';

interface Props {
  storedPinHash: string;
  isBiometricEnabled: boolean;
  onUnlocked: () => void;
  language: 'en' | 'ne';
}

export const PinLockModal: React.FC<Props> = ({
  storedPinHash,
  isBiometricEnabled,
  onUnlocked,
  language
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [canUseBio, setCanUseBio] = useState(false);

  useEffect(() => {
    const bioAvailable = isBiometricAvailable() && isBiometricEnabled;
    setCanUseBio(bioAvailable);
    if (bioAvailable) {
      // Prompt biometrics on mount
      handleBiometricUnlock();
    }
  }, [isBiometricEnabled]);

  const handleBiometricUnlock = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      onUnlocked();
    }
  };

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const isValid = await verifyPin(newPin, storedPinHash);
      if (isValid) {
        if (navigator.vibrate) navigator.vibrate(50);
        onUnlocked();
      } else {
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
        setError(true);
        setErrorMessage(language === 'ne' ? 'गलत पिन! पुनः प्रयास गर्नुहोस्।' : 'Incorrect PIN. Try again.');
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        {/* Security Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/5">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white">
          {language === 'ne' ? 'सवारी सुरक्षित छ' : 'Sawaari is Locked'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          {language === 'ne' ? 'कृपया ४-अंकको पिन प्रविष्ट गर्नुहोस्' : 'Enter 4-digit PIN to access your bike data'}
        </p>

        {/* PIN Dots */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-transform ${error ? 'translate-x-1 animate-pulse' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? error
                      ? 'bg-rose-500 scale-125'
                      : 'bg-cyan-400 scale-125 shadow-md shadow-cyan-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mb-4 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 active:bg-cyan-500/20 active:border-cyan-500/40 text-lg font-semibold text-white transition active:scale-95 flex items-center justify-center shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics button */}
          {canUseBio ? (
            <button
              onClick={handleBiometricUnlock}
              title="Unlock with Fingerprint"
              className="h-14 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 text-cyan-400 transition active:scale-95 flex items-center justify-center"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <div className="h-14" />
          )}

          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 active:bg-cyan-500/20 text-lg font-semibold text-white transition active:scale-95 flex items-center justify-center shadow-sm"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            title="Delete"
            className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white transition active:scale-95 flex items-center justify-center shadow-sm"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-8 text-[11px] text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local IndexedDB Encrypted Session</span>
        </div>
      </div>
    </div>
  );
};
