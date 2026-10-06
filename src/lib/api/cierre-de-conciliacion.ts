/**
 * 🔴 CONCILIACIÓN, OLA 3 (Nico, 03-10-2026): el cierre mensual por cuenta
 * (P9), la alerta de partidas a los 30 días (P10), la planilla de caja cuando
 * la inmobiliaria recibe efectivo (P12) y la relación de pagos de las
 * aseguradoras (P6). Espejo de las rutas del back
 * (`inmobiliaria/conciliacion-bancaria/{cierres,cuentas-contables,configuracion,alertas,planilla-de-caja,aseguradoras}`).
 *
 * El cierre lo FIRMA el contador (403 `SOLO_EL_CONTADOR_FIRMA`) y lo REABRE un
 * administrador con motivo (403 `SOLO_UN_ADMINISTRADOR_REABRE`). Un mes cerrado
 * no deja conciliar, deshacer ni cargar nada de esa cuenta: cualquier camino
 * que lo intente recibe 409 `MES_CERRADO` con la frase.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

const BASE = '/inmobiliaria/conciliacion-bancaria';

/** Quién firma y quién reabre: el back también lo exige. */
export const ROLES_QUE_FIRMAN_EL_CIERRE: ReadonlySet<string> = new Set(['CONTADOR']);
export const ROLES_QUE_REABREN_EL_CIERRE: ReadonlySet<string> = new Set(['ADMIN']);
export const MOTIVO_DE_REAPERTURA = { minimo: 10, maximo: 500 } as const;
export const DIAS_DE_ALERTA_POR_DEFECTO = 30;

// ── El cierre ────────────────────────────────────────────────────────────

export type RangoDeAntiguedad = '0-30' | '31-60' | 'mas-de-60';
export type TipoDePartida = 'ENTRADA_SIN_IDENTIFICAR' | 'SALIDA_SIN_IDENTIFICAR';
export type OrigenDeLaConciliacion = 'persona' | 'piloto' | 'pasarela' | 'sin-dato';

export const NOMBRE_DEL_RANGO: Record<RangoDeAntiguedad, string> = {
  '0-30': 'De 0 a 30 días',
  '31-60': 'De 31 a 60 días',
  'mas-de-60': 'Más de 60 días',
};
export const NOMBRE_DEL_TIPO_DE_PARTIDA: Record<TipoDePartida, string> = {
  ENTRADA_SIN_IDENTIFICAR: 'Consignaciones sin identificar',
  SALIDA_SIN_IDENTIFICAR: 'Débitos sin identificar',
};
export const NOMBRE_DEL_ORIGEN: Record<OrigenDeLaConciliacion, string> = {
  persona: 'Una persona',
  piloto: 'El Piloto',
  pasarela: 'La pasarela de pagos',
  'sin-dato': 'Sin dato (antes de que se registrara)',
};

export interface FotoDelCierre {
  formato: 1;
  cuenta: { id: string; nombre: string; numeroEnmascarado: string | null; banco: string | null };
  mes: string;
  mesEnPalabras: string;
  periodo: { desde: string; hasta: string };
  saldos: {
    extracto: { valorCop: number | null; fuente: 'carga' | 'calculado' | 'persona' | null; detalle: string };
    libros: {
      valorCop: number | null;
      cuentaPuc: { id: string; codigo: string; nombre: string } | null;
      compartida: boolean;
      detalle: string;
    };
    diferenciaCop: number | null;
    efectoDeLasPartidasCop: number;
    diferenciaSinExplicarCop: number | null;
  };
  partidas: {
    lista: {
      id: string;
      fecha: string;
      tipo: TipoDePartida;
      valorCop: number;
      dias: number;
      rango: RangoDeAntiguedad;
      descripcion: string;
      referencia: string | null;
    }[];
    porTipoYRango: { tipo: TipoDePartida; rango: RangoDeAntiguedad; n: number; valorCop: number }[];
    total: { n: number; valorCop: number; valorAbsolutoCop: number };
  };
  conciliado: {
    lineasDelMes: number;
    conciliadas: number;
    pendientes: number;
    porNumeroPct: number | null;
    valorDelMesCop: number;
    conciliadoCop: number;
    porValorPct: number | null;
  };
  quien: {
    origen: OrigenDeLaConciliacion;
    n: number;
    valorCop: number;
    personas: { userId: string; nombre: string; n: number; valorCop: number }[];
  }[];
  ignoradas: { n: number; valorCop: number; entradas: number; entradasCop: number };
  terceros: {
    fecha: string;
    saldoDeLaCuentaCop: number | null;
    plataDeTercerosCop: number | null;
    diferenciaCop: number | null;
    partidasPorIdentificarCop: number | null;
    laDiferenciaEsLaComision: boolean | null;
    detalle: string;
  } | null;
  avisos: string[];
  armadaAt: string;
  firma: {
    userId: string;
    nombre: string | null;
    email: string | null;
    rol: string;
    tarjetaProfesional: string | null;
    firmadoAt: string;
  } | null;
}

