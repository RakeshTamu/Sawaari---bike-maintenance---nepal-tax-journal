import Dexie, { Table } from 'dexie';
import { Bike, ServiceRecord, RenewalRecord, ExpenseRecord, DocumentItem, AppSettings, ComponentWearItem } from '../types';
import { adToBs, formatAdDate } from '../utils/nepaliCalendar';

export class SawaariDatabase extends Dexie {
  bikes!: Table<Bike, number>;
  services!: Table<ServiceRecord, number>;
  renewals!: Table<RenewalRecord, number>;
  expenses!: Table<ExpenseRecord, number>;
  documents!: Table<DocumentItem, number>;
  components!: Table<ComponentWearItem, number>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('SawaariBikeDB');
    this.version(1).stores({
      bikes: '++id, name, category, registrationNumber, isPrimary',
      services: '++id, bikeId, serviceDateAD, odometerKm, nextServiceDateAD',
      renewals: '++id, bikeId, renewedDateAD, validUntilAD',
      expenses: '++id, bikeId, dateAD, category, amount',
      documents: '++id, bikeId, category, title',
      components: '++id, bikeId, type',
      settings: 'key'
    });
  }
}

export const db = new SawaariDatabase();

// Pre-fill realistic demo data if database is empty
export async function seedInitialDataIfEmpty() {
  try {
    const bikeCount = await db.bikes.count();
    if (bikeCount > 0) return;

    const today = new Date();
  
  // Create primary bike: Yamaha MT-15 Version 2.0 (popular in Nepal)
  const bikeId = await db.bikes.add({
    name: 'Yamaha MT-15 V2',
    category: 'Bike',
    registrationNumber: 'Ba 02-031 Pa 4521',
    boughtYearBS: '2080',
    boughtYearAD: '2023',
    cc: 155,
    engineNo: 'G3K4E098213',
    chassisNo: 'ME4RG4618N0014298',
    odometerKm: 9850,
    isPrimary: true,
    createdDate: formatAdDate(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000))
  });

  // Calculate renewal valid until date (e.g. 45 days in future)
  const validUntil = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
  const renewedDate = new Date(today.getTime() - 320 * 24 * 60 * 60 * 1000);

  const validUntilBS = adToBs(validUntil).formatted;
  const renewedDateBS = adToBs(renewedDate).formatted;

  // Add initial renewal record
  await db.renewals.add({
    bikeId,
    renewedDateAD: formatAdDate(renewedDate),
    renewedDateBS,
    validUntilAD: formatAdDate(validUntil),
    validUntilBS,
    taxAmount: 6500,
    fineAmount: 0,
    totalPaid: 6500,
    officeLocation: 'Yatayat Karyalaya, Ekantakuna, Lalitpur',
    bluebookPages: [],
    notes: 'Paid via Nagarik App / ConnectIPS online portal'
  });

  // Add initial service history
  const lastServiceDate = new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000);
  const nextServiceDate = new Date(today.getTime() + 50 * 24 * 60 * 60 * 1000);

  await db.services.add({
    bikeId,
    serviceDateAD: formatAdDate(lastServiceDate),
    serviceDateBS: adToBs(lastServiceDate).formatted,
    odometerKm: 8500,
    nextServiceKm: 11500,
    nextServiceDateAD: formatAdDate(nextServiceDate),
    snoozeDays: 0,
    cost: 3850,
    serviceCenter: 'Yamaha Blue Square, Teku, Kathmandu',
    workDone: 'Motul 7100 10W40 Synthetic Engine Oil, Oil Filter replacement, Chain cleaning & Motul lube, Rear brake pad adjustment, Throttle play tuning.',
    notes: 'Running smooth, recommended replacing air filter at next 12,000 km service.'
  });

  // Older service record
  const olderServiceDate = new Date(today.getTime() - 150 * 24 * 60 * 60 * 1000);
  await db.services.add({
    bikeId,
    serviceDateAD: formatAdDate(olderServiceDate),
    serviceDateBS: adToBs(olderServiceDate).formatted,
    odometerKm: 5200,
    nextServiceKm: 8500,
    nextServiceDateAD: formatAdDate(lastServiceDate),
    snoozeDays: 0,
    cost: 3200,
    serviceCenter: 'Yamaha Blue Square, Teku, Kathmandu',
    workDone: 'Yamalube Sport Full Synthetic Oil, Spark plug cleaning, coolant top-up, battery health inspection.',
    notes: 'General checkup OK.'
  });

  // Add sample sequential fuel refuels for mileage tracking
  const fuelRefill1Date = new Date(today.getTime() - 75 * 24 * 60 * 60 * 1000);
  await db.expenses.add({
    bikeId,
    dateAD: formatAdDate(fuelRefill1Date),
    dateBS: adToBs(fuelRefill1Date).formatted,
    category: 'fuel',
    amount: 1705,
    description: 'Petrol Refuel: 10L @ Rs. 170.5/L (Baseline Refill)',
    odometerKm: 8100,
    fuelLiters: 10
  });

  const fuelRefill2Date = new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000);
  await db.expenses.add({
    bikeId,
    dateAD: formatAdDate(fuelRefill2Date),
    dateBS: adToBs(fuelRefill2Date).formatted,
    category: 'fuel',
    amount: 1705,
    description: 'Petrol Refuel: 10L @ Rs. 170.5/L (39.0 KM/L)',
    odometerKm: 8490,
    fuelLiters: 10
  });

  const fuelRefill3Date = new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000);
  await db.expenses.add({
    bikeId,
    dateAD: formatAdDate(fuelRefill3Date),
    dateBS: adToBs(fuelRefill3Date).formatted,
    category: 'fuel',
    amount: 1620,
    description: 'Petrol Refuel: 9.5L @ Rs. 170.5/L (41.1 KM/L)',
    odometerKm: 8880,
    fuelLiters: 9.5
  });

  const fuelRefill4Date = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  await db.expenses.add({
    bikeId,
    dateAD: formatAdDate(fuelRefill4Date),
    dateBS: adToBs(fuelRefill4Date).formatted,
    category: 'fuel',
    amount: 1671,
    description: 'Petrol Refuel: 9.8L @ Rs. 170.5/L (37.8 KM/L)',
    odometerKm: 9250,
    fuelLiters: 9.8
  });

  await db.expenses.add({
    bikeId,
    dateAD: formatAdDate(new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)),
    dateBS: adToBs(new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)).formatted,
    category: 'accessories',
    amount: 2500,
    description: 'Motowolf Phone Mount with Vibration Dampener & Radiator Guard',
    odometerKm: 8100
  });

    // Seed initial components for the MT-15
    await ensureDefaultComponentsForBike(bikeId, 9850);

    // Settings
    await db.settings.put({
      key: 'app_settings',
      value: {
        isPinEnabled: false,
        isBiometricEnabled: false,
        language: 'en',
        theme: 'oled',
        autoLockMinutes: 0
      } as AppSettings
    });
  } catch (err) {
    console.warn('Initial seed error / warning:', err);
  }
}

