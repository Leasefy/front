'use client';

/**
 * LA ASEGURABILIDAD MANUAL en la ficha del candidato (Nico, 28-10-2026: «mientras tenemos lo de automático de
 * asegurabilidad deberíamos de tener esto»). Lo que hace la inmobiliaria aquí, en orden:
 *   1. ve el comprobante que subió el candidato y lo acepta (sale el recibo del estudio, como siempre) o lo rechaza
 *      con el motivo (el candidato sube otro);
 *   2. hecho el estudio con cada aseguradora, marca «Aprobado» o «No aprobado» y, si la aseguradora lo dijo, el
 *      máximo afianzable.
 * Sin la asegurabilidad manual prendida y sin nada guardado, no se pinta. Lo configura Configuración → Asegurabilidad.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, FileText, XCircle } from '@phosphor-icons/react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/components/ui/toast';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import {
  asegurabilidadManualApi,
  type AsegurabilidadDeLaPostulacion,
  type ResultadoDeLaAseguradora,
} from '@/lib/api/asegurabilidad-manual.service';
import { useLocaleDeFechas, useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';

const TONO = { POR_REVISAR: 'info', ACEPTADO: 'success', RECHAZADO: 'warning' } as const;
const ESTADO = { POR_REVISAR: 'Por revisar', ACEPTADO: 'Pago aceptado', RECHAZADO: 'Rechazado' } as const;

export function AsegurabilidadManualDeLaPostulacion({ applicationId }: { applicationId: string }) {
  const tr = useTr();
  const fechas = useLocaleDeFechas();
  const permisos = usePermissionsContextSafe();
  // Fuera del panel de la inmobiliaria (el propietario directo) no hay permisos de agencia: sólo se mira.
  const puedeCobrar = permisos?.canAccess('cobros', 'create') ?? false;
  const puedeMarcar = permisos?.canAccess('portafolio', 'edit') ?? false;
  const [datos, setDatos] = useState<AsegurabilidadDeLaPostulacion | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [maximos, setMaximos] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    try {
      setDatos(await asegurabilidadManualApi.deLaPostulacion(applicationId));
    } catch {
      setDatos(null);
    }
  }, [applicationId]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hacer = async (clave: string, accion: () => Promise<AsegurabilidadDeLaPostulacion>, listo: string) => {
    setHaciendo(clave);
    try {
      setDatos(await accion());
      toast.success(tr(listo));
      return true;
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo guardar.'), accion: tr('guardar la asegurabilidad') }));
      return false;
    } finally {
      setHaciendo(null);
    }
  };

  if (!permisos || !datos || !datos.disponible) return null;
  const hayAlgo = datos.activa || datos.comprobante !== null || datos.aseguradoras.some((a) => a.resultado);
  if (!hayAlgo) return null;

  const dia = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(fechas, { timeZone: 'America/Bogota', day: 'numeric', month: 'short' }).format(new Date(iso)) : '';
  const c = datos.comprobante;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-testid="asegurabilidad-manual">
      <div className="space-y-0.5">
        <p className="text-body-sm text-fg">{tr('Asegurabilidad con tus aseguradoras')}</p>
        {datos.precioCop ? (
          <p className="text-caption text-fg-muted">
            {tr('El estudio cuesta')} <span className="font-mono tabular-nums">{formatCurrency(datos.precioCop)}</span>
            {datos.estudioVigente?.vigente ? ` · ${tr('ya está pagado y vigente')}` : ''}
          </p>
        ) : null}
      </div>

      {c ? (
        <div className="space-y-2" data-testid="comprobante-del-estudio">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={TONO[c.estado]}>{c.enLinea ? tr('Pagado en línea') : tr(ESTADO[c.estado])}</StatusBadge>
            {c.enLinea ? (
              <span className="text-caption text-fg-muted">
                {c.revisadoAt ? `${dia(c.revisadoAt)} · ` : ''}
                {tr('Leasefy te lo gira con tu liquidación.')}
              </span>
            ) : null}
            {c.subidoAt ? <span className="text-caption text-fg-muted">{tr('Subido el')} {dia(c.subidoAt)}</span> : null}
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-caption text-primary underline-offset-4 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {tr('Ver el comprobante')}
              </a>
            ) : null}
          </div>
          {c.estado === 'RECHAZADO' && c.motivo ? (
            <p className="text-caption text-fg-muted">
              {tr('Motivo')}: {c.motivo}
            </p>
          ) : null}
          {c.estado === 'POR_REVISAR' && puedeCobrar ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  isLoading={haciendo === 'aceptar'}
                  disabled={haciendo !== null}
                  onClick={() => void hacer('aceptar', () => asegurabilidadManualApi.aceptar(applicationId), 'Listo: el pago quedó registrado con su recibo.')}
                  data-testid="aceptar-comprobante"
                >
                  {tr('Aceptar el pago')}
                </Button>
                <Button size="sm" variant="ghost" hideArrow disabled={haciendo !== null} onClick={() => setRechazando((v) => !v)}>
                  {tr('Rechazar')}
                </Button>
              </div>
              <Presence show={rechazando} direction="down">
                <div className="space-y-2">
                  <label htmlFor={`motivo-${applicationId}`} className="text-caption text-fg-muted">
                    {tr('Dile al candidato por qué no sirve (lo lee en su postulación)')}
                  </label>
                  <textarea
                    id={`motivo-${applicationId}`}
                    rows={2}
                    maxLength={300}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface p-2 text-body-sm text-fg placeholder:text-fg-placeholder"
                    placeholder={tr('Por ejemplo: no se ve el valor transferido.')}
                    data-testid="motivo-del-rechazo"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    hideArrow
                    isLoading={haciendo === 'rechazar'}
                    disabled={haciendo !== null || motivo.trim().length < 5}
                    onClick={async () => {
                      const ok = await hacer('rechazar', () => asegurabilidadManualApi.rechazar(applicationId, motivo.trim()), 'Listo: le avisamos al candidato que suba otro.');
                      if (ok) {
                        setRechazando(false);
                        setMotivo('');
                      }
                    }}
                    data-testid="enviar-rechazo"
                  >
                    {tr('Rechazar con este motivo')}
                  </Button>
                </div>
              </Presence>
            </div>
          ) : null}
        </div>
      ) : datos.activa && !datos.estudioVigente?.vigente ? (
        <p className="text-caption text-fg-muted">{tr('El candidato todavía no sube el comprobante del pago.')}</p>
      ) : null}

      {datos.aseguradoras.length > 0 ? (
        <ul className="space-y-2" aria-label={tr('Resultado de cada aseguradora')}>
          {datos.aseguradoras.map((a) => {
            const r = a.resultado;
            const marcar = (estado: ResultadoDeLaAseguradora | null, maximo?: number | null) =>
              hacer(
                `marcar-${a.id}`,
                () => asegurabilidadManualApi.marcar(applicationId, a.id, { estado, maximoAfianzableCop: maximo ?? r?.maximoAfianzableCop ?? null }),
                estado ? 'Listo: el resultado quedó marcado.' : 'Listo: se quitó el resultado.',
              );
            const escrito = maximos[a.id] ?? (r?.maximoAfianzableCop ? String(r.maximoAfianzableCop) : '');
            return (
              <li key={a.id} className="space-y-2 rounded-md bg-surface-muted p-2.5" data-testid={`aseguradora-${a.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-caption text-fg">{a.nombre}</span>
                  <div className="flex gap-1" role="group" aria-label={`${tr('Resultado de')} ${a.nombre}`}>
                    {(['APROBADO', 'NO_APROBADO'] as const).map((e) => {
                      const activo = r?.estado === e;
                      return (
                        <button
                          key={e}
                          type="button"
                          aria-pressed={activo}
                          disabled={!puedeMarcar || haciendo !== null}
                          onClick={() => void marcar(activo ? null : e)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-caption transition-colors disabled:opacity-60',
                            activo
                              ? e === 'APROBADO'
                                ? 'border-success/30 bg-success-soft text-fg'
                                : 'border-danger/30 bg-danger-soft text-fg'
                              : 'border-border bg-surface text-fg-muted hover:text-fg',
                          )}
                          data-testid={`marcar-${a.id}-${e}`}
                        >
                          {e === 'APROBADO' ? (
                            <CheckCircle className={cn('h-3.5 w-3.5', activo && 'text-success')} aria-hidden="true" />
                          ) : (
                            <XCircle className={cn('h-3.5 w-3.5', activo && 'text-danger')} aria-hidden="true" />
                          )}
                          {tr(e === 'APROBADO' ? 'Aprobado' : 'No aprobado')}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {r?.estado === 'APROBADO' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`maximo-${a.id}`} className="text-caption text-fg-muted">
                      {tr('Máximo afianzable')}
                    </label>
                    <MoneyInput
                      id={`maximo-${a.id}`}
                      className="w-36"
                      value={escrito}
                      disabled={!puedeMarcar}
                      onChange={(v) => setMaximos((m) => ({ ...m, [a.id]: v }))}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      hideArrow
                      disabled={!puedeMarcar || haciendo !== null || !(Number(escrito) > 0) || Number(escrito) === r.maximoAfianzableCop}
                      onClick={() => void marcar('APROBADO', Math.trunc(Number(escrito)))} // redondeo: no es un cálculo, el campo ya es en pesos
                      data-testid={`guardar-maximo-${a.id}`}
                    >
                      {tr('Guardar')}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {datos.maximoAfianzableCop ? (
        <p className="text-caption text-fg-muted" data-testid="maximo-afianzable">
          {tr('Máximo afianzable')}: <span className="font-mono tabular-nums text-fg">{formatCurrency(datos.maximoAfianzableCop)}</span>
        </p>
      ) : null}
    </div>
  );
}
