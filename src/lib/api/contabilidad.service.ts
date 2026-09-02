/**
 * Contabilidad — los pasos 4 (plan de cuentas) y 5 (registros contables) del
 * arranque de una inmobiliaria.
 *
 * ── Qué hay del otro lado ───────────────────────────────────────────────────
 *
 * `back-erp/src/inmobiliaria/contabilidad/{puc,asientos,migracion}/`. Tres
 * controllers bajo `/inmobiliaria/contabilidad`:
 *
 *   puc        → el plan de cuentas (árbol, semilla del Decreto 2650, CRUD)
 *   asientos   → partida doble: se crean y se reversan, nunca se editan
 *   migracion  → un lote de asientos históricos: `revisar` y `aplicar`
 *
 * La agencia sale del JWT (`AgencyMemberGuard`); no se manda nada. Escribir
 * exige rol ADMIN o CONTADOR (`ContabilidadEscrituraGuard`): un AGENTE ve el
 * plan pero recibe 403 al tocarlo, y la pantalla tiene que decirlo así.
 *
 * ── 🔴 Por qué cada cuerpo se arma con una lista explícita de claves ────────
 *
 * `back-erp/src/main.ts` monta el `ValidationPipe` global con
 * `whitelist: true` **y `forbidNonWhitelisted: true`**. Una clave que el DTO
 * no declara no se ignora: devuelve 400 y con él el lote entero. Y hay dos
 * vocabularios que se parecen y NO son el mismo:
 *
 *   asiento manual  → `cuentaId` (uuid) + `debitoCop` / `creditoCop` (enteros)
 *   asiento migrado → `codigoCuenta` (texto) + `debito` / `credito` (lo que
 *                     traiga el Excel: el back lo normaliza)
 *
 * Por eso `soloClaves()` filtra cada cuerpo contra la lista de su DTO, y por
 * eso el test de este archivo compara esas listas contra copias escritas a
 * mano de los DTOs, no contra sí mismas.
 */

import { apiClient } from './client';

const BASE = '/inmobiliaria/contabilidad';

// ══ Vocabulario del back ════════════════════════════════════════════════════

/** `NaturalezaContable` en `schema.prisma`. */
export type NaturalezaContable = 'DEBITO' | 'CREDITO';

/** `OrigenDelAsiento`. Un asiento hecho a mano es `MANUAL`; el histórico
 * entra como `MIGRACION`. */
export type OrigenDelAsiento = 'MANUAL' | 'COBRO' | 'RECIBO_DE_CAJA' | 'DISPERSION' | 'MIGRACION';

/** `FuenteDelCodigo` en `puc/puc-semilla.ts`: de dónde sale cada código de la
 * semilla. `PENDIENTE_DE_CONFIRMAR` es lo que el contador tiene que mirar. */
export type FuenteDelCodigo =
  | 'DECRETO_2650'
  | 'RANGO_LIBRE_ART_6'
  | 'AUXILIAR_ART_7'
  | 'PENDIENTE_DE_CONFIRMAR';

/** `EstadoDeFila` en `migracion/migracion-contable.service.ts`. */
export type EstadoDeFilaMigrada = 'LISTO' | 'RECHAZADA' | 'YA_MIGRADA';

// ── PUC ────────────────────────────────────────────────────────────────────

/** Una fila de `cuentas_puc`, tal como sale en JSON. No hay `nivel`: se
 * deduce del largo del código (clase 1, grupo 2, cuenta 4, subcuenta 6). */
