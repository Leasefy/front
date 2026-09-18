'use client';

/**
 * 🔴 BITÁCORA DE PLATA: quién hizo qué en lo que mueve plata.
 *
 * Nico (17/18-09-2026): «bitácora de quién hizo qué en lo que mueve plata
 * (aprobar lotes, anular, condonar, cambiar cuentas), VISIBLE PARA EL DUEÑO de
 * la inmobiliaria».
 *
 * Es de SÓLO LECTURA, y eso es parte del diseño: las filas las escriben las
 * acciones cuando ocurren. Una pantalla que pudiera escribir en la bitácora la
 * volvería inútil.
 *
 * ⚠️ Sin la migración la lista sale VACÍA **diciendo por qué**. Una bitácora
 * vacía sin explicación se lee como «no pasó nada», que es lo contrario de la
 * verdad.
 */

import { useCallback, useEffect, useState } from 'react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { bitacoraApi } from '@/lib/api/bitacora.service';
import type { BitacoraDePlata } from '@/lib/api/bitacora.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion } from './piezas';

/** Las acciones, en palabras. Un `APROBAR_LOTE` no se le muestra a nadie. */
const EN_PALABRAS: Record<string, string> = {
  APROBAR_LOTE: 'Aprobó un lote de giros',
  ANULAR_LOTE: 'Anuló un lote de giros',
  ANULAR_COBRO: 'Anuló un cobro',
  ANULAR_RECIBO: 'Anuló un recibo de caja',
  CONDONAR: 'Condonó',
  CAMBIAR_CUENTA: 'Cambió una cuenta bancaria',
  MARCAR_PAGADO: 'Marcó un lote como pagado',
  GIRO_DEVUELTO: 'Registró un giro devuelto',
  CASTIGAR_CARTERA: 'Castigó cartera',
  APROBAR_REPARACION: 'Aprobó una reparación',
  REPORTAR_SINIESTRO: 'Reportó un siniestro',
};

export function SeccionBitacora() {
  const [datos, setDatos] = useState<BitacoraDePlata | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await bitacoraApi.listar({ limite: 100 }));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando || error || !datos) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !datos}
        esqueleto={<EsqueletoDeSeccion filas={6} />}
      >
        <span />
      </EstadoDeDatos>
    );
  }

  return (
    <div className="space-y-4" data-testid="bitacora-de-plata">
      <p className="text-sm text-fg-muted">
        Todo lo que movió plata en tu inmobiliaria: quién, qué, cuándo y por qué.
        No se puede editar ni borrar.
      </p>

      {!datos.disponible && (
        <p
          className="rounded-md border border-border bg-warning-soft px-3 py-2 text-xs text-fg"
          data-testid="bitacora-sin-migrar"
        >
          {datos.motivo}
        </p>
      )}

      {datos.disponible && datos.filas.length === 0 && (
        <p className="text-sm text-fg-muted" data-testid="bitacora-vacia">
          Todavía no se registró ninguna acción que mueva plata.
        </p>
      )}

      <ul className="space-y-2">
        {datos.filas.map((f) => (
          <li
            key={f.id}
            className="rounded-lg border border-border bg-surface p-4"
            data-testid={`huella-${f.id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-fg">
                  {EN_PALABRAS[f.accion] ?? f.accion}
                </p>
                <p className="mt-1 text-xs text-fg-muted">{f.resumen}</p>
                {f.motivo && (
                  <p className="mt-1 text-xs text-fg-muted">Motivo: {f.motivo}</p>
                )}
              </div>
              {f.valorCop !== null && (
                <p className="shrink-0 font-mono text-sm text-fg">
                  {formatCurrency(f.valorCop)}
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              {/*
                El actor sale del NOMBRE COPIADO en la fila, no de un join: la
                bitácora tiene que decir quién fue aunque después borren al
                usuario. Sin nombre se dice «el sistema», que es la verdad
                cuando la acción la hizo un cron.
              */}
              {f.actor.nombre ?? f.actor.email ?? 'El sistema'} ·{' '}
              {new Date(f.fecha).toLocaleString('es-CO')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
