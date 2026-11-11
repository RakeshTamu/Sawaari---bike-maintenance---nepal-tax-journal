import { TaxStatusResult } from '../types';

/**
 * Nepal Motor Vehicle & Transport Management Act Tax & Grace Period Engine
 *
 * Rules:
 * 1. Annual tax must be renewed on or before the registration expiry date.
 * 2. 90-Day Grace Period: The law provides 90 days after expiry during which the owner
 *    can renew without any monetary fine/penalty.
 * 3. After 90 days (Days 91+):
 *    - 1 to 30 days past grace (days 91-120): 5% fine on base tax
 *    - 31 to 75 days past grace (days 121-165): 10% fine on base tax
 *    - Up to end of fiscal year: 20% fine
 *    - Next fiscal year onwards: 32% to 100%
 */

export function calculateNepalTaxStatus(
  validUntilAD: string,
  baseTaxAmount: number = 6500, // Default 126-225cc standard
  currentDateInput?: Date | string
): TaxStatusResult {
  const now = currentDateInput ? new Date(currentDateInput) : new Date();
  // Strip time for clean day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const expiryDate = new Date(validUntilAD);
  const expiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());

  if (isNaN(expiry.getTime())) {
    return {
      status: 'EXPIRED',
      badgeLabel: 'NO DATE SET',
      badgeColor: 'rose',
      daysRemaining: 0,
      daysOverdue: 0,
      daysLeftInGrace: 0,
      fineMultiplierPercent: 0,
      estimatedFineAmount: 0,
      message: 'Please set vehicle tax renewal date',
      reminderAlert: 'none'
    };
  }

  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Case 1: Tax is Still Valid (diffDays >= 0)
  if (diffDays >= 0) {
    let reminderAlert: TaxStatusResult['reminderAlert'] = 'none';
    if (diffDays <= 1) {
      reminderAlert = '1_day';
    } else if (diffDays <= 5) {
      reminderAlert = '5_days';
    } else if (diffDays <= 15) {
      reminderAlert = '15_days';
    }

    return {
      status: 'VALID',
      badgeLabel: 'TAX VALID',
      badgeColor: 'emerald',
      daysRemaining: diffDays,
      daysOverdue: 0,
      daysLeftInGrace: 90,
      fineMultiplierPercent: 0,
      estimatedFineAmount: 0,
      message: diffDays === 0
        ? 'Tax expires today! Renew at Yatayat office or online.'
        : `${diffDays} days remaining until Blue Book expiry.`,
      reminderAlert
    };
  }

  // Case 2: Expired, but within 90-Day Grace Period
  const daysOverdue = Math.abs(diffDays);
  const graceRemaining = 90 - daysOverdue;

  if (daysOverdue <= 90) {
    return {
      status: 'GRACE_PERIOD',
      badgeLabel: '90-DAY GRACE PERIOD',
      badgeColor: 'amber',
      daysRemaining: 0,
      daysOverdue,
      daysLeftInGrace: graceRemaining,
      fineMultiplierPercent: 0,
      estimatedFineAmount: 0,
      message: `Tax expired ${daysOverdue} days ago. Within 90-day grace period: ${graceRemaining} days left before fines begin!`,
      reminderAlert: graceRemaining <= 7 ? 'grace_ending' : 'none'
    };
  }

  // Case 3: Overdue and Fined (daysOverdue > 90)
  const daysPastGrace = daysOverdue - 90;
  let finePercent = 5;

  if (daysPastGrace <= 30) {
    finePercent = 5;
  } else if (daysPastGrace <= 75) {
    finePercent = 10;
  } else if (daysPastGrace <= 275) {
    finePercent = 20;
  } else {
    // Multi-year or elapsed fiscal period
    finePercent = 32;
  }

  const estimatedFineAmount = Math.round((baseTaxAmount * finePercent) / 100);

  return {
    status: 'FINED',
    badgeLabel: 'TAX OVERDUE / FINED',
    badgeColor: 'rose',
    daysRemaining: 0,
    daysOverdue,
    daysLeftInGrace: 0,
    fineMultiplierPercent: finePercent,
    estimatedFineAmount,
    message: `Tax overdue by ${daysOverdue} days (${daysPastGrace} days past grace). ${finePercent}% penalty applies (approx. Rs. ${estimatedFineAmount.toLocaleString()})!`,
    reminderAlert: 'fined'
  };
}

/**
 * Nepal Standard Annual Two-Wheeler Road Tax (Bagmati Province & Federal Rates)
 */
export function getEstimatedBaseTax(cc: number, category: string = 'Bike'): number {
  if (category === 'Electric') {
    return 2000;
  }
  if (category === 'Scooter') {
    return cc <= 125 ? 3000 : 6500;
  }
  if (cc <= 125) return 3000;
  if (cc <= 225) return 6500;
  if (cc <= 400) return 11500;
  if (cc <= 650) return 22000;
  return 30000;
}
