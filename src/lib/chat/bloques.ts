/**
 * La respuesta del chat con FORMA: los bloques (tabla, cifra, aviso) y las
 * entidades (persona → contratos → inmueble → propietarios → cartera) que el
 * micro manda en el evento `done` además del texto.
 *
 * ── Por qué (Nico, 23-09) ──────────────────────────────────────────────────
 * «Revisa que sí estés usando todos los componentes que Cadence tiene listos
 * para el chat, para entregar siempre respuestas usando alguno que haga match
 * con cómo debe presentarse la respuesta.» Una lista de contratos es una TABLA,
 * una cifra es una MÉTRICA y una persona es una TARJETA DE ENTIDAD — no un
 * párrafo que las describe.
 *
 * Todo lo de acá es tolerante: el micro puede ser más viejo o más nuevo que el
 * panel. Lo que no se entiende se descarta sin romper; el texto de la respuesta
 * siempre está como respaldo.
 */

import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

// ── Bloques (espejo de `turno-en-vivo.ts` del micro) ────────────────────────

export type FormatoDeColumna = 'texto' | 'moneda' | 'numero' | 'fecha' | 'estado';
export type ValorDeCelda = string | number | boolean | null;

export interface ColumnaDeBloque {
  clave: string;
  titulo: string;
  formato: FormatoDeColumna;
}

export type BloqueDeRespuesta =
  | {
      tipo: 'tabla';
      titulo: string;
      columnas: ColumnaDeBloque[];
      filas: Array<Record<string, ValorDeCelda>>;
      total: number;
      truncada: boolean;
    }
  | { tipo: 'metrica'; titulo: string; valor: number; formato: 'moneda' | 'numero' }
  | { tipo: 'aviso'; tono: 'info' | 'advertencia'; texto: string };

const FORMATOS: FormatoDeColumna[] = ['texto', 'moneda', 'numero', 'fecha', 'estado'];

/**
 * Un código, una cédula o un teléfono son IDENTIFICADORES aunque sean números:
 * «1.040» en vez de «1040» en la columna Código (visto en el panel) los hace
 * ilegibles para buscarlos. Se leen como texto, en mono.
 */
