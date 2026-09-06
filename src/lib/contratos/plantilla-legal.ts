/**
 * Las reglas del contrato armado desde la plantilla legal, sin React.
 *
 * Acá NO se decide nada legal: el texto, el catálogo cerrado de cláusulas, los
 * topes de los artículos 18 y 20 y los siete puntos del artículo 3 viven en el
 * backend, y el validador corre siempre del otro lado. Lo que hay acá es lo que
 * la pantalla necesita para no mandar a la persona a un error que ya se ve
 * venir, y para no perder lo que escribió.
 */

import type {
  BorradorDeContrato,
  CampoDelContrato,
  ClausulaDelCatalogo,
  PropuestaDeLaIa,
} from '@/lib/api/contratos-plantilla.service';

/** Los campos requeridos que todavía están vacíos. */
export function camposIncompletos(
  campos: readonly CampoDelContrato[],
  valores: Record<string, string>,
): CampoDelContrato[] {
  return campos.filter(
    (c) => c.requerida && (valores[c.nombre] ?? '').trim() === '',
  );
}

/**
 * Todos los campos que hay que llenar: los de la plantilla más los de las
 * cláusulas elegidas.
 *
 * Las cláusulas que no se eligieron vienen del backend con `campos: []`, así
 * que no hace falta filtrarlas acá — pero se filtra igual, porque una cláusula
 * desmarcada cuya última respuesta del backend todavía traía sus campos
 * llenaría el «falta completar» con preguntas de algo que no va a entrar.
 */
export function camposATrabajar(
  camposDeLaPlantilla: readonly CampoDelContrato[],
  clausulas: readonly ClausulaDelCatalogo[],
  elegidas: readonly string[],
): CampoDelContrato[] {
  const activas = new Set(elegidas);
  return [
    ...camposDeLaPlantilla,
    ...clausulas.filter((c) => activas.has(c.codigo)).flatMap((c) => c.campos),
  ];
}

/**
 * Qué cláusula YA ELEGIDA se contradice con ésta, si alguna.
 *
 * Se mira en las dos direcciones: el backend declara la incompatibilidad en una
 * sola de las dos cláusulas del par, y leerla en un solo sentido dejaría pasar
 * el par según cuál se marcara primero — que es justo el 400 que se quiere
 * evitar mostrándolo antes.
 */
export function bloqueadaPor(
  clausula: ClausulaDelCatalogo,
  elegidas: readonly string[],
  catalogo: readonly ClausulaDelCatalogo[],
): ClausulaDelCatalogo | null {
  const activas = elegidas.filter((c) => c !== clausula.codigo);
  for (const codigo of activas) {
    const otra = catalogo.find((c) => c.codigo === codigo);
    if (!otra) continue;
    if (
      clausula.incompatibleCon.includes(codigo) ||
      otra.incompatibleCon.includes(clausula.codigo)
    ) {
      return otra;
    }
  }
  return null;
}

/** Marcar o desmarcar una cláusula, sin repetidos y conservando el orden. */
export function alternarClausula(
  elegidas: readonly string[],
  codigo: string,
): string[] {
  return elegidas.includes(codigo)
    ? elegidas.filter((c) => c !== codigo)
    : [...elegidas, codigo];
}

/**
 * El prellenado nuevo del backend, sin pisar lo que la persona escribió.
 *
 * `tocados` son los campos que la persona editó a mano. Todo lo demás lo manda
 * el backend, y tiene que poder cambiar: si alguien corrige el canon en el
 * formulario, el canon impreso en el contrato cambia con él. Sin esta
 * distinción o se pierde lo tecleado, o se imprime un canon viejo — y lo
 * segundo es un contrato firmado con un número que nadie acordó.
 */
export function mezclarValores(
  delBackend: Record<string, string>,
  actuales: Record<string, string>,
  tocados: ReadonlySet<string>,
): Record<string, string> {
  const mezcla = { ...delBackend };
  for (const nombre of tocados) {
    const valor = actuales[nombre];
    if (valor !== undefined) mezcla[nombre] = valor;
  }
  return mezcla;
}

/** Los valores prellenados que devuelve una preparación, como diccionario. */
export function valoresDe(campos: readonly CampoDelContrato[]): Record<string, string> {
  return Object.fromEntries(campos.map((c) => [c.nombre, c.valor]));
}

