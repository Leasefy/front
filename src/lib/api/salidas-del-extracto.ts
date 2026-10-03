/**
 * 🔴 LAS SALIDAS DEL EXTRACTO (Nico, P5, 03-10-2026: «se concilian TODAS:
 * giros a propietarios, egresos/proveedores, 4×1000, comisiones bancarias y
 * devoluciones»).
 *
 * `/inmobiliaria/conciliacion-bancaria/salidas`:
 *   · `GET ?ids=a,b,c` → qué puede ser cada salida de la página (y cada entrada
 *     que habla de un reverso) y con qué quedó conciliada;
 *   · `GET avisos` → el giro que no salió o salió dos veces;
 *   · `POST movimientos/:id/conciliar` `{ tipo, destinoId?, clase? }`;
 *   · `GET seguras` → cuántas salidas seguras hay, cuánto suman y cuáles (no
 *     escribe nada: es lo que ve la persona ANTES de confirmar);
 *   · `POST aplicar-seguras` `{ movimientoIds, cantidad, totalCop }` → concilia
 *     de un golpe SÓLO lo que la persona vio y sigue siendo seguro (regla P7;
 *     seguimiento 6, Nico C2-SALIDAS Q3: «también lo aprieta una persona, con
 *     confirmación»);
 *   · `POST movimientos/:id/desvincular` `{ motivo }` (P11: sólo administrador o
 *     contador; la fila queda como bitácora).
 *
 * El back verifica cada propuesta (valor exacto, pago pagado y sin usar). Sin
 * la migración del vínculo, `sePuedeAplicar: false` y conciliar responde 503.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

const BASE = '/inmobiliaria/conciliacion-bancaria/salidas';

export type TipoDeSalida =
  | 'GIRO'
  | 'LOTE_DE_GIROS'
  | 'EGRESO'
  | 'LOTE_DE_EGRESOS'
  | 'PAGO_A_PROVEEDOR'
  | 'GASTO_BANCARIO'
  | 'REVERSO'
  | 'DEVOLUCION_DE_GIRO';

export type ClaseDeGastoBancario = 'GMF_4X1000' | 'COMISION' | 'IVA_COMISION' | 'CUOTA_DE_MANEJO';

export type NivelDeSalida = 'alta' | 'media' | 'baja';

export interface PropuestaDeSalida {
  tipo: TipoDeSalida;
  destinoId: string | null;
  clase: ClaseDeGastoBancario | null;
  valorCop: number;
  destino: { etiqueta: string; fecha: string | null; beneficiario: string | null; cantidad: number } | null;
  regla: { id: string; nombre: string; orden: number };
  nivel: NivelDeSalida;
  unica: boolean;
  sePuedeAplicarSola: boolean;
  porQue: string[];
  llave: string;
}

export interface VinculoDeSalida {
  id: string;
  tipo: TipoDeSalida;
  destinoId: string | null;
  clase: ClaseDeGastoBancario | null;
  valorCop: number;
  regla: string;
  etiqueta: string | null;
  porQue: string[];
  conciliadoPor: 'persona' | 'piloto';
  conciliadoAt: string;
}

export interface SalidaDeLaPagina {
  evaluacion: { movimientoId: string; propuestas: PropuestaDeSalida[]; ambigua: boolean } | null;
  vinculos: VinculoDeSalida[];
}

export interface SalidasDeLaPagina {
  sePuedeAplicar: boolean;
  porMovimiento: Record<string, SalidaDeLaPagina>;
}

export interface AvisoDeSalida {
  tipo: 'NO_SALIO' | 'SALIO_DOS_VECES';
  destinoTipo: TipoDeSalida;
  destinoId: string;
  etiqueta: string;
  valorCop: number;
  fecha: string;
  movimientoIds: string[];
  mensaje: string;
}

export interface PedidoDeSalida {
  tipo: TipoDeSalida;
  destinoId?: string | null;
  clase?: ClaseDeGastoBancario | null;
}

export interface SalidasSegurasAplicadas {
  aplicadas: number;
  /** Cuánto sumó lo que se concilió. */
  totalCop?: number;
  errores: { movimientoId: string; mensaje: string }[];
  /** Lo que la persona confirmó y ya no era seguro: queda en la tabla. */
  yaNoSonSeguras?: { movimientoId: string; mensaje: string }[];
  quedanParaUnaPersona: number;
}

/** Una salida segura tal como la ve la persona en el diálogo. */
export interface SalidaSeguraALaVista {
  movimientoId: string;
  fecha: string;
  descripcion: string;
  /** Lo que salió, en positivo. */
  valorCop: number;
  tipo: TipoDeSalida;
  clase: ClaseDeGastoBancario | null;
  etiqueta: string;
  regla: { id: string; nombre: string };
}

