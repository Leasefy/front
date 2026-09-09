'use client';

/**
 * Los pasos del cajón de renovación y su riel de actividad.
 *
 * Cada paso pinta UNA cosa que la inmobiliaria tiene que hacer o esperar:
 * proponer un precio y mandarlo, saber si el inquilino aceptó, subir el
 * contrato firmado. Nada de tarjetas dentro de tarjetas ni de botones que no
 * hacen nada: lo que se ve, funciona.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Callout, KeyValueList } from '@leasefy/cadence';
import {
  CheckCircle,
  Clock,
  FileText,
  FlagCheckered,
  UploadSimple,
  Warning,
  WhatsappLogo,
  XCircle,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/ui/money-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Renovacion, RenovacionHistoryItem } from '@/lib/types/inmobiliaria';
import { getUrgencyColor } from '@/lib/types/inmobiliaria';
import { URL_IPC_DANE } from '@/lib/constants/inmobiliaria-data';
import {
  type CanalDeEnvio,
  canalDeEnvio,
  enlaceDeWhatsapp,
  etiquetaDeActividad,
  fechaCorta,
  fechaLarga,
  formatearPct,
  ipcSugerido,
  nuevoVencimiento,
  renovacionAceptada,
  textoDeActividad,
  topeConIpc,
  variacionDelCanon,
} from '@/lib/renovaciones/reglas';

// ============================================================================
// Piezas chicas
// ============================================================================

function Campo({
  id,
  etiqueta,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-fg">
        {etiqueta}
      </Label>
      {children}
      {ayuda ? <p className="text-xs text-fg-muted">{ayuda}</p> : null}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{children}</h3>
  );
}

/** «Vence el 1 de octubre de 2026 · en 23 días», con el tono del cajón de urgencia. */
export function ChipDeVencimiento({
  renovacion,
}: {
  renovacion: Pick<Renovacion, 'leaseEndDate' | 'daysUntilExpiry' | 'urgencyBucket'>;
}) {
  const { locale } = useI18n();
  const dias = renovacion.daysUntilExpiry;
  const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium',
        getUrgencyColor(renovacion.urgencyBucket),
      )}
      data-testid="renovacion-vence"
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
      Vence el {fechaLarga(renovacion.leaseEndDate, locale)} · {cuando}
    </span>
  );
}

