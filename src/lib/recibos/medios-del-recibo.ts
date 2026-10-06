/**
 * 🔴 «¿POR DÓNDE ENTRÓ?» — con qué se puede registrar un recibo de caja
 * (PG-01, QA de Pagos, 03-10-2026). PURA.
 *
 * Nico (17:37, mirando el recibo): «aquí puede ser en efectivo también no? y
 * más opciones». El recibo ofrecía SÓLO las cuentas bancarias configuradas:
 * con una sola cuenta en «Medios de pago», todos los demás medios que la
 * inmobiliaria tiene habilitados (efectivo, tarjeta/datáfono, PSE, enlace de
 * pago, Nequi, Daviplata, cheque, consignación…) desaparecían.
 *
 * Ahora el recibo ofrece:
 *   · las CUENTAS de la inmobiliaria (transferencia o consignación a esa
 *     cuenta, Nequi, Daviplata), con su banco y la cuenta enmascarada;
 *   · MÁS los otros medios habilitados del catálogo que ninguna cuenta cubre;
 *   · nunca los apagados. Decisión de Nico (TAL CUAL): el EFECTIVO sale sólo si
 *     la inmobiliaria tiene prendido su interruptor; si está apagado, el recibo
 *     dice en una línea dónde prenderlo (`efectivoApagado`).
 *
 * De dónde sale:
 *   · `desdeElBack` — `GET /inmobiliaria/recibos-de-caja/medios` (pide
 *     `cobros:create`, lo que tiene quien hace el recibo);
 *   · `sinElEndpoint` — un back anterior: las cuentas de `useMediosDePago` y
 *     el catálogo de Configuración (`GET /inmobiliaria/finanzas/medios`, que
 *     pide `configuracion:view`). Si tampoco se pudo leer ése, falla ABIERTO
 *     con la lista fija de siempre: el back rechaza igual lo apagado, con el
 *     motivo (`lib/finanzas/medios.ts`).
 *
 * Lo que viaja en `medio` sigue siendo el TIPO (QA 22-09): «Efectivo en la
 * oficina» normalizado no es ningún medio apagado y el recibo en efectivo
 * entraba. El nombre de la cuenta va a las notas.
 */

import type { MediosDeRecibo } from '@/lib/api/finanzas.types';
import type { MediosDelRecibo } from '@/lib/api/recibos-de-caja.types';
import { estaApagado, normalizarMedio } from '@/lib/finanzas/medios';

/** El DTO del back acepta `medio` como texto libre de hasta 40 caracteres. */
export const LARGO_MAXIMO_DEL_MEDIO = 40;

export interface OpcionDeMedio {
  /** Identidad del chip: dos cuentas de transferencia son dos chips con el mismo código. */
  valor: string;
  /** Lo que viaja en `medio`: el TIPO (o el valor histórico de la lista fija). */
  codigo: string;
  /** El nombre de la cuenta configurada, para las notas. `null` en un medio del catálogo. */
  nombre: string | null;
  /** El texto del chip cuando no hay clave del diccionario. */
  etiqueta: string | null;
  /** La clave del diccionario del chip (`recibos.form.medios.*`). */
  clave: string | null;
  /**
   * La cuenta enmascarada («•••• 8912») al lado del nombre de una cuenta: dos
   * cuentas del mismo banco se distinguen por el número. Sin número, el banco.
   */
  detalle: string | null;
  /** Las cuentas van primero y aparte: es «a qué cuenta entró». */
  grupo: 'CUENTA' | 'OTRO';
}

export interface MediosParaElRecibo {
  opciones: OpcionDeMedio[];
  /**
   * El efectivo está APAGADO para esta inmobiliaria: el porqué, con dónde se
   * prende. `null` si está prendido o si no se pudo saber.
   */
  efectivoApagado: string | null;
}

/** La frase cuando el back no la manda (un back anterior o la lista de Configuración). */
export const EFECTIVO_APAGADO_POR_DEFECTO =
  'Esta inmobiliaria no recibe pagos en efectivo: ese medio está apagado. Si quieres recibirlo, préndelo en Configuración → Medios de recibo.';

