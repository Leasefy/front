/**
 * Lo puro de la exógena: qué bloquea, qué avisa, qué se puede aprobar y cómo se
 * llama el archivo.
 *
 * ── 🔴 Bloqueo y aviso NO son lo mismo, y confundirlos cuesta una sanción ───
 *
 * Un BLOQUEO impide presentar: movimientos sin tercero (un asiento a 2815 sin
 * tercero no cumple el régimen de mandato) o cuentas sin concepto asignado. El
 * back devuelve 409 `EXOGENA_CON_BLOQUEOS` al intentar aprobar así, y la
 * pantalla NO ofrece forzarlo: no hay botón «aprobar igual». Un AVISO es algo
 * que hay que mirar y que no impide — y se muestra distinto, porque un contador
 * que ve seis renglones rojos iguales deja de leerlos.
 *
 * ── El visto bueno del contador se marca, no se asume ───────────────────────
 *
 * `APROBADA` guarda quién, cuándo y la foto de los totales. Lo que la pantalla
 * tiene que decir es qué de ese formato NO lo decidió el sistema: los códigos de
 * concepto los fija la resolución de la DIAN de cada año y cambian. Se muestran
 * con el mismo tratamiento que el PUC le da a `PENDIENTE_DE_CONFIRMAR` —un aviso
 * con el texto exacto, nunca un asterisco— porque un asterisco al pie de una
 * tabla de 128 filas no lo lee nadie.
 *
 * ── Que se pueda descargar no quiere decir que esté presentada ──────────────
 *
 * El CSV es la plantilla del Prevalidador; Leasefy no transmite. Ese aviso vive
 * en `exogena.service.ts` (`AVISO_DEL_PREVALIDADOR`) porque es parte del
 * contrato con el back, y la pantalla lo pone arriba, antes del botón.
 */

import type {
  ConceptosDeExogena,
  CuantiasMenores,
  FormatoDeExogena,
  ResumenDeExogena,
  ResumenDeFormato,
} from '@/lib/api/exogena.service';

/** Cuántos formatos tienen algo que impide presentarlos. */
export function formatosBloqueados(resumen: ResumenDeExogena): ResumenDeFormato[] {
  return resumen.formatos.filter((f) => f.bloqueos.length > 0);
}

/** Los formatos que todavía no tienen el visto bueno del contador. */
export function formatosSinVistoBueno(resumen: ResumenDeExogena): ResumenDeFormato[] {
  return resumen.formatos.filter((f) => f.estado !== 'APROBADA');
}

/** Los formatos con filas: los vacíos no se presentan y no hacen falta. */
export function formatosConFilas(resumen: ResumenDeExogena): ResumenDeFormato[] {
  return resumen.formatos.filter((f) => f.filas > 0);
}

export interface PermisoDeAprobar {
  puede: boolean;
  /** Por qué no. `null` cuando sí. */
  motivo: string | null;
}

/**
 * ¿Se puede pedir el visto bueno de este formato?
 *
 * Con bloqueos, NO — y el motivo es el primer bloqueo del back, textual: es el
 * que dice cuántos movimientos y por cuánta plata. Sin filas tampoco: aprobar un
 * formato vacío deja constancia de algo que no se va a presentar. Y sin la
 * migración 52 no hay dónde guardar el visto bueno, aunque el formato se calcule
 * y se descargue igual.
 */
export function sePuedeAprobar(
  formato: ResumenDeFormato,
  disponible: boolean,
): PermisoDeAprobar {
  if (!disponible) {
    return {
      puede: false,
      motivo:
        'Falta la migración que guarda el visto bueno. El formato se calcula y se descarga igual: lo que no se puede todavía es dejar constancia de quién lo revisó.',
    };
  }
  if (formato.estado === 'APROBADA') {
    return { puede: false, motivo: 'Este formato ya tiene el visto bueno.' };
  }
  if (formato.bloqueos.length > 0) {
    return {
      puede: false,
      motivo: formato.bloqueos[0],
    };
  }
  if (formato.filas === 0) {
    return {
      puede: false,
      motivo: 'Este formato no tiene filas: no hay nada que presentar ni que aprobar.',
    };
  }
  return { puede: true, motivo: null };
}