function AvisoDeCanal({
  canal,
  correo,
  respondible,
}: {
  canal: CanalDeEnvio;
  correo: string | null;
  /** La inmobiliaria tiene correo: el inquilino sin cuenta puede contestar el suyo. */
  respondible: boolean;
}) {
  if (canal === 'panel_y_correo') {
    return (
      <p className="text-xs text-fg-muted" data-testid="renovacion-canal">
        Le llega a su panel de Leasefy{correo ? ` y a su correo (${correo})` : ''}. Desde el panel
        puede aceptar.
      </p>
    );
  }
  if (canal === 'correo_del_contrato') {
    return (
      <p className="text-xs text-fg-muted" data-testid="renovacion-canal">
        Este inquilino no tiene cuenta en Leasefy: la propuesta le llega al correo del contrato (
        {correo}){respondible ? ' y te responde contestándolo' : ''}. Su respuesta la registras tú
        en el paso siguiente.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1.5 text-xs text-warning" data-testid="renovacion-canal">
      <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Sin cuenta ni correo en el contrato: al enviar, la propuesta queda registrada acá. Hazla
      llegar por WhatsApp o copia el mensaje.
    </p>
  );
}

// ============================================================================
// Paso 1 — Propuesta
// ============================================================================

export function PasoPropuesta({
  renovacion,
  newRent,
  newAdminFee,
  ipcRate,
  message,
  editado,
  respondible,
  hoy,
  onNewRentChange,
  onNewAdminFeeChange,
  onIpcRateChange,
  onMessageChange,
  onRestaurarMensaje,
}: {
  renovacion: Renovacion;
  newRent: number;
  newAdminFee: number;
  /** El IPC lo escribe la inmobiliaria (DANE, año anterior). null = no lo puso. */
  ipcRate: number | null;
  message: string;
  editado: boolean;
  respondible: boolean;
  /** Qué día es hoy: decide si el IPC de la tabla sigue siendo el del año pasado. */
  hoy: Date;
  onNewRentChange: (value: number) => void;
  onNewAdminFeeChange: (value: number) => void;
  onIpcRateChange: (value: number | null) => void;
  onMessageChange: (texto: string) => void;
  onRestaurarMensaje: () => void;
}) {
  const { locale, formatCurrency, formatDate } = useI18n();
  const sugerido = ipcSugerido(hoy);
  const tope = ipcRate != null && ipcRate > 0 ? topeConIpc(renovacion.currentRent, ipcRate) : null;
  const variacion = variacionDelCanon(renovacion.currentRent, newRent);
  const superaElTope = tope != null && newRent > tope;
  const canal = canalDeEnvio(renovacion);
  const yaEnviada = renovacion.status !== 'pending' && Boolean(renovacion.notifiedAt);
  const currentAdminFee = renovacion.currentAdminFee ?? 0;

  const ayudaDelCanon = (() => {
    const actual = `Actual ${formatCurrency(renovacion.currentRent)}`;
    if (newRent <= 0 || variacion.pesos === 0) return `${actual} · sin cambio`;
    const signo = variacion.pesos > 0 ? '+' : '−';
    return `${actual} · ${signo}${formatCurrency(Math.abs(variacion.pesos))} (${signo}${formatearPct(Math.abs(variacion.pct), locale, 1)})`;
  })();

  return (
    <section className="space-y-6" data-testid="paso-propuesta">
      {yaEnviada ? (
        <Callout
          icon={<CheckCircle className="h-5 w-5 text-success" weight="fill" aria-hidden="true" />}
          title="Propuesta enviada"
          data-testid="propuesta-ya-enviada"
        >
          Salió el {formatDate(renovacion.notifiedAt as string)}. Si cambias el precio, envíala otra
          vez y el inquilino recibe la nueva.
        </Callout>
      ) : null}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
          <Campo id="renovacion-canon" etiqueta="Nuevo canon" ayuda={ayudaDelCanon}>
            <MoneyInput
              id="renovacion-canon"
              data-testid="renovacion-canon"
              value={newRent > 0 ? newRent : ''}
              onChange={(crudo) => onNewRentChange(Number(crudo) || 0)}
              placeholder={formatCurrency(renovacion.currentRent)}
              className="h-12 text-lg font-semibold"
            />
          </Campo>
          <Campo id="renovacion-ipc" etiqueta="IPC del año anterior">
            <div className="relative">
              <Input
                id="renovacion-ipc"
                data-testid="renovacion-ipc"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                value={ipcRate ?? ''}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  onIpcRateChange(Number.isFinite(n) && n >= 0 ? n : null);
                }}
                placeholder="Según el DANE"
                className="h-12 pr-8"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle"
              >
                %
              </span>
            </div>
          </Campo>
        </div>

        {/* El IPC dice hasta dónde se puede subir en vivienda. Se sugiere sólo
            el del año pasado; si la tabla no lo tiene, se pide, no se inventa. */}
        <div
          className="rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm"
          data-testid="renovacion-ipc-ayuda"
        >
          {tope != null && ipcRate != null ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {superaElTope ? (
                <p className="flex items-start gap-1.5 text-warning">
                  <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Supera el tope del IPC ({formatearPct(ipcRate, locale)}) por{' '}
                    {formatCurrency(newRent - tope)}. En vivienda el aumento no puede pasar del IPC
                    del año anterior (Ley 820, art. 20).
                  </span>
                </p>
              ) : (
                <p className="text-fg-muted">
                  Con IPC de {formatearPct(ipcRate, locale)} el canon queda en{' '}
                  <strong className="font-semibold text-fg">{formatCurrency(tope)}</strong>, el tope
                  legal en vivienda.
                </p>
              )}
              {newRent !== tope ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  hideArrow
                  onClick={() => onNewRentChange(tope)}
                  data-testid="renovacion-aplicar-ipc"
                >
                  Aplicar {formatCurrency(tope)}
                </Button>
              ) : null}
            </div>
          ) : sugerido ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-fg-muted">
                IPC de {sugerido.anio} según el DANE:{' '}
                <strong className="font-semibold text-fg">{formatearPct(sugerido.rate, locale)}</strong>
                . Es el tope legal de aumento en vivienda.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                hideArrow
                onClick={() => onIpcRateChange(sugerido.rate)}
                data-testid="renovacion-usar-ipc"
              >
                Usar {formatearPct(sugerido.rate, locale)}
              </Button>
            </div>
          ) : (
            <p className="text-fg-muted">
              El tope legal de aumento en vivienda es el IPC del año calendario anterior. Escribe el
              que publicó el DANE.{' '}
              <a
                href={URL_IPC_DANE}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-fg"
              >
                Ver en el DANE
              </a>
            </p>
          )}
        </div>

        <Campo
          id="renovacion-admin"
          etiqueta="Administración del conjunto"
          ayuda={
            currentAdminFee > 0
              ? `Actual ${formatCurrency(currentAdminFee)}`
              : 'Déjalo vacío si el inmueble no paga administración.'
          }
        >
          <MoneyInput
            id="renovacion-admin"
            data-testid="renovacion-admin"
            value={newAdminFee > 0 ? newAdminFee : ''}
            onChange={(crudo) => onNewAdminFeeChange(Number(crudo) || 0)}
            placeholder="Sin administración"
          />
        </Campo>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">Mensaje al inquilino</h3>
          <div className="flex items-center gap-1">
            {editado ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                hideArrow
                onClick={onRestaurarMensaje}
                data-testid="renovacion-restaurar"
              >
                Restaurar el sugerido
              </Button>
            ) : null}
            {renovacion.tenantPhone ? (
              <Button type="button" size="sm" variant="outline" hideArrow asChild>
                <a
                  href={enlaceDeWhatsapp(renovacion.tenantPhone, message)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="renovacion-whatsapp"
                >
                  <WhatsappLogo className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                hideArrow
                disabled
                title="El contrato no tiene teléfono del inquilino"
                data-testid="renovacion-whatsapp"
              >
                <WhatsappLogo className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/40 px-3.5 py-2.5">
          <Avatar name={renovacion.tenantName || '?'} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{renovacion.tenantName}</p>
            <p className="truncate text-xs text-fg-muted">
              {[renovacion.tenantEmail, renovacion.tenantPhone].filter(Boolean).join(' · ') ||
                'Sin correo ni teléfono en el contrato'}
            </p>
          </div>
        </div>

        <Textarea
          data-testid="renovacion-mensaje"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={9}
          className="text-sm leading-relaxed"
        />
        <AvisoDeCanal canal={canal} correo={renovacion.tenantEmail} respondible={respondible} />
      </div>
    </section>
  );
}

// ============================================================================
// Paso 2 — Aceptación
// ============================================================================

export function PasoAceptacion({
  renovacion,
  newRent,
  newAdminFee,
  registrando,
  onRegistrarAceptacion,
  onNoRenueva,
}: {
  renovacion: Renovacion;
  newRent: number;
  newAdminFee: number;
  registrando: boolean;
  onRegistrarAceptacion: () => void;
  onNoRenueva: () => void;
}) {
  const { formatCurrency, formatDate } = useI18n();
  const acepto = renovacionAceptada(renovacion);
  const canal = canalDeEnvio(renovacion);

  return (
    <section className="space-y-5" data-testid="paso-aceptacion">
      <KeyValueList
        compact
        items={[
          {
            label: 'Propuesta enviada',
            value: renovacion.notifiedAt ? formatDate(renovacion.notifiedAt) : '—',
          },
          { label: 'Nuevo canon', value: formatCurrency(newRent), valueColor: 'success' as const },
          ...(newAdminFee > 0
            ? [{ label: 'Administración', value: formatCurrency(newAdminFee) }]
            : []),
        ]}
      />

      {acepto ? (
        <Callout
          icon={<CheckCircle className="h-5 w-5 text-success" weight="fill" aria-hidden="true" />}
          title="El inquilino aceptó"
          data-testid="aceptacion-estado"
        >
          {renovacion.tenantAcceptedAt
            ? `Desde su panel, el ${formatDate(renovacion.tenantAcceptedAt)}.`
            : 'Quedó registrado desde acá.'}{' '}
          Sigue la firma del contrato.
        </Callout>
      ) : canal === 'panel_y_correo' ? (
        <Callout
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          title="Esperando al inquilino"
          data-testid="aceptacion-estado"
        >
          Puede aceptar desde su panel de Leasefy. Si te contestó por otro medio, regístralo acá.
        </Callout>
      ) : (
        <Callout
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          title="Esperando al inquilino"
          data-testid="aceptacion-estado"
        >
          No tiene cuenta en Leasefy, así que no acepta desde ningún panel: cuando te conteste,
          registra acá su respuesta.
        </Callout>
      )}

      {!acepto ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            isLoading={registrando}
            disabled={registrando}
            onClick={onRegistrarAceptacion}
            data-testid="aceptacion-acepto"
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            El inquilino aceptó
          </Button>
          <Button
            type="button"
            variant="ghost"
            hideArrow
            onClick={onNoRenueva}
            data-testid="aceptacion-no-renueva"
          >
            No renueva
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ============================================================================
// Paso 3 — Firma
// ============================================================================

export function PasoFirma({
  renovacion,
  newRent,
  newAdminFee,
  archivo,
  onArchivo,
  onAbrirDocumento,
}: {
  renovacion: Renovacion;
  newRent: number;
  newAdminFee: number;
  archivo: File | null;
  onArchivo: (archivo: File | null) => void;
  onAbrirDocumento: () => void;
}) {
  const { locale, formatCurrency } = useI18n();
  const vence = fechaLarga(nuevoVencimiento(renovacion.leaseEndDate), locale);

  return (
    <section className="space-y-5" data-testid="paso-firma">
      <KeyValueList
        compact
        items={[
          { label: 'Nuevo canon', value: formatCurrency(newRent), valueColor: 'success' as const },
          ...(newAdminFee > 0
            ? [{ label: 'Administración', value: formatCurrency(newAdminFee) }]
            : []),
          { label: 'Nuevo vencimiento', value: vence },
          { label: 'Inquilino', value: renovacion.tenantName },
        ]}
      />

      {renovacion.documentName ? (
        <Callout
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          title="Contrato firmado subido"
          data-testid="firma-documento"
        >
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="truncate">{renovacion.documentName}</span>
            <Button type="button" size="sm" variant="ghost" hideArrow onClick={onAbrirDocumento}>
              Abrir
            </Button>
          </span>
        </Callout>
      ) : null}

      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          archivo ? 'border-success/40 bg-success-soft' : 'border-border hover:border-fg-muted/40',
        )}
      >
        {archivo ? (
          <>
            <CheckCircle className="h-7 w-7 text-success" weight="fill" aria-hidden="true" />
            <span className="text-sm font-medium text-success">{archivo.name}</span>
            <span className="text-xs text-fg-muted">Toca para cambiarlo</span>
          </>
        ) : (
          <>
            <UploadSimple className="h-7 w-7 text-fg-muted" aria-hidden="true" />
            <span className="text-sm text-fg-muted">
              Arrastra el contrato firmado o toca para elegirlo
            </span>
            <span className="text-xs text-fg-subtle">PDF, JPG o PNG</span>
          </>
        )}
        {/* allowlist: hidden type=file behind a custom drag/click dropzone (playbook file-input allowlist) */}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          data-testid="firma-archivo"
          onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
        />
      </label>

      <p className="text-xs text-fg-muted">
        Al registrar la firma, el contrato, la consignación y el inmueble quedan con el nuevo canon
        y vencen el {vence}.
      </p>
    </section>
  );
}

// ============================================================================
// Cierres — completada y no renovada
// ============================================================================

export function PasoCompletada({
  renovacion,
  onAbrirDocumento,
}: {
  renovacion: Renovacion;
  onAbrirDocumento: () => void;
}) {
  const { locale, formatCurrency } = useI18n();
  const finalRent = renovacion.negotiatedRent || renovacion.proposedRent || renovacion.currentRent;
  const vence = fechaLarga(
    renovacion.newLeaseEndDate ?? nuevoVencimiento(renovacion.leaseEndDate),
    locale,
  );

  return (
    <section className="space-y-5" data-testid="paso-completada">
      <div className="py-2 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <FlagCheckered className="h-8 w-8 text-success" weight="fill" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-fg">Renovación completada</h3>
        <p className="mt-1 text-sm text-fg-muted">
          El contrato sigue hasta el {vence} con un canon de {formatCurrency(finalRent)}.
        </p>
      </div>
      <KeyValueList
        compact
        items={[
          { label: 'Inmueble', value: renovacion.propertyTitle },
          { label: 'Inquilino', value: renovacion.tenantName },
          { label: 'Nuevo canon', value: formatCurrency(finalRent), valueColor: 'success' as const },
          { label: 'Vence', value: vence },
        ]}
      />
      {renovacion.documentName ? (
        <Button type="button" variant="outline" hideArrow onClick={onAbrirDocumento}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          Ver contrato firmado
        </Button>
      ) : null}
    </section>
  );
}

export function PasoNoRenovada({
  renovacion,
  motivo,
}: {
  renovacion: Renovacion;
  motivo: string | null;
}) {
  const { locale } = useI18n();
  return (
    <section className="space-y-5" data-testid="paso-no-renovada">
      <Callout
        icon={<XCircle className="h-5 w-5 text-danger" weight="fill" aria-hidden="true" />}
        title="No se renueva"
      >
        {motivo ? `${motivo} ` : ''}El contrato actual sigue hasta el{' '}
        {fechaLarga(renovacion.leaseEndDate, locale)}.
      </Callout>
    </section>
  );
}

// ============================================================================
// Riel — contrato actual + actividad + notas
// ============================================================================

export function RielDeActividad({
  renovacion,
  historial,
  agregandoNota,
  onAddNote,
}: {
  renovacion: Renovacion;
  /** null mientras se lee el detalle. */
  historial: RenovacionHistoryItem[] | null;
  agregandoNota: boolean;
  onAddNote: (nota: string) => void | Promise<void>;
}) {
  const { locale, formatCurrency, formatDate } = useI18n();
  const [nota, setNota] = useState('');
  const currentAdminFee = renovacion.currentAdminFee ?? 0;

  const ordenado = [...(historial ?? [])].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  const enviar = async () => {
    const texto = nota.trim();
    if (!texto) return;
    await onAddNote(texto);
    setNota('');
  };

  return (
    <aside className="space-y-5" data-testid="renovacion-riel">
      <div className="rounded-lg border border-border bg-surface-muted/40 p-4">
        <div className="mb-2">
          <Rotulo>Contrato actual</Rotulo>
        </div>
        <KeyValueList
          compact
          noDividers
          items={[
            { label: 'Canon', value: formatCurrency(renovacion.currentRent) },
            ...(currentAdminFee > 0
              ? [{ label: 'Administración', value: formatCurrency(currentAdminFee) }]
              : []),
            // Son DATE, no instantes: `formatDate` los corría un día en Bogotá.
            { label: 'Inicio', value: fechaCorta(renovacion.leaseStartDate, locale) },
            { label: 'Vence', value: fechaCorta(renovacion.leaseEndDate, locale) },
          ]}
        />
        {/* Nombres y enlaces van como texto: en la lista de cifras el rótulo
            salía cortado y el nombre en monoespaciada. */}
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <p className="text-fg">
            <span className="text-fg-muted">Propietario · </span>
            {renovacion.propietarioName}
          </p>
          {renovacion.contractId ? (
            <Link
              href={`/panel/inmobiliaria/contratos/${renovacion.contractId}`}
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
              data-testid="riel-contrato"
            >
              {renovacion.contractCode != null
                ? `Ver el contrato #${renovacion.contractCode}`
                : 'Ver el contrato'}
            </Link>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-3">
          <Rotulo>Actividad</Rotulo>
        </div>
        {historial === null ? (
          <p className="text-sm text-fg-muted">Cargando…</p>
        ) : ordenado.length === 0 ? (
          <p className="text-sm text-fg-muted" data-testid="riel-vacio">
            Todavía no hay movimientos.
          </p>
        ) : (
          <ol className="space-y-3" data-testid="riel-actividad">
            {ordenado.map((item, i) => {
              const texto = textoDeActividad(item.action, item.description);
              return (
                <li key={item.id ?? `${item.action}-${i}`} className="relative pl-5">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary/70"
                  />
                  <p className="text-sm font-medium text-fg">{etiquetaDeActividad(item.action)}</p>
                  <p className="text-xs text-fg-muted">
                    {item.createdAt
                      ? formatDate(item.createdAt, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                    {item.actorName ? ` · ${item.actorName}` : ''}
                  </p>
                  {texto ? (
                    <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-fg-muted">
                      {texto}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <Textarea
            data-testid="riel-nota"
            rows={2}
            placeholder="Escribe una nota…"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            hideArrow
            className="w-full"
            disabled={!nota.trim() || agregandoNota}
            isLoading={agregandoNota}
            data-testid="riel-agregar-nota"
          >
            Agregar nota
          </Button>
        </form>
      </div>
    </aside>
  );
}

// ============================================================================
// Diálogo — no renovar
// ============================================================================

export function DialogoNoRenovar({
  abierto,
  confirmando,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  confirmando: boolean;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md" data-testid="dialogo-no-renovar">
        <DialogHeader>
          <DialogTitle>No renovar este contrato</DialogTitle>
          <DialogDescription>
            La renovación queda cerrada con el motivo. El contrato actual sigue hasta su vencimiento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-no-renovar">Motivo</Label>
          <Textarea
            id="motivo-no-renovar"
            data-testid="no-renovar-motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por ejemplo: el inquilino se muda en diciembre."
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" hideArrow onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            hideArrow
            disabled={!motivo.trim() || confirmando}
            isLoading={confirmando}
            onClick={() => onConfirmar(motivo.trim())}
            data-testid="no-renovar-confirmar"
          >
            No renovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
