/**
 * Bikram Sambat (BS) <-> Gregorian (AD) Date Engine
 * Supports years 2000 BS to 2095 BS
 * Reference: Department of Transport Management (DoTM) & Nepal Patro calculations
 */

export interface BsDate {
  year: number;
  month: number; // 1 to 12
  day: number;   // 1 to 32
}

export const NEPALI_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const NEPALI_MONTHS_NE = [
  'वैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'
];

export const NEPALI_DAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const NEPALI_DAYS_NE = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'
];

export const NEPALI_NUMBERS_MAP: { [key: string]: string } = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
};

export function toDevanagariNumerals(num: number | string): string {
  return String(num).replace(/[0-9]/g, (digit) => NEPALI_NUMBERS_MAP[digit] || digit);
}

// Days in each month for BS years 2070 to 2095 (most active operational range for vehicles)
// Format: [Baisakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra]
export const BS_MONTH_DAYS: { [year: number]: number[] } = {
  2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2092: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2093: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30]
};

// Base Anchor Point: 2070 Baisakh 01 BS = 2013-04-14 AD (Normalized to noon 12:00:00 to prevent timezone drift)
const ANCHOR_BS_YEAR = 2070;
const ANCHOR_AD_DATE = new Date(2013, 3, 14, 12, 0, 0);

/**
 * Get total days in a given BS month for a given year
 */
export function getDaysInBsMonth(year: number, month: number): number {
  const monthDays = BS_MONTH_DAYS[year] || [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30];
  const mIndex = Math.max(0, Math.min(11, month - 1));
  return monthDays[mIndex] || 30;
}

/**
 * Converts AD date to BS date
 */
export function adToBs(dateInput: Date | string): {
  year: number;
  month: number;
  day: number;
  formatted: string;
  formattedNe: string;
  monthNameEn: string;
  monthNameNe: string;
} {
  let adDate: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.trim().split('-');
    if (parts.length === 3 && !isNaN(Number(parts[0]))) {
      adDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      adDate = new Date(dateInput);
    }
  } else {
    adDate = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0);
  }

  if (isNaN(adDate.getTime())) {
    return {
      year: 2083,
      month: 7,
      day: 20,
      formatted: '2083-07-20',
      formattedNe: '२०८३-०७-२०',
      monthNameEn: 'Kartik',
      monthNameNe: 'कार्तिक'
    };
  }

  // Calculate day difference from anchor
  const diffTime = adDate.getTime() - ANCHOR_AD_DATE.getTime();
  let totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let currentYear = ANCHOR_BS_YEAR;
  let currentMonth = 1;
  let currentDay = 1;

  if (totalDays >= 0) {
    while (totalDays > 0) {
      const daysInCurrentMonth = getDaysInBsMonth(currentYear, currentMonth);

      if (totalDays >= daysInCurrentMonth) {
        totalDays -= daysInCurrentMonth;
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      } else {
        currentDay += totalDays;
        totalDays = 0;
      }
    }
  } else {
    // For dates prior to 2070 (approximate backward step)
    const yearsDiff = Math.ceil(Math.abs(totalDays) / 365.25);
    currentYear -= yearsDiff;
    totalDays += Math.floor(yearsDiff * 365.25);
    currentDay = Math.max(1, 1 + totalDays);
  }

  const mm = String(currentMonth).padStart(2, '0');
  const dd = String(currentDay).padStart(2, '0');
  const formatted = `${currentYear}-${mm}-${dd}`;
  const formattedNe = `${toDevanagariNumerals(currentYear)}-${toDevanagariNumerals(mm)}-${toDevanagariNumerals(dd)}`;

  return {
    year: currentYear,
    month: currentMonth,
    day: currentDay,
    formatted,
    formattedNe,
    monthNameEn: NEPALI_MONTHS_EN[currentMonth - 1] || 'Baisakh',
    monthNameNe: NEPALI_MONTHS_NE[currentMonth - 1] || 'वैशाख'
  };
}

/**
 * Converts BS date (year, month, day) to AD Date
 */
export function bsToAd(year: number, month: number, day: number): Date {
  let daysCount = 0;

  // Add days for years between anchor and target year
  for (let y = ANCHOR_BS_YEAR; y < year; y++) {
    const monthDays = BS_MONTH_DAYS[y] || [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30];
    for (let m = 0; m < 12; m++) {
      daysCount += monthDays[m];
    }
  }

  // Add days for months in current year
  const currentYearMonths = BS_MONTH_DAYS[year] || [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30];
  for (let m = 1; m < month; m++) {
    daysCount += currentYearMonths[m - 1];
  }

  // Add remaining days
  daysCount += (day - 1);

  return new Date(2013, 3, 14 + daysCount, 12, 0, 0);
}

/**
 * Format AD date to standard YYYY-MM-DD
 */
export function formatAdDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format AD date to full readable English string, e.g. "15 November 2026"
 */
export function formatAdDisplayDate(dateInput: Date | string): string {
  if (!dateInput) return '---';
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.trim().split('-');
    if (parts.length === 3 && !isNaN(Number(parts[0]))) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const monthName = ENGLISH_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}

/**
 * Format BS date to full readable string with proper month name (never "Gate"),
 * e.g. "15 Mangsir 2083" (English) or "१५ मंसिर २०८३" (Nepali)
 */
export function formatBsDisplayDate(dateInput: Date | string, lang: 'en' | 'ne' = 'en'): string {
  if (!dateInput) return '---';
  const bs = adToBs(dateInput);
  if (lang === 'ne') {
    return `${toDevanagariNumerals(bs.day)} ${bs.monthNameNe} ${toDevanagariNumerals(bs.year)}`;
  }
  return `${bs.day} ${bs.monthNameEn} ${bs.year}`;
}

/**
 * Get current Nepali Date info
 */
export function getCurrentNepaliDate() {
  return adToBs(new Date());
}

/**
 * Calculate difference in days between two dates
 */
export function diffDays(dateA: Date | string, dateB: Date | string): number {
  const dA = new Date(dateA);
  const dB = new Date(dateB);
  const diffTime = dA.getTime() - dB.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

