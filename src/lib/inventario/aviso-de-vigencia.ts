/**
 * Qué dice la ficha del inmueble sobre su inventario, en una sola función
 * (la pantalla sólo pinta). Las claves viven en
 * `inmobiliaria.inventarioDelInmueble.*`.
 */
import type { TranslationParams } from '@/lib/i18n/types';
import type { BloqueoPorInventario } from '@/lib/inventario/bloqueo-por-inventario';
import { diaLegible, numeroDelContrato } from '@/lib/inventario/bloqueo-por-inventario';
import type { VigenciaDelInventario } from '@/lib/types/inventario-del-inmueble';

const B = 'inmobiliaria.inventarioDelInmueble';

export interface AvisoDeVigencia {
  severidad: 'success' | 'warning' | 'info';
  titulo: { clave: string; params?: TranslationParams };
  texto: { clave: string; params?: TranslationParams } | null;
}

export function avisoDeVigencia(v: VigenciaDelInventario | null): AvisoDeVigencia | null {
  if (!v) return null;
  if (v.porActualizarTras) {
    return {
      severidad: 'warning',
      titulo: {
        clave: `${B}.porActualizarTitulo`,
        params: { numero: numeroDelContrato(v.porActualizarTras) },
      },
      texto: {
        clave: `${B}.porActualizarTexto`,
        params: { fecha: diaLegible(v.porActualizarTras.terminoEl) },
      },
    };
  }
  if (v.vigente && v.ultimoCompleto) {
    return {
      severidad: 'success',
      titulo: {
        clave: `${B}.vigente`,
        params: { version: v.ultimoCompleto.version, fecha: diaLegible(v.ultimoCompleto.completadoEl) },
      },
      texto: null,
    };
  }
  return {
    severidad: 'info',
    titulo: { clave: v.motivo === 'SOLO_BORRADOR' ? `${B}.soloBorrador` : `${B}.sinInventario` },
    texto: null,
  };
}

/** El texto del bloqueo al crear o activar un contrato. */
export function textoDelBloqueo(b: BloqueoPorInventario): { clave: string; params?: TranslationParams } {
  if (b.motivo === 'ANTERIOR_AL_FIN_DEL_CONTRATO' && b.porActualizarTras) {
    return {
      clave: `${B}.bloqueoAnterior`,
      params: {
        numero: numeroDelContrato(b.porActualizarTras),
        fecha: diaLegible(b.porActualizarTras.terminoEl),
      },
    };
  }
  if (b.motivo === 'SOLO_BORRADOR') return { clave: `${B}.bloqueoSoloBorrador` };
  return { clave: `${B}.bloqueoSinInventario` };
}
