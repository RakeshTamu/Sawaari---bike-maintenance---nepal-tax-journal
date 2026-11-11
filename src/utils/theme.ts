import { AppTheme } from '../types';

export interface ThemeConfig {
  id: AppTheme;
  nameEn: string;
  nameNe: string;
  badge: string;
  bgClass: string;
  surfaceClass: string;
  surfaceMutedClass: string;
  borderClass: string;
  accentTextClass: string;
  accentBgClass: string;
  accentGlow: string;
  primaryColorHex: string;
  previewColor: string;
}

export const THEMES: { [key in AppTheme]: ThemeConfig } = {
  oled: {
    id: 'oled',
    nameEn: 'OLED Pitch Black',
    nameNe: 'पिच ब्ल्याक (OLED)',
    badge: 'AMOLED',
    bgClass: 'bg-black text-slate-100',
    surfaceClass: 'bg-zinc-950 border-zinc-800/80 shadow-2xl',
    surfaceMutedClass: 'bg-black/90 border-zinc-900',
    borderClass: 'border-zinc-800',
    accentTextClass: 'text-cyan-400',
    accentBgClass: 'bg-cyan-500 hover:bg-cyan-400 text-black',
    accentGlow: 'shadow-cyan-500/20',
    primaryColorHex: '#06b6d4',
    previewColor: '#00f2fe'
  },
  racing_amber: {
    id: 'racing_amber',
    nameEn: 'Racing Amber & Orange',
    nameNe: 'रेसिङ ओरेन्ज (केटीएम)',
    badge: 'KTM Vibe',
    bgClass: 'bg-[#090805] text-amber-50',
    surfaceClass: 'bg-[#15120c] border-[#2c2415] shadow-2xl',
    surfaceMutedClass: 'bg-[#0b0a07] border-[#221c10]',
    borderClass: 'border-[#2c2415]',
    accentTextClass: 'text-amber-400',
    accentBgClass: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold',
    accentGlow: 'shadow-orange-500/25',
    primaryColorHex: '#f59e0b',
    previewColor: '#f97316'
  },
  cyber_violet: {
    id: 'cyber_violet',
    nameEn: 'Cyber Neon Violet',
    nameNe: 'साइबर भायोलेट',
    badge: 'Neon',
    bgClass: 'bg-[#06040c] text-purple-50',
    surfaceClass: 'bg-[#100c1e] border-[#281c44] shadow-2xl',
    surfaceMutedClass: 'bg-[#080512] border-[#1e1533]',
    borderClass: 'border-[#281c44]',
    accentTextClass: 'text-purple-400',
    accentBgClass: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold',
    accentGlow: 'shadow-purple-500/25',
    primaryColorHex: '#a855f7',
    previewColor: '#c084fc'
  },
  emerald: {
    id: 'emerald',
    nameEn: 'Himalayan Jade',
    nameNe: 'हिमाली जेड हरियो',
    badge: 'Forest',
    bgClass: 'bg-[#020a06] text-emerald-50',
    surfaceClass: 'bg-[#07170f] border-[#133222] shadow-2xl',
    surfaceMutedClass: 'bg-[#030e08] border-[#0e2418]',
    borderClass: 'border-[#133222]',
    accentTextClass: 'text-emerald-400',
    accentBgClass: 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold',
    accentGlow: 'shadow-emerald-500/25',
    primaryColorHex: '#10b981',
    previewColor: '#10b981'
  },
  slate_dark: {
    id: 'slate_dark',
    nameEn: 'Midnight Slate',
    nameNe: 'मिडनाइट स्लेट',
    badge: 'Original',
    bgClass: 'bg-slate-950 text-slate-100',
    surfaceClass: 'bg-slate-900 border-slate-800 shadow-xl',
    surfaceMutedClass: 'bg-slate-950/80 border-slate-800/80',
    borderClass: 'border-slate-800',
    accentTextClass: 'text-cyan-400',
    accentBgClass: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold',
    accentGlow: 'shadow-cyan-500/20',
    primaryColorHex: '#38bdf8',
    previewColor: '#38bdf8'
  },
  light: {
    id: 'light',
    nameEn: 'Daylight Sunshine',
    nameNe: 'डे-लाइट (घाममा हेर्न)',
    badge: 'Daylight',
    bgClass: 'bg-slate-100 text-slate-900',
    surfaceClass: 'bg-white border-slate-200 shadow-lg',
    surfaceMutedClass: 'bg-slate-50 border-slate-200',
    borderClass: 'border-slate-200',
    accentTextClass: 'text-blue-600',
    accentBgClass: 'bg-blue-600 hover:bg-blue-700 text-white font-bold',
    accentGlow: 'shadow-blue-500/20',
    primaryColorHex: '#2563eb',
    previewColor: '#2563eb'
  }
};