export interface CierreDeLaCuenta {
  id: string;
  cuentaId: string;
  mes: string;
  version: number;
  estado: 'CERRADO' | 'REABIERTO';
  saldoExtractoCop: number | null;
  saldoLibrosCop: number | null;
  diferenciaCop: number | null;
  partidas: number;
  partidasCop: number;
  conciliadoPorNumeroPct: number | null;
  conciliadoPorValorPct: number | null;
  huella: string;
  firma: { userId: string; nombre: string | null; rol: string; tarjetaProfesional: string | null; firmadoAt: string };
  reapertura: { at: string; nombre: string | null; motivo: string | null } | null;
}

export interface MesDeLaCuenta {
  mes: string;
  mesEnPalabras: string;
  estado: 'ABIERTO' | 'CERRADO' | 'REABIERTO';
  terminado: boolean;
  lineas: number;
  pendientes: number;
  cierre: CierreDeLaCuenta | null;
  versiones: number;
}

export interface MesesDeLaCuenta {
  disponible: boolean;
  sePuedeFirmar: boolean;
  motivo: string | null;
  cuenta: { id: string; nombre: string; numeroEnmascarado: string | null; banco: string | null };
  meses: MesDeLaCuenta[];
}

export interface CierreConFoto extends CierreDeLaCuenta {
  foto: FotoDelCierre;
  /** La huella de la foto guardada coincide con la firmada. */
  integra?: boolean;
}

export interface EventoDeLaBitacora {
  id: string;
  cierreId: string;
  mes: string;
  evento: 'CERRADO' | 'REABIERTO';
  motivo: string | null;
  quien: string | null;
  rol: string;
  at: string;
}

// ── Configuración y alerta ───────────────────────────────────────────────

export interface ConfiguracionDeLaConciliacion {
  /** `false` = falta la migración del cierre: los días de la alerta no se guardan. */
  disponible: boolean;
  diasDeAlerta: number;
  efectivoActivo: boolean;
  porDefecto: boolean;
  /**
   * 🔴 ARREGLOS-5 (Nico Q2 a): UN SOLO interruptor de efectivo. La fuente son los
   * medios de recibo (Configuración → Medios de recibo, «Efectivo»); la
   * conciliación los lee y, al guardar, los escribe. Aditivos: un back anterior
   * no los manda (entonces el efectivo se guarda sólo con `disponible`).
   */
  efectivoDesde?: 'medios-de-recibo' | 'conciliacion';
  efectivoSePuedeGuardar?: boolean;
}

/** ¿Se puede prender o apagar el efectivo? Un back sin el campo: como antes (con la migración). */
export function efectivoSePuedeGuardar(c: ConfiguracionDeLaConciliacion): boolean {
  return typeof c.efectivoSePuedeGuardar === 'boolean' ? c.efectivoSePuedeGuardar : c.disponible;
}

export interface AlertaDePartidas {
  hoy: string;
  diasDeAlerta: number;
  pendientes: number;
  rangos: { rango: RangoDeAntiguedad; nombre: string; n: number; valorAbsolutoCop: number }[];
  vencidas: {
    n: number;
    valorAbsolutoCop: number;
    masVieja: { id: string; fecha: string; dias: number; valorCop: number; descripcion: string } | null;
  };
  porCuenta: { cuenta: string; nombre: string; pendientes: number; vencidas: number; valorVencidoCop: number }[];
  hayAlerta: boolean;
  frase: string | null;
  configuracion: ConfiguracionDeLaConciliacion;
}

