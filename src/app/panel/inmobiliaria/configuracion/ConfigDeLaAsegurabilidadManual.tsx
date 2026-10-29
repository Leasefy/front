'use client';

/**
 * Configuración → Medios de pago → «Asegurabilidad con tus aseguradoras» (Nico, 28-10-2026: «mientras tenemos lo de
 * automático de asegurabilidad deberíamos de tener esto»; la inmobiliaria «decide cuánto cobra por el estudio y a qué
 * cuenta» y escoge con qué aseguradoras trabaja). Prendida, el candidato ve en su postulación cuánto pagar y a qué
 * cuenta y sube el comprobante; la inmobiliaria lo acepta y marca qué aseguradora lo aprobó en la ficha del candidato.
 * Las aseguradoras salen de Pagos → Recaudo → Aseguradoras (las mismas de los siniestros).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { FilaDeAjuste, TarjetaDeAjustes } from './piezas';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  asegurabilidadManualApi,
  type ConfiguracionDeLaAsegurabilidadManual,
} from '@/lib/api/asegurabilidad-manual.service';

export function ConfigDeLaAsegurabilidadManual() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');
  const [datos, setDatos] = useState<ConfiguracionDeLaAsegurabilidadManual | null>(null);
  const [activa, setActiva] = useState(false);
  const [precio, setPrecio] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [aseguradoraIds, setAseguradoraIds] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const poner = (d: ConfiguracionDeLaAsegurabilidadManual) => {
    setDatos(d);
    setActiva(d.activa);
    setPrecio(d.precioCop ? String(d.precioCop) : '');
    setCuentaId(d.cuentaId ?? '');
    setAseguradoraIds(d.aseguradoraIds);
  };
  const cargar = useCallback(async () => {
    try {
      poner(await asegurabilidadManualApi.configuracion());
    } catch {
      setDatos(null);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const activas = useMemo(() => (datos?.aseguradoras ?? []).filter((a) => a.activa), [datos]);
  if (!datos) return null;

  const mismaLista = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const cambio =
    activa !== datos.activa ||
    (activa &&
      (Number(precio) !== (datos.precioCop ?? 0) || cuentaId !== (datos.cuentaId ?? '') || !mismaLista(aseguradoraIds, datos.aseguradoraIds)));
  const falta = !activa
    ? null
    : !(Number(precio) > 0)
      ? 'Escribe cuánto cobras por el estudio.'
      : !cuentaId
        ? 'Escoge la cuenta a donde te pagan.'
        : aseguradoraIds.length === 0
          ? 'Escoge al menos una aseguradora.'
          : null;

  const guardar = async () => {
    setGuardando(true);
    try {
      poner(
        await asegurabilidadManualApi.guardarConfiguracion(
          activa
            ? { activa: true, precioCop: Math.trunc(Number(precio)), cuentaId, formas: ['COMPROBANTE'], aseguradoraIds } // redondeo: el campo ya es en pesos
            : { activa: false },
        ),
      );
      toast.success(activa ? 'Listo: tus candidatos ya ven cuánto pagar y a qué cuenta.' : 'Listo: la asegurabilidad manual quedó apagada.');
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo guardar.', accion: 'guardar la asegurabilidad manual' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4 pt-6" data-testid="config-asegurabilidad-manual">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-base font-medium text-fg">
          <ShieldCheck className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          Asegurabilidad con tus aseguradoras
        </h3>
        <p className="text-sm text-fg-muted">
          Cobras el estudio al candidato: paga a tu cuenta y sube el comprobante en su postulación. En la ficha del
          candidato aceptas el pago (sale el recibo) y marcas qué aseguradora lo aprobó.
        </p>
      </div>
      {!datos.disponible ? (
        <div role="alert" className="rounded-xl bg-warning-soft px-3 py-2 text-caption text-fg">
          Todavía no se puede prender: Leasefy tiene pendiente una actualización.
        </div>
      ) : (
        <TarjetaDeAjustes>
          <FilaDeAjuste
            icono={ShieldCheck}
            titulo="Cobrar el estudio y marcar la asegurabilidad a mano"
            descripcion="Mientras llega la asegurabilidad automática."
          >
            <Switch
              checked={activa}
              disabled={!puedeEditar}
              onCheckedChange={(v: boolean) => setActiva(v)}
              aria-label="Cobrar el estudio y marcar la asegurabilidad a mano"
              data-testid="asegurabilidad-manual-activa"
            />
          </FilaDeAjuste>
          {activa ? (
            <>
              <FilaDeAjuste icono={ShieldCheck} titulo="Cuánto cobras por el estudio" descripcion="Le sirve al candidato para cualquier inmueble tuyo mientras esté vigente.">
                <MoneyInput
                  className="w-40"
                  value={precio}
                  disabled={!puedeEditar}
                  onChange={setPrecio}
                  aria-label="Cuánto cobras por el estudio"
                  data-testid="precio-del-estudio"
                />
              </FilaDeAjuste>
              <FilaDeAjuste
                icono={ShieldCheck}
                titulo="A qué cuenta te pagan"
                descripcion={datos.cuentas.length === 0 ? 'Primero agrega una cuenta arriba, en tus medios de pago.' : 'El candidato ve el número completo para poder transferir.'}
              >
                <Select value={cuentaId} onValueChange={setCuentaId} disabled={!puedeEditar || datos.cuentas.length === 0}>
                  <SelectTrigger className="w-64" aria-label="A qué cuenta te pagan" data-testid="cuenta-del-estudio">
                    <SelectValue placeholder="Escoge la cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {datos.cuentas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {[c.nombre, c.banco, c.numeroEnmascarado].filter(Boolean).join(' · ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilaDeAjuste>
            </>
          ) : null}
        </TarjetaDeAjustes>
      )}

      <Presence show={datos.disponible && activa} direction="down">
        <div className="space-y-2">
          <p className="text-sm text-fg">Con qué aseguradoras trabajas</p>
          {activas.length === 0 ? (
            <p className="text-caption text-fg-muted">
              Todavía no tienes aseguradoras.{' '}
              <Link href="/panel/inmobiliaria/pagos/recaudo/aseguradoras" className="text-primary underline-offset-4 hover:underline">
                Agrégalas aquí
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Con qué aseguradoras trabajas">
              {activas.map((a) => (
                <li key={a.id}>
                  <label className="flex items-center gap-2 text-body-sm text-fg">
                    <Checkbox
                      checked={aseguradoraIds.includes(a.id)}
                      disabled={!puedeEditar}
                      onCheckedChange={(v) =>
                        setAseguradoraIds((lista) => (v === true ? [...lista.filter((x) => x !== a.id), a.id] : lista.filter((x) => x !== a.id)))
                      }
                      data-testid={`aseguradora-${a.id}`}
                    />
                    {a.nombre}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Presence>

      {puedeEditar && datos.disponible ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {cambio && falta ? <span className="text-caption text-fg-muted">{falta}</span> : null}
          <Button variant="outline" hideArrow isLoading={guardando} disabled={!cambio || Boolean(falta) || guardando} onClick={() => void guardar()} data-testid="guardar-asegurabilidad-manual">
            Guardar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
