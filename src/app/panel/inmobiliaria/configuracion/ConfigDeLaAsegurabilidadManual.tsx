'use client';

/**
 * Configuración → Medios de pago → «Asegurabilidad con tus aseguradoras» (Nico, 28-10-2026: «mientras tenemos lo de
 * automático de asegurabilidad deberíamos de tener esto»; la inmobiliaria «decide cuánto cobra por el estudio y a qué
 * cuenta» y escoge con qué aseguradoras trabaja). Prendida, el candidato ve en su postulación cuánto pagar y a qué
 * cuenta y sube el comprobante; la inmobiliaria lo acepta y marca qué aseguradora lo aprobó en la ficha del candidato.
 * Las aseguradoras salen de Pagos → Recaudo → Aseguradoras (las mismas de los siniestros).
 *
 * Cómo le pagan (Nico 28-10: «las dos formas»; 29-10: «se la giramos con su liquidación»): con comprobante a su cuenta,
 * en línea (Wompi, en la cuenta de Leasefy, que se lo gira con su liquidación) o las dos. «En línea» sólo aparece cuando
 * el back lo ofrece (`formasDisponibles`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CreditCard, ShieldCheck } from '@phosphor-icons/react';
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
  type FormaDePagoDelEstudio,
} from '@/lib/api/asegurabilidad-manual.service';

export function ConfigDeLaAsegurabilidadManual() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');
  const [datos, setDatos] = useState<ConfiguracionDeLaAsegurabilidadManual | null>(null);
  const [activa, setActiva] = useState(false);
  const [precio, setPrecio] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [aseguradoraIds, setAseguradoraIds] = useState<string[]>([]);
  const [formas, setFormas] = useState<FormaDePagoDelEstudio[]>(['COMPROBANTE']);
  const [guardando, setGuardando] = useState(false);

  const poner = (d: ConfiguracionDeLaAsegurabilidadManual) => {
    setDatos(d);
    setActiva(d.activa);
    setPrecio(d.precioCop ? String(d.precioCop) : '');
    setCuentaId(d.cuentaId ?? '');
    setAseguradoraIds(d.aseguradoraIds);
    setFormas(d.formas.length > 0 ? d.formas : ['COMPROBANTE']);
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
  const enLineaDisponible = datos.formasDisponibles.includes('WOMPI');
  const conComprobante = formas.includes('COMPROBANTE');
  const formasGuardadas: FormaDePagoDelEstudio[] = datos.formas.length > 0 ? datos.formas : ['COMPROBANTE'];
  const cambio =
    activa !== datos.activa ||
    (activa &&
      (Number(precio) !== (datos.precioCop ?? 0) ||
        cuentaId !== (datos.cuentaId ?? '') ||
        !mismaLista(aseguradoraIds, datos.aseguradoraIds) ||
        !mismaLista(formas, formasGuardadas)));
  const falta = !activa
    ? null
    : !(Number(precio) > 0)
      ? 'Escribe cuánto cobras por el estudio.'
      : formas.length === 0
        ? 'Escoge cómo te pagan.'
        : conComprobante && !cuentaId
          ? 'Escoge la cuenta a donde te pagan.'
          : aseguradoraIds.length === 0
            ? 'Escoge al menos una aseguradora.'
            : null;
  const cambiarForma = (forma: FormaDePagoDelEstudio, si: boolean) =>
    setFormas((lista) => (si ? [...lista.filter((f) => f !== forma), forma] : lista.filter((f) => f !== forma)));

  const guardar = async () => {
    setGuardando(true);
    try {
      poner(
        await asegurabilidadManualApi.guardarConfiguracion(
          activa
            ? {
                activa: true,
                precioCop: Math.trunc(Number(precio)), // redondeo: el campo ya es en pesos
                cuentaId: conComprobante ? cuentaId : null,
                formas,
                aseguradoraIds,
              }
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
          {enLineaDisponible
            ? 'Cobras el estudio al candidato: paga a tu cuenta y sube el comprobante, o paga en línea en su postulación. En la ficha del candidato aceptas el comprobante (el pago en línea se acepta solo y sale el recibo) y marcas qué aseguradora lo aprobó.'
            : 'Cobras el estudio al candidato: paga a tu cuenta y sube el comprobante en su postulación. En la ficha del candidato aceptas el pago (sale el recibo) y marcas qué aseguradora lo aprobó.'}
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
              {enLineaDisponible ? (
                <FilaDeAjuste
                  icono={CreditCard}
                  titulo="Cómo te pagan"
                  descripcion="En línea con tarjeta, PSE o Nequi: entra a la cuenta de Leasefy y te lo giramos con tu liquidación."
                >
                  <div className="flex flex-col gap-2" role="group" aria-label="Cómo te pagan">
                    <label className="flex items-center gap-2 text-body-sm text-fg">
                      <Checkbox
                        checked={conComprobante}
                        disabled={!puedeEditar}
                        onCheckedChange={(v) => cambiarForma('COMPROBANTE', v === true)}
                        data-testid="forma-COMPROBANTE"
                      />
                      Con comprobante, a tu cuenta
                    </label>
                    <label className="flex items-center gap-2 text-body-sm text-fg">
                      <Checkbox
                        checked={formas.includes('WOMPI')}
                        disabled={!puedeEditar}
                        onCheckedChange={(v) => cambiarForma('WOMPI', v === true)}
                        data-testid="forma-WOMPI"
                      />
                      En línea
                    </label>
                  </div>
                </FilaDeAjuste>
              ) : null}
              {conComprobante ? (
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
              ) : null}
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
