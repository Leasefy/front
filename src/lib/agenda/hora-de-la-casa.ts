/**
 * PL-22 / AG (QA del 04-10-2026): las horas como se dicen en Colombia,
 * «9:00 a. m.» y «2:30 p. m.» (antes «9:00am», «12:00pm»). Pura.
 */
export function horaDeLaCasa(hhmm: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return hhmm ?? '';
  const h = Number(m[1]);
  const periodo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${periodo}`;
}

/** «2026-10-03…» → «3 de octubre de 2026» (sin cero ni mes abreviado: AG-05). */
export function diaDeLaCasa(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** El lunes (AAAA-MM-DD) de la semana de `d`, en el calendario local. */
export function lunesDe(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dia = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - dia);
  return x;
}
