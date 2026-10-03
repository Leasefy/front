'use client';

/**
 * Configuración de la conciliación, ola 3 (Nico, 03-10-2026):
 *
 *   · P10 — a los cuántos días se avisa de una partida pendiente (30 por
 *     defecto, lo que eligió Nico);
 *   · P12 — si la inmobiliaria recibe EFECTIVO (apagado por defecto: «sólo
 *     transferencia y pasarela»); prendido, la planilla de caja del día entra
 *     a la conciliación;
 *   · P9 — la cuenta contable (PUC, grupo 11) de cada cuenta bancaria: de ahí
 *     sale el «saldo en libros» del cierre del mes. 🔴 Seguimiento 6 (Nico,
 *     D-CONC 2 a): los recibos conciliados desde el extracto de esa cuenta se
 *     asientan en ella (si admite movimientos); si no, en la de bancos del
 *     mapeo, y aquí se dice.
 *
 * Sin la migración del back, se dice por qué y no se puede guardar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Coins, Bank } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SelectorDeCuenta } from '@/components/contabilidad/SelectorDeCuenta';
import { useCuentas } from '@/components/contabilidad/use-cuentas';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import {
  cierreDeConciliacionApi,
  DIAS_DE_ALERTA_POR_DEFECTO,
  type ConfiguracionDeLaConciliacion,
  type CuentasContables,
} from '@/lib/api/cierre-de-conciliacion';

/** El mismo rango que el back (1 a 365 días). */
export function diasDeAlertaValidos(texto: string): number | null {
  if (!/^\d{1,3}$/.test(texto.trim())) return null;
  const n = Number(texto.trim());
  return n >= 1 && n <= 365 ? n : null;
}

