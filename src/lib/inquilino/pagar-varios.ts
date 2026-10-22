/**
 * 🔴 «Pagos» para quien arrienda varios inmuebles (Nico, 21-10-2026: «debería
 * aparecer selecciona qué vas a pagar y que se muestre bien a qué hace
 * referencia ese pago y de qué inmueble… como él quiera, si selecciona uno o
 * dos o tres o los que sea»).
 *
 * Lo puro de la pantalla: qué queda marcado, cuánto suma, qué se le pide al
 * back y qué parte del estado de cuenta muestran las tarjetas. En cada
 * inmueble se paga SIEMPRE de la cuota más vieja a la más nueva (la regla de
 * siempre, por contrato): marcar una cuota marca las anteriores de ESE
 * inmueble y quitarla quita las más nuevas.
 */
import { sumar } from '@/lib/plata/plata';
import {
  nombreDelInmueble,
  totalDeLasMasViejas,
  type ArriendoQueSePuedePagar,
  type ParteDelPago,
} from '@/lib/api/pago-en-linea.service';
import type { EstadoDeCuenta, TotalesDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

/** Cuántas cuotas (las más viejas) de cada arriendo van en el pago. */
export type LoMarcado = Readonly<Record<string, number>>;

/** Lo que pasa al tocar la cuota `i` de un arriendo (marcada → se quita con las más nuevas). */
export function tocarLaCuota(marcado: LoMarcado, leaseId: string, i: number): LoMarcado {
  const cuantas = marcado[leaseId] ?? 0;
  return { ...marcado, [leaseId]: i < cuantas ? i : i + 1 };
}

/** Los arriendos que tienen algo para pagar en línea (o un pago en curso que decir). */
export function arriendosConAlgoQueDecir(arriendos: readonly ArriendoQueSePuedePagar[]): ArriendoQueSePuedePagar[] {
  return arriendos.filter((a) => a.aplica && (a.cuotas.length > 0 || a.enVerificacion || a.ultimoRechazo));
}

/** Se puede marcar: hay cuotas y no hay un pago de ese inmueble esperando a Wompi. */
export function sePuedeMarcar(a: ArriendoQueSePuedePagar): boolean {
  return a.cuotas.length > 0 && !a.enVerificacion;
}

/** Todas las cuotas que se pueden pagar, de los arriendos que se ven. */
export function marcarTodo(arriendos: readonly ArriendoQueSePuedePagar[]): LoMarcado {
  return Object.fromEntries(arriendos.filter(sePuedeMarcar).map((a) => [a.leaseId, a.cuotas.length]));
}

/** Lo marcado sólo de los arriendos que se ven (al quitar un inmueble del filtro, sale del pago). */
export function loMarcadoQueSeVe(arriendos: readonly ArriendoQueSePuedePagar[], marcado: LoMarcado): LoMarcado {
  return Object.fromEntries(
    arriendos
      .filter(sePuedeMarcar)
      .map((a) => [a.leaseId, Math.min(marcado[a.leaseId] ?? 0, a.cuotas.length)] as const)
      .filter(([, n]) => n > 0),
  );
}

export function totalDeLoMarcado(arriendos: readonly ArriendoQueSePuedePagar[], marcado: LoMarcado): number {
  const visto = loMarcadoQueSeVe(arriendos, marcado);
  return sumar(...arriendos.map((a) => totalDeLasMasViejas(a.cuotas, visto[a.leaseId] ?? 0)));
}

export function cuotasMarcadas(arriendos: readonly ArriendoQueSePuedePagar[], marcado: LoMarcado): number {
  return Object.values(loMarcadoQueSeVe(arriendos, marcado)).reduce((s, n) => s + n, 0);
}

/** Lo que se le pide al back (`POST /portal/pago-en-linea/varios`), en el orden de la pantalla. */
export function partesDelPago(arriendos: readonly ArriendoQueSePuedePagar[], marcado: LoMarcado): ParteDelPago[] {
  const visto = loMarcadoQueSeVe(arriendos, marcado);
  return arriendos.filter((a) => (visto[a.leaseId] ?? 0) > 0).map((a) => ({ leaseId: a.leaseId, cuotas: visto[a.leaseId] }));
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function mesEnPalabras(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[(m || 1) - 1]} de ${a}`;
}

/** «la cuota de noviembre de 2026» / «3 cuotas (agosto de 2026 a octubre de 2026)». */
export function queCuotas(a: ArriendoQueSePuedePagar, cuantas: number): string {
  if (cuantas <= 0) return '';
  if (cuantas === 1) return `la cuota de ${mesEnPalabras(a.cuotas[0].mes)}`;
  return `${cuantas} cuotas (${mesEnPalabras(a.cuotas[0].mes)} a ${mesEnPalabras(a.cuotas[cuantas - 1].mes)})`;
}

/** La frase de la confirmación: qué se paga de cada inmueble. */
export function loQueVasAPagar(arriendos: readonly ArriendoQueSePuedePagar[], marcado: LoMarcado): string {
  const visto = loMarcadoQueSeVe(arriendos, marcado);
  const partes = arriendos
    .filter((a) => (visto[a.leaseId] ?? 0) > 0)
    .map((a) => `${queCuotas(a, visto[a.leaseId])} de ${nombreDelInmueble(a)}`);
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * 🔴 Las tarjetas de arriba con el estado de cuenta de los inmuebles escogidos
 * (Nico: «las del inmueble escogido»). Sin contratos que coincidan (o sin
 * filtro), el documento entero, como siempre.
 */
export function estadoDeLosContratos(doc: EstadoDeCuenta, contractIds: readonly string[] | null): EstadoDeCuenta {
  if (!contractIds) return doc;
  const quedan = doc.contratos.filter((c) => contractIds.includes(c.id));
  if (quedan.length === 0 || quedan.length === doc.contratos.length) return doc;
  const suma = (campo: keyof TotalesDelEstadoDeCuenta) => sumar(...quedan.map((c) => c.totales[campo]));
  return {
    ...doc,
    contratos: quedan,
    totales: { ...doc.totales, cancelado: suma('cancelado'), pendiente: suma('pendiente'), restaPorPagar: suma('restaPorPagar') },
    // Del inquilino no viene; si viniera, es la suma de TODOS sus contratos.
    proximaCuota: undefined,
  };
}

/** «De Oficina en Centro, Caldas» / «De tus 2 arriendos». */
export function deQueSonLasTarjetas(arriendos: readonly ArriendoQueSePuedePagar[], escogidos: readonly string[]): string | null {
  if (arriendos.length < 2) return null;
  const vistos = arriendos.filter((a) => escogidos.includes(a.leaseId));
  if (vistos.length === 1) return `De ${nombreDelInmueble(vistos[0])}`;
  return vistos.length === arriendos.length ? `De tus ${arriendos.length} arriendos` : `De ${vistos.length} de tus ${arriendos.length} arriendos`;
}
