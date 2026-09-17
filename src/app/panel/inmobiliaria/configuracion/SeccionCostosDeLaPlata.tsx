'use client';

/**
 * Costos de la plata: el 4x1000 y la pasarela, y a quién se le trasladan.
 *
 * ── La regla, con las palabras de Nico (17-09) ──────────────────────────────
 *
 * «Por defecto los asume la INMOBILIARIA (contra su comisión); configurable
 * para trasladar el 4x1000 al propietario en su liquidación y el costo de la
 * pasarela al inquilino, siempre como línea aparte.»
 *
 * Tres cosas de ese párrafo viven acá:
 *
 *   1. **el valor por defecto es la inmobiliaria**: las dos perillas nacen
 *      apagadas, y apagada significa «lo asumo yo»;
 *   2. **las tarifas son de cada inmobiliaria**, no del producto: el 4x1000 lo
 *      fija una ley que se reforma y cada pasarela cobra distinto;
 *   3. **siempre como línea aparte**: nunca se descuenta por dentro del canon
 *      ni del neto. Por eso el EJEMPLO que devuelve el back se pinta entero,
 *      con su rótulo y su cuenta escrita: es exactamente la línea que va a ver
 *      el propietario en su liquidación o el inquilino en su recibo.
 *
 * 🔴 Lo que esta pantalla no decide: si la inmobiliaria está EXENTA del GMF
 * (art. 879 del E.T. tiene 30 exenciones). Una exenta deja el campo vacío y no
 * se calcula nada. Eso lo confirma el contador.
 */

import { useCallback, useEffect, useState } from 'react';
import { Coins } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { explicar } from '@/components/finanzas/TasasDeUsura';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { CostoDeLaPlata, CostosDeLaPlata } from '@/lib/api/finanzas.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

/** Un número escrito a mano; `''` o basura → `null` (= sin configurar). */
export function comoNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Cómo se lee `asume` en la línea del ejemplo. */
const QUIEN_ASUME: Record<string, string> = {
  INMOBILIARIA: 'Lo asume la inmobiliaria',
  PROPIETARIO: 'Se le traslada al propietario',
  INQUILINO: 'Se le traslada al inquilino',
};