/** Las claves del diccionario de cada código del catálogo. */
export const CLAVE_DEL_MEDIO: Readonly<Record<string, string>> = {
  TRANSFERENCIA: 'recibos.form.medios.transferencia',
  CONSIGNACION: 'recibos.form.medios.consignacion',
  EFECTIVO: 'recibos.form.medios.efectivo',
  TARJETA: 'recibos.form.medios.tarjeta',
  PSE: 'recibos.form.medios.pse',
  ENLACE_DE_PAGO: 'recibos.form.medios.enlaceDePago',
  NEQUI: 'recibos.form.medios.nequi',
  DAVIPLATA: 'recibos.form.medios.daviplata',
  CHEQUE: 'recibos.form.medios.cheque',
  OTRO: 'recibos.form.medios.otro',
};

/** En qué orden los lee quien está en caja: primero lo que más se usa. */
const ORDEN: readonly string[] = [
  'TRANSFERENCIA',
  'CONSIGNACION',
  'EFECTIVO',
  'TARJETA',
  'PSE',
  'ENLACE_DE_PAGO',
  'NEQUI',
  'DAVIPLATA',
  'CHEQUE',
  'OTRO',
];

/**
 * La lista fija de siempre, con los valores que el front ya venía mandando
 * (`transferencia`, `efectivo`…): cambiarlos partiría el histórico en dos
 * vocabularios. Sólo se usa cuando no se pudo leer ningún catálogo.
 */
const LISTA_FIJA: readonly { valor: string; clave: string }[] = [
  { valor: 'transferencia', clave: 'recibos.form.medios.transferencia' },
  { valor: 'efectivo', clave: 'recibos.form.medios.efectivo' },
  { valor: 'tarjeta', clave: 'recibos.form.medios.tarjeta' },
  { valor: 'cheque', clave: 'recibos.form.medios.cheque' },
  { valor: 'pse', clave: 'recibos.form.medios.pse' },
  { valor: 'otro', clave: 'recibos.form.medios.otro' },
];

function posicion(codigo: string): number {
  const i = ORDEN.indexOf(normalizarMedio(codigo));
  return i === -1 ? ORDEN.length : i;
}

/**
 * ¿Una cuenta de la inmobiliaria ya cubre este medio? Una cuenta de
 * transferencia cubre también la consignación: las dos llegan a esa cuenta, y
 * lo que caja tiene que decir es A CUÁL entró.
 */
function cubiertoPorUnaCuenta(codigo: string, tiposConCuenta: ReadonlySet<string>): boolean {
  const tipo = normalizarMedio(codigo);
  if (tipo === 'OTRO') return false;
  return tiposConCuenta.has(tipo) || (tipo === 'CONSIGNACION' && tiposConCuenta.has('TRANSFERENCIA'));
}

interface CuentaParaElChip {
  id?: string | null;
  nombre: string;
  tipo: string;
  detalle: string | null;
}

function opcionDeCuenta(c: CuentaParaElChip): OpcionDeMedio {
  const nombre = c.nombre.trim();
  return {
    valor: `cuenta|${c.id ?? `${normalizarMedio(c.tipo)}|${nombre}`}`,
    codigo: normalizarMedio(c.tipo),
    nombre: nombre.slice(0, LARGO_MAXIMO_DEL_MEDIO),
    etiqueta: nombre,
    clave: null,
    detalle: c.detalle,
    grupo: 'CUENTA',
  };
}

function ordenar(opciones: OpcionDeMedio[]): OpcionDeMedio[] {
  // Las cuentas en el orden en que la inmobiliaria las configuró; el catálogo
  // en el orden de caja. `sort` es estable.
  return [...opciones].sort((a, b) =>
    a.grupo !== b.grupo ? (a.grupo === 'CUENTA' ? -1 : 1) : a.grupo === 'CUENTA' ? 0 : posicion(a.codigo) - posicion(b.codigo),
  );
}

