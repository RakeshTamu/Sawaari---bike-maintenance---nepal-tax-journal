export type VehicleCategory = 'Bike' | 'Scooter' | 'Car' | 'Electric' | 'Other';

export interface Bike {
  id?: number;
  name: string; // e.g. "Bajaj Pulsar 220F"
  category: VehicleCategory;
  registrationNumber: string; // e.g. "Ba 02-031 Pa 4521"
  platePhotoUrl?: string; // Base64 photo of physical license plate
  showPlateAsPhoto?: boolean; // Preference to display plate photo instead of text
  boughtYearBS: string; // e.g. "2078"
  boughtYearAD: string; // e.g. "2021"
  cc: number; // e.g. 220
  engineNo?: string;
  chassisNo?: string;
  photoUrl?: string; // Base64
  odometerKm: number;
  isPrimary?: boolean;
  createdDate: string;
}

export interface MaintenanceCategoryItem {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface ServiceSubItem {
  id: string;
  name: string;
  category: string; // Every item must belong to a category
  cost: number;
}

export interface ServiceRecord {
  id?: number;
  bikeId: number;
  serviceDateAD: string;
  serviceDateBS: string;
  odometerKm: number;
  categories?: string[]; // e.g. ['Engine oil', 'Brake pads', 'Air filter']
  subItems?: ServiceSubItem[]; // Itemized sub-entries with individual costs
  nextServiceKm?: number;
  nextServiceDateAD?: string;
  enableReminder?: boolean;
  reminderInterval?: 'today' | '1_week' | '2_weeks' | '4_weeks';
  snoozeDays?: number; // Postpone reminder count
  cost: number;
  serviceCenter: string;
  workDone: string;
  receiptPhoto?: string; // Base64
  notes?: string;
}

export interface RenewalRecord {
  id?: number;
  bikeId: number;
  renewedDateAD: string;
  renewedDateBS: string;
  validUntilAD: string;
  validUntilBS: string;
  taxAmount: number;
  fineAmount: number;
  totalPaid: number;
  officeLocation: string; // e.g. "Ekantakuna, Lalitpur" or "Gurhudhumo, Bhaktapur"
  bluebookPages: string[]; // Base64 images
  receiptPhoto?: string; // Base64 photo of tax voucher or blue book stamp
  enableReminder?: boolean;
  reminderInterval?: 'today' | '1_week' | '2_weeks' | '4_weeks';
  notes?: string;
}

export type ConsumableComponentType = 
  | 'engine_oil' 
  | 'chain_sprocket' 
  | 'brake_pads' 
  | 'tyres' 
  | 'battery' 
  | 'air_filter'
  | 'spark_plug';

export interface ComponentWearItem {
  id?: number;
  bikeId: number;
  type: ConsumableComponentType;
  name: string;
  lastReplacedKm: number;
  lifespanKm: number;
  lastReplacedDateAD: string;
  notes?: string;
}

export type ExpenseCategory = 'service' | 'tax_renewal' | 'repair_parts' | 'fuel' | 'insurance' | 'accessories';

export interface ExpenseRecord {
  id?: number;
  bikeId: number;
  dateAD: string;
  dateBS: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  odometerKm?: number;
  fuelLiters?: number;
}

export interface DocumentItem {
  id?: number;
  bikeId: number;
  title: string;
  category: 'bluebook_front' | 'bluebook_tax' | 'insurance' | 'pollution' | 'license' | 'other';
  imageBase64: string;
  uploadDate: string;
  notes?: string;
}

export type AppTheme = 'oled' | 'racing_amber' | 'cyber_violet' | 'emerald' | 'slate_dark' | 'light';

export interface AppSettings {
  pinHash?: string;
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  language: 'en' | 'ne';
  theme: AppTheme;
  autoLockMinutes: number;
}

export type TaxStatusType = 'VALID' | 'GRACE_PERIOD' | 'FINED' | 'EXPIRED';

export interface TaxStatusResult {
  status: TaxStatusType;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose';
  daysRemaining: number;
  daysOverdue: number;
  daysLeftInGrace: number;
  fineMultiplierPercent: number;
  estimatedFineAmount: number;
  message: string;
  reminderAlert: 'none' | '15_days' | '5_days' | '1_day' | 'grace_ending' | 'fined';
}