export function SeccionCostosDeLaPlata() {
  const [datos, setDatos] = useState<CostosDeLaPlata | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [gmf, setGmf] = useState('');
  const [trasladaGmf, setTrasladaGmf] = useState(false);
  const [pasarelaPct, setPasarelaPct] = useState('');
  const [pasarelaFijo, setPasarelaFijo] = useState('');
  const [trasladaPasarela, setTrasladaPasarela] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const aplicar = useCallback((r: CostosDeLaPlata) => {
    setDatos(r);
    setGmf(r.config.gmfPorMil === null ? '' : String(r.config.gmfPorMil));
    setTrasladaGmf(r.config.trasladaGmfAlPropietario === true);
    setPasarelaPct(r.config.costoPasarelaPct === null ? '' : String(r.config.costoPasarelaPct));
    setPasarelaFijo(
      r.config.costoPasarelaFijoCop === null ? '' : String(r.config.costoPasarelaFijoCop),
    );
    setTrasladaPasarela(r.config.trasladaPasarelaAlInquilino === true);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      aplicar(await finanzasApi.costos());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [aplicar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const disponible = datos?.disponible !== false;

  async function guardar() {
    setGuardando(true);
    try {
      const r = await finanzasApi.guardarCostos({
        gmfPorMil: comoNumero(gmf),
        trasladaGmfAlPropietario: trasladaGmf,
        costoPasarelaPct: comoNumero(pasarelaPct),
        costoPasarelaFijoCop: comoNumero(pasarelaFijo),
        trasladaPasarelaAlInquilino: trasladaPasarela,
      });
      aplicar(r);
      toast.success('Costos de la plata guardados.', {
        description: 'Aplican a los giros y recibos que se hagan desde ahora.',
      });
    } catch (e) {
      toast.error('No se pudieron guardar los costos.', {
        description: explicar(e, 'No se pudieron guardar los costos.'),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <EstadoDeDatos
      cargando={cargando && !datos}
      error={error}
      vacio={!cargando && !datos}
      queEs="los costos de la plata"
      onReintentar={cargar}
      esqueleto={<EsqueletoDeSeccion filas={3} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Coins}
          titulo="Todavía no pudimos leer la configuración"
          ayuda="Vuelve a intentar en un momento: las tarifas cuelgan de tu inmobiliaria."
        />
      }
    >
      {datos ? (
        <div className="space-y-6" data-testid="seccion-costos-de-la-plata">
          {!datos.disponible ? (
            <SinLaMigracion motivo={datos.motivo} queSeEspera="guardar los costos de la plata" />
          ) : null}

          <p className="text-sm text-fg-muted">
            Mover plata cuesta: el banco cobra el 4x1000 cuando le giras al propietario y la
            pasarela cobra cuando el inquilino paga en línea. Por defecto los asume la inmobiliaria
            contra su comisión. Si los trasladas, salen{' '}
            <strong>siempre como línea aparte</strong>: nunca por dentro del canon ni del neto.
          </p>

          {/* ── 4x1000 ──────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-base font-semibold text-fg">Gravamen a los movimientos (4x1000)</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gmf-por-mil">Por mil</Label>
                <Input
                  id="gmf-por-mil"
                  inputMode="decimal"
                  className="w-32 font-mono"
                  placeholder="4"
                  disabled={!disponible}
                  value={gmf}
                  onChange={(e) => setGmf(e.target.value)}
                />
              </div>
              <p className="max-w-md text-xs text-fg-muted">
                Art. 870 del Estatuto Tributario: 4 por mil sobre cada retiro o transferencia. Se
                escribe POR MIL para que una reforma sea un número y no un despliegue. Si tu
                inmobiliaria está exenta (art. 879), déjalo vacío: no se calcula nada.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">Trasladárselo al propietario</p>
                <p className="text-xs text-fg-muted">
                  Apagado: lo asume la inmobiliaria contra su comisión y no baja lo que se le gira.
                  Prendido: sale como línea aparte de su liquidación.
                </p>
              </div>
              <Switch
                checked={trasladaGmf}
                aria-label="Trasladar el 4x1000 al propietario"
                data-testid="traslada-gmf"
                disabled={!disponible}
                onCheckedChange={setTrasladaGmf}
              />
            </div>
            <LineaDeEjemplo
              testId="ejemplo-gmf"
              costo={datos.ejemplo.gmf}
              sobre={`Sobre un giro de ${formatCurrency(datos.ejemplo.giroCop)}`}
            />
          </section>

          {/* ── Pasarela ────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-base font-semibold text-fg">Costo de la pasarela de pago</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pasarela-pct">% del recaudo</Label>
                <Input
                  id="pasarela-pct"
                  inputMode="decimal"
                  className="w-32 font-mono"
                  placeholder="2,65"
                  disabled={!disponible}
                  value={pasarelaPct}
                  onChange={(e) => setPasarelaPct(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pasarela-fijo">Fijo por transacción</Label>
                <Input
                  id="pasarela-fijo"
                  inputMode="numeric"
                  className="w-40 font-mono"
                  placeholder="900"
                  disabled={!disponible}
                  value={pasarelaFijo}
                  onChange={(e) => setPasarelaFijo(e.target.value)}
                />
              </div>
              <p className="max-w-sm text-xs text-fg-muted">
                Casi todas cobran un % más un fijo. Pueden venir los dos, uno o ninguno.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">Trasladárselo al inquilino</p>
                <p className="text-xs text-fg-muted">
                  Prendido, es plata que el inquilino pone ADEMÁS de su deuda: no baja lo que se le
                  abona. Sale como línea aparte de su recibo.
                </p>
              </div>
              <Switch
                checked={trasladaPasarela}
                aria-label="Trasladar el costo de la pasarela al inquilino"
                data-testid="traslada-pasarela"
                disabled={!disponible}
                onCheckedChange={setTrasladaPasarela}
              />
            </div>
            <LineaDeEjemplo
              testId="ejemplo-pasarela"
              costo={datos.ejemplo.pasarela}
              sobre={`Sobre un recaudo de ${formatCurrency(datos.ejemplo.recaudoCop)}`}
            />
          </section>

          <div className="flex justify-end">
            <Button size="sm" hideArrow disabled={!disponible} isLoading={guardando} onClick={() => void guardar()}>
              Guardar
            </Button>
          </div>
        </div>
      ) : null}
    </EstadoDeDatos>
  );
}

/**
 * El ejemplo que devuelve el back, pintado tal cual: el rótulo que verá la
 * persona, el valor, quién lo asume y la cuenta escrita. No se recalcula acá —
 * sería una segunda fórmula para la misma plata.
 */
function LineaDeEjemplo({
  costo,
  sobre,
  testId,
}: {
  costo: CostoDeLaPlata;
  sobre: string;
  testId: string;
}) {
  return (
    <div className="space-y-1 rounded-md bg-surface-muted px-4 py-3" data-testid={testId}>
      <p className="text-label text-fg-muted">{sobre}</p>
      {costo.configurado ? (
        <>
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-fg">{costo.rotulo}</span>
            <span className="font-mono text-sm tabular-nums text-fg">
              {formatCurrency(costo.valorCop)}
            </span>
          </p>
          <p className="text-xs text-fg-muted">
            {QUIEN_ASUME[costo.asume] ?? costo.asume}. {costo.detalle}
          </p>
        </>
      ) : (
        <p className="text-xs text-fg-muted">{costo.detalle}</p>
      )}
    </div>
  );
}