export function esIdentificador(clave: string): boolean {
  return /(^|_)(codigo|numero|id|documento|cedula|nit|telefono|celular|matricula|consecutivo)($|_)/i.test(clave);
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function leerBloque(v: unknown): BloqueDeRespuesta | null {
  if (!esObjeto(v)) return null;
  if (v.tipo === 'tabla') {
    if (!Array.isArray(v.columnas) || !Array.isArray(v.filas)) return null;
    const columnas = v.columnas
      .filter(esObjeto)
      .filter((c) => typeof c.clave === 'string' && c.clave)
      .map((c) => ({
        clave: String(c.clave),
        titulo: typeof c.titulo === 'string' && c.titulo ? c.titulo : String(c.clave),
        formato:
          FORMATOS.includes(c.formato as FormatoDeColumna) && !esIdentificador(String(c.clave))
            ? (c.formato as FormatoDeColumna)
            : 'texto',
      }));
    const filas = v.filas.filter(esObjeto) as Array<Record<string, ValorDeCelda>>;
    if (columnas.length === 0 || filas.length === 0) return null;
    return {
      tipo: 'tabla',
      titulo: typeof v.titulo === 'string' ? v.titulo : '',
      columnas,
      filas,
      total: typeof v.total === 'number' ? v.total : filas.length,
      truncada: v.truncada === true,
    };
  }
  if (v.tipo === 'metrica') {
    if (typeof v.valor !== 'number' || !Number.isFinite(v.valor)) return null;
    return {
      tipo: 'metrica',
      titulo: typeof v.titulo === 'string' ? v.titulo : '',
      valor: v.valor,
      formato: v.formato === 'moneda' ? 'moneda' : 'numero',
    };
  }
  if (v.tipo === 'aviso') {
    if (typeof v.texto !== 'string' || !v.texto.trim()) return null;
    return { tipo: 'aviso', tono: v.tono === 'advertencia' ? 'advertencia' : 'info', texto: v.texto };
  }
  return null;
}

/** Los bloques válidos del `done`; lo que no se entiende se descarta. */
export function leerBloques(v: unknown): BloqueDeRespuesta[] {
  if (!Array.isArray(v)) return [];
  return v.map(leerBloque).filter((b): b is BloqueDeRespuesta => b !== null);
}

// ── Entidades (espejo mínimo de `ResultadoDeBusqueda` del micro) ─────────────

export type CarteraDeEntidad =
  | {
      estado: 'ok';
      deudaTotalCop: number;
      carteraCop: number;
      porVencerCop: number;
      diasDeMoraMaximo: number;
      /** El interés de mora, aparte del capital (0 si no hay o no vino). */
      interesDeMoraCop: number;
    }
  | { estado: 'sin_cuotas' | 'no_disponible' };

export interface ContratoDeEntidad {
  id: string;
  codigo: number;
  estado: string;
  vigente: boolean;
  inquilino: string | null;
  inicio: string | null;
  fin: string | null;
  canonCop: number | null;
  diasParaVencer: number | null;
  inmueble: { id: string; codigo: number; titulo: string; direccion: string; ciudad: string } | null;
  propietarios: Array<{ id: string; nombre: string }>;
  renovacion: { estado: string; fin: string | null } | null;
  cartera: CarteraDeEntidad;
}

export type TipoDeEntidad =
  | 'inquilino'
  | 'coarrendatario'
  | 'propietario'
  | 'inmueble'
  | 'contrato'
  | 'postulante'
  | 'lead'
  | 'contacto'
  | 'proveedor';

export interface EntidadDelChat {
  tipo: TipoDeEntidad;
  id: string;
  titulo: string;
  motivo: string;
  documento: string | null;
  telefono: string | null;
  correo: string | null;
  contratos: ContratoDeEntidad[];
  totalContratos: number;
  otrosRoles: TipoDeEntidad[];
  /**
   * Con qué tipo se vuelve a pedir su ficha (`persona`, `contrato`…). Lo manda
   * el camino directo del micro (23-09); sin él, sale del `tipo`.
   */
  tipoDeFicha?: string;
}

const TIPOS: TipoDeEntidad[] = [
  'inquilino',
  'coarrendatario',
  'propietario',
  'inmueble',
  'contrato',
  'postulante',
  'lead',
  'contacto',
  'proveedor',
];

const texto = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function leerCartera(v: unknown): CarteraDeEntidad {
  if (esObjeto(v) && v.estado === 'ok') {
    return {
      estado: 'ok',
      deudaTotalCop: numero(v.deudaTotalCop) ?? 0,
      carteraCop: numero(v.carteraCop) ?? 0,
      porVencerCop: numero(v.porVencerCop) ?? 0,
      diasDeMoraMaximo: numero(v.diasDeMoraMaximo) ?? 0,
      interesDeMoraCop: numero(v.interesDeMoraCop) ?? 0,
    };
  }
  return { estado: esObjeto(v) && v.estado === 'sin_cuotas' ? 'sin_cuotas' : 'no_disponible' };
}

function leerContrato(v: unknown): ContratoDeEntidad | null {
  if (!esObjeto(v) || typeof v.id !== 'string' || typeof v.codigo !== 'number') return null;
  const inm = esObjeto(v.inmueble) ? v.inmueble : null;
  return {
    id: v.id,
    codigo: v.codigo,
    estado: texto(v.estado) ?? '',
    vigente: v.vigente === true,
    inquilino: texto(v.inquilino),
    inicio: texto(v.inicio),
    fin: texto(v.fin),
    canonCop: numero(v.canonCop),
    diasParaVencer: numero(v.diasParaVencer),
    inmueble:
      inm && typeof inm.id === 'string'
        ? {
            id: inm.id,
            codigo: numero(inm.codigo) ?? 0,
            titulo: texto(inm.titulo) ?? '',
            direccion: texto(inm.direccion) ?? '',
            ciudad: texto(inm.ciudad) ?? '',
          }
        : null,
    propietarios: Array.isArray(v.propietarios)
      ? v.propietarios
          .filter(esObjeto)
          .filter((p) => typeof p.id === 'string' && typeof p.nombre === 'string')
          .map((p) => ({ id: String(p.id), nombre: String(p.nombre) }))
      : [],
    renovacion: esObjeto(v.renovacion)
      ? { estado: texto(v.renovacion.estado) ?? '', fin: texto(v.renovacion.fin) }
      : null,
    cartera: leerCartera(v.cartera),
  };
}

/**
 * Los contratos de un PROPIETARIO no vienen en `contratos` sino colgados de
 * cada inmueble (`inmuebles[].contratoVigente`): la cadena es propietario →
 * inmueble → contrato → inquilino → cartera. Se aplanan para que la tarjeta
 * los pinte igual que los de un inquilino, con el inmueble puesto.
 */
function contratosDeSusInmuebles(v: unknown): ContratoDeEntidad[] {
  if (!Array.isArray(v)) return [];
  const salida: ContratoDeEntidad[] = [];
  for (const inm of v) {
    if (!esObjeto(inm) || !esObjeto(inm.contratoVigente)) continue;
    const c = leerContrato({ ...inm.contratoVigente, inmueble: inm.contratoVigente.inmueble ?? inm });
    if (c) salida.push(c);
  }
  return salida;
}

/** Las entidades válidas del `done` (la búsqueda en la plataforma). */
export function leerEntidades(v: unknown): EntidadDelChat[] {
  if (!Array.isArray(v)) return [];
  const salida: EntidadDelChat[] = [];
  for (const e of v) {
    if (!esObjeto(e) || typeof e.id !== 'string' || !TIPOS.includes(e.tipo as TipoDeEntidad)) continue;
    const contratos = Array.isArray(e.contratos)
      ? e.contratos.map(leerContrato).filter((c): c is ContratoDeEntidad => c !== null)
      : contratosDeSusInmuebles(e.inmuebles);
    salida.push({
      tipo: e.tipo as TipoDeEntidad,
      id: e.id,
      titulo: texto(e.titulo) ?? '',
      motivo: texto(e.motivo) ?? '',
      // P-5: el completo si el back lo manda; si no, los últimos 4.
      documento: texto(e.documento) ?? (texto(e.documentoFinal) ? `••••${e.documentoFinal}` : null),
      telefono: texto(e.telefono) ?? (texto(e.telefonoFinal) ? `••••${e.telefonoFinal}` : null),
      correo: texto(e.correo),
      contratos,
      totalContratos: numero(e.totalContratos) ?? contratos.length,
      otrosRoles: Array.isArray(e.otrosRoles)
        ? (e.otrosRoles.filter((r) => TIPOS.includes(r as TipoDeEntidad)) as TipoDeEntidad[])
        : [],
      ...(texto(e.tipoDeFicha) ? { tipoDeFicha: texto(e.tipoDeFicha) as string } : {}),
    });
  }
  return salida;
}

// ── Presentación ────────────────────────────────────────────────────────────

/**
 * Quita del markdown las tablas GFM. Cuando la respuesta trae un bloque `tabla`,
 * la tabla de Cadence ES la tabla; la que el modelo copió a mano en el texto
 * (a veces recortada, a veces con otras columnas) sería la misma información
 * dicha dos veces, y la regla del panel es no decir dos veces la misma frase.
 *
 * `parcial`: el texto se está escribiendo. Una tabla a medio teclear todavía no
 * tiene su separador (`|---|`) y se vería como una línea de rayas y barras; las
 * líneas del final que empiezan con `|` se esconden hasta que se completen (y
 * entonces las quita la regla de arriba).
 */
export function sinTablasDeMarkdown(md: string, opts: { parcial?: boolean } = {}): string {
  const lineas = md.split('\n');
  const salida: string[] = [];
  const esFilaDeTabla = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const esSeparador = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  for (let i = 0; i < lineas.length; i++) {
    if (esFilaDeTabla(lineas[i]) && i + 1 < lineas.length && esSeparador(lineas[i + 1])) {
      i += 1;
      while (i + 1 < lineas.length && esFilaDeTabla(lineas[i + 1])) i += 1;
      continue;
    }
    salida.push(lineas[i]);
  }
  if (opts.parcial) {
    // Las líneas en blanco del final no cuentan: la fila a medias puede estar
    // justo antes del salto que acaba de llegar.
    while (salida.length > 0 && /^\s*(\|.*)?$/.test(salida[salida.length - 1])) salida.pop();
  }
  return salida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** ¿Hay algo con forma que pintar? */
export function tieneTabla(bloques: BloqueDeRespuesta[] | undefined): boolean {
  return (bloques ?? []).some((b) => b.tipo === 'tabla');
}

/** Una celda, en el formato de su columna. `null` → raya (nunca «null» ni 0). */
export function textoDeCelda(valor: ValorDeCelda, formato: FormatoDeColumna): string {
  if (valor === null || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (formato === 'moneda' && Number.isFinite(n)) return formatCurrency(n);
  if (formato === 'numero' && Number.isFinite(n)) return formatNumber(n);
  if (formato === 'fecha' && typeof valor === 'string') return formatDate(valor);
  return String(valor);
}

/** La columna se alinea a la derecha y va en mono si es una cifra. */
export function esColumnaNumerica(formato: FormatoDeColumna): boolean {
  return formato === 'moneda' || formato === 'numero';
}
