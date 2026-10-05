/**
 * QA-PROP-95 (PO-01, 04-10-2026): el sello de cada contrato en el estado de
 * cuenta y en el Inicio del portal. «Vigente» juntaba ACTIVE y SIGNED: un
 * contrato firmado que empieza el mes que viene salía «Vigente» (y contaba en
 * «N vigentes») y uno cancelado salía «Terminado». El back manda ahora
 * `estadoDelContrato`; sin él (un back viejo), se usa `vigente` como antes.
 */
export type EstadoDelContrato = 'VIGENTE' | 'POR_EMPEZAR' | 'TERMINADO' | 'CANCELADO';

export interface ContratoConSello {
  vigente: boolean;
  estadoDelContrato?: EstadoDelContrato;
  inicio?: string | null;
}

export function estadoDe(c: ContratoConSello): EstadoDelContrato {
  return c.estadoDelContrato ?? (c.vigente ? 'VIGENTE' : 'TERMINADO');
}

/** «1 de noviembre de 2026» desde `AAAA-MM-DD`, sin correrse de día. */
function diaEnPalabras(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, d)));
}

export function selloDelContrato(c: ContratoConSello): { texto: string; vivo: boolean } {
  switch (estadoDe(c)) {
    case 'VIGENTE':
      return { texto: 'Vigente', vivo: true };
    case 'POR_EMPEZAR':
      return { texto: c.inicio ? `Empieza el ${diaEnPalabras(c.inicio)}` : 'Por empezar', vivo: false };
    case 'CANCELADO':
      return { texto: 'Cancelado', vivo: false };
    default:
      return { texto: 'Terminado', vivo: false };
  }
}
