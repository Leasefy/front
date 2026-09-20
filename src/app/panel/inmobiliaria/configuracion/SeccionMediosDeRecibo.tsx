'use client';

/**
 * Medios de recibo: con qué se puede registrar un pago en caja.
 *
 * ── No es lo mismo que «Medios de pago» ─────────────────────────────────────
 *
 * «Medios de pago» (la sección de al lado) es lo que el INQUILINO ve en «Cómo
 * pagar»: las cuentas y los enlaces de la inmobiliaria. Esto es otra cosa: qué
 * medios admite un RECIBO DE CAJA, o sea con qué puede la persona de caja
 * registrar que entró plata. Por eso son dos secciones y no una.
 *
 * ── El preset de Nico (17-09), que es un preset ─────────────────────────────
 *
 * «Sólo transferencia y pasarela; no se recibe efectivo ni cheque (queda
 * apagado, sin cierre de caja)». Nace así y cada inmobiliaria lo cambia: una
 * de pueblo que recibe efectivo tiene que poder prenderlo.
 *
 * Lo que NO hace apagar un medio: tocar los recibos YA registrados. La
 * inmobiliaria migrada tiene miles con `medio = 'EFECTIVO'` y son hechos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { explicar } from '@/components/finanzas/TasasDeUsura';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { MediosDeRecibo } from '@/lib/api/finanzas.types';
import {
  NOMBRE_DE_LA_FAMILIA,
  QUE_ES_LA_FAMILIA,
  apagadosDespuesDe,
  normalizarMedio,
} from '@/lib/finanzas/medios';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

/** Las familias en el orden en que se leen: primero lo que Portofino usa. */
const ORDEN_DE_FAMILIAS = ['TRANSFERENCIA', 'PASARELA', 'CAJA', 'OTRO'];

export function SeccionMediosDeRecibo() {
  const [datos, setDatos] = useState<MediosDeRecibo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [apagados, setApagados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await finanzasApi.medios();
      setDatos(r);
      setApagados(r.apagados.map(normalizarMedio));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const grupos = useMemo(() => {
    const porFamilia = new Map<string, MediosDeRecibo['medios']>();
    for (const medio of datos?.medios ?? []) {
      porFamilia.set(medio.familia, [...(porFamilia.get(medio.familia) ?? []), medio]);
    }
    return ORDEN_DE_FAMILIAS.filter((f) => porFamilia.has(f)).map((familia) => ({
      familia,
      medios: porFamilia.get(familia) ?? [],
    }));
  }, [datos]);

  const cambiado = useMemo(() => {
    const antes = new Set((datos?.apagados ?? []).map(normalizarMedio));
    const ahora = new Set(apagados);
    return antes.size !== ahora.size || [...ahora].some((m) => !antes.has(m));
  }, [datos, apagados]);

  async function guardar() {
    setGuardando(true);
    try {
      const r = await finanzasApi.guardarMedios(apagados);
      setDatos(r);
      setApagados(r.apagados.map(normalizarMedio));
      toast.success('Medios de recibo guardados.', {
        description: 'Los recibos que ya existen no se tocan: son hechos.',
      });
    } catch (e) {
      toast.error('No se pudieron guardar los medios.', {
        description: explicar(e, 'No se pudieron guardar los medios.'),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <EstadoDeDatos
      cargando={cargando && !datos}
      error={error}
      vacio={Boolean(datos) && (datos?.medios.length ?? 0) === 0}
      queEs="los medios de recibo"
      onReintentar={cargar}
      esqueleto={<EsqueletoDeSeccion filas={4} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Receipt}
          titulo="No pudimos leer el catálogo de medios"
          ayuda="Vuelve a intentar en un momento: el catálogo lo arma el back con lo que el producto conoce."
        />
      }
    >
      {datos ? (
        <div className="space-y-5" data-testid="seccion-medios-de-recibo">
          <p className="text-sm text-fg-muted">
            Con qué puede la persona de caja registrar que entró plata. Un medio apagado no se
            ofrece al emitir un recibo, y el back lo rechaza si llega igual. Esto NO cambia lo que
            el inquilino ve en «Cómo pagar»: eso se configura en «Medios de pago».
          </p>

          {datos.esElPreset ? (
            <p
              className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-fg-muted"
              data-testid="es-el-preset"
            >
              Todavía no has decidido nada, así que rige el ajuste de fábrica: sólo transferencia y
              pasarela. Efectivo y cheque están apagados —sin efectivo no hay caja física que
              cuadrar, y no hay arqueo—. Cámbialo cuando quieras.
            </p>
          ) : null}

          {grupos.map(({ familia, medios }) => (
            <section key={familia} className="space-y-2" data-testid={`familia-${familia}`}>
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-fg">
                  {NOMBRE_DE_LA_FAMILIA[familia] ?? familia}
                </h3>
                <p className="text-xs text-fg-muted">{QUE_ES_LA_FAMILIA[familia] ?? ''}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {medios.map((m) => {
                    const prendido = !apagados.includes(normalizarMedio(m.medio));
                    return (
                      <div
                        key={m.medio}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                        data-testid={`medio-${m.medio}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg">{m.nombre}</p>
                          <p className="text-xs text-fg-muted">
                            {prendido ? 'Se ofrece al registrar un pago.' : 'No se ofrece.'}
                          </p>
                        </div>
                        <Switch
                          checked={prendido}
                          aria-label={m.nombre}
                          data-testid={`interruptor-${m.medio}`}
                          onCheckedChange={(v) =>
                            setApagados((a) => apagadosDespuesDe(a, m.medio, v))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}

          <div className="flex justify-end">
            <Button size="sm" hideArrow onClick={() => void guardar()} disabled={!cambiado} isLoading={guardando}>
              Guardar
            </Button>
          </div>
        </div>
      ) : null}
    </EstadoDeDatos>
  );
}
