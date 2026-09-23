/**
 * Wompi · Pagos a terceros — los tipos que devuelve el back
 * (`/inmobiliaria/wompi-pagos`, `back/src/inmobiliaria/dispersiones/wompi/`).
 *
 * 🔴 Ninguno trae las llaves: el back las guarda cifradas y nunca las devuelve.
 * `finalDeLaLlave` son sus últimos cuatro caracteres, para saber cuál está puesta.
 */

export type AmbienteDeWompi = 'SANDBOX' | 'PRODUCCION';

/** Una cuenta origen de Wompi (`GET /accounts`), tal como la guardó el back. */
export interface CuentaOrigenDeWompi {
  id: string;
  banco: string;
  codigoDelBanco: string | null;
  /** Enmascarada por Wompi: `****7890`. */
  numero: string;
  tipo: string | null;
  /** `ACTIVE` | `IN_REVIEW` | `INACTIVE`. */
  estado: string | null;
  saldoCentavos: number | null;
  actualizadaAt: string | null;
}

export interface ConexionDeWompi {
  ambiente: AmbienteDeWompi;
  /** `SIN_PROBAR` | `CONECTADA` | `FALLO`. */
  estado: string;
  finalDeLaLlave: string;
  tieneSecretoDeEventos: boolean;
  ultimaPruebaAt: string | null;
  ultimoError: string | null;
  cuentasOrigen: CuentaOrigenDeWompi[];
  cuentasLeidasAt: string | null;
  /** `url` es `null` si el servidor no sabe su dirección pública. */
  webhook: { ruta: string; url: string | null };
  /** Sólo en la respuesta de una prueba. */
  limites: { diarioCop: number | null; disponibleHoyCop: number | null } | null;
}

export interface VistaDeLaConexion {
  /** `false` = falta una migración o la llave de cifrado del servidor: `motivo` dice cuál. */
  disponible: boolean;
  motivo: string | null;
  conexion: ConexionDeWompi | null;
}

export interface LlavesDeWompi {
  ambiente: AmbienteDeWompi;
  apiKey: string;
  usuarioPrincipalId: string;
  /** `undefined` = se deja el que había; `''` = se quita. */
  secretoDeEventos?: string;
}

export type EstadoDelEnvio =
  | 'ENVIANDO'
  | 'ESPERANDO_APROBACION'
  | 'PAGANDO'
  | 'CERRADO'
  | 'RECHAZADO'
  | 'FALLO_EL_ENVIO'
  | 'SIMULACION_TERMINADA';

/** `ENVIADA` | `PAGADA` | `RECHAZADA` | `CANCELADA` | `NO_ENVIADA`. */
export type EstadoDeLaTransaccion = 'ENVIADA' | 'PAGADA' | 'RECHAZADA' | 'CANCELADA' | 'NO_ENVIADA';

export interface TransaccionEnWompi {
  dispersionId: string;
  nombre: string;
  cuentaFinal: string;
  valorCop: number;
  estado: EstadoDeLaTransaccion | string;
  causal: string | null;
  motivo: string | null;
}

export interface EnvioAWompi {
  id: string;
  intento: number;
  estado: EstadoDelEnvio;
  abierto: boolean;
  estadoWompi: string | null;
  estadoEnPalabras: string;
  mensaje: string | null;
  payoutId: string | null;
  ambiente: AmbienteDeWompi;
  cuentaOrigen: string;
  totalDeGiros: number;
  pagados: number;
  rechazados: number;
  pendientes: number;
  totalCop: number;
  facturarAhora: boolean;
  enviadoAt: string;
  ultimaConsultaAt: string | null;
  cerradoAt: string | null;
  procesoId: string | null;
  transacciones: TransaccionEnWompi[];
}

export interface VistaDelLoteEnWompi {
  disponible: boolean;
  motivo: string | null;
  conexion: { ambiente: AmbienteDeWompi; estado: string } | null;
  sePuedeEnviar: boolean;
  porQueNo: string | null;
  cuentaOrigen: string | null;
  enlaceAlPanel: string;
  envio: EnvioAWompi | null;
  intentosAnteriores: number;
}
