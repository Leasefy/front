/**
 * Las DIFERENCIAS CONOCIDAS de la conciliación — lo que se calcula sin React
 * (02-10-2026, S2-D).
 *
 * Nico: «la retención (p. ej. 3,5 % de arrendamientos) es una DIFERENCIA
 * CONOCIDA CONFIGURABLE por cada inmobiliaria; una combinación que sólo cuadra
 * gracias a una diferencia se PROPONE, nunca se aplica sola».
 *
 * Espejo del DTO del back (`back/src/inmobiliaria/conciliacion-bancaria/dto/
 * diferencias-conocidas.dto.ts` y `diferencias-conocidas.ts`): los MISMOS
 * topes y las MISMAS frases. El back vuelve a validar todo igual.
 */

import { camposDelError, leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type {
  ClaseDeRetencion,
  AQuienAplicaLaDiferencia,
  DiferenciaConfigurada,
} from '@/lib/api/conciliacion-bancaria.types';

/** Cuántas puede tener una inmobiliaria (`MAXIMO_DE_DIFERENCIAS_CONOCIDAS` del back). */
export const MAXIMO_DE_DIFERENCIAS = 10;
/** Una comisión de más de $10.000.000 no es una comisión (`TOPE_DE_LA_COMISION_COP`). */
export const TOPE_DE_LA_COMISION_COP = 10_000_000;
export const LARGO_MAXIMO_DEL_NOMBRE = 60;

export type TipoDeDiferencia = DiferenciaConfigurada['tipo'];
export type CampoDeLaFila = 'nombre' | 'valor';

/** Una fila del formulario: el valor se escribe como texto (porcentaje o pesos). */
export interface FilaDeDiferencia {
  /** Sólo para React y para los errores: no viaja al back. */
  clave: string;
  nombre: string;
  tipo: TipoDeDiferencia;
  valor: string;
  aQuien: AQuienAplicaLaDiferencia;
  /** Sólo retención: qué retención es (para el certificado). `''` = sin decir. */
  clase: ClaseDeRetencion | '';
}

/** C2-DESHACER (Nico, P1): la clase de una retención, en palabras. */
export const NOMBRE_DE_LA_CLASE: Record<ClaseDeRetencion, string> = {
  RETEFUENTE: 'En la fuente',
  RETEICA: 'De ICA',
  RETEIVA: 'De IVA',
};

export const NOMBRE_DE_A_QUIEN: Record<AQuienAplicaLaDiferencia, string> = {
  aseguradoras: 'Aseguradoras',
  empresas: 'Empresas',
  todos: 'Todos',
};

export const AYUDA_DE_A_QUIEN: Record<AQuienAplicaLaDiferencia, string> = {
  aseguradoras: 'Sólo si todos los recibos de la combinación los pagó una aseguradora.',
  empresas: 'Sólo si la línea del banco viene de una empresa (trae NIT, «SAS», «LTDA»…).',
  todos: 'A cualquier pagador.',
};

let consecutivo = 0;
function claveNueva(): string {
  consecutivo += 1;
  return `diferencia-${consecutivo}`;
}

/** Una fila vacía: por defecto, una retención a empresas (el caso del 3,5 %). */
export function filaNueva(): FilaDeDiferencia {
  return { clave: claveNueva(), nombre: '', tipo: 'RETENCION', valor: '', aQuien: 'empresas', clase: '' };
}

/** «3,5» y no «3.5»: así se escribe un porcentaje en Colombia. */
function porcentajeEnTexto(p: number): string {
  return String(p).replace('.', ',');
}

/** Lo que guardó el back, como filas del formulario. */
export function filasDesde(diferencias: readonly DiferenciaConfigurada[]): FilaDeDiferencia[] {
  return diferencias.map((d) => ({
    clave: claveNueva(),
    nombre: d.nombre,
    tipo: d.tipo,
    valor: d.tipo === 'RETENCION' ? porcentajeEnTexto(d.porcentaje) : String(d.valorCop),
    aQuien: d.aQuien,
    clase: d.tipo === 'RETENCION' ? (d.clase ?? '') : '',
  }));
}

/**
 * El porcentaje escrito («3,5», «3.5», « 3,50 % »). `null` = no es un número.
 * Devuelve también cuántos decimales traía (el DTO admite hasta dos).
 */
export function leerPorcentaje(texto: string): { valor: number; decimales: number } | null {
  const limpio = texto.trim().replace(/\s*%$/, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const decimales = limpio.includes('.') ? limpio.split('.')[1].replace(/0+$/, '').length : 0;
  return { valor: Number(limpio), decimales };
}

/** Los pesos escritos («8.900», «$ 8900», «8900»). `null` = no son pesos enteros. */
export function leerPesos(texto: string): number | null {
  const limpio = texto.trim().replace(/^\$\s*/, '').replace(/\./g, '');
  if (!/^\d+$/.test(limpio)) return null;
  return Number(limpio);
}

/** Los errores de UNA fila, con las frases del DTO del back. */
export function erroresDeLaFila(f: FilaDeDiferencia): Partial<Record<CampoDeLaFila, string>> {
  const errores: Partial<Record<CampoDeLaFila, string>> = {};
  const nombre = f.nombre.trim();
  if (!nombre) errores.nombre = 'Ponle un nombre a la diferencia.';
  else if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE) errores.nombre = 'El nombre va hasta 60 caracteres.';

  if (f.tipo === 'RETENCION') {
    if (!f.valor.trim()) errores.valor = 'Escribe el porcentaje de la retención.';
    else {
      const p = leerPorcentaje(f.valor);
      if (!p) errores.valor = 'El porcentaje es un número, por ejemplo 3,5.';
      else if (p.decimales > 2) errores.valor = 'El porcentaje va con hasta dos decimales.';
      else if (p.valor <= 0) errores.valor = 'El porcentaje tiene que ser mayor que cero.';
      else if (p.valor > 100) errores.valor = 'El porcentaje va hasta 100.';
    }
  } else if (!f.valor.trim()) errores.valor = 'Escribe el valor de la comisión.';
  else {
    const v = leerPesos(f.valor);
    if (v === null) errores.valor = 'La comisión va en pesos enteros.';
    else if (v < 1) errores.valor = 'La comisión tiene que ser de al menos $1.';
    else if (v > TOPE_DE_LA_COMISION_COP) errores.valor = 'La comisión va hasta $10.000.000.';
  }
  return errores;
}

export interface Validacion {
  /** Por la `clave` de la fila. Vacío = todo bien. */
  errores: Record<string, Partial<Record<CampoDeLaFila, string>>>;
  /** Lo que se manda al back, o `null` si hay algo mal. */
  diferencias: DiferenciaConfigurada[] | null;
}

export function validar(filas: readonly FilaDeDiferencia[]): Validacion {
  const errores: Validacion['errores'] = {};
  for (const f of filas) {
    const e = erroresDeLaFila(f);
    if (Object.keys(e).length > 0) errores[f.clave] = e;
  }
  if (Object.keys(errores).length > 0 || filas.length > MAXIMO_DE_DIFERENCIAS) {
    return { errores, diferencias: null };
  }
  return {
    errores,
    diferencias: filas.map((f): DiferenciaConfigurada =>
      f.tipo === 'RETENCION'
        ? {
            nombre: f.nombre.trim(),
            tipo: 'RETENCION',
            porcentaje: leerPorcentaje(f.valor)!.valor,
            aQuien: f.aQuien,
            ...(f.clase ? { clase: f.clase } : {}),
          }
        : { nombre: f.nombre.trim(), tipo: 'COMISION', valorCop: leerPesos(f.valor)!, aQuien: f.aQuien },
    ),
  };
}

export interface ErroresDelServidor {
  /** Por la `clave` de la fila. */
  porFila: Record<string, Partial<Record<CampoDeLaFila, string>>>;
  /** Lo que no va en ninguna fila (un 5xx, la red…): para el aviso general. */
  general: string | null;
  /** 503 `FALTA_UNA_MIGRACION`: no se puede guardar todavía. */
  sinLaMigracion: boolean;
}

/**
 * Lo que dijo el back al guardar, repartido por fila: `campos[]` del 400
 * `DATOS_INVALIDOS` llegan como `diferencias.<i>.<campo>`, y el 400
 * `DIFERENCIA_MAL_ARMADA` trae el `indice`.
 */
export function erroresDelServidor(error: unknown, filas: readonly FilaDeDiferencia[]): ErroresDelServidor {
  const fallo = leerFallo(error);
  const salida: ErroresDelServidor = { porFila: {}, general: null, sinLaMigracion: false };
  if (fallo.code === 'FALTA_UNA_MIGRACION') {
    salida.sinLaMigracion = true;
    return salida;
  }
  const poner = (indice: number, campo: CampoDeLaFila, mensaje: string) => {
    const fila = filas[indice];
    if (!fila) return false;
    salida.porFila[fila.clave] = { [campo]: mensaje, ...salida.porFila[fila.clave] };
    return true;
  };
  if (fallo.code === 'DIFERENCIA_MAL_ARMADA') {
    const sobre = (error as { detalle?: Record<string, unknown> })?.detalle ?? {};
    const indice = typeof sobre.indice === 'number' ? sobre.indice : -1;
    const mensaje = mensajeParaLaPersona(error, { porDefecto: 'A una de las diferencias le sobra o le falta un dato.' });
    if (!poner(indice, 'valor', mensaje)) salida.general = mensaje;
    return salida;
  }
  const sueltos: string[] = [];
  for (const c of camposDelError(error)) {
    const m = /^diferencias\.(\d+)\.(\w+)$/.exec(c.campo);
    const campo: CampoDeLaFila | null = m ? (m[2] === 'nombre' ? 'nombre' : m[2] === 'porcentaje' || m[2] === 'valorCop' ? 'valor' : null) : null;
    if (!m || !campo || !poner(Number(m[1]), campo, c.mensaje)) sueltos.push(c.mensaje);
  }
  if (sueltos.length > 0) salida.general = sueltos.join(' ');
  else if (Object.keys(salida.porFila).length === 0) {
    salida.general = mensajeParaLaPersona(error, {
      porDefecto: 'No se pudieron guardar las diferencias conocidas.',
      accion: 'guardar las diferencias conocidas',
    });
  }
  return salida;
}
