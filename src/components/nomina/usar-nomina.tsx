'use client';

/**
 * Cargar algo de nómina, con las tres formas de «no se puede» resueltas UNA vez.
 *
 * Cada pantalla de nómina tiene que distinguir:
 *
 *   · el módulo no está comprado (402) → cartel de producto, sin reintentar;
 *   · falta una migración (503)        → cartel de «la aplica Víctor»;
 *   · cualquier otro fallo             → `EstadoDeDatos` con su reintento.
 *
 * Repetir ese `if` en ocho pantallas garantiza que la novena se olvide de una de
 * las tres y muestre «algo salió mal» donde debería decir «esto se contrata».
 *
 * 🔴 `recargar` devuelve la PROMESA (no `void recargar()`): `FalloDeCarga` la
 * espera para dejar el botón ocupado y evitar el doble clic. Hay un test estático
 * que lo cuida (`el-reintento-devuelve-su-promesa.test.ts`).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import {
  faltaLaMigracion,
  noEstaHabilitada,
} from '@/lib/api/nomina.service';
import { ModuloNoHabilitado, SinLaMigracion } from './piezas';

export interface EstadoDeCarga<T> {
  datos: T | null;
  cargando: boolean;
  fallo: unknown;
  recargar: () => Promise<void>;
}

/** Carga algo y lo recarga a pedido. Nada más: los carteles los pone `<Cargado>`. */
export function useCargaDeNomina<T>(
  cargar: () => Promise<T>,
  dependencias: readonly unknown[] = [],
): EstadoDeCarga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await cargar());
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
    // `cargar` se recrea en cada render de quien llama; las dependencias reales
    // las declara la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, cargando, fallo, recargar };
}

/**
 * El envoltorio que decide qué se ve. Recibe el estado de `useCargaDeNomina` y
 * los hijos sólo se montan cuando hay datos.
 */
export function Cargado<T>({
  estado,
  queEs,
  queSeEspera,
  children,
}: {
  estado: EstadoDeCarga<T>;
  /** «las personas de nómina», «el desprendible». */
  queEs: string;
  /** Para el cartel de la migración: «liquidar la nómina». */
  queSeEspera: string;
  children: (datos: T) => ReactNode;
}) {
  // 🔴 El módulo no comprado se mira PRIMERO y no ofrece reintentar: reintentar
  // no lo compra, y un botón que no puede resolver nada enseña a ignorarlo.
  if (noEstaHabilitada(estado.fallo)) {
    return <ModuloNoHabilitado />;
  }
  if (faltaLaMigracion(estado.fallo)) {
    return (
      <SinLaMigracion
        motivo={mensajeDelError(estado.fallo)}
        queSeEspera={queSeEspera}
      />
    );
  }
  return (
    <EstadoDeDatos
      cargando={estado.cargando}
      error={estado.fallo}
      queEs={queEs}
      onReintentar={estado.recargar}
    >
      {estado.datos != null ? children(estado.datos) : null}
    </EstadoDeDatos>
  );
}

function mensajeDelError(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  return null;
}
