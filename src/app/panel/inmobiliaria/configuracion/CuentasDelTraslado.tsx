'use client';

/**
 * E-03 (QA-PAGOS-95 r2, 06-10-2026): las cuentas del TRASLADO de la comisión.
 *
 * Aprobar un traslado decía «Quedó aprobado SIN asiento contable: falta decir
 * cuál cuenta del PUC es la de recaudo y cuál la propia, en la configuración de
 * tesorería» y no había ninguna pantalla donde decirlo: el back tenía
 * `GET/PUT /inmobiliaria/tesoreria/configuracion` y nadie lo llamaba. Esto es
 * esa configuración: la cuenta del PUC (grupo 11) de la cuenta de recaudo y la
 * de la cuenta propia, con el nombre de cada cuenta del banco, y qué se
 * traslada además de la comisión. Sin la migración del traslado, lo dice y no
 * guarda.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowsLeftRight } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SelectorDeCuenta } from '@/components/contabilidad/SelectorDeCuenta';
import { useCuentas } from '@/components/contabilidad/use-cuentas';
import { usePuedeEscribir } from '@/components/contabilidad/use-puede-escribir';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type { ConfiguracionDeTesoreria } from '@/lib/api/tesoreria.types';
import { useCambiosPorGuardar } from '@/components/configuracion/cambios-por-guardar';
import { EsqueletoDeSeccion } from './piezas';

type Cambio = Partial<Omit<ConfiguracionDeTesoreria, 'disponible' | 'motivo'>>;

const QUE_SE_TRASLADA: { campo: 'trasladarIvaDeLaComision' | 'trasladarIntereses' | 'trasladarGastosDeCobranza'; texto: string }[] = [
  { campo: 'trasladarIvaDeLaComision', texto: 'El IVA de la comisión' },
  { campo: 'trasladarIntereses', texto: 'Los intereses de mora cobrados' },
  { campo: 'trasladarGastosDeCobranza', texto: 'Los gastos de cobranza cobrados' },
];

export function CuentasDelTraslado() {
  const [datos, setDatos] = useState<ConfiguracionDeTesoreria | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const { cuentas } = useCuentas();
  const escritura = usePuedeEscribir();

  const leer = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await tesoreriaApi.configuracion());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  async function guardar(clave: string, cambio: Cambio): Promise<boolean> {
    setGuardando(clave);
    try {
      setDatos(await tesoreriaApi.guardarConfiguracion(cambio));
      if (!conBarra) toast.success('Configuración del traslado guardada.');
      return true;
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar la configuración del traslado.',
          accion: 'guardar la configuración del traslado',
        }),
      );
      return false;
    } finally {
      setGuardando(null);
    }
  }

  /*
   * Dentro de Configuración (Nico, 20-10-2026): elegir una cuenta o marcar una
   * casilla sólo marca; todo se guarda junto, en una escritura, con la barra.
   */
  const [borrador, setBorrador] = useState<Cambio>({});
  const pendiente = Object.fromEntries(
    Object.entries(borrador).filter(([k, v]) => datos && v !== datos[k as keyof Cambio]),
  ) as Cambio;
  const { conBarra } = useCambiosPorGuardar({
    id: 'cuentas-del-traslado',
    cambios: Object.keys(pendiente).length,
    guardar: async () => {
      if (Object.keys(pendiente).length === 0) return true;
      const ok = await guardar('todo', pendiente);
      if (ok) setBorrador({});
      return ok;
    },
    descartar: () => setBorrador({}),
    activo: Boolean(datos?.disponible) && escritura.puede,
  });
  const cambiar = (clave: string, cambio: Cambio) => {
    if (conBarra) setBorrador((b) => ({ ...b, ...cambio }));
    else void guardar(clave, cambio);
  };
  const valor = <K extends keyof Cambio>(k: K) => (k in borrador ? borrador[k] : datos?.[k]) as Cambio[K];

  const apagado = (clave: string) =>
    !datos?.disponible || guardando === clave || guardando === 'todo' || !escritura.puede;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-6" data-testid="cuentas-del-traslado">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 text-h4 font-medium text-fg">
          <ArrowsLeftRight className="h-5 w-5" aria-hidden="true" />
          Traslado de la comisión
        </h3>
        <p className="text-body-sm text-fg-muted">
          La comisión que cobras entra a la cuenta de recaudo con la plata de los propietarios. Al aprobar un traslado
          (Pagos › Traslados de comisión) sale el comprobante y el asiento que la pasa a tu cuenta propia: para el
          asiento hace falta saber qué cuenta del PUC es cada una.
        </p>
      </header>
      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        vacio={false}
        queEs="la configuración del traslado"
        onReintentar={() => leer()}
        esqueleto={<EsqueletoDeSeccion filas={2} />}
      >
        {datos && (
          <div className="space-y-4">
            {!datos.disponible && datos.motivo && (
              <p className="text-body-sm text-fg-muted" data-testid="traslado-sin-migracion">
                {datos.motivo}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5" data-testid="cuenta-puc-de-recaudo">
                <Label htmlFor="cuenta-puc-recaudo">Cuenta del PUC de la cuenta de recaudo</Label>
                <SelectorDeCuenta
                  cuentas={cuentas}
                  value={valor('cuentaPucRecaudoId') ?? ''}
                  onChange={(id) => id && cambiar('recaudo', { cuentaPucRecaudoId: id })}
                  soloImputables
                  disabled={apagado('recaudo')}
                  placeholder="Sin cuenta: el traslado sale sin asiento"
                  className="w-full"
                />
                <p className="text-caption text-fg-muted">Donde entra la plata de los inquilinos (grupo 11, Bancos).</p>
              </div>
              <div className="space-y-1.5" data-testid="cuenta-puc-propia">
                <Label htmlFor="cuenta-puc-propia">Cuenta del PUC de tu cuenta propia</Label>
                <SelectorDeCuenta
                  cuentas={cuentas}
                  value={valor('cuentaPucPropiaId') ?? ''}
                  onChange={(id) => id && cambiar('propia', { cuentaPucPropiaId: id })}
                  soloImputables
                  disabled={apagado('propia')}
                  placeholder="Sin cuenta: el traslado sale sin asiento"
                  className="w-full"
                />
                <p className="text-caption text-fg-muted">A donde va tu comisión (no puede ser la misma de recaudo).</p>
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-body-sm font-medium text-fg">Además de la comisión, se traslada</legend>
              {QUE_SE_TRASLADA.map((o) => (
                <label key={o.campo} className="flex items-center gap-2 text-body-sm text-fg" data-testid={`traslada-${o.campo}`}>
                  <Checkbox
                    checked={Boolean(valor(o.campo))}
                    disabled={apagado(o.campo)}
                    onCheckedChange={(v) => cambiar(o.campo, { [o.campo]: v === true })}
                  />
                  {o.texto}
                </label>
              ))}
            </fieldset>
          </div>
        )}
      </EstadoDeDatos>
    </section>
  );
}