export function ConciliacionCierreYEfectivo() {
  const { canAccess, isLoading } = usePermissions();
  const puede = isLoading || canAccess('cobros', 'edit');
  const aparecer = useAparecer();
  const { cuentas: puc } = useCuentas();
  const delDisponible = useMemo(() => puc.filter((c) => c.codigo.startsWith('11')), [puc]);
  const [config, setConfig] = useState<ConfiguracionDeLaConciliacion | null>(null);
  const [contables, setContables] = useState<CuentasContables | null>(null);
  const [dias, setDias] = useState('');
  const [errorDeDias, setErrorDeDias] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);

  const leer = useCallback(async () => {
    setFallo(null);
    try {
      const [c, k] = await Promise.all([cierreDeConciliacionApi.configuracion(), cierreDeConciliacionApi.cuentasContables()]);
      setConfig(c);
      setContables(k);
      setDias(String(c.diasDeAlerta));
    } catch (e) {
      setFallo(e);
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  if (fallo) {
    return (
      <p className="text-caption text-fg-muted" data-testid="conciliacion-config-fallo">
        {mensajeParaLaPersona(fallo, { porDefecto: 'No se pudo leer la configuración de la conciliación.' })}{' '}
        <button type="button" className="underline" onClick={() => void leer()}>
          Reintentar
        </button>
      </p>
    );
  }
  if (!config || !contables) return null;

  const guardar = async (cambios: { diasDeAlerta?: number; efectivoActivo?: boolean }, que: string) => {
    setGuardando(que);
    setErrorDeDias(null);
    try {
      const c = await cierreDeConciliacionApi.guardarConfiguracion(cambios);
      setConfig(c);
      setDias(String(c.diasDeAlerta));
      toast.success(
        cambios.efectivoActivo === undefined
          ? `La alerta avisa desde los ${c.diasDeAlerta} días.`
          : c.efectivoActivo
            ? 'Efectivo prendido: la planilla de caja de cada día entra a la conciliación.'
            : 'Efectivo apagado: la planilla de caja ya no entra a la conciliación.',
      );
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['diasDeAlerta'] as const,
        porDefecto: 'No se pudo guardar.',
        accion: 'guardar la configuración de la conciliación',
      });
      if (porCampo.diasDeAlerta) setErrorDeDias(porCampo.diasDeAlerta);
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
    } finally {
      setGuardando(null);
    }
  };

  const asignar = async (cuentaId: string, cuentaPucId: string) => {
    if (!cuentaPucId) return;
    setGuardando(cuentaId);
    try {
      setContables(await cierreDeConciliacionApi.asignarCuentaContable(cuentaId, cuentaPucId));
      toast.success('Cuenta contable guardada.');
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo guardar la cuenta contable.', accion: 'asignar la cuenta contable' }));
    } finally {
      setGuardando(null);
    }
  };

  const diasLeidos = diasDeAlertaValidos(dias);

  return (
    <motion.section {...aparecer} className="space-y-5 rounded-lg border border-border bg-surface p-5" data-testid="conciliacion-cierre-y-efectivo">
      <header className="space-y-1">
        <h2 className="text-h4 text-fg">Conciliación: alerta, efectivo y cierre del mes</h2>
        {!config.disponible && (
          <p className="text-caption text-fg-muted" data-testid="conciliacion-config-sin-migracion">
            Todavía no se puede guardar: falta una actualización de la base. Mientras tanto la alerta avisa a los {DIAS_DE_ALERTA_POR_DEFECTO} días y el
            efectivo está apagado.
          </p>
        )}
      </header>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          <Label htmlFor="dias-de-alerta">Avisar de una partida pendiente después de</Label>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Input
            id="dias-de-alerta"
            inputMode="numeric"
            className="w-24"
            value={dias}
            onChange={(e) => {
              setDias(e.target.value);
              setErrorDeDias(null);
            }}
            disabled={!config.disponible || !puede}
            aria-invalid={errorDeDias || (dias && diasLeidos === null) ? true : undefined}
            aria-describedby="dias-de-alerta-error"
            data-testid="dias-de-alerta"
          />
          <span className="py-2 text-body-sm text-fg">días</span>
          <Button
            hideArrow
            variant="outline"
            disabled={!config.disponible || !puede || diasLeidos === null || diasLeidos === config.diasDeAlerta}
            isLoading={guardando === 'dias'}
            onClick={() => diasLeidos !== null && void guardar({ diasDeAlerta: diasLeidos }, 'dias')}
            data-testid="guardar-dias-de-alerta"
          >
            Guardar
          </Button>
        </div>
        <ErrorDelCampo
          id="dias-de-alerta-error"
          mensaje={errorDeDias ?? (dias && diasLeidos === null ? 'Escribe un número de días entre 1 y 365.' : null)}
          pista={`Entre 1 y 365. Por defecto, ${DIAS_DE_ALERTA_POR_DEFECTO}. Las partidas se cuentan de 0 a 30, de 31 a 60 y de más de 60 días.`}
        />
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
        <div className="flex gap-2">
          <Coins className="mt-0.5 h-5 w-5 text-fg-muted" aria-hidden="true" />
          <div>
            <Label htmlFor="efectivo-activo">La inmobiliaria recibe efectivo</Label>
            <p className="text-caption text-fg-muted">
              Apagado por defecto: sólo transferencia y pasarela. Prendido, los recibos en efectivo de cada día (la planilla de caja) se cruzan
              contra la consignación del banco.
            </p>
          </div>
        </div>
        <Switch
          id="efectivo-activo"
          checked={config.efectivoActivo}
          disabled={!config.disponible || !puede || guardando === 'efectivo'}
          onCheckedChange={(v) => void guardar({ efectivoActivo: v === true }, 'efectivo')}
          data-testid="efectivo-activo"
        />
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Bank className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          <h3 className="text-body font-semibold text-fg">Cuenta contable de cada cuenta bancaria</h3>
        </div>
        <p className="text-caption text-fg-muted">
          De aquí sale el «saldo en libros» del cierre del mes, y aquí se asientan los recibos que se concilian desde
          el extracto de esa cuenta (y lo que el banco cobra en ella).
          {contables.cuentaDeLosRecibos
            ? ` Sin cuenta contable, van a ${contables.cuentaDeLosRecibos.codigo} ${contables.cuentaDeLosRecibos.nombre}, la de bancos del mapeo.`
            : ''}
        </p>
        {!contables.disponible && <p className="text-caption text-fg-muted">{contables.motivo}</p>}
        {contables.cuentas.length === 0 ? (
          <p className="text-caption text-fg-muted">No hay cuentas bancarias: se registran en Configuración → Medios de pago.</p>
        ) : (
          <ul className="space-y-2">
            {contables.cuentas.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between" data-testid={`cuenta-contable-${c.id}`}>
                <span className="text-body-sm text-fg">
                  {c.nombre}
                  {!c.activa && <span className="text-caption text-fg-muted"> (desactivada)</span>}
                </span>
                <div className="sm:w-80">
                  <SelectorDeCuenta
                    cuentas={delDisponible}
                    value={c.cuentaPuc?.id ?? ''}
                    onChange={(id) => void asignar(c.id, id)}
                    disabled={!contables.disponible || !puede || guardando === c.id}
                    placeholder="Sin cuenta contable"
                  />
                </div>
                <AnimatePresence initial={false}>
                  {c.compartida && (
                    <motion.p key="compartida" {...aparecer} className="text-caption text-warning sm:basis-full">
                      Esta cuenta contable también recibe lo de otra cuenta bancaria: el cierre no la compara con los libros.
                    </motion.p>
                  )}
                  {c.asientaLosRecibos === false && c.porQueNoAsientaLosRecibos && c.activa && (
                    <motion.p
                      key="sin-recibos"
                      {...aparecer}
                      className="text-caption text-fg-muted sm:basis-full"
                      data-testid={`cuenta-contable-sin-recibos-${c.id}`}
                    >
                      {c.porQueNoAsientaLosRecibos}
                    </motion.p>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
