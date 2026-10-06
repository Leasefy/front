/**
 * 🔴🔴 BU-11 (QA del 04-10-2026): el buscador del portal del inquilino
 * («Buscar propiedades, pagos, documentos…») mostraba DATOS INVENTADOS de
 * `lib/constants/search-data.ts`: «Pago Febrero 2026 · $2,500,000 - Pendiente»,
 * «Apartamento Chapinero», «Nicolás Rodriguez · Propietario» y búsquedas
 * recientes fijas. Un inquilino que buscaba «pago» veía una deuda falsa de
 * $2.500.000, y lo suyo de verdad («octubre», «Calle 45», «PQRS-0004») daba
 * «No encontramos».
 *
 * Esto arma el índice con lo PROPIO del inquilino, leído de los servicios que
 * el portal ya usa —el estado de cuenta (`GET /portal/estado-de-cuenta`), sus
 * solicitudes (`GET /pqrs/mine`) y sus acuerdos de pago
 * (`GET /cartera/payment-plans/mine`)— más las secciones del portal. Es puro:
 * se prueba sin red. Nada se rellena: lo que no llegó no sale.
 */
import type { EstadoDeCuenta, FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import type { SolicitudPqrs, PqrsTipo } from '@/lib/api/pqrs.types';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';
import { formatoPesos } from '@/lib/plata/formato';
import { sumar } from '@/lib/plata/plata';
import { conceptoSinElRango, fechaLarga, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { acuerdoStatusToLabel, pqrsStatusToLabel } from '@/lib/types/tenant-case';

export type CategoriaDelPortal = 'pago' | 'recibo' | 'contrato' | 'solicitud' | 'acuerdo' | 'pagina';

export interface ResultadoDelPortal {
  id: string;
  titulo: string;
  detalle: string;
  categoria: CategoriaDelPortal;
  href: string;
}

/** Un resultado con el texto (ya normalizado) contra el que se compara. */
export interface EntradaDelIndice extends ResultadoDelPortal {
  texto: string;
}

export interface DatosDelInquilino {
  estado?: EstadoDeCuenta | null;
  solicitudes?: SolicitudPqrs[] | null;
  acuerdos?: AcuerdoDetail[] | null;
}

export const ORDEN_DE_CATEGORIAS: readonly CategoriaDelPortal[] = [
  'pago',
  'recibo',
  'contrato',
  'solicitud',
  'acuerdo',
  'pagina',
];

export const NOMBRE_DE_CATEGORIA: Record<CategoriaDelPortal, string> = {
  pago: 'Pagos',
  recibo: 'Recibos',
  contrato: 'Contrato e inmueble',
  solicitud: 'Solicitudes',
  acuerdo: 'Acuerdos de pago',
  pagina: 'Secciones del portal',
};

/** Minúsculas, sin tildes, «#» y signos fuera: «#24» = «24», «Iván» = «ivan». */
export function normalizar(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Un número sin los ceros de la izquierda: «0004» → «4». */
function sinCeros(n: string): string {
  return n.replace(/^0+(?=\d)/, '');
}

const TIPO_DE_SOLICITUD: Record<PqrsTipo, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia',
  solicitud: 'Solicitud',
  reparacion: 'Reparación',
};

/** «octubre de 2026» a partir de «2026-10-01». */
function mesDe(iso: string): string {
  const larga = fechaLarga(iso);
  return larga.replace(/^\d+ de /, '');
}

function entrada(r: ResultadoDelPortal, ...palabras: Array<string | number | null | undefined>): EntradaDelIndice {
  const texto = normalizar([r.titulo, r.detalle, ...palabras].filter((p) => p !== null && p !== undefined).join(' '));
  return { ...r, texto };
}

/** Las secciones del portal que existen para todo inquilino (menú del portal). */
const SECCIONES: ReadonlyArray<{ id: string; titulo: string; detalle: string; href: string; claves: string }> = [
  { id: 'pagos', titulo: 'Mis pagos', detalle: 'Tus cuotas y cómo pagarlas', href: '/inquilino/pagos', claves: 'pago pagar cuota canon pse transferencia' },
  { id: 'estado', titulo: 'Estado de cuenta', detalle: 'Lo que has pagado y lo que debes', href: '/inquilino/estado-de-cuenta', claves: 'estado cuenta saldo deuda recibos extracto' },
  { id: 'arriendo', titulo: 'Mi arriendo', detalle: 'Tu contrato y tu inmueble', href: '/inquilino/arriendo', claves: 'arriendo contrato inmueble apartamento casa' },
  { id: 'documentos', titulo: 'Documentos', detalle: 'Paz y salvo, certificados y tus documentos', href: '/inquilino/documentos', claves: 'documento paz salvo certificado retencion pdf' },
  { id: 'solicitudes', titulo: 'Solicitudes', detalle: 'Peticiones, quejas, reclamos y reparaciones', href: '/inquilino/solicitudes', claves: 'pqrs solicitud peticion queja reclamo sugerencia reparacion dano' },
  { id: 'acuerdos', titulo: 'Acuerdos de pago', detalle: 'Tus acuerdos con la inmobiliaria', href: '/inquilino/acuerdos', claves: 'acuerdo cuotas plan' },
  { id: 'mensajes', titulo: 'Mensajes', detalle: 'Escríbele a la inmobiliaria', href: '/inquilino/mensajes', claves: 'mensaje chat escribir inmobiliaria' },
];

/** Lo que se ofrece antes de escribir: secciones reales, sin cifras inventadas. */
export function accesosRapidos(): ResultadoDelPortal[] {
  return SECCIONES.filter((s) => ['pagos', 'estado', 'solicitudes'].includes(s.id)).map((s) => ({
    id: `pagina:${s.id}`,
    titulo: s.titulo,
    detalle: s.detalle,
    categoria: 'pagina' as const,
    href: s.href,
  }));
}

function cuotasDelContrato(
  contratoId: string,
  filas: FilaDelEstadoDeCuenta[],
  esArriendo: boolean,
  hoy: string,
): EntradaDelIndice[] {
  // Un mes puede venir partido en varios renglones (lo abonado y el saldo que
  // queda): se junta en UNA cuota por mes y concepto, con lo pagado y lo que falta.
  const grupos = new Map<string, { concepto: string; vence: string; filas: FilaDelEstadoDeCuenta[] }>();
  for (const f of filas) {
    // «ANTERIOR» es del sistema de antes (no se cobra acá); «ANULADA» no existe.
    if (f.estado !== 'CANCELADA' && f.estado !== 'PENDIENTE') continue;
    const concepto = esArriendo ? 'Arriendo' : conceptoSinElRango(f.concepto).replace(/^Saldo pendiente por /i, '');
    const mes = f.fechaVencimiento.slice(0, 7);
    const clave = `${concepto}|${mes}`;
    const g = grupos.get(clave) ?? { concepto, vence: f.fechaVencimiento, filas: [] };
    if (f.fechaVencimiento < g.vence) g.vence = f.fechaVencimiento;
    g.filas.push(f);
    grupos.set(clave, g);
  }
  const salida: EntradaDelIndice[] = [];
  for (const [clave, g] of grupos) {
    const pagado = sumar(...g.filas.filter((f) => f.estado === 'CANCELADA').map((f) => f.valorNeto));
    const debe = sumar(...g.filas.filter((f) => f.estado === 'PENDIENTE').map((f) => f.valorNeto));
    const mes = mesDe(g.vence);
    const vencida = debe > 0 && g.vence < hoy;
    const detalle =
      debe > 0
        ? `Debes ${formatoPesos(debe)} · ${vencida ? 'venció' : 'vence'} el ${fechaLarga(g.vence)}`
        : `Pagado · ${formatoPesos(pagado)}`;
    salida.push(
      entrada(
        {
          id: `pago:${contratoId}:${clave}`,
          titulo: `${g.concepto} de ${mes}`,
          detalle,
          categoria: 'pago',
          href: '/inquilino/pagos',
        },
        'pago cuota',
        esArriendo ? 'canon arrendamiento' : null,
        debe > 0 ? 'pendiente debe deuda' : 'pagado pagada al dia',
        vencida ? 'vencido vencida mora' : null,
      ),
    );
  }
  return salida;
}

function recibosDelContrato(contratoId: string, filas: FilaDelEstadoDeCuenta[]): EntradaDelIndice[] {
  const porNumero = new Map<string, FilaDelEstadoDeCuenta[]>();
  for (const f of filas) {
    if (!f.documentoDePago || f.estado === 'ANULADA') continue;
    const n = String(f.documentoDePago.numero);
    porNumero.set(n, [...(porNumero.get(n) ?? []), f]);
  }
  return [...porNumero].map(([numero, fs]) => {
    const valor = sumar(...fs.map((f) => f.valorNeto));
    const fecha = fs.find((f) => f.fechaDePago)?.fechaDePago ?? null;
    const meses = [...new Set(fs.map((f) => mesDe(f.fechaVencimiento)))];
    return entrada(
      {
        id: `recibo:${contratoId}:${numero}`,
        titulo: `Recibo N.º ${numero}`,
        detalle: `${formatoPesos(valor)} · ${fecha ? `pagado el ${fechaLarga(fecha)}` : meses.join(', ')}`,
        categoria: 'recibo',
        href: '/inquilino/estado-de-cuenta',
      },
      'recibo comprobante pago',
      meses.join(' '),
    );
  });
}

/** El índice de lo propio del inquilino. `hoy` (AAAA-MM-DD, Bogotá) decide «venció» o «vence». */
export function indiceDelInquilino(datos: DatosDelInquilino, hoy: string = hoyEnColombia()): EntradaDelIndice[] {
  const indice: EntradaDelIndice[] = [];

  for (const c of datos.estado?.contratos ?? []) {
    indice.push(
      entrada(
        {
          id: `contrato:${c.id}`,
          titulo: `Contrato N.º ${c.numero}`,
          detalle: `${c.inmueble.direccion} · ${c.vigente ? 'Vigente' : 'Terminado'}`,
          categoria: 'contrato',
          href: '/inquilino/arriendo',
        },
        'contrato arriendo inmueble mi arriendo',
        c.numeroDeLeasefy,
      ),
    );
    indice.push(...cuotasDelContrato(c.id, c.secciones.arriendos, true, hoy));
    indice.push(...cuotasDelContrato(c.id, c.secciones.otrosConceptos, false, hoy));
    indice.push(...recibosDelContrato(c.id, [...c.secciones.arriendos, ...c.secciones.otrosConceptos]));
  }

  for (const s of datos.solicitudes ?? []) {
    const numero = s.radicado.match(/(\d+)\s*$/)?.[1] ?? null;
    const lugar = s.propiedadDireccion ? s.propiedadDireccion.split(' · ')[0] : null;
    indice.push(
      entrada(
        {
          id: `solicitud:${s.id}`,
          titulo: `${s.radicado} · ${s.asunto}`,
          detalle: [TIPO_DE_SOLICITUD[s.tipo] ?? 'Solicitud', pqrsStatusToLabel(s.estado), lugar].filter(Boolean).join(' · '),
          categoria: 'solicitud',
          href: `/inquilino/casos/${encodeURIComponent(s.id)}`,
        },
        'solicitud pqrs caso',
        numero ? sinCeros(numero) : null,
        s.descripcion,
      ),
    );
  }

  for (const a of datos.acuerdos ?? []) {
    // Los cancelados son los que quedaron reemplazados (SO-17): no son del inquilino hoy.
    if (a.status === 'cancelled') continue;
    const cuotas = a.installments?.length ?? 0;
    const total = a.totalDueCop != null ? formatoPesos(a.totalDueCop) : null;
    indice.push(
      entrada(
        {
          id: `acuerdo:${a.planId}`,
          titulo: 'Acuerdo de pago',
          detalle: [acuerdoStatusToLabel(a.status), cuotas > 0 ? `${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}` : null, total]
            .filter(Boolean)
            .join(' · '),
          categoria: 'acuerdo',
          href: `/inquilino/acuerdos/${encodeURIComponent(a.planId)}`,
        },
        'acuerdo plan cuotas deuda',
      ),
    );
  }

  for (const s of SECCIONES) {
    indice.push(
      entrada({ id: `pagina:${s.id}`, titulo: s.titulo, detalle: s.detalle, categoria: 'pagina', href: s.href }, s.claves),
    );
  }

  return indice;
}

/**
 * ¿La entrada tiene TODAS las palabras buscadas? Las palabras van en cualquier
 * orden y pueden estar a medias («oct» encuentra octubre); los números se
 * comparan enteros («4» no encuentra «45»; «4» sí encuentra PQRS-0004) y,
 * escritos con ceros («0004»), sólo lo que lleva esos ceros (el radicado).
 */
function coincide(e: EntradaDelIndice, terminos: string[]): boolean {
  const palabras = e.texto.split(' ');
  return terminos.every((t) =>
    /^0\d+$/.test(t)
      ? // «0004» se escribió con sus ceros: es un radicado, no el «4» de una fecha.
        palabras.includes(t)
      : /^\d+$/.test(t)
        ? palabras.some((p) => /^\d+$/.test(p) && sinCeros(p) === sinCeros(t))
        : e.texto.includes(t),
  );
}

/** Lo que coincide, agrupado en el orden de las categorías; hasta `tope` por categoría. */
export function buscarEnElPortal(
  indice: readonly EntradaDelIndice[],
  consulta: string,
  tope = 6,
): ResultadoDelPortal[] {
  const terminos = normalizar(consulta).split(' ').filter(Boolean);
  if (terminos.length === 0) return [];
  const salida: ResultadoDelPortal[] = [];
  for (const categoria of ORDEN_DE_CATEGORIAS) {
    const deEsta = indice.filter((e) => e.categoria === categoria && coincide(e, terminos)).slice(0, tope);
    for (const { texto: _texto, ...r } of deEsta) salida.push(r);
  }
  return salida;
}