/**
 * Lo que propuso la IA, volcado sobre el formulario.
 *
 * Vuelve al MISMO estado que llena el modo plantilla —variables, cláusulas y
 * estipulaciones— y por eso todo queda editable: la revisión no es una pantalla
 * de sólo lectura con un botón de aceptar, es el formulario ya lleno.
 *
 * Las cláusulas se SUMAN a las que ya estaban: la persona pudo haber marcado
 * algunas antes de pedirle una propuesta al modelo, y borrárselas sería
 * deshacerle trabajo sin avisar.
 */
export function aplicarPropuesta(
  propuesta: PropuestaDeLaIa,
  actual: { valores: Record<string, string>; clausulas: readonly string[] },
): {
  valores: Record<string, string>;
  clausulas: string[];
  estipulacionesEspeciales: string;
  /** Las variables que de verdad cambió la propuesta, para poder señalarlas. */
  deducidas: string[];
} {
  const valores = { ...actual.valores };
  const deducidas: string[] = [];
  for (const [nombre, valor] of Object.entries(propuesta.variables)) {
    if (typeof valor !== 'string' || valor.trim() === '') continue;
    valores[nombre] = valor;
    deducidas.push(nombre);
  }

  let clausulas = [...actual.clausulas];
  for (const codigo of propuesta.clausulas) {
    if (!clausulas.includes(codigo)) clausulas = [...clausulas, codigo];
  }

  return {
    valores,
    clausulas,
    estipulacionesEspeciales: propuesta.estipulacionesEspeciales ?? '',
    deducidas,
  };
}

/**
 * La huella de todo lo que termina IMPRESO en el PDF.
 *
 * 🔴 Existe para invalidar un PDF ya generado. Sin esto: se genera el contrato
 * con un canon de 2.500.000, la persona corrige el canon a 2.800.000 en el
 * formulario de abajo, aprieta «Crear contrato» — y el contrato queda con
 * 2.800.000 en la base y 2.500.000 en el PDF que firman las partes. La suite
 * quedaría verde y el documento sería falso.
 *
 * No entra nada que el PDF no use: `insuranceTier` o los días de plazo cambian
 * el cobro, no el texto del contrato, y regenerar por ellos sería hacer perder
 * un paso sin razón.
 */
export function huellaDelBorrador(
  borrador: BorradorDeContrato,
  extra: { valores: Record<string, string>; clausulas: readonly string[]; estipulaciones: string },
): string {
  return JSON.stringify([
    borrador.consignacionId ?? null,
    borrador.propertyId ?? null,
    borrador.uso ?? null,
    borrador.arrendatarioNombre ?? null,
    borrador.arrendatarioDocumento ?? null,
    borrador.arrendatarioTipoDocumento ?? null,
    borrador.arrendadorNombre ?? null,
    borrador.arrendadorDocumento ?? null,
    borrador.canonMensual ?? null,
    borrador.periodicidad ?? null,
    borrador.diaDePago ?? null,
    borrador.fechaInicio ?? null,
    borrador.fechaFin ?? null,
    borrador.destinacion ?? null,
    borrador.adminFee ?? null,
    borrador.conceptos ?? null,
    borrador.reajustePorcentaje ?? null,
    borrador.valorComercial ?? null,
    borrador.avaluoCatastral ?? null,
    // Ordenadas: marcar A y después B tiene que dar la misma huella que B y
    // después A, porque el PDF sale igual.
    [...extra.clausulas].sort(),
    Object.entries(extra.valores)
      .filter(([, v]) => (v ?? '').trim() !== '')
      .sort(([a], [b]) => a.localeCompare(b)),
    extra.estipulaciones.trim(),
  ]);
}

/** El texto mínimo que el backend acepta en `instrucciones` (`@MinLength(10)`). */
export const MINIMO_DE_INSTRUCCIONES = 10;

/** El tope de `instrucciones` (`@MaxLength(6000)`). */
export const MAXIMO_DE_INSTRUCCIONES = 6000;

/** El tope de `estipulacionesEspeciales` (`@MaxLength(4000)`). */
export const MAXIMO_DE_ESTIPULACIONES = 4000;

export function instruccionesValidas(texto: string): boolean {
  const limpio = texto.trim();
  return (
    limpio.length >= MINIMO_DE_INSTRUCCIONES &&
    limpio.length <= MAXIMO_DE_INSTRUCCIONES
  );
}
