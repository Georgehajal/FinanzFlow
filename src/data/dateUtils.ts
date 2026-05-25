// Date utilities — interne Speicherung ISO (YYYY-MM-DD), UI in TT.MM.JJJJ

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

export function isValidISO(s: string): boolean {
  return ISO_RE.test(s.trim());
}

export function isValidDE(s: string): boolean {
  const m = DE_RE.exec(s.trim());
  if (!m) return false;
  const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return false;
  return true;
}

// "15.06.2030" → "2030-06-15"   (gibt null bei ungültig)
export function deToISO(s: string): string | null {
  const m = DE_RE.exec(s.trim());
  if (!m) return null;
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  return `${m[3]}-${mo}-${d}`;
}

// "2030-06-15" → "15.06.2030"   (gibt '' bei leer/ungültig)
export function isoToDE(s?: string): string {
  if (!s) return '';
  const m = ISO_RE.exec(s.trim());
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

// Akzeptiert TT.MM.JJJJ oder JJJJ-MM-TT und gibt ISO zurück; bei leer/ungültig null
export function parseDateInput(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (isValidISO(t)) return t;
  return deToISO(t);
}

// Heute als ISO
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Vergleich zweier ISO-Daten als Number
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Anzahl Monate zwischen zwei ISO-Daten (b − a)
export function monthsBetweenISO(a: string, b: string): number {
  if (!a || !b) return 0;
  const aD = new Date(a + 'T00:00:00');
  const bD = new Date(b + 'T00:00:00');
  let m = (bD.getFullYear() - aD.getFullYear()) * 12 + (bD.getMonth() - aD.getMonth());
  if (bD.getDate() < aD.getDate()) m -= 1;
  return m;
}

// ISO-Datum plus n Monate
export function addMonthsISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Jahr aus ISO
export function yearFromISO(iso: string): number {
  return parseInt(iso.slice(0, 4), 10);
}
