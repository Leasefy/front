/**
 * 🔴 LA LIQUIDACIÓN DEL MES COMPLETO (PG-02, QA de Pagos, 03-10-2026). PURA.
 *
 * «Liquidaciones» pintaba la vista previa de la dispersión
 * (`GET /dispersiones/preview`), que es la lista de lo que FALTA generar: a
 * Paula, con su dispersión de octubre ya generada, le restaba esas cuotas y
 * pintaba «Dispersión generada» sobre el resto —que justamente NO estaba
 * generado—, y el KPI «Canon causado de octubre» dejaba fuera todo lo ya
 * generado ($63,15 M contra ~$90 M). El back publicó
 * `GET /inmobiliaria/dispersiones/liquidacion-del-mes?month=` con el mes
 * ENTERO por propietario (lo generado + lo pendiente), el estado verdadero de
 * cada fila y la cuenta de destino ya enmascarada.
 *
 * Esto la traduce a la forma que la pantalla ya sabía pintar (la de la vista
 * previa), con lo nuevo al lado (`liquidacion`): así la tabla, el resumen y el
 * cajón siguen siendo los mismos y un back anterior (sin la ruta) sigue
 * funcionando con la vista previa.
 */

import type { InmuebleSinPorcentaje } from '@/lib/inmuebles/participaciones-desconocidas';
import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';

/** Los números de una liquidación, siempre con la misma forma (espejo del back). */
export interface BloqueDeLaLiquidacion {
  canonCop: number;
  comisionCop: number;
  ivaComisionCop: number;
  retencionesComisionCop: number;
  conceptosAFavorCop: number;
  conceptosACargoCop: number;
  /** El neto del mes ANTES de deducciones. */
  netoCop: number;
  deduccionesCop: number;
  /** Lo que sale del banco: entero o nada. */
  aGirarCop: number;
  saldoEnContraCop: number;
}

export type EstadoDeLaLiquidacion = 'POR_GENERAR' | 'GENERADA_EN_PARTE' | 'GENERADA' | 'GIRADA';

export interface FilaDeLaLiquidacion {
  propietarioId: string;
  propietarioName: string;
  estado: EstadoDeLaLiquidacion;
  /** El mes completo: generado + pendiente. */
  mes: BloqueDeLaLiquidacion;
  generado: BloqueDeLaLiquidacion | null;
  pendiente: BloqueDeLaLiquidacion | null;
  dispersiones: { id: string; status: string; aGirarCop: number }[];
  /** La cuenta ya enmascarada por el back («•••• 8912»). */
  cuentaDeDestino: { banco: string | null; cuenta: string | null };
}

export interface LiquidacionDelMesCompleto {
  month: string;
  base: 'CAUSADO';
  propietarios: FilaDeLaLiquidacion[];
  /**
   * 🔴 Lo que no se liquida este mes porque al inmueble le falta el
   * porcentaje de cada propietario. Un back anterior no lo manda.
   */
  sinPorcentaje?: InmuebleSinPorcentaje[];
  resumen: {
    mes: BloqueDeLaLiquidacion;
    generado: BloqueDeLaLiquidacion;
    pendiente: BloqueDeLaLiquidacion;
    propietarios: number;
    porEstado: Record<EstadoDeLaLiquidacion, number>;
  };
}

/** Lo que la fila sabe de su mes cuando viene de la liquidación completa. */
export interface DelMesCompleto {
  estado: EstadoDeLaLiquidacion;
  generado: BloqueDeLaLiquidacion | null;
  pendiente: BloqueDeLaLiquidacion | null;
  dispersiones: { id: string; status: string; aGirarCop: number }[];
}

export type PropietarioDeLaLiquidacion = VistaPreviaDeDispersiones['propietarios'][number] & {
  /** Sólo con la liquidación del mes completo (PG-02). Ausente = vista previa de un back anterior. */
  liquidacion?: DelMesCompleto;
};

export type LiquidacionParaLaPantalla = Omit<VistaPreviaDeDispersiones, 'propietarios'> & {
  propietarios: PropietarioDeLaLiquidacion[];
  /** `true` = vino de la liquidación del mes completo. */
  mesCompleto?: boolean;
};

/** Cómo se lee cada estado. «Dispersión generada» sólo cuando TODO está generado. */
export const NOMBRE_DEL_ESTADO: Record<EstadoDeLaLiquidacion, string> = {
  POR_GENERAR: 'Sin generar',
  GENERADA_EN_PARTE: 'Generada en parte',
  GENERADA: 'Dispersión generada',
  GIRADA: 'Girada',
};

/**
 * La liquidación completa con la forma de la vista previa. Los números de la
 * fila son los del MES (generado + pendiente); `conDeducciones` lleva el neto
 * antes de deducciones, las deducciones, lo que se gira y lo que queda en
 * contra, sin inventar el detalle de cada deducción (la liquidación completa
 * no lo trae).
 */
export function comoLiquidacionDeLaPantalla(l: LiquidacionDelMesCompleto): LiquidacionParaLaPantalla {
  const propietarios: PropietarioDeLaLiquidacion[] = l.propietarios.map((f) => ({
    propietarioId: f.propietarioId,
    propietarioName: f.propietarioName,
    propietarioBankName: f.cuentaDeDestino?.banco ?? null,
    propietarioBankAccount: f.cuentaDeDestino?.cuenta ?? null,
    yaExiste: f.estado !== 'POR_GENERAR',
    totalCollected: f.mes.canonCop,
    totalCommission: f.mes.comisionCop,
    totalIvaComision: f.mes.ivaComisionCop,
    totalRetencionesComision: f.mes.retencionesComisionCop,
    totalConceptosAFavor: f.mes.conceptosAFavorCop,
    totalConceptosACargo: f.mes.conceptosACargoCop,
    totalDeTerceros: 0,
    netToPropietario: f.mes.netoCop - f.mes.deduccionesCop,
    conDeducciones: {
      netoDelMesCop: f.mes.netoCop,
      deducciones: [],
      deduccionesCop: f.mes.deduccionesCop,
      saldoAnteriorCop: 0,
      netoCop: f.mes.netoCop - f.mes.deduccionesCop,
      aGirarCop: f.mes.aGirarCop,
      saldoEnContraCop: f.mes.saldoEnContraCop,
      compensadoCop: 0,
      renglones: [],
    },
    items: [],
    liquidacion: {
      estado: f.estado,
      generado: f.generado,
      pendiente: f.pendiente,
      dispersiones: f.dispersiones ?? [],
    },
  }));
  return {
    month: l.month,
    base: 'CAUSADO',
    totalPropietarios: l.resumen?.propietarios ?? propietarios.length,
    yaGenerados: propietarios.filter((p) => p.yaExiste).length,
    totalAGirar: l.resumen?.mes.aGirarCop ?? 0,
    totalComisiones: l.resumen?.mes.comisionCop ?? 0,
    totalDeducciones: l.resumen?.mes.deduccionesCop ?? 0,
    totalSaldoEnContra: l.resumen?.mes.saldoEnContraCop ?? 0,
    propietarios,
    mesCompleto: true,
    // 🔴 Lo que no se liquida por falta del porcentaje de cada propietario.
    ...(l.sinPorcentaje ? { sinPorcentaje: l.sinPorcentaje } : {}),
  };
}