export interface VistaPreviaDeLasSeguras {
  /** `false` = falta la migración del back: se ve, no se concilia. */
  sePuedeAplicar: boolean;
  cantidad: number;
  totalCop: number;
  salidas: SalidaSeguraALaVista[];
  quedanParaUnaPersona: number;
  desde: string;
}

export const NOMBRE_DEL_GASTO: Record<ClaseDeGastoBancario, string> = {
  GMF_4X1000: '4×1000',
  COMISION: 'Comisión del banco',
  IVA_COMISION: 'IVA de la comisión',
  CUOTA_DE_MANEJO: 'Cuota de manejo',
};

/** Las entradas que la pantalla le pregunta al back: sólo las que hablan de un reverso. */
const REVERSO = /\b(reverso|reversion|reversad[oa]|devoluci[oó]n|devuelt[oa]|rechaz[oa]d?[oa]?|anulaci[oó]n|reintegro|reembolso)\b/i;

export function hayQuePreguntarPorLaLinea(m: { valorCop: number; descripcion: string; estado: string }): boolean {
  if (m.valorCop < 0) return true;
  return m.estado !== 'IGNORADO' && REVERSO.test(m.descripcion.normalize('NFD').replace(/[̀-ͯ]/g, ''));
}

export const salidasDelExtractoApi = {
  propuestas(ids: string[]): Promise<SalidasDeLaPagina> {
    const q = new URLSearchParams({ ids: ids.join(',') });
    return apiClient.get<SalidasDeLaPagina>(`${BASE}?${q.toString()}`);
  },

  avisos(): Promise<{ avisos: AvisoDeSalida[]; hasta: string | null }> {
    return apiClient.get<{ avisos: AvisoDeSalida[]; hasta: string | null }>(`${BASE}/avisos`);
  },

  async conciliar(movimientoId: string, pedido: PedidoDeSalida) {
    // Clave por clave: el back corre con `forbidNonWhitelisted`.
    const cuerpo: Record<string, string> = { tipo: pedido.tipo };
    if (pedido.destinoId) cuerpo.destinoId = pedido.destinoId;
    if (pedido.clase) cuerpo.clase = pedido.clase;
    const res = await apiClient.post<{ movimientoId: string; estado: string }>(
      `${BASE}/movimientos/${movimientoId}/conciliar`,
      cuerpo,
    );
    invalidar('cobros');
    return res;
  },

  /** Lo que ve la persona antes de confirmar: cuántas, cuánto y cuáles. */
  seguras(): Promise<VistaPreviaDeLasSeguras> {
    return apiClient.get<VistaPreviaDeLasSeguras>(`${BASE}/seguras`);
  },

  /** Concilia SÓLO lo que la persona vio (el back vuelve a mirar que siga seguro). */
  async aplicarSeguras(vista: Pick<VistaPreviaDeLasSeguras, 'salidas' | 'cantidad' | 'totalCop'>): Promise<SalidasSegurasAplicadas> {
    const res = await apiClient.post<SalidasSegurasAplicadas>(`${BASE}/aplicar-seguras`, {
      movimientoIds: vista.salidas.map((s) => s.movimientoId),
      cantidad: vista.cantidad,
      totalCop: Math.round(vista.totalCop),
    });
    invalidar('cobros');
    return res;
  },

  async desvincular(movimientoId: string, motivo: string) {
    const res = await apiClient.post<{ movimientoIds: string[]; estado: 'PENDIENTE' }>(
      `${BASE}/movimientos/${movimientoId}/desvincular`,
      { motivo: motivo.trim() },
    );
    invalidar('cobros');
    return res;
  },
};

/** «Giro a Juan Pérez» / «4×1000» / «Reverso» para la etiqueta de lo conciliado. */
export function textoDelVinculo(v: VinculoDeSalida): string {
  if (v.tipo === 'GASTO_BANCARIO' && v.clase) return `Gasto del banco: ${NOMBRE_DEL_GASTO[v.clase]}`;
  if (v.etiqueta) return v.etiqueta;
  const nombres: Record<TipoDeSalida, string> = {
    GIRO: 'Giro a un propietario',
    LOTE_DE_GIROS: 'Lote de giros',
    EGRESO: 'Egreso',
    LOTE_DE_EGRESOS: 'Lote de egresos',
    PAGO_A_PROVEEDOR: 'Pago a un proveedor',
    GASTO_BANCARIO: 'Gasto del banco',
    REVERSO: 'Reverso (efecto cero)',
    DEVOLUCION_DE_GIRO: 'Devolución de un giro',
  };
  return nombres[v.tipo];
}
