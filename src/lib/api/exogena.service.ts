/**
 * `/inmobiliaria/contabilidad/exogena` — la información exógena anual de la
 * DIAN (contrato congelado del 18-09, §6).
 *
 * ── 🔴 Qué es y qué NO es el archivo que baja de acá ────────────────────────
 *
 * La DIAN recibe XML generado por su **Prevalidador**; el camino oficial es
 * cargar la plantilla en el prevalidador y que él produzca el XML firmado. El
 * CSV de `archivo()` es esa plantilla, con las columnas del formato y los datos
 * ya cuadrados contra el libro. **Leasefy no transmite nada a la DIAN**, y la
 * pantalla lo dice con esas palabras, arriba, antes del botón de descarga. Una
 * pantalla que deja creer que ya se presentó la exógena produce una sanción.
 *
 * ── 🔴 El preset de conceptos viene `PENDIENTE_DE_CONFIRMAR` ────────────────
 *
 * Los códigos de concepto los fija la resolución de la DIAN de cada año (para
 * 2025, la Resolución 000162 de 2023 y sus modificaciones) y cambian. El preset
 * que trae el back es una propuesta, no la resolución: se muestra con el mismo
 * tratamiento que el PUC le da a `PENDIENTE_DE_CONFIRMAR` —un aviso con el
 * texto exacto, nunca un asterisco— y no se deja aprobar un formato con
 * cuentas sin concepto.
 *
 * ── Los cinco puntos que necesitan visto bueno del contador ─────────────────
 *
 * Están escritos en `PENDIENTES_DEL_CONTADOR` y la pantalla los lista tal cual.
 * El tercero es el que decide la plata de una inmobiliaria: si los giros a
 * propietarios van en el 1001 como pago a tercero o sólo en el 1647 como
 * ingreso recibido para terceros. Bajo mandato la inmobiliaria no es la que
 * deduce ese pago; por defecto el back manda sólo 1647.
 *
 * Sin la migración 52 los formatos se **calculan y se descargan** igual: lo que
 * no se puede es guardar el mapeo de conceptos ni el visto bueno.
 */

import { apiClient } from './client';

const BASE = '/inmobiliaria/contabilidad/exogena';

// ══ Vocabulario del back ════════════════════════════════════════════════════

/** Los seis formatos que le toca presentar a una inmobiliaria. */
export type FormatoDeExogena = '1001' | '1003' | '1007' | '1008' | '1009' | '1647';

export const FORMATOS_DE_EXOGENA: readonly FormatoDeExogena[] = [
  '1001',
  '1003',
  '1007',
  '1008',
  '1009',
  '1647',
];

/** De dónde sale cada formato, para que la pantalla no sea seis números. */
export const DE_DONDE_SALE: Record<FormatoDeExogena, string> = {
  '1001':
    'Cuentas de gasto (5/6/7) por tercero, más las retenciones que se le practicaron (2365, 2367, 2368).',
  '1003': 'Las retenciones que le practicaron a la inmobiliaria (1355xx).',
  '1007': 'Cuentas de ingreso (clase 4) por tercero.',
  '1008': 'Saldo débito de 13xx por tercero al 31 de diciembre.',
  '1009': 'Saldo crédito de 23xx y 28xx por tercero al 31 de diciembre.',
  '1647': 'Movimientos de 2815xx por propietario: el formato propio de una inmobiliaria.',
};

export type EstadoDeFormato = 'GENERADA' | 'APROBADA' | 'ANULADA';

export const NOMBRE_DEL_ESTADO_DE_FORMATO: Record<EstadoDeFormato, string> = {
  GENERADA: 'Generada',
  APROBADA: 'Con visto bueno',
  ANULADA: 'Anulada',
};

export interface ResumenDeFormato {
  formato: FormatoDeExogena;
  nombre: string;
  filas: number;
  totalCop: number;
  estado: EstadoDeFormato;
  aprobadoPorUserId: string | null;
  aprobadoAt: string | null;
  observaciones: string | null;
  /** Lo que impide presentar: movimientos sin tercero, cuentas sin concepto. */
  bloqueos: string[];
  /** Lo que hay que mirar pero no impide. */
  avisos: string[];
  /**
   * 🔴 Las preguntas que ESTE formato necesita que responda el contador: si los
   * giros a propietarios van en el 1001 o sólo en el 1647, qué parte del gasto
   * es deducible, qué tope de cuantías menores fijó la resolución del año.
   *
   * Es contenido de pantalla, no un comentario del código: son decisiones que el
   * sistema no puede tomar y que cambian lo que se presenta. Se listan enteras,
   * con el tratamiento de `PENDIENTE_DE_CONFIRMAR`.
   */
  paraElContador?: string[];
  /** Este formato necesita el visto bueno del contador antes de presentarse. */
  necesitaContador: boolean;
}

