'use client';

/**
 * 🔴 Las CUENTAS de las diferencias de la conciliación (Nico, P1, 03-10-2026):
 * «asiento AUTOMÁTICO al aprobar, contra cuentas configurables por
 * inmobiliaria. La retención del inquilino queda a nombre del PROPIETARIO
 * (art. 394 ET) y entra en su liquidación y certificado». Encargo: «4×1000 y
 * comisión → gasto bancario».
 *
 * Tres cuentas del plan de la inmobiliaria (la semilla propone 530505 para los
 * gastos bancarios y 28150505 para la retención). Sin cuenta, la diferencia
 * aprobada NO se asienta (nunca a una cuenta adivinada) y queda «por
 * asentar»: el botón la asienta cuando ya hay cuenta.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bank, Warning } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { SelectorDeCuenta } from '@/components/contabilidad/SelectorDeCuenta';
import { useCuentas } from '@/components/contabilidad/use-cuentas';
import { usePuedeEscribir } from '@/components/contabilidad/use-puede-escribir';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import {
  cuentasDeLasDiferenciasApi,
  type CuentasDeLasDiferencias as Datos,
  type DiferenciasPorAsentar,
  type EventoDeDiferencia,
} from '@/lib/api/cuentas-de-las-diferencias';
import { EsqueletoDeSeccion } from './piezas';

function plata(cop: number): string {
  return `$${Math.round(cop).toLocaleString('es-CO')}`;
}

export function CuentasDeLasDiferencias() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [porAsentar, setPorAsentar] = useState<DiferenciasPorAsentar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState<EventoDeDiferencia | null>(null);
  const [asentando, setAsentando] = useState(false);
  const { cuentas } = useCuentas();
  const escritura = usePuedeEscribir();
  const aparecer = useAparecer();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([
        cuentasDeLasDiferenciasApi.cuentas(),
        cuentasDeLasDiferenciasApi.porAsentar().catch(() => null),
      ]);
      setDatos(d);
      setPorAsentar(p);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function elegir(evento: EventoDeDiferencia, cuentaId: string | null) {
    setGuardando(evento);
    try {
      const r = await cuentasDeLasDiferenciasApi.guardar([{ evento, cuentaId }]);
      setDatos(r);
      toast.success(cuentaId ? 'Cuenta guardada.' : 'Cuenta quitada: esa diferencia no se asienta hasta que elijas otra.');
      setPorAsentar(await cuentasDeLasDiferenciasApi.porAsentar().catch(() => null));
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar la cuenta.',
          accion: 'guardar la cuenta de la diferencia',
        }),
      );
    } finally {
      setGuardando(null);
    }
  }

  async function asentarLasPendientes() {
    setAsentando(true);
    try {
      const r = await cuentasDeLasDiferenciasApi.reprocesar();
      if (r.asentadas > 0) {
        toast.success(
          r.asentadas === 1 ? 'Se asentó 1 diferencia.' : `Se asentaron ${r.asentadas} diferencias.`,
        );
      }
      if (r.sinAsentar > 0) {
        toast.error(
          `${r.sinAsentar === 1 ? 'Quedó 1 sin asentar' : `Quedaron ${r.sinAsentar} sin asentar`}: ${r.motivos.join(' · ')}`,
        );
      }
      setPorAsentar(await cuentasDeLasDiferenciasApi.porAsentar().catch(() => null));
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudieron asentar las diferencias.',
          accion: 'asentar las diferencias',
        }),
      );
    } finally {
      setAsentando(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-5"
      aria-labelledby="cuentas-de-las-diferencias-titulo"
      data-testid="cuentas-de-las-diferencias"
    >
      <header className="space-y-1">
        <h3 id="cuentas-de-las-diferencias-titulo" className="flex items-center gap-2 text-base font-semibold text-fg">
          <Bank className="h-4 w-4" aria-hidden="true" />
          Cuentas de las diferencias
        </h3>
        <p className="text-body-sm text-fg-muted">
          Cuando apruebas una conciliación con una diferencia, se asienta sola: el 4×1000 y la comisión van a gasto
          bancario; la retención que practicó el inquilino queda a nombre del propietario (art. 394 del Estatuto
          Tributario), se le descuenta en su liquidación y entra a su certificado.
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        vacio={false}
        queEs="las cuentas de las diferencias"
        onReintentar={cargar}
        esqueleto={<EsqueletoDeSeccion filas={3} />}
      >
        {datos ? (
          <div className="space-y-4">
            {!datos.disponible && (
              <SinLaMigracion
                motivo={datos.motivo}
                queSeEspera="guardar las cuentas y asentar las diferencias"
                testId="cuentas-de-las-diferencias-sin-la-migracion"
              />
            )}

            <ul className="space-y-3" aria-label="Cuenta de cada diferencia">
              {datos.eventos.map((e) => (
                <li
                  key={e.evento}
                  className="grid gap-2 rounded-md border border-border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start"
                  data-testid={`cuenta-de-${e.evento}`}
                >
                  <div className="space-y-1">
                    <Label htmlFor={`cuenta-${e.evento}`}>{e.nombre}</Label>
                    <p className="text-caption text-fg-muted">{e.explicacion}</p>
                  </div>
                  <div className="space-y-1.5">
                    <SelectorDeCuenta
                      cuentas={cuentas}
                      value={e.cuenta?.id ?? ''}
                      onChange={(id) => void elegir(e.evento, id || null)}
                      soloImputables
                      disabled={!datos.disponible || guardando === e.evento || !escritura.puede}
                      placeholder="Sin cuenta: no se asienta"
                      className="w-full"
                    />
                    {!e.cuenta && e.propuesta && datos.disponible && (
                      <Button
                        size="sm"
                        variant="ghost"
                        hideArrow
                        disabled={guardando === e.evento || !escritura.puede}
                        onClick={() => void elegir(e.evento, e.propuesta!.id)}
                        data-testid={`usar-propuesta-${e.evento}`}
                      >
                        Usar {e.propuesta.codigo} · {e.propuesta.nombre}
                      </Button>
                    )}
                    {!escritura.puede && escritura.motivo && (
                      <p className="text-caption text-fg-muted">{escritura.motivo}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-caption text-fg-muted" data-testid="cuenta-del-banco">
              {datos.cuentaDelBanco
                ? `Lo que no llegó sale de ${datos.cuentaDelBanco.codigo} · ${datos.cuentaDelBanco.nombre} (la cuenta de «Entró plata al banco» del mapeo contable).`
                : 'Falta la cuenta de «Entró plata al banco» en el mapeo contable: sin ella no se asienta ninguna diferencia.'}
            </p>

            {!datos.retencionEnLaLiquidacion && datos.disponible && (
              <p className="flex items-start gap-2 text-caption text-fg-muted" data-testid="retencion-sin-liquidacion">
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                La retención se asienta a nombre del propietario y entra a su certificado, pero todavía no se le
                descuenta sola en la liquidación: falta preparar eso en el servidor.
              </p>
            )}

            <AnimatePresence initial={false}>
              {porAsentar && porAsentar.total > 0 && (
                <motion.div
                  key="por-asentar"
                  {...aparecer}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning bg-warning-soft px-4 py-3"
                  data-testid="diferencias-por-asentar"
                >
                  <p className="text-body-sm text-fg">
                    {porAsentar.total === 1
                      ? `1 diferencia aprobada (${plata(porAsentar.valorCop)}) no tiene asiento todavía.`
                      : `${porAsentar.total} diferencias aprobadas (${plata(porAsentar.valorCop)}) no tienen asiento todavía.`}
                  </p>
                  <Button
                    size="sm"
                    hideArrow
                    isLoading={asentando}
                    disabled={!escritura.puede || !datos.disponible}
                    onClick={() => void asentarLasPendientes()}
                    data-testid="asentar-las-pendientes"
                  >
                    Asentarlas
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}