export interface CuentaPuc {
  id: string;
  agencyId: string;
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  padreId: string | null;
  imputable: boolean;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET /puc/arbol`: cada nodo es una cuenta con sus hijas, recursivo. */
export interface CuentaEnArbol extends CuentaPuc {
  hijas: CuentaEnArbol[];
}

/** Una cuenta del catálogo estático de la semilla. No tiene `id`: no es una
 * fila de la base, es lo que la semilla SABE crear. */
export interface CuentaSemilla {
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  imputable: boolean;
  fuente: FuenteDelCodigo;
  uso?: string;
  nota?: string;
}

export interface PendientesDeSemilla {
  total: number;
  cuentas: CuentaSemilla[];
}

/** `ResultadoSemilla` en `puc.service.ts`. Idempotente: la segunda vez
 * `creadas` es 0 y `existentes` es el total. */
export interface ResultadoSemilla {
  creadas: number;
  existentes: number;
  total: number;
  codigosCreados: string[];
}

/** `CrearCuentaDto`. `codigo` sólo dígitos; `padreId` opcional (sin él el
 * back engancha al prefijo más largo que exista). */
export const CLAVES_DE_CREAR_CUENTA = ['codigo', 'nombre', 'naturaleza', 'padreId', 'imputable'] as const;

export interface CuentaNueva {
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  padreId?: string;
  imputable?: boolean;
}

/** `ActualizarCuentaDto`. 🔴 `codigo` NO está: un código no se cambia, se
 * crea otra cuenta. Mandarlo es un 400. */
export const CLAVES_DE_ACTUALIZAR_CUENTA = ['nombre', 'naturaleza', 'activa', 'imputable'] as const;

export interface CambiosDeCuenta {
  nombre?: string;
  naturaleza?: NaturalezaContable;
  activa?: boolean;
  imputable?: boolean;
}

export const LARGO_MAXIMO_DE_CODIGO = 20;
export const LARGO_MINIMO_DE_NOMBRE = 3;
export const LARGO_MAXIMO_DE_NOMBRE = 200;

// ── Importar el plan desde un archivo ──────────────────────────────────────

/** `MAX_CUENTAS_POR_IMPORTACION` del back: un archivo más grande es 400. */
export const MAX_CUENTAS_POR_IMPORTACION = 5_000;

/**
 * `CuentaImportadaDto`. Forma y nada más: el código puede venir con puntos o
 * guiones, la naturaleza como «Débito»/«D»/«Debe», el imputable como «Sí»;
 * qué significa cada cosa lo decide el back y lo devuelve en la revisión.
 */
export interface CuentaImportada {
  codigo: string;
  nombre: string;
  naturaleza?: string;
  imputable?: string | boolean;
}

export type VeredictoDeCuenta = 'NUEVA' | 'YA_EXISTE' | 'INVALIDA';

/** `CuentaRevisada` en `puc-importacion.ts`. */
export interface CuentaRevisada {
  /** Fila en el archivo, desde 0 (en pantalla se muestra +2). */
  indice: number;
  codigoOriginal: string;
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable | null;
  imputable: boolean;
  veredicto: VeredictoDeCuenta;
  motivo?: string;
  nombreActual?: string;
}

export interface RevisionDeImportacionPuc {
  filas: CuentaRevisada[];
  nuevas: number;
  existentes: number;
  invalidas: number;
}

export interface ResultadoImportacionPuc extends RevisionDeImportacionPuc {
  creadas: number;
}

// ── Asientos ───────────────────────────────────────────────────────────────

export interface MovimientoContable {
  id: string;
  asientoId: string;
  cuentaId: string;
  debitoCop: number;
  creditoCop: number;
  terceroTipo: string | null;
  terceroId: string | null;
  descripcion: string | null;
  orden: number;
  /** Sólo en los listados y en `GET /:id`; `POST /` devuelve sin esto. */
  cuenta?: { codigo: string; nombre: string };
}

export interface AsientoContable {
  id: string;
  agencyId: string;
  numero: number;
  /** `AAAA-MM-DD` (columna `@db.Date`). */
  fecha: string;
  descripcion: string;
  origen: OrigenDelAsiento;
  origenId: string | null;
  cerrado: boolean;
  creadoPorUserId: string | null;
  createdAt: string;
  movimientos: MovimientoContable[];
}

/** `GET /asientos`: paginado por `limite` / `desplazamiento`, orden `numero desc`. */
export interface PaginaDeAsientos {
  total: number;
  limite: number;
  desplazamiento: number;
  asientos: AsientoContable[];
}

/** `ListarAsientosDto`. Los booleanos viajan como texto (`@IsBooleanString`)
 * y `limite` tiene tope 200 (`@Max(200)`). */
export interface FiltrosDeAsientos {
  desde?: string;
  hasta?: string;
  origen?: OrigenDelAsiento;
  cuentaId?: string;
  cerrado?: boolean;
  limite?: number;
  desplazamiento?: number;
}

export const MAX_LIMITE_DE_ASIENTOS = 200;

/** `MovimientoDto` (anidado en `CrearAsientoDto`). Montos en pesos enteros,
 * sin centavos; débito XOR crédito por línea. */
export const CLAVES_DE_MOVIMIENTO = [
  'cuentaId',
  'debitoCop',
  'creditoCop',
  'terceroTipo',
  'terceroId',
  'descripcion',
] as const;

export interface MovimientoNuevo {
  cuentaId: string;
  debitoCop?: number;
  creditoCop?: number;
  terceroTipo?: string;
  terceroId?: string;
  descripcion?: string;
}

/** `CrearAsientoDto`. `fecha` es `AAAA-MM-DD` a secas: con hora el back la
 * rechaza (`FECHA_INVALIDA`). */
export const CLAVES_DE_CREAR_ASIENTO = [
  'fecha',
  'descripcion',
  'movimientos',
  'claveIdempotencia',
] as const;

export interface AsientoNuevo {
  fecha: string;
  descripcion: string;
  movimientos: MovimientoNuevo[];
  /**
   * La llave del intento: dos envíos con el MISMO valor producen UN asiento —
   * el segundo devuelve el primero. Se genera una vez por formulario, NO por
   * clic: si la red se corta con la petición en vuelo el asiento ya quedó
   * escrito, y reintentar con una llave nueva registraría la apertura dos
   * veces (los saldos iniciales contados doble).
   */
  claveIdempotencia?: string;
}

/** `MAX_COP_POR_MOVIMIENTO` en `asientos.service.ts`: es un `Int` de Postgres. */
export const MAX_COP_POR_MOVIMIENTO = 2_147_483_647;
export const LARGO_MAXIMO_DE_DESCRIPCION = 300;

/** `ReversarAsientoDto`. Sin movimientos: la reversa es el espejo exacto. */
export const CLAVES_DE_REVERSAR = ['fecha', 'motivo'] as const;

export interface OpcionesDeReversa {
  fecha?: string;
  motivo?: string;
}

export interface ResultadoDeReversa {
  original: AsientoContable;
  reversa: AsientoContable;
}

// ── Cierre de período ──────────────────────────────────────────────────────

/** `GET /asientos/cierre`. `null` = nunca se cerró nada. */
export interface Cierre {
  /** `AAAA-MM-DD`, el último día cerrado. */
  cerradaHasta: string | null;
}

/** `CerrarPeriodoDto`: un solo campo. */
export const CLAVES_DE_CERRAR = ['hasta'] as const;

/** Respuesta de `POST /asientos/cerrar`. */
export interface ResultadoDeCierre {
  hasta: string;
  /** Asientos que quedaron bloqueados con este cierre. */
  cerrados: number;
  fronteraAnterior: string | null;
}

// ── Reportes ───────────────────────────────────────────────────────────────

/** `RangoDto`: los dos opcionales e inclusivos, en `AAAA-MM-DD`. */
export interface RangoDeFechas {
  desde?: string;
  hasta?: string;
}

/** `BalanceDePruebaDto`. `soloConMovimiento` viaja como texto; por defecto
 * el back deja afuera las cuentas sin movimiento ni saldo anterior. */
export interface FiltrosDeBalance extends RangoDeFechas {
  soloConMovimiento?: boolean;
}

/** `FilaDeBalance` en `reportes-contables.service.ts`. Los saldos van en la
 * naturaleza de la cuenta: en una de débito, `debitos - creditos`; en una de
 * crédito, al revés. */
export interface FilaDeBalance {
  cuentaId: string;
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  saldoAnteriorCop: number;
  debitosCop: number;
  creditosCop: number;
  saldoFinalCop: number;
}

/** `GET /reportes/balance-de-prueba`. `cuadra` en `false` es un bug del
 * libro, no un dato más: la pantalla lo grita. */
export interface BalanceDePrueba {
  desde: string | null;
  hasta: string | null;
  filas: FilaDeBalance[];
  totalDebitosCop: number;
  totalCreditosCop: number;
  cuadra: boolean;
  diferenciaCop: number;
}

/** `RenglonDeAuxiliar`. `fecha` llega serializada (`2026-02-05T00:00:00.000Z`). */
export interface RenglonDeAuxiliar {
  asientoId: string;
  numero: number;
  fecha: string;
  descripcionAsiento: string;
  descripcion: string | null;
  terceroTipo: string | null;
  terceroId: string | null;
  debitoCop: number;
  creditoCop: number;
  /** Saldo corrido, en la naturaleza de la cuenta. */
  saldoCop: number;
}

/** `GET /reportes/libro-auxiliar/:cuentaId`. */
export interface LibroAuxiliar {
  cuenta: Pick<CuentaPuc, 'id' | 'codigo' | 'nombre' | 'naturaleza'>;
  desde: string | null;
  hasta: string | null;
  saldoInicialCop: number;
  renglones: RenglonDeAuxiliar[];
  debitosCop: number;
  creditosCop: number;
  saldoFinalCop: number;
}

/** `EstadoDeCuentaDto`. `terceroTipo` y `terceroId` tal como se asentaron
 * (`PROPIETARIO`, `ARRENDATARIO`, `PROVEEDOR`…); los dos obligatorios. */
export interface FiltrosDeEstadoDeCuenta extends RangoDeFechas {
  terceroTipo: string;
  terceroId: string;
}

export interface RenglonDeEstadoDeCuenta {
  asientoId: string;
  numero: number;
  fecha: string;
  descripcionAsiento: string;
  codigo: string;
  cuenta: string;
  descripcion: string | null;
  debitoCop: number;
  creditoCop: number;
  /** Saldo corrido, convención fija: `débitos − créditos`. Positivo = el
   * tercero le debe a la inmobiliaria; negativo = la inmobiliaria le debe. */
  saldoCop: number;
}

/** `GET /reportes/estado-de-cuenta`. */
export interface EstadoDeCuenta {
  tercero: { terceroTipo: string; terceroId: string };
  desde: string | null;
  hasta: string | null;
  saldoInicialCop: number;
  renglones: RenglonDeEstadoDeCuenta[];
  debitosCop: number;
  creditosCop: number;
  saldoFinalCop: number;
}

// ── Migración de asientos ──────────────────────────────────────────────────

/** `MigrarMovimientoDto`. Vocabulario DISTINTO al del asiento manual: código
 * en vez de id, y `debito`/`credito` sin tipo (`@Allow()`) porque el back
 * normaliza «1.500.000», «1500000.00» y el número a secas. */
export const CLAVES_DE_MOVIMIENTO_MIGRADO = [
  'codigoCuenta',
  'debito',
  'credito',
  'descripcion',
  'terceroTipo',
  'terceroId',
] as const;

export interface MovimientoMigrado {
  codigoCuenta: string;
  debito?: number | string;
  credito?: number | string;
  descripcion?: string;
  terceroTipo?: string;
  terceroId?: string;
}

/** `MigrarAsientoDto`. `fecha` es texto libre (`AAAA-MM-DD`, `DD/MM/AAAA`,
 * `DD-MM-AAAA`, con hora…): la normaliza el back, fila por fila. */
export const CLAVES_DE_ASIENTO_MIGRADO = ['numeroOriginal', 'fecha', 'descripcion', 'movimientos'] as const;

export interface AsientoMigrado {
  numeroOriginal?: string;
  fecha: string;
  descripcion: string;
  movimientos: MovimientoMigrado[];
}

/** `MigrarLoteDto`. El mismo cuerpo para `revisar` y para `aplicar`: no hay
 * id de revisión ni staging — `aplicar` vuelve a preparar el lote entero. */
export const CLAVES_DE_LOTE = ['lote', 'asientos'] as const;

export interface LoteDeAsientos {
  lote: string;
  asientos: AsientoMigrado[];
}

/** `MAX_ASIENTOS_POR_LOTE` en `migracion-contable.service.ts`. */
export const MAX_ASIENTOS_POR_LOTE = 5_000;
export const LARGO_MAXIMO_DE_LOTE = 60;

export interface CuentaFaltante {
  codigo: string;
  /** Números de fila (1-based) del lote que la usan. */
  filas: number[];
}

export interface MotivoDeRechazo {
  motivo: string;
  filas: number[];
}

/** `FilaPreparada`: TODAS las filas del lote, con su veredicto. */
export interface FilaRevisada {
  fila: number;
  numeroOriginal: string | null;
  estado: EstadoDeFilaMigrada;
  errores: string[];
  advertencias: string[];
  clave: string;
  fecha?: string;
  descripcion?: string;
  totalCop?: number;
}

/** `RevisionDeLote` — respuesta de `POST /migracion/revisar`. */
export interface RevisionDeLote {
  lote: string;
  total: number;
  listas: number;
  rechazadas: number;
  yaMigradas: number;
  /** 🔴 Se reportan, nunca se crean: la UI manda al paso 4. */
  cuentasFaltantes: CuentaFaltante[];
  motivos: MotivoDeRechazo[];
  filas: FilaRevisada[];
}

/** `InformeDeMigracion` — respuesta de `POST /migracion/aplicar`. Ojo: acá es
 * `yaMigrados` y en la revisión `yaMigradas`; no trae `filas`. */
export interface InformeDeMigracion {
  lote: string;
  total: number;
  aplicados: number;
  omitidos: number;
  yaMigrados: number;
  primerNumero: number | null;
  ultimoNumero: number | null;
  cuentasFaltantes: CuentaFaltante[];
  motivos: MotivoDeRechazo[];
  fallasAlEscribir: Array<{ fila: number; motivo: string }>;
}

// ══ Helpers puros ═══════════════════════════════════════════════════════════

/**
 * Se queda sólo con las claves que el DTO declara, y tira las `undefined`
 * (que `JSON.stringify` omitiría igual, pero así el objeto que se testea es
 * el que viaja).
 */
export function soloClaves<T extends object>(
  objeto: T,
  claves: readonly (keyof T)[],
): Partial<T> {
  const limpio: Partial<T> = {};
  for (const clave of claves) {
    const valor = objeto[clave];
    if (valor !== undefined) limpio[clave] = valor;
  }
  return limpio;
}

function cuerpoDeAsiento(asiento: AsientoNuevo): AsientoNuevo {
  const base = soloClaves(asiento, CLAVES_DE_CREAR_ASIENTO) as AsientoNuevo;
  return {
    ...base,
    movimientos: asiento.movimientos.map(
      (m) => soloClaves(m, CLAVES_DE_MOVIMIENTO) as MovimientoNuevo,
    ),
  };
}

function cuerpoDeLote(lote: LoteDeAsientos): LoteDeAsientos {
  const base = soloClaves(lote, CLAVES_DE_LOTE) as LoteDeAsientos;
  return {
    ...base,
    asientos: lote.asientos.map((a) => ({
      ...(soloClaves(a, CLAVES_DE_ASIENTO_MIGRADO) as AsientoMigrado),
      movimientos: a.movimientos.map(
        (m) => soloClaves(m, CLAVES_DE_MOVIMIENTO_MIGRADO) as MovimientoMigrado,
      ),
    })),
  };
}

function conQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

// ── Mapeo contable (asientos automáticos) ──────────────────────────────────

/** `EventoContable` en `schema.prisma`: los ocho movimientos que el sistema asienta solo. */
export type EventoContable =
  | 'RECIBO_BANCOS'
  | 'RECIBO_CAJA'
  | 'RECAUDO_CANON_TERCEROS'
  | 'RECAUDO_ADMINISTRACION'
  | 'RECAUDO_OTROS_TERCEROS'
  | 'INGRESO_COMISION'
  | 'IVA_GENERADO'
  | 'GIRO_PROPIETARIO_BANCOS';

export const EVENTOS_CONTABLES: readonly EventoContable[] = [
  'RECIBO_BANCOS',
  'RECIBO_CAJA',
  'RECAUDO_CANON_TERCEROS',
  'RECAUDO_ADMINISTRACION',
  'RECAUDO_OTROS_TERCEROS',
  'INGRESO_COMISION',
  'IVA_GENERADO',
  'GIRO_PROPIETARIO_BANCOS',
];

export type LadoDelEvento = 'DEBE' | 'HABER';

export interface CuentaResumida {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
  imputable: boolean;
}

/** Una fila de `GET /mapeo`: el evento, su explicación, la cuenta asignada y la propuesta. */
export interface MapeoDeEvento {
  evento: EventoContable;
  nombre: string;
  explicacion: string;
  lado: LadoDelEvento;
  codigoPropuesto: string;
  cuenta: CuentaResumida | null;
  propuesta: CuentaResumida | null;
}

export interface MapeoContable {
  eventos: MapeoDeEvento[];
  completo: boolean;
  faltantes: EventoContable[];
}

/** `EntradaDeMapeoDto`. */
export const CLAVES_DE_ENTRADA_DE_MAPEO = ['evento', 'cuentaId'] as const;

export interface EntradaDeMapeo {
  evento: EventoContable;
  cuentaId: string;
}

/** Respuesta de `POST /mapeo/semilla`. */
export interface ResultadoDeSemillaDeMapeo {
  asignados: EventoContable[];
  yaEstaban: EventoContable[];
  sinCuenta: { evento: EventoContable; codigo: string }[];
  mapeo: MapeoContable;
}

// ══ API ═════════════════════════════════════════════════════════════════════

export const contabilidadApi = {
  puc: {
    /** Lista plana, orden por código. Los filtros viajan como texto. */
    async listar(
      filtros: { soloActivas?: boolean; soloImputables?: boolean; busqueda?: string } = {},
    ): Promise<CuentaPuc[]> {
      return apiClient.get<CuentaPuc[]>(
        conQuery(`${BASE}/puc`, {
          soloActivas: filtros.soloActivas === undefined ? undefined : String(filtros.soloActivas),
          soloImputables:
            filtros.soloImputables === undefined ? undefined : String(filtros.soloImputables),
          busqueda: filtros.busqueda,
        }),
      );
    },

    /** El árbol entero (activas e inactivas), raíces con sus hijas. */
    async arbol(): Promise<CuentaEnArbol[]> {
      return apiClient.get<CuentaEnArbol[]>(`${BASE}/puc/arbol`);
    },

    /** Las cuentas de la semilla que el contador tiene que confirmar. */
    async semillaPendientes(): Promise<PendientesDeSemilla> {
      return apiClient.get<PendientesDeSemilla>(`${BASE}/puc/semilla/pendientes`);
    },

    /** Crea el plan base del Decreto 2650. Sin cuerpo: el back no declara `@Body()`. */
    async sembrar(): Promise<ResultadoSemilla> {
      return apiClient.post<ResultadoSemilla>(`${BASE}/puc/semilla`);
    },

    async crear(cuenta: CuentaNueva): Promise<CuentaPuc> {
      return apiClient.post<CuentaPuc>(`${BASE}/puc`, soloClaves(cuenta, CLAVES_DE_CREAR_CUENTA));
    },

    /**
     * Qué pasaría si se importa este archivo. No escribe nada: dice, fila por
     * fila, qué entra, qué ya existe y qué no se entendió.
     */
    async revisarImportacion(cuentas: CuentaImportada[]): Promise<RevisionDeImportacionPuc> {
      return apiClient.post<RevisionDeImportacionPuc>(`${BASE}/puc/importar/revisar`, { cuentas });
    },

    /** Escribe las NUEVAS de la revisión. Idempotente: la segunda vez crea 0. */
    async importar(cuentas: CuentaImportada[]): Promise<ResultadoImportacionPuc> {
      return apiClient.post<ResultadoImportacionPuc>(`${BASE}/puc/importar`, { cuentas });
    },

    async actualizar(id: string, cambios: CambiosDeCuenta): Promise<CuentaPuc> {
      return apiClient.patch<CuentaPuc>(
        `${BASE}/puc/${encodeURIComponent(id)}`,
        soloClaves(cambios, CLAVES_DE_ACTUALIZAR_CUENTA),
      );
    },

    async eliminar(id: string): Promise<{ eliminada: true; codigo: string }> {
      return apiClient.delete(`${BASE}/puc/${encodeURIComponent(id)}`);
    },
  },

  asientos: {
    async listar(filtros: FiltrosDeAsientos = {}): Promise<PaginaDeAsientos> {
      return apiClient.get<PaginaDeAsientos>(
        conQuery(`${BASE}/asientos`, {
          desde: filtros.desde,
          hasta: filtros.hasta,
          origen: filtros.origen,
          cuentaId: filtros.cuentaId,
          cerrado: filtros.cerrado === undefined ? undefined : String(filtros.cerrado),
          limite:
            filtros.limite === undefined
              ? undefined
              : String(Math.min(filtros.limite, MAX_LIMITE_DE_ASIENTOS)),
          desplazamiento:
            filtros.desplazamiento === undefined ? undefined : String(filtros.desplazamiento),
        }),
      );
    },

    /** Un asiento cuadrado. El back valida de nuevo; acá sólo se filtran claves. */
    async crear(asiento: AsientoNuevo): Promise<AsientoContable> {
      return apiClient.post<AsientoContable>(`${BASE}/asientos`, cuerpoDeAsiento(asiento));
    },

    async reversar(id: string, opciones: OpcionesDeReversa = {}): Promise<ResultadoDeReversa> {
      return apiClient.post<ResultadoDeReversa>(
        `${BASE}/asientos/${encodeURIComponent(id)}/reversar`,
        soloClaves(opciones, CLAVES_DE_REVERSAR),
      );
    },

    /** Un asiento con sus líneas y el código/nombre de cada cuenta. */
    async detalle(id: string): Promise<AsientoContable> {
      return apiClient.get<AsientoContable>(`${BASE}/asientos/${encodeURIComponent(id)}`);
    },

    /** Hasta qué día está cerrada la contabilidad. */
    async cierre(): Promise<Cierre> {
      return apiClient.get<Cierre>(`${BASE}/asientos/cierre`);
    },

    /**
     * Cierra todo lo que tenga fecha ≤ `hasta`. Después no entra ningún
     * asiento con fecha adentro; una fecha anterior a la frontera vigente
     * es 409 (`PERIODO_YA_CERRADO`).
     */
    async cerrar(hasta: string): Promise<ResultadoDeCierre> {
      return apiClient.post<ResultadoDeCierre>(
        `${BASE}/asientos/cerrar`,
        soloClaves({ hasta }, CLAVES_DE_CERRAR),
      );
    },
  },

  reportes: {
    async balanceDePrueba(filtros: FiltrosDeBalance = {}): Promise<BalanceDePrueba> {
      return apiClient.get<BalanceDePrueba>(
        conQuery(`${BASE}/reportes/balance-de-prueba`, {
          desde: filtros.desde,
          hasta: filtros.hasta,
          soloConMovimiento:
            filtros.soloConMovimiento === undefined ? undefined : String(filtros.soloConMovimiento),
        }),
      );
    },

    async libroAuxiliar(cuentaId: string, rango: RangoDeFechas = {}): Promise<LibroAuxiliar> {
      return apiClient.get<LibroAuxiliar>(
        conQuery(`${BASE}/reportes/libro-auxiliar/${encodeURIComponent(cuentaId)}`, {
          desde: rango.desde,
          hasta: rango.hasta,
        }),
      );
    },

    async estadoDeCuenta(filtros: FiltrosDeEstadoDeCuenta): Promise<EstadoDeCuenta> {
      return apiClient.get<EstadoDeCuenta>(
        conQuery(`${BASE}/reportes/estado-de-cuenta`, {
          terceroTipo: filtros.terceroTipo,
          terceroId: filtros.terceroId,
          desde: filtros.desde,
          hasta: filtros.hasta,
        }),
      );
    },
  },

  mapeo: {
    /** Los ocho eventos con su cuenta (o null) y la que la semilla propone. */
    async obtener(): Promise<MapeoContable> {
      return apiClient.get<MapeoContable>(`${BASE}/mapeo`);
    },

    /** Asigna cuentas. Lo que no viene no se toca. Cada entrada sale filtrada al DTO. */
    async guardar(entradas: EntradaDeMapeo[]): Promise<MapeoContable> {
      return apiClient.put<MapeoContable>(`${BASE}/mapeo`, {
        entradas: entradas.map((e) => soloClaves(e, CLAVES_DE_ENTRADA_DE_MAPEO)),
      });
    },

    /** Asigna las cuentas propuestas a los eventos vacíos; no pisa lo asignado. */
    async sembrar(): Promise<ResultadoDeSemillaDeMapeo> {
      return apiClient.post<ResultadoDeSemillaDeMapeo>(`${BASE}/mapeo/semilla`, {});
    },
  },

  migracion: {
    /** No escribe nada: dice qué entraría, qué no y por qué. */
    async revisar(lote: LoteDeAsientos): Promise<RevisionDeLote> {
      return apiClient.post<RevisionDeLote>(`${BASE}/migracion/revisar`, cuerpoDeLote(lote));
    },

    /** Mismo cuerpo que `revisar`. Idempotente por fila (`YA_MIGRADA`). */
    async aplicar(lote: LoteDeAsientos): Promise<InformeDeMigracion> {
      return apiClient.post<InformeDeMigracion>(`${BASE}/migracion/aplicar`, cuerpoDeLote(lote));
    },
  },
};