/** El tope de cuantías menores y su NIT de agrupación, que fija la resolución. */
export interface CuantiasMenores {
  activa: boolean;
  topeCop: number;
  /** El NIT genérico con el que se agrupa (`222222222`). */
  nit: string;
  filas: number;
}

export interface ResumenDeExogena {
  anio: number;
  formatos: ResumenDeFormato[];
  /** `false` = falta la migración 52: se calcula y se descarga, no se aprueba. */
  disponible: boolean;
  cuantiasMenores: CuantiasMenores;
}

/** Una fila del formato, ya armada por el back, con las claves del CSV. */
export type FilaDeExogena = Record<string, string | number | null>;

/** Una línea del detalle: de qué movimiento salió cada peso. */
export interface DetalleDeExogena {
  terceroTipo: string;
  terceroId: string | null;
  cuentaCodigo: string;
  valorCop: number;
}

export interface FormatoArmado {
  formato: FormatoDeExogena;
  anio: number;
  /** El orden exacto del CSV. La tabla usa este orden y no uno propio. */
  columnas: string[];
  filas: FilaDeExogena[];
  totales: Record<string, number>;
  bloqueos: string[];
  avisos: string[];
  /** Las preguntas que este formato necesita que responda el contador. */
  paraElContador?: string[];
  /** Sólo con `incluirDetalle=true`. */
  detalle?: DetalleDeExogena[];
}

// ── El mapeo cuenta → concepto ─────────────────────────────────────────────

/** `PRESET` = la propuesta del back; `AGENCIA` = lo que fijó el contador. */
export type FuenteDelConcepto = 'PRESET' | 'AGENCIA';

export interface ConceptoDeExogena {
  cuentaId: string;
  codigo: string;
  nombre: string;
  formato: FormatoDeExogena;
  concepto: string;
  fuente: FuenteDelConcepto;
}

export interface CuentaSinConcepto {
  cuentaId: string;
  codigo: string;
  /** Cuánto movió esa cuenta en el año: por eso importa que falte. */
  movimientosCop: number;
}

export interface ConceptosDeExogena {
  anio: number;
  /** `false` = falta la migración 52: se ve el preset, no se guarda. */
  disponible: boolean;
  conceptos: ConceptoDeExogena[];
  sinConcepto: CuentaSinConcepto[];
  /** El texto exacto del aviso legal. Va arriba, sin recortar. */
  avisoLegal: string;
}

/** `ExogenaGuardarConceptosDto`: la entrada anidada. */
export const CLAVES_DE_CONCEPTO = ['cuentaId', 'formato', 'concepto'] as const;

export interface ConceptoNuevo {
  cuentaId: string;
  formato: FormatoDeExogena;
  concepto: string;
}

export const CLAVES_DE_GUARDAR_CONCEPTOS = ['anio', 'conceptos'] as const;

/** `AprobarExogenaDto`. Es el visto bueno del contador: quién, cuándo y los totales. */
export const CLAVES_DE_APROBAR = ['anio', 'observaciones'] as const;

/** `AnularExogenaDto`. Vuelve el formato a `GENERADA`. */
export const CLAVES_DE_ANULAR_EXOGENA = ['anio', 'motivo'] as const;

/** 409 al aprobar con movimientos sin tercero o cuentas sin concepto. */
export const EXOGENA_CON_BLOQUEOS = 'EXOGENA_CON_BLOQUEOS';

// ── La configuración de la inmobiliaria (contrato del 19-09, §2) ───────────

/** Lo que Leasefy publicó para el año. `null` = ese año no está publicado. */
export interface AnioDeLaPlataforma {
  anio: number;
  /** Qué resolución de la DIAN rige el año. `null` = no se cargó. */
  resolucion: string | null;
  /** 🔴 `null` = no se agrupa nada. NO es cero: agrupar con un tope inventado
   * esconde terceros que había que declarar. */
  topeCuantiasMenoresCop: number | null;
  nitCuantiasMenores: string | null;
}