export interface CuentasContables {
  disponible: boolean;
  motivo: string | null;
  cuentaDeLosRecibos: { id: string; codigo: string; nombre: string } | null;
  cuentas: {
    id: string;
    nombre: string;
    numeroEnmascarado: string | null;
    banco: string | null;
    activa: boolean;
    cuentaPuc: { id: string; codigo: string; nombre: string } | null;
    compartida: boolean;
    /**
     * 🔴 Seguimiento 6 (Nico, D-CONC 2 a): ¿los recibos conciliados desde el
     * extracto de esta cuenta se asientan en SU cuenta contable? (activa e
     * imputable). Un back viejo no lo manda.
     */
    asientaLosRecibos?: boolean;
    porQueNoAsientaLosRecibos?: string | null;
  }[];
}

// ── Planilla de caja ─────────────────────────────────────────────────────

export interface PlanillaDelDia {
  fecha: string;
  recibos: { id: string; numero: number | null; valorCop: number; respaldado: boolean }[];
  totalCop: number;
  porConsignarCop: number;
  estado: 'CONSIGNADA' | 'PARCIAL' | 'POR_CONSIGNAR';
  diasSinConsignar: number | null;
  reciboIdsPorConsignar: string[];
  propuestas: { movimientoId: string; fecha: string; valorCop: number; descripcion: string; segura: boolean; porQue: string[] }[];
}

export interface PlanillasDeCaja {
  activo: boolean;
  motivo: string | null;
  desde: string | null;
  hasta: string | null;
  planillas: PlanillaDelDia[];
}

// ── Aseguradoras ─────────────────────────────────────────────────────────

export const CAMPOS_DE_LA_RELACION = [
  'fecha',
  'neto',
  'bruto',
  'retencion',
  'siniestro',
  'contrato',
  'documento',
  'nombre',
  'periodo',
] as const;
export type CampoDeLaRelacion = (typeof CAMPOS_DE_LA_RELACION)[number];
export type MapeoDeColumnas = Partial<Record<CampoDeLaRelacion, string>>;

export const NOMBRE_DEL_CAMPO: Record<CampoDeLaRelacion, string> = {
  fecha: 'Fecha del pago',
  neto: 'Valor pagado (neto)',
  bruto: 'Valor bruto',
  retencion: 'Retención',
  siniestro: 'Número de siniestro',
  contrato: 'Contrato',
  documento: 'Documento del inquilino',
  nombre: 'Nombre del inquilino',
  periodo: 'Período',
};

export interface AseguradoraConMapeo {
  id: string;
  nombre: string;
  nit: string;
  mapeo: MapeoDeColumnas | null;
}

export interface AseguradorasDeLaConciliacion {
  disponible: boolean;
  motivo: string | null;
  aseguradoras: AseguradoraConMapeo[];
}

export interface CabezaDeLaRelacion {
  id: string;
  aseguradora: { id: string; nombre: string; nit: string };
  nombreArchivo: string;
  filas: number;
  totalNetoCop: number;
  totalBrutoCop: number | null;
  totalRetencionCop: number | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  cargadaAt: string;
}

export type EstadoDeLaLinea = 'CRUZADO' | 'YA_CONCILIADO' | 'VARIOS_RECIBOS' | 'VALOR_DISTINTO' | 'SIN_RECIBO';

export interface RelacionCruzada extends CabezaDeLaRelacion {
  retencionConfiguradaPct: number | null;
  lineas: {
    fila: number;
    fecha: string | null;
    netoCop: number;
    siniestro: string | null;
    contrato: string | null;
    documento: string | null;
    nombre: string | null;
    cruce: { estado: EstadoDeLaLinea; reciboId: string | null; por: string | null; retencionCop: number; detalle: string };
  }[];
  resumen: { cruzadas: number; yaConciliadas: number; aLaPersona: number; sinRecibo: number };
  banco: {
    motivo: string | null;
    propuestas: {
      movimientoId: string;
      fecha: string;
      valorCop: number;
      descripcion: string;
      reciboIds: string[];
      sumaDeLosRecibosCop: number;
      diferenciaCop: number;
      segura: boolean;
      porQue: string[];
    }[];
  };
}