/**
 * Las cuentas sin concepto que de verdad importan: las que movieron plata.
 *
 * Una cuenta sin concepto y sin movimiento en el año no bloquea nada —no va a
 * salir en ningún formato—, y listarla entre las pendientes enterraría las que sí
 * bloquean bajo cincuenta que no. Ordenadas por plata, de mayor a menor: la
 * primera es la que hay que resolver.
 */
export function cuentasSinConceptoQueImportan(
  conceptos: ConceptosDeExogena,
): ConceptosDeExogena['sinConcepto'] {
  return conceptos.sinConcepto
    .filter((c) => c.movimientosCop !== 0)
    .slice()
    .sort((a, b) => Math.abs(b.movimientosCop) - Math.abs(a.movimientosCop));
}

/** Cuántos conceptos vienen del preset (o sea: pendientes de confirmar). */
export function conceptosDelPreset(conceptos: ConceptosDeExogena): number {
  return conceptos.conceptos.filter((c) => c.fuente === 'PRESET').length;
}

/**
 * El aviso de que el preset no es la resolución, con el número de cuentas que
 * lo usan. `null` cuando el contador ya los fijó todos.
 *
 * 🔴 Va con el mismo tratamiento que `PENDIENTE_DE_CONFIRMAR` en el PUC: un
 * aviso con el texto exacto. Nunca un asterisco.
 */
export function avisoDelPreset(conceptos: ConceptosDeExogena): string | null {
  const delPreset = conceptosDelPreset(conceptos);
  if (delPreset === 0) return null;
  return (
    `${delPreset} ${delPreset === 1 ? 'cuenta usa el concepto propuesto' : 'cuentas usan el concepto propuesto'} ` +
    'por Leasefy, no uno confirmado por el contador. ' +
    conceptos.avisoLegal
  );
}

/**
 * La frase de cuantías menores, con el tope y el NIT de agrupación. `null`
 * cuando no está activa.
 *
 * El tope lo fija la resolución del año: es uno de los cinco puntos que
 * necesitan visto bueno, y la pantalla lo dice al lado del número y no en una
 * nota al pie.
 */
export function frasesDeCuantiasMenores(
  cuantias: CuantiasMenores,
  formatoDeMonto: (n: number) => string,
): string | null {
  if (!cuantias.activa) return null;
  return (
    `${cuantias.filas} ${cuantias.filas === 1 ? 'fila se agrupa' : 'filas se agrupan'} en cuantías menores ` +
    `(pagos por debajo de ${formatoDeMonto(cuantias.topeCop)}) bajo el NIT ${cuantias.nit}. ` +
    'El tope y la agrupación los fija la resolución de la DIAN del año: confirmalos con el contador.'
  );
}

/** `exogena-1001-2026.csv`. El año va en el nombre: es un archivo anual. */
export function nombreDelArchivoDeExogena(formato: FormatoDeExogena, anio: number): string {
  return `exogena-${formato}-${anio}.csv`;
}

/**
 * Los años que se pueden pedir: del actual hacia atrás.
 *
 * Nunca el próximo: la exógena de 2027 se presenta en 2028 y en 2026 no tiene
 * ni una fila — un selector que lo ofrezca produce un informe vacío que se lee
 * como «no hubo movimiento».
 */
export function aniosDeExogena(anioDeHoy: number, cuantos = 5): number[] {
  return Array.from({ length: cuantos }, (_, i) => anioDeHoy - i);
}

/**
 * Cuántas filas y cuánta plata hay en total, para el encabezado. Se suman los
 * formatos CON filas: los vacíos no aportan y contarlos daría un promedio falso.
 */
export function totalesDelAnio(resumen: ResumenDeExogena): { filas: number; totalCop: number } {
  return resumen.formatos.reduce(
    (acumulado, f) => ({
      filas: acumulado.filas + f.filas,
      totalCop: acumulado.totalCop + f.totalCop,
    }),
    { filas: 0, totalCop: 0 },
  );
}