/**
 * `GET /exogena/configuracion?anio=`.
 *
 * 🔴 Los dos interruptores se ven iguales y NO valen lo mismo:
 * `girosAPropietariosEn1001` ya está decidido (Nico, 18-09: sólo en el 1647) y
 * `saldo2815En1009` todavía espera al contador. Cuál es cuál lo dice el back
 * en `decididoPorNico` y `esperaAlContador`, con el texto entero — la pantalla
 * los usa tal cual y no inventa una explicación propia.
 */
export interface ConfiguracionDeExogena {
  /** `false` = falta la migración 70: se ven los valores por defecto y guardar es 503. */
  disponible: boolean;
  motivo: string | null;
  girosAPropietariosEn1001: boolean;
  saldo2815En1009: boolean;
  /** El override propio. `null` = hereda el del año publicado. */
  topeCuantiasMenoresCop: number | null;
  delAnioDeLaPlataforma: AnioDeLaPlataforma | null;
  /** Por interruptor: por qué ya está resuelto. */
  decididoPorNico: Record<string, string>;
  /** Por interruptor: qué falta para resolverlo. */
  esperaAlContador: Record<string, string>;
}

/**
 * `GuardarConfiguracionDto`.
 *
 * 🔴 `anio` NO está: la configuración es de la inmobiliaria y no del año
 * (`configuracion_de_exogena` tiene `agencyId` único). El `?anio=` del GET
 * sólo sirve para traer `delAnioDeLaPlataforma`. Mandar `anio` en el cuerpo es
 * un 400 por `forbidNonWhitelisted`.
 */
export const CLAVES_DE_CONFIGURACION = [
  'girosAPropietariosEn1001',
  'saldo2815En1009',
  'topeCuantiasMenoresCop',
] as const;

export interface CambiosDeConfiguracion {
  girosAPropietariosEn1001?: boolean;
  saldo2815En1009?: boolean;
  /** `null` borra el override y vuelve a heredar el del año publicado. */
  topeCuantiasMenoresCop?: number | null;
}

/**
 * Lo que devuelve el `PUT`: la FILA de `configuracion_de_exogena`, no el
 * resumen del `GET`.
 *
 * 🔴 Verificado contra `ExogenaService.guardarConfiguracion`, que devuelve el
 * `upsert` pelado: no trae `delAnioDeLaPlataforma`, ni `decididoPorNico`, ni
 * `esperaAlContador`. Tipar esto como `ConfiguracionDeExogena` haría que la
 * pantalla pintara el tope heredado como si no existiera apenas se guarda algo
 * — por eso quien guarda vuelve a pedir el `GET`.
 */
export interface FilaDeConfiguracionDeExogena {
  id: string;
  agencyId: string;
  girosAPropietariosEn1001: boolean;
  saldo2815En1009: boolean;
  topeCuantiasMenoresCop: number | null;
  actualizadoPorUserId: string | null;
}

/** 503 sin la migración 70. */
export const CONFIGURACION_DE_EXOGENA_SIN_MIGRAR = 'CONFIGURACION_DE_EXOGENA_SIN_MIGRAR';

/**
 * Lo que la resolución de cada año decide y el sistema NO puede saber. La
 * pantalla los lista con este texto, marcados como pendientes de confirmar.
 */
export const PENDIENTES_DEL_CONTADOR: readonly string[] = [
  'Los códigos de concepto de cada formato y cada año: el preset no es la resolución.',
  'El tope de cuantías menores y si se agrupa con el NIT 222222222: lo fija la resolución del año.',
  'Los giros a propietarios: ¿van en el 1001 como pago a tercero, o sólo en el 1647 como ingreso recibido para terceros? Bajo mandato la inmobiliaria no es la que deduce ese pago. Por defecto sólo 1647, configurable.',
  'Qué parte del gasto es deducible y qué parte no (el 1001 tiene las dos columnas): por defecto todo deducible.',
  'El dígito de verificación se calcula con el algoritmo de la DIAN sobre el NIT; para cédulas va vacío.',
];

/**
 * El aviso que va arriba de la pantalla, con estas palabras. No es copy
 * decorativo: es la diferencia entre creer que la exógena está presentada y
 * saber que falta cargarla en el Prevalidador.
 */
export const AVISO_DEL_PREVALIDADOR =
  'Este CSV es la plantilla del Prevalidador de la DIAN: tiene las columnas del formato y los datos ya cuadrados contra el libro. Leasefy NO transmite la exógena. El XML firmado lo produce el Prevalidador después de cargar esta plantilla.';

// ══ Helpers ═════════════════════════════════════════════════════════════════

function conQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * Se queda con las claves del DTO y tira las `undefined`. Igual que el de
 * `contabilidad.service.ts` — el `ValidationPipe` del back corre con
 * `forbidNonWhitelisted` y una clave de más es un 400.
 */
function soloClaves<T extends object>(objeto: T, claves: readonly (keyof T)[]): Partial<T> {
  const limpio: Partial<T> = {};
  for (const clave of claves) {
    const valor = objeto[clave];
    if (valor !== undefined) limpio[clave] = valor;
  }
  return limpio;
}

// ══ API ═════════════════════════════════════════════════════════════════════

export const exogenaApi = {
  /** Los seis formatos del año con sus filas, bloqueos y estado. */
  async resumen(anio: number): Promise<ResumenDeExogena> {
    return apiClient.get<ResumenDeExogena>(conQuery(BASE, { anio: String(anio) }));
  },

  /** Un formato con sus filas ya armadas, en el orden de columnas del CSV. */
  async formato(
    formato: FormatoDeExogena,
    anio: number,
    incluirDetalle = false,
  ): Promise<FormatoArmado> {
    return apiClient.get<FormatoArmado>(
      conQuery(`${BASE}/${encodeURIComponent(formato)}`, {
        anio: String(anio),
        incluirDetalle: incluirDetalle ? 'true' : undefined,
      }),
    );
  },

  /** El CSV con BOM y `;`, en el orden de columnas del formato. */
  async archivo(formato: FormatoDeExogena, anio: number): Promise<Blob> {
    return apiClient.getBlob(
      conQuery(`${BASE}/${encodeURIComponent(formato)}/archivo`, { anio: String(anio) }),
    );
  },

  /** El mapeo cuenta del PUC → concepto del formato, por año. */
  async conceptos(anio: number): Promise<ConceptosDeExogena> {
    return apiClient.get<ConceptosDeExogena>(
      conQuery(`${BASE}/conceptos`, { anio: String(anio) }),
    );
  },

  /** Escritura. Guarda el mapeo del año. 503 sin la migración 52. */
  async guardarConceptos(anio: number, conceptos: ConceptoNuevo[]): Promise<ConceptosDeExogena> {
    return apiClient.put<ConceptosDeExogena>(`${BASE}/conceptos`, {
      ...soloClaves({ anio }, ['anio'] as const),
      conceptos: conceptos.map((c) => soloClaves(c, CLAVES_DE_CONCEPTO)),
    });
  },

  /**
   * Escritura. El visto bueno del contador: guarda quién, cuándo y la foto de
   * los totales. 409 `EXOGENA_CON_BLOQUEOS` si hay movimientos sin tercero o
   * cuentas sin concepto — y eso NO se puede forzar desde la pantalla.
   */
  async aprobar(
    formato: FormatoDeExogena,
    anio: number,
    observaciones?: string,
  ): Promise<ResumenDeFormato> {
    return apiClient.post<ResumenDeFormato>(
      `${BASE}/${encodeURIComponent(formato)}/aprobar`,
      soloClaves({ anio, observaciones }, CLAVES_DE_APROBAR),
    );
  },

  /**
   * Qué escogió esta inmobiliaria, qué hereda del año que Leasefy publicó, y
   * cuál de los dos interruptores ya se resolvió.
   */
  async configuracion(anio: number): Promise<ConfiguracionDeExogena> {
    return apiClient.get<ConfiguracionDeExogena>(
      conQuery(`${BASE}/configuracion`, { anio: String(anio) }),
    );
  },

  /**
   * Escritura (ADMIN o CONTADOR). 503 sin la migración 70.
   *
   * 🔴 `topeCuantiasMenoresCop: null` SÍ viaja —es lo que borra el override y
   * devuelve la herencia—; `undefined` no viaja y deja el valor como estaba.
   */
  async guardarConfiguracion(
    cambios: CambiosDeConfiguracion,
  ): Promise<FilaDeConfiguracionDeExogena> {
    return apiClient.put<FilaDeConfiguracionDeExogena>(
      `${BASE}/configuracion`,
      soloClaves(cambios, CLAVES_DE_CONFIGURACION),
    );
  },

  /** Escritura. Vuelve el formato a `GENERADA`, con motivo. */
  async anular(
    formato: FormatoDeExogena,
    anio: number,
    motivo: string,
  ): Promise<ResumenDeFormato> {
    return apiClient.post<ResumenDeFormato>(
      `${BASE}/${encodeURIComponent(formato)}/anular`,
      soloClaves({ anio, motivo }, CLAVES_DE_ANULAR_EXOGENA),
    );
  },
};
