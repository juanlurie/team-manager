function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

export function getSAPublicHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  const offset = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };
  return [
    new Date(year, 0, 1),    // New Year's Day
    new Date(year, 2, 21),   // Human Rights Day
    offset(easter, -2),      // Good Friday
    offset(easter, 1),       // Family Day
    new Date(year, 3, 27),   // Freedom Day
    new Date(year, 4, 1),    // Workers' Day
    new Date(year, 5, 16),   // Youth Day
    new Date(year, 7, 9),    // National Women's Day
    new Date(year, 8, 24),   // Heritage Day
    new Date(year, 11, 16),  // Day of Reconciliation
    new Date(year, 11, 25),  // Christmas Day
    new Date(year, 11, 26),  // Day of Goodwill
  ];
}

export function countWorkingDays(start: Date, end: Date): { days: number; holidaysSkipped: number } {
  const years = new Set<number>();
  const cur = new Date(start);
  while (cur <= end) { years.add(cur.getFullYear()); cur.setDate(cur.getDate() + 1); }

  const holidays = new Set<string>();
  years.forEach(y => getSAPublicHolidays(y).forEach(h => holidays.add(key(h))));

  let days = 0, holidaysSkipped = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      if (holidays.has(key(d))) holidaysSkipped++;
      else days++;
    }
    d.setDate(d.getDate() + 1);
  }
  return { days, holidaysSkipped };
}

export function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function key(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