export const cierreDeConciliacionApi = {
  meses(cuentaId: string): Promise<MesesDeLaCuenta> {
    return apiClient.get<MesesDeLaCuenta>(`${BASE}/cierres?cuenta=${encodeURIComponent(cuentaId)}`);
  },
  borrador(cuentaId: string, mes: string): Promise<{ foto: FotoDelCierre; huella: string }> {
    return apiClient.get(`${BASE}/cierres/borrador?cuenta=${encodeURIComponent(cuentaId)}&mes=${encodeURIComponent(mes)}`);
  },
  cierre(id: string): Promise<CierreConFoto> {
    return apiClient.get<CierreConFoto>(`${BASE}/cierres/${id}`);
  },
  bitacora(cuentaId: string): Promise<{ disponible: boolean; eventos: EventoDeLaBitacora[] }> {
    return apiClient.get(`${BASE}/cierres/bitacora?cuenta=${encodeURIComponent(cuentaId)}`);
  },
  async cerrar(cuerpo: {
    cuentaId: string;
    mes: string;
    confirmo: true;
    tarjetaProfesional?: string;
    saldoExtractoCop?: number;
  }): Promise<CierreConFoto> {
    const res = await apiClient.post<CierreConFoto>(`${BASE}/cierres`, cuerpo);
    invalidar('cobros');
    return res;
  },
  async reabrir(id: string, motivo: string): Promise<CierreDeLaCuenta> {
    const res = await apiClient.post<CierreDeLaCuenta>(`${BASE}/cierres/${id}/reabrir`, { motivo: motivo.trim() });
    invalidar('cobros');
    return res;
  },
  cuentasContables(): Promise<CuentasContables> {
    return apiClient.get<CuentasContables>(`${BASE}/cuentas-contables`);
  },
  asignarCuentaContable(cuentaId: string, cuentaPucId: string): Promise<CuentasContables> {
    return apiClient.put<CuentasContables>(`${BASE}/cuentas-contables/${cuentaId}`, { cuentaPucId });
  },
  configuracion(): Promise<ConfiguracionDeLaConciliacion> {
    return apiClient.get<ConfiguracionDeLaConciliacion>(`${BASE}/configuracion`);
  },
  async guardarConfiguracion(cambios: { diasDeAlerta?: number; efectivoActivo?: boolean }): Promise<ConfiguracionDeLaConciliacion> {
    const res = await apiClient.put<ConfiguracionDeLaConciliacion>(`${BASE}/configuracion`, cambios);
    invalidar('cobros');
    return res;
  },
  alertas(): Promise<AlertaDePartidas> {
    return apiClient.get<AlertaDePartidas>(`${BASE}/alertas`);
  },
  planillas(): Promise<PlanillasDeCaja> {
    return apiClient.get<PlanillasDeCaja>(`${BASE}/planilla-de-caja`);
  },
  async conciliarPlanilla(fecha: string, movimientoId: string): Promise<unknown> {
    const res = await apiClient.post(`${BASE}/planilla-de-caja/conciliar`, { fecha, movimientoId });
    invalidar('cobros');
    return res;
  },
  aseguradoras(): Promise<AseguradorasDeLaConciliacion> {
    return apiClient.get<AseguradorasDeLaConciliacion>(`${BASE}/aseguradoras`);
  },
  relaciones(): Promise<{ disponible: boolean; relaciones: CabezaDeLaRelacion[] }> {
    return apiClient.get(`${BASE}/aseguradoras/relaciones`);
  },
  relacion(id: string): Promise<RelacionCruzada> {
    return apiClient.get<RelacionCruzada>(`${BASE}/aseguradoras/relaciones/${id}`);
  },
  cargarRelacion(cuerpo: {
    aseguradoraId: string;
    nombreArchivo: string;
    mapeo: MapeoDeColumnas;
    filas: Record<string, unknown>[];
  }): Promise<RelacionCruzada> {
    return apiClient.post<RelacionCruzada>(`${BASE}/aseguradoras/relaciones`, cuerpo);
  },
};