/** Con la respuesta de `GET /inmobiliaria/recibos-de-caja/medios`. */
export function desdeElBack(r: MediosDelRecibo): MediosParaElRecibo {
  const cuentas = (r.cuentas ?? []).filter((c) => c.habilitado);
  const tiposConCuenta = new Set(cuentas.map((c) => normalizarMedio(c.tipo)));
  const deCuentas = cuentas.map((c) =>
    opcionDeCuenta({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      detalle: c.cuenta?.trim() || c.banco?.trim() || null,
    }),
  );
  const delCatalogo: OpcionDeMedio[] = (r.medios ?? [])
    .filter((m) => m.habilitado && !cubiertoPorUnaCuenta(m.medio, tiposConCuenta))
    .map((m) => ({
      valor: m.medio,
      codigo: m.medio,
      nombre: null,
      etiqueta: m.nombre,
      clave: CLAVE_DEL_MEDIO[normalizarMedio(m.medio)] ?? null,
      detalle: null,
      grupo: 'OTRO' as const,
    }));
  const efectivo = (r.medios ?? []).find((m) => normalizarMedio(m.medio) === 'EFECTIVO');
  return {
    opciones: ordenar([...deCuentas, ...delCatalogo]),
    efectivoApagado:
      efectivo && !efectivo.habilitado ? (efectivo.porQueNo?.trim() || EFECTIVO_APAGADO_POR_DEFECTO) : null,
  };
}

/** Una cuenta de «Medios de pago», como la trae `useMediosDePago`. */
export interface MedioConfigurado {
  id?: string | null;
  nombre: string;
  tipo: string;
  activo: boolean;
  banco?: string | null;
  numeroDeCuenta?: string | null;
}

function enmascarar(numero: string | null | undefined): string | null {
  const limpio = (numero ?? '').replace(/\s+/g, '');
  return limpio ? `•••• ${limpio.slice(-4)}` : null;
}

/**
 * Con un back anterior (sin `/recibos-de-caja/medios`): las cuentas activas y
 * el catálogo de Configuración. `catalogo` en `null` = no se pudo leer:
 * falla abierto con la lista fija.
 */
export function sinElEndpoint(
  configurados: readonly MedioConfigurado[] | null | undefined,
  catalogo: MediosDeRecibo | null,
): MediosParaElRecibo {
  const apagados = catalogo?.apagados ?? [];
  const cuentas = (configurados ?? []).filter((m) => m.activo && !estaApagado(m.tipo, apagados));
  const tiposConCuenta = new Set(cuentas.map((c) => normalizarMedio(c.tipo)));
  const deCuentas = cuentas.map((c) =>
    opcionDeCuenta({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      detalle: enmascarar(c.numeroDeCuenta) ?? (c.banco?.trim() || null),
    }),
  );

  const conCatalogo = (catalogo?.medios ?? []).length > 0;
  const delCatalogo: OpcionDeMedio[] = conCatalogo
    ? catalogo!.medios
        .filter((m) => m.habilitado && !estaApagado(m.medio, apagados) && !cubiertoPorUnaCuenta(m.medio, tiposConCuenta))
        .map((m) => ({
          valor: m.medio,
          codigo: m.medio,
          nombre: null,
          etiqueta: m.nombre,
          clave: CLAVE_DEL_MEDIO[normalizarMedio(m.medio)] ?? null,
          detalle: null,
          grupo: 'OTRO' as const,
        }))
    : LISTA_FIJA.filter(
        (m) => !estaApagado(m.valor, apagados) && !cubiertoPorUnaCuenta(m.valor, tiposConCuenta),
      ).map((m) => ({
        valor: m.valor,
        codigo: m.valor,
        nombre: null,
        etiqueta: null,
        clave: m.clave,
        detalle: null,
        grupo: 'OTRO' as const,
      }));

  const efectivoDelCatalogo = (catalogo?.medios ?? []).find((m) => normalizarMedio(m.medio) === 'EFECTIVO');
  const efectivoApagado =
    (efectivoDelCatalogo && !efectivoDelCatalogo.habilitado) || estaApagado('EFECTIVO', apagados)
      ? EFECTIVO_APAGADO_POR_DEFECTO
      : null;

  return { opciones: ordenar([...deCuentas, ...delCatalogo]), efectivoApagado };
}
