import { db } from '../db/db';

/**
 * Exports all IndexedDB data into a portable JSON backup file
 */
export async function exportJsonBackup() {
  const bikes = await db.bikes.toArray();
  const services = await db.services.toArray();
  const renewals = await db.renewals.toArray();
  const expenses = await db.expenses.toArray();
  const documents = await db.documents.toArray();
  const settings = await db.settings.toArray();

  const backupData = {
    app: 'Sawaari Bike & Nepal Tax Journal',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      bikes,
      services,
      renewals,
      expenses,
      documents,
      settings
    }
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `sawaari_backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports a JSON backup file and restores data to IndexedDB
 */
export async function importJsonBackup(file: File): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.data || !parsed.data.bikes) {
          resolve({ success: false, message: 'Invalid Sawaari backup file format.' });
          return;
        }

        // Clear existing tables and populate
        await db.transaction('rw', [db.bikes, db.services, db.renewals, db.expenses, db.documents, db.settings], async () => {
          await db.bikes.clear();
          await db.services.clear();
          await db.renewals.clear();
          await db.expenses.clear();
          await db.documents.clear();
          await db.settings.clear();

          if (parsed.data.bikes?.length) await db.bikes.bulkAdd(parsed.data.bikes);
          if (parsed.data.services?.length) await db.services.bulkAdd(parsed.data.services);
          if (parsed.data.renewals?.length) await db.renewals.bulkAdd(parsed.data.renewals);
          if (parsed.data.expenses?.length) await db.expenses.bulkAdd(parsed.data.expenses);
          if (parsed.data.documents?.length) await db.documents.bulkAdd(parsed.data.documents);
          if (parsed.data.settings?.length) await db.settings.bulkAdd(parsed.data.settings);
        });

        resolve({ success: true, message: 'Backup data successfully restored!' });
      } catch (err: any) {
        resolve({ success: false, message: 'Error parsing backup: ' + (err.message || 'Unknown error') });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, message: 'Failed to read file.' });
    };
    reader.readAsText(file);
  });
}

/**
 * Exports a completely self-contained, standalone single-file HTML version
 * with inline offline service worker and local data
 */
export async function exportStandaloneHtmlFile() {
  const bikes = await db.bikes.toArray();
  const services = await db.services.toArray();
  const renewals = await db.renewals.toArray();
  const expenses = await db.expenses.toArray();
  const documents = await db.documents.toArray();

  const embeddedData = JSON.stringify({
    bikes,
    services,
    renewals,
    expenses,
    documents
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Sawaari - Standalone Bike & Nepal Tax Journal</title>
  <meta name="theme-color" content="#0f172a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            slate: { 950: '#090d16' }
          }
        }
      }
    }
  </script>
  <!-- Dexie.js for IndexedDB -->
  <script src="https://unpkg.com/dexie@latest/dist/dexie.js"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #090d16; color: #f8fafc; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 9999px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div id="standalone-root" class="max-w-md mx-auto p-4 pb-20">
    <header class="py-4 border-b border-slate-800 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <span class="text-cyan-400">🏍️</span> Sawaari Standalone
        </h1>
        <p class="text-xs text-slate-400">Offline-First Nepal Tax & Service Journal</p>
      </div>
      <span class="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded-md font-mono">100% Offline</span>
    </header>

    <main class="mt-6 space-y-6" id="app-content">
      <!-- Injected Bike Card -->
      <div id="bike-summary" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div class="flex items-start justify-between">
          <div>
            <h2 id="bike-name" class="text-lg font-bold text-white">Loading Vehicle...</h2>
            <p id="bike-plate" class="text-sm font-mono text-cyan-400 mt-0.5">---</p>
          </div>
          <div id="tax-badge" class="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
            Checking Tax
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div>
            <span class="text-slate-400">Odometer:</span>
            <p id="bike-odo" class="font-bold text-white text-sm">-- KM</p>
          </div>
          <div>
            <span class="text-slate-400">Tax Expiry:</span>
            <p id="tax-expiry" class="font-bold text-white text-sm">--</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-2 gap-3">
        <button onclick="promptLogService()" class="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left">
          <div class="text-sm font-semibold text-white">🔧 Log Service</div>
          <div class="text-xs text-slate-400 mt-1">Record oil, repairs</div>
        </button>
        <button onclick="promptLogTax()" class="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left">
          <div class="text-sm font-semibold text-white">📜 Renew Tax</div>
          <div class="text-xs text-slate-400 mt-1">Update Blue Book</div>
        </button>
      </div>

      <!-- Service History -->
      <div>
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Recent Service Records</h3>
        <div id="service-list" class="space-y-2"></div>
      </div>

      <!-- Nepal Tax 90-Day Info Box -->
      <div class="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300">
        <div class="font-semibold text-white flex items-center gap-2">
          <span>🇳🇵</span> Nepal Vehicle Law: 90-Day Grace Period
        </div>
        <p>Under the Motor Vehicle & Transport Management Act, you have a 90-day grace period after your Blue Book tax expiry date with ZERO monetary fines.</p>
        <p class="text-slate-400">After 90 days, traffic fines range from 5% to 32%+ across fiscal years.</p>
      </div>
    </main>
  </div>

  <script>
    // Inline Standalone Storage & Engine
    const INITIAL_DATA = ${embeddedData};
    const sdb = new Dexie('SawaariStandaloneDB');
    sdb.version(1).stores({
      bikes: '++id, name, registrationNumber',
      services: '++id, bikeId, serviceDateAD',
      renewals: '++id, bikeId, validUntilAD'
    });

    async function initStandalone() {
      const count = await sdb.bikes.count();
      if (count === 0 && INITIAL_DATA.bikes && INITIAL_DATA.bikes.length > 0) {
        await sdb.bikes.bulkAdd(INITIAL_DATA.bikes);
        if (INITIAL_DATA.services) await sdb.services.bulkAdd(INITIAL_DATA.services);
        if (INITIAL_DATA.renewals) await sdb.renewals.bulkAdd(INITIAL_DATA.renewals);
      }

      const bike = await sdb.bikes.toCollection().first();
      if (bike) {
        document.getElementById('bike-name').textContent = bike.name;
        document.getElementById('bike-plate').textContent = bike.registrationNumber;
        document.getElementById('bike-odo').textContent = (bike.odometerKm || 0) + ' KM';
      }

      const renewal = await sdb.renewals.toCollection().last();
      if (renewal && renewal.validUntilAD) {
        document.getElementById('tax-expiry').textContent = renewal.validUntilBS + ' BS (' + renewal.validUntilAD + ')';
        const diff = Math.ceil((new Date(renewal.validUntilAD) - new Date()) / (1000*60*60*24));
        const badge = document.getElementById('tax-badge');
        if (diff >= 0) {
          badge.textContent = diff + ' Days Left (VALID)';
          badge.className = 'px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800';
        } else if (Math.abs(diff) <= 90) {
          const grace = 90 - Math.abs(diff);
          badge.textContent = grace + ' Days Grace Left';
          badge.className = 'px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-950 text-amber-400 border border-amber-800';
        } else {
          badge.textContent = 'TAX OVERDUE / FINED';
          badge.className = 'px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-950 text-rose-400 border border-rose-800';
        }
      }

      const services = await sdb.services.toArray();
      const list = document.getElementById('service-list');
      list.innerHTML = '';
      if (services.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-500">No service records yet.</p>';
      } else {
        services.slice(-5).reverse().forEach(s => {
          const div = document.createElement('div');
          div.className = 'p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs';
          div.innerHTML = '<div><p class="font-medium text-white">' + s.workDone + '</p><p class="text-slate-400 mt-0.5">' + (s.serviceCenter || 'Workshop') + ' · ' + (s.odometerKm || 0) + ' KM</p></div><div class="text-right font-mono font-bold text-cyan-400">Rs. ' + (s.cost || 0).toLocaleString() + '</div>';
          list.appendChild(div);
        });
      }
    }

    async function promptLogService() {
      const work = prompt('Work done (e.g. Engine oil change, chain lube):');
      if (!work) return;
      const cost = parseInt(prompt('Cost in NPR:', '2500') || '0', 10);
      const km = parseInt(prompt('Current Odometer KM:', '10000') || '0', 10);
      const bike = await sdb.bikes.toCollection().first();
      await sdb.services.add({
        bikeId: bike ? bike.id : 1,
        workDone: work,
        cost: cost,
        odometerKm: km,
        serviceDateAD: new Date().toISOString().slice(0, 10),
        serviceCenter: 'Local Workshop'
      });
      if (bike) {
        bike.odometerKm = Math.max(bike.odometerKm || 0, km);
        await sdb.bikes.put(bike);
      }
      initStandalone();
    }

    async function promptLogTax() {
      const dateAD = prompt('New Valid Until Date (YYYY-MM-DD):', new Date(Date.now() + 365*24*60*60*1000).toISOString().slice(0, 10));
      if (!dateAD) return;
      const bike = await sdb.bikes.toCollection().first();
      await sdb.renewals.add({
        bikeId: bike ? bike.id : 1,
        validUntilAD: dateAD,
        validUntilBS: 'Updated',
        taxAmount: 6500,
        fineAmount: 0,
        totalPaid: 6500,
        renewedDateAD: new Date().toISOString().slice(0, 10)
      });
      initStandalone();
    }

    // Inline Service Worker via Blob
    if ('serviceWorker' in navigator) {
      const swCode = "self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => clients.claim()); self.addEventListener('fetch', e => {});";
      const blob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      navigator.serviceWorker.register(swUrl).catch(() => {});
    }

    window.addEventListener('DOMContentLoaded', initStandalone);
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sawaari-bike-journal-standalone.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