export async function ensureDefaultComponentsForBike(bikeId: number, currentOdo: number = 0) {
  try {
    const existing = await db.components.where('bikeId').equals(bikeId).toArray();
    if (existing.length > 0) return existing;

    const today = new Date();
    const todayStr = formatAdDate(today);

    // Default consumable parts list
    const defaults: Omit<ComponentWearItem, 'id'>[] = [
      {
        bikeId,
        type: 'engine_oil',
        name: 'Engine Oil & Filter',
        lastReplacedKm: Math.max(0, currentOdo - 1350),
        lifespanKm: 3500,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000)),
        notes: 'Motul 7100 10W40 Synthetic'
      },
      {
        bikeId,
        type: 'brake_pads',
        name: 'Brake Pads (Front & Rear)',
        lastReplacedKm: Math.max(0, currentOdo - 4650),
        lifespanKm: 9000,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 150 * 24 * 60 * 60 * 1000)),
        notes: 'OEM Nissin / Ceramic brake pads'
      },
      {
        bikeId,
        type: 'chain_sprocket',
        name: 'Drive Chain & Sprocket Set',
        lastReplacedKm: 0,
        lifespanKm: 18000,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)),
        notes: 'O-ring heavy duty drive chain'
      },
      {
        bikeId,
        type: 'tyres',
        name: 'Tyres (Front & Rear Set)',
        lastReplacedKm: 0,
        lifespanKm: 22000,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)),
        notes: 'Tubeless Radial Tyres'
      },
      {
        bikeId,
        type: 'air_filter',
        name: 'Engine Air Filter',
        lastReplacedKm: Math.max(0, currentOdo - 1350),
        lifespanKm: 8000,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000)),
        notes: 'Viscous paper element filter'
      },
      {
        bikeId,
        type: 'spark_plug',
        name: 'Spark Plug',
        lastReplacedKm: Math.max(0, currentOdo - 4650),
        lifespanKm: 12000,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 150 * 24 * 60 * 60 * 1000)),
        notes: 'NGK CPR8EA-9 Nickel Spark Plug'
      },
      {
        bikeId,
        type: 'battery',
        name: '12V VRLA Starter Battery',
        lastReplacedKm: 0,
        lifespanKm: 28000,
        lastReplacedDateAD: formatAdDate(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)),
        notes: 'Exide 12V 5Ah Maintenance-Free'
      }
    ];

    for (const item of defaults) {
      await db.components.add(item);
    }

    return await db.components.where('bikeId').equals(bikeId).toArray();
  } catch (err) {
    console.error('Error ensuring default components:', err);
    return [];
  }
}

