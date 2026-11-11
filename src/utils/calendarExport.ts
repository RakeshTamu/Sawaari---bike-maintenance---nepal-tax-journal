/**
 * Offline iCalendar (.ics) Event Generator
 * Generates standards-compliant .ics files with reminder alarms
 * for Tax Renewals and Bike Service appointments.
 */

export interface CalendarEventDetails {
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  location?: string;
  url?: string;
  reminderDaysBefore?: number[]; // e.g. [15, 5, 1]
}

export function downloadIcsFile(event: CalendarEventDetails) {
  const parts = event.startDate.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return;

  const yyyy = parts[0];
  const mm = String(parts[1]).padStart(2, '0');
  const dd = String(parts[2]).padStart(2, '0');

  const dtStart = `${yyyy}${mm}${dd}T090000`;
  const dtEnd = `${yyyy}${mm}${dd}T100000`;
  const uid = `bike-tax-${Date.now()}@bikemanager.local`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const reminders = event.reminderDaysBefore || [15, 5, 1];
  const alarms = reminders.map((days) => `
BEGIN:VALARM
TRIGGER:-P${days}D
ACTION:DISPLAY
DESCRIPTION:Reminder: ${escapeIcsText(event.title)} is due in ${days} day(s)!
END:VALARM`).join('');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nepal Bike & Tax Renewal Journal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    alarms,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeFilename = event.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `${safeFilename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
