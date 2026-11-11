import React, { useState } from 'react';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Plus,
  Fuel,
  Wrench,
  Shield,
  FileCheck,
  DollarSign,
  X,
  Calendar,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { ExpenseRecord, ExpenseCategory, Bike } from '../types';
import { db } from '../db/db';
import { adToBs, formatAdDate } from '../utils/nepaliCalendar';
import { NepaliDatePicker } from './NepaliDatePicker';

interface Props {
  bike: Bike;
  expenses: ExpenseRecord[];
  onRefresh: () => void;
  language: 'en' | 'ne';
  onOpenRefuel?: () => void;
}

const CATEGORY_META: { [key in ExpenseCategory]: { labelEn: string; labelNe: string; color: string; icon: any } } = {
  service: { labelEn: 'Service & Maintenance', labelNe: 'सर्भिस तथा मर्मत', color: '#06b6d4', icon: Wrench },
  tax_renewal: { labelEn: 'Tax & Blue Book Renewals', labelNe: 'सवारी कर तथा नवीकरण', color: '#10b981', icon: FileCheck },
  repair_parts: { labelEn: 'Repairs & Parts', labelNe: 'पार्टपुर्जा फेरबदल', color: '#f59e0b', icon: Wrench },
  fuel: { labelEn: 'Fuel / Petrol', labelNe: 'पेट्रोल / इन्धन', color: '#ec4899', icon: Fuel },
  insurance: { labelEn: 'Third-Party / Full Insurance', labelNe: 'सवारी बीमा', color: '#8b5cf6', icon: Shield },
  accessories: { labelEn: 'Accessories & Mods', labelNe: 'एक्सेसरिज तथा मोडिफिकेसन', color: '#64748b', icon: Layers }
};

interface TooltipPayload {
  payload: {
    id: number;
    dateAD: string;
    dateBS: string;
    displayDate: string;
    odometerKm: number;
    fuelLiters: number;
    amount: number;
    distanceKm: number;
    kmpl: number;
  };
}

const CustomFuelTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[]; language: 'en' | 'ne' }> = ({
  active,
  payload,
  language
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-2xl bg-zinc-950/95 border border-zinc-700 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <span className="font-bold text-white font-mono">{data.dateAD}</span>
          <span className="text-[10px] text-cyan-400 font-mono">{data.dateBS} BS</span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-slate-300">
            <span>{language === 'ne' ? 'इन्धन माइलेज' : 'Fuel Mileage'}:</span>
            <span className="text-pink-400 font-black font-mono text-sm">{data.kmpl} KM/L</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{language === 'ne' ? 'ओडोमिटर' : 'Odometer'}:</span>
            <span className="font-mono text-slate-200">{data.odometerKm.toLocaleString()} KM</span>
          </div>
          {data.distanceKm > 0 && (
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>{language === 'ne' ? 'पार दुरी' : 'Distance'}:</span>
              <span className="font-mono text-emerald-400">+{data.distanceKm} KM</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{language === 'ne' ? 'इन्धन परिमाण' : 'Fuel Liters'}:</span>
            <span className="font-mono text-slate-200">{data.fuelLiters} L (Rs. {data.amount.toLocaleString()})</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsView: React.FC<Props> = ({ bike, expenses, onRefresh, language, onOpenRefuel }) => {
  const [isLogging, setIsLogging] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'service' | 'tax' | 'fuel'>('all');

  // Form State
  const [dateAD, setDateAD] = useState(formatAdDate(new Date()));
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState<number>(1500);
  const [description, setDescription] = useState('');
  const [odometerKm, setOdometerKm] = useState<number>(bike.odometerKm || 0);
  const [fuelLiters, setFuelLiters] = useState<number>(0);

  // Totals & Category Breakdown
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const categoryTotals: { [key in ExpenseCategory]: number } = {
    service: 0,
    tax_renewal: 0,
    repair_parts: 0,
    fuel: 0,
    insurance: 0,
    accessories: 0
  };

  expenses.forEach(exp => {
    if (categoryTotals[exp.category] !== undefined) {
      categoryTotals[exp.category] += exp.amount;
    } else {
      categoryTotals.service += exp.amount;
    }
  });

  // Calculate Cost Per KM
  const costPerKm = (bike.odometerKm && bike.odometerKm > 0)
    ? (totalSpent / bike.odometerKm).toFixed(2)
    : '0.00';

  // Monthly Spending for last 6 months
  const monthlyData: { [key: string]: number } = {};
  const monthLabels: string[] = [];

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = 0;
    monthLabels.push(key);
  }

  expenses.forEach(exp => {
    const key = exp.dateAD.slice(0, 7);
    if (monthlyData[key] !== undefined) {
      monthlyData[key] += exp.amount;
    }
  });

  const maxMonthly = Math.max(...Object.values(monthlyData), 5000);

  // Fuel Efficiency (KM/L) Trends calculation for the active bike
  const fuelExpenses = expenses
    .filter(exp => exp.category === 'fuel' && exp.odometerKm)
    .sort((a, b) => new Date(a.dateAD).getTime() - new Date(b.dateAD).getTime());

  interface FuelPoint {
    id: number;
    dateAD: string;
    dateBS: string;
    displayDate: string;
    odometerKm: number;
    fuelLiters: number;
    amount: number;
    distanceKm: number;
    kmpl: number;
    description?: string;
  }

  const fuelTrendData: FuelPoint[] = [];

  for (let i = 0; i < fuelExpenses.length; i++) {
    const current = fuelExpenses[i];
    const prev = i > 0 ? fuelExpenses[i - 1] : null;

    let kmpl = 0;
    let distance = 0;

    if (prev && current.odometerKm && prev.odometerKm && current.fuelLiters && current.fuelLiters > 0) {
      distance = Math.max(0, current.odometerKm - prev.odometerKm);
      if (distance > 0) {
        kmpl = parseFloat((distance / current.fuelLiters).toFixed(1));
      }
    }

    // Fallback: check if description explicitly records KM/L
    if (kmpl === 0 && current.description) {
      const match = current.description.match(/(\d+(\.\d+)?)\s*KM\/L/i);
      if (match) {
        kmpl = parseFloat(match[1]);
      }
    }

    if (kmpl > 0 && kmpl <= 120) {
      fuelTrendData.push({
        id: current.id || i,
        dateAD: current.dateAD,
        dateBS: current.dateBS,
        displayDate: current.dateAD.slice(5),
        odometerKm: current.odometerKm!,
        fuelLiters: current.fuelLiters || 0,
        amount: current.amount,
        distanceKm: distance,
        kmpl,
        description: current.description
      });
    }
  }

  // Mileage Metrics
  const allKmpl = fuelTrendData.map(d => d.kmpl);
  const avgKmpl = allKmpl.length > 0
    ? (allKmpl.reduce((a, b) => a + b, 0) / allKmpl.length).toFixed(1)
    : '0.0';
  const bestKmpl = allKmpl.length > 0
    ? Math.max(...allKmpl).toFixed(1)
    : '0.0';
  const latestKmpl = fuelTrendData.length > 0
    ? fuelTrendData[fuelTrendData.length - 1].kmpl.toFixed(1)
    : '0.0';

  const benchmarkKmpl = bike.category === 'Scooter'
    ? 42
    : bike.cc <= 125
      ? 48
      : bike.cc <= 160
        ? 39
        : bike.cc <= 250
          ? 34
          : 27;

  const fuelCostPerKm = parseFloat(avgKmpl) > 0
    ? (170.5 / parseFloat(avgKmpl)).toFixed(2)
    : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const bsDate = adToBs(dateAD).formatted;

    await db.expenses.add({
      bikeId: bike.id!,
      dateAD,
      dateBS: bsDate,
      category,
      amount: Number(amount),
      description: description.trim(),
      odometerKm: Number(odometerKm) || undefined,
      fuelLiters: category === 'fuel' ? Number(fuelLiters) || undefined : undefined
    });

    if (Number(odometerKm) > (bike.odometerKm || 0)) {
      await db.bikes.update(bike.id!, { odometerKm: Number(odometerKm) });
    }

    setIsLogging(false);
    setDescription('');
    onRefresh();
  };

  const filteredExpenses = expenses
    .filter(exp => {
      if (activeTab === 'all') return true;
      if (activeTab === 'service') return exp.category === 'service' || exp.category === 'repair_parts';
      if (activeTab === 'tax') return exp.category === 'tax_renewal';
      if (activeTab === 'fuel') return exp.category === 'fuel';
      return true;
    })
    .sort((a, b) => new Date(b.dateAD).getTime() - new Date(a.dateAD).getTime());

  return (
    <div className="space-y-6">
      {/* Top Spending KPI Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-medium">
            {language === 'ne' ? 'सवारीमा कुल खर्च' : 'Total Bike Expenses'}
          </span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            Rs. {totalSpent.toLocaleString()}
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">
            {expenses.length} {language === 'ne' ? 'कुल रेकर्डहरू' : 'recorded transactions'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-medium">
            {language === 'ne' ? 'प्रति कि.मी. लागत' : 'Cost per Kilometer'}
          </span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            Rs. {costPerKm} <span className="text-xs font-normal text-slate-400 font-sans">/ KM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {bike.odometerKm?.toLocaleString()} KM tracked
          </div>
        </div>
      </div>

      {/* Fuel Efficiency (KM/L) Trends Chart (Powered by Recharts) */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {language === 'ne' ? 'इन्धन खपत तथा माइलेज ट्रेन्ड' : 'Fuel Efficiency Trends'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-mono font-bold">
                  KM/L
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'ne'
                  ? `${bike.name} को पम्प रिफ्युल अनुसार प्रति लिटर माइलेज`
                  : `Real-time fuel economy tracking across pump refills for ${bike.name}`}
              </p>
            </div>
          </div>

          {onOpenRefuel && (
            <button
              onClick={onOpenRefuel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-pink-500/20 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ne' ? 'पेट्रोल दर्ता' : 'Log Refuel'}</span>
            </button>
          )}
        </div>

        {/* 4 Mileage KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'ne' ? 'औसत माइलेज' : 'Average Economy'}
            </span>
            <div className="text-xl font-black text-pink-400 font-mono mt-0.5">
              {avgKmpl} <span className="text-xs font-normal text-slate-400">KM/L</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {fuelTrendData.length} {language === 'ne' ? 'रिफ्युल गणना' : 'fills tracked'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'ne' ? 'उत्कृष्ट माइलेज' : 'Best Economy'}
            </span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {bestKmpl} <span className="text-xs font-normal text-slate-400">KM/L</span>
            </div>
            <span className="text-[10px] text-emerald-500/80">
              Peak efficiency
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'ne' ? 'पछिल्लो माइलेज' : 'Latest Refill'}
            </span>
            <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">
              {latestKmpl} <span className="text-xs font-normal text-slate-400">KM/L</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Recent pump fill
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'ne' ? 'इन्धन खर्च / कि.मी.' : 'Running Cost / KM'}
            </span>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              Rs. {fuelCostPerKm}
            </div>
            <span className="text-[10px] text-slate-500">
              @ Rs. 170.5/L NOC
            </span>
          </div>
        </div>

        {/* The Recharts Area Chart */}
        {fuelTrendData.length >= 1 ? (
          <div className="space-y-3 pt-1">
            <div className="w-full h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={fuelTrendData}
                  margin={{ top: 15, right: 12, left: -15, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="fuelEfficiencyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    domain={[(dataMin: number) => Math.max(10, Math.floor(dataMin - 4)), (dataMax: number) => Math.ceil(dataMax + 4)]}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    unit=" km/l"
                  />
                  <ReferenceLine
                    y={benchmarkKmpl}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target: ${benchmarkKmpl} KM/L`,
                      fill: '#f59e0b',
                      fontSize: 10,
                      position: 'insideTopRight'
                    }}
                  />
                  <Tooltip content={<CustomFuelTooltip language={language} />} />
                  <Area
                    type="monotone"
                    dataKey="kmpl"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fuelEfficiencyGrad)"
                    dot={{ r: 4, fill: '#ec4899', stroke: '#09090b', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Chart Legend & Context */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span className="text-slate-300 font-medium">
                    {language === 'ne' ? 'वास्तविक माइलेज' : 'Actual Mileage (KM/L)'}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
                  <span className="text-slate-300 font-medium">
                    {language === 'ne' ? `मापदण्ड (${benchmarkKmpl} KM/L)` : `Target Baseline (${benchmarkKmpl} KM/L)`}
                  </span>
                </span>
              </div>
              <span className="font-mono text-slate-500">
                {bike.category} {bike.cc}cc
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'ne' ? 'कुनै इन्धन माइलेज रेकर्ड छैन' : 'No Fuel Efficiency Records Yet'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {language === 'ne'
                  ? 'पम्पमा पेट्रोल भर्दा ओडोमिटर कि.मी. र लिटर दर्ता गर्नुहोस्। एपले स्वतः प्रति लिटर माइलेज ट्रेन्ड चार्ट बनाउनेछ।'
                  : 'Log refuels with your odometer KM and liters. The app will automatically calculate and plot your KM/L trends.'}
              </p>
            </div>
            {onOpenRefuel && (
              <button
                onClick={onOpenRefuel}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ne' ? 'पहिलो पेट्रोल दर्ता गर्नुहोस्' : 'Log First Refuel'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Monthly Bar Chart */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              {language === 'ne' ? 'पछिल्लो ६ महिनाको खर्च' : '6-Month Expense Trend'}
            </h3>
          </div>
          <button
            onClick={() => setIsLogging(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-sm shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'खर्च थप्नुहोस्' : 'Add Expense'}</span>
          </button>
        </div>

        {/* CSS/SVG Bar Chart */}
        <div className="pt-4 flex items-end justify-between gap-2 h-44 border-b border-slate-800 px-2">
          {monthLabels.map(mKey => {
            const val = monthlyData[mKey] || 0;
            const heightPercent = Math.max(6, Math.round((val / maxMonthly) * 100));
            const monthName = new Date(mKey + '-01').toLocaleString('en-US', { month: 'short' });
            return (
              <div key={mKey} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition truncate">
                  Rs.{val >= 1000 ? Math.round(val / 1000) + 'k' : val}
                </div>
                <div className="w-full max-w-[36px] bg-slate-800 rounded-t-lg overflow-hidden flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-400 pb-1">
                  {monthName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown Progress */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <PieChart className="w-4 h-4 text-cyan-400" />
          <span>{language === 'ne' ? 'शीर्षक अनुसार खर्च विभाजन' : 'Category Breakdown'}</span>
        </h3>

        <div className="space-y-3 pt-2">
          {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map(catKey => {
            const cat = CATEGORY_META[catKey];
            const catAmount = categoryTotals[catKey] || 0;
            const pct = totalSpent > 0 ? Math.round((catAmount / totalSpent) * 100) : 0;
            const Icon = cat.icon;

            return (
              <div key={catKey} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{language === 'ne' ? cat.labelNe : cat.labelEn}</span>
                  </span>
                  <span className="font-mono font-semibold text-white">
                    Rs. {catAmount.toLocaleString()} <span className="text-slate-500 text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Expense Modal */}
      {isLogging && (
        <form onSubmit={handleSubmit} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">
              {language === 'ne' ? 'नयाँ खर्च दर्ता गर्नुहोस्' : 'Log New Expense'}
            </h3>
            <button
              type="button"
              onClick={() => setIsLogging(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {language === 'ne' ? 'खर्चको शीर्षक' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map(key => (
                <option key={key} value={key}>
                  {language === 'ne' ? CATEGORY_META[key].labelNe : CATEGORY_META[key].labelEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {language === 'ne' ? 'रकम (रु.)' : 'Amount (Rs.)'}
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Expense Date Picker with BS / AD Selection */}
          <NepaliDatePicker
            label={language === 'ne' ? 'खर्च मिति' : 'Expense Date'}
            valueAD={dateAD}
            onChange={(ad) => setDateAD(ad)}
            required={true}
            language={language}
          />

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {language === 'ne' ? 'विवरण' : 'Description'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10L Petrol, Chain Lube Spray, Tubeless Puncture Fix"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {category === 'fuel' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'ne' ? 'इन्धन परिमाण (लिटर - ऐच्छिक)' : 'Fuel Liters (Optional)'}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 11.5"
                value={fuelLiters || ''}
                onChange={(e) => setFuelLiters(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {language === 'ne' ? 'ओडोमिटर कि.मी. (ऐच्छिक)' : 'Odometer KM (Optional)'}
            </label>
            <input
              type="number"
              placeholder="e.g. 9850"
              value={odometerKm || ''}
              onChange={(e) => setOdometerKm(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLogging(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              {language === 'ne' ? 'रद्द' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              {language === 'ne' ? 'खर्च सेभ गर्नुहोस्' : 'Save Expense'}
            </button>
          </div>
        </form>
      )}

      {/* Filterable Expense Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            {language === 'ne' ? 'हालका खर्च रेकर्डहरू' : 'Expense Log'}
          </h3>
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'all' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'service' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              Service
            </button>
            <button
              onClick={() => setActiveTab('tax')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'tax' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              Tax
            </button>
            <button
              onClick={() => setActiveTab('fuel')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'fuel' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'
              }`}
            >
              Fuel
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredExpenses.map(item => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.service;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    <meta.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                      {item.description}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.dateAD} (BS: {item.dateBS})
                      {item.odometerKm && ` · ${item.odometerKm.toLocaleString()} KM`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-white font-mono">
                    Rs. {item.amount.toLocaleString()}
                  </div>
                  <span
                    className="text-[10px] uppercase font-semibold tracking-wider block mt-0.5"
                    style={{ color: meta.color }}
                  >
                    {language === 'ne' ? meta.labelNe : meta.labelEn.split(' ')[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
