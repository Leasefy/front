'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Clock,
  User,
  House,
  ChatCircle,
  Warning,
  Envelope,
  WhatsappLogo,
  Upload,
  FileText,
  TrendUp,
  Check,
  X,
  ArrowRight,
  CheckCircle,
  PenNib,
  FlagCheckered,
} from '@phosphor-icons/react';
import type {
  Renovacion,
  RenovacionStatus,
} from '@/lib/types/inmobiliaria';
import {
  getRenovacionStatusColor,
  getRenovacionStatusLabel,
  formatCurrency,
} from '@/lib/types/inmobiliaria';
import { calculateNewRent } from '@/lib/constants/inmobiliaria-data';

// ============================================================================
// Types
// ============================================================================

export type WorkflowStep = {
  status: RenovacionStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
};

// ============================================================================
// Stepper Component
// ============================================================================

export function WorkflowStepper({
  currentStatus,
  onStepClick,
  steps,
}: {
  currentStatus: RenovacionStatus;
  onStepClick: (status: RenovacionStatus) => void;
  steps: WorkflowStep[];
}) {
  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
      <div
        className="absolute top-5 left-0 h-0.5 bg-success transition-all duration-300"
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = index <= currentIndex;

          return (
            // allowlist: clickable wizard step-navigator (icon-per-step circle + label-below,
            // done/active/upcoming state). Cadence Stepper is display-only (non-clickable nav,
            // numbered, side labels) — can't model this. Native kept, tokens cleaned (emerald→success).
            <button
              key={step.status}
              onClick={() => isClickable && onStepClick(step.status)}
              disabled={!isClickable}
              className={`flex flex-col items-center gap-2 group ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-success text-white ring-4 ring-success/30'
                    : 'bg-surface-muted text-fg-muted'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" weight="bold" /> : step.icon}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-medium ${
                    isCurrent
                      ? 'text-success'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Step Content Components
// ============================================================================

export function StepRevision({
  renovacion,
  newRent,
  newAdminFee,
  onNewRentChange,
  onNewAdminFeeChange,
  onContinue,
}: {
  renovacion: Renovacion;
  newRent: number;
  newAdminFee: number;
  onNewRentChange: (value: number) => void;
  onNewAdminFeeChange: (value: number) => void;
  onContinue: () => void;
}) {
  const { t, locale } = useI18n();
  const parseMoney = (v: string) => parseInt(v.replace(/[^\d]/g, '')) || 0;
  const fmtInput = (n: number) =>
    n > 0 ? n.toLocaleString(locale === 'es' ? 'es-CO' : 'en-US') : '';

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {/* Property Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <House className="h-4 w-4" />
              {t('inmobiliaria.operaciones.renovacion.revision.property')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{renovacion.propertyTitle}</p>
            <p className="text-sm text-muted-foreground">{renovacion.propertyAddress}</p>
          </CardContent>
        </Card>

        {/* Tenant Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('inmobiliaria.operaciones.renovacion.revision.tenant')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{renovacion.tenantName}</p>
            <p className="text-sm text-muted-foreground">{renovacion.tenantPhone}</p>
            <p className="text-sm text-muted-foreground">{renovacion.tenantEmail}</p>
          </CardContent>
        </Card>

        {/* Contract Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('inmobiliaria.operaciones.renovacion.revision.currentContract')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.revision.startDate')}</span>
              <span>{new Date(renovacion.leaseStartDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.revision.expiryDate')}</span>
              <span className="font-medium text-warning">
                {new Date(renovacion.leaseEndDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.revision.currentRent')}</span>
              <span className="font-medium">{formatCurrency(renovacion.currentRent)}</span>
            </div>
          </CardContent>
        </Card>

        {/* New price — set by the AGENCY. IPC is only a suggestion. */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendUp className="h-4 w-4" />
              Propuesta de renovación (la define la inmobiliaria)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revNewRent">Nuevo canon</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="revNewRent"
                  value={fmtInput(newRent)}
                  onChange={(e) => onNewRentChange(parseMoney(e.target.value))}
                  placeholder={formatCurrency(renovacion.currentRent)}
                  className="pl-8 text-lg font-semibold"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Actual: {formatCurrency(renovacion.currentRent)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revNewAdmin">Administración del conjunto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="revNewAdmin"
                  value={fmtInput(newAdminFee)}
                  onChange={(e) => onNewAdminFeeChange(parseMoney(e.target.value))}
                  placeholder="Sin administración"
                  className="pl-8"
                />
              </div>
              {(renovacion.currentAdminFee ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Actual: {formatCurrency(renovacion.currentAdminFee ?? 0)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onContinue} className="w-full" size="lg" disabled={newRent <= 0}>
        {t('inmobiliaria.operaciones.renovacion.revision.continue')}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

/** «31 de diciembre de 2026» leyendo la parte YYYY-MM-DD (DATE = medianoche UTC). */
function fechaLarga(iso: string, locale: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = partes
    ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
    : new Date(iso);
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function StepNotification({
  renovacion,
  newRent,
  newAdminFee,
  ipcRate,
  agencyName,
  onNewRentChange,
  onNewAdminFeeChange,
  onIpcRateChange,
  onNotify,
}: {
  renovacion: Renovacion;
  newRent: number;
  newAdminFee: number;
  /** El IPC lo ingresa la inmobiliaria (DANE, año anterior). null = no lo puso. */
  ipcRate: number | null;
  /** Con qué se firma el mensaje. Vacío mientras carga. */
  agencyName: string;
  onNewRentChange: (value: number) => void;
  onNewAdminFeeChange: (value: number) => void;
  onIpcRateChange: (value: number | null) => void;
  onNotify: (channel: 'email' | 'whatsapp', message: string) => void;
}) {
  const { t, locale } = useI18n();
  /*
   * El IPC NO viene de una tabla escrita en el código (había una que
   * terminaba en diciembre de 2024 y se mostraba como «sugerido» dos años
   * después). El tope legal de aumento en vivienda es el IPC del año
   * calendario anterior (Ley 820, art. 20); lo publica el DANE y lo escribe
   * la inmobiliaria. Sin IPC no hay sugerencia: se dice, no se inventa.
   */
  const suggestedRent =
    ipcRate != null && ipcRate > 0 ? calculateNewRent(renovacion.currentRent, ipcRate) : null;
  const parseMoney = (v: string) => parseInt(v.replace(/[^\d]/g, '')) || 0;
  const fmtInput = (n: number) =>
    n > 0 ? n.toLocaleString(locale === 'es' ? 'es-CO' : 'en-US') : '';

  const defaultMessage = `Estimado/a ${renovacion.tenantName},

Le informamos que su contrato de arrendamiento del inmueble ubicado en ${renovacion.propertyAddress} vence el ${fechaLarga(renovacion.leaseEndDate, locale)}.

El nuevo canon propuesto para la renovación es de ${formatCurrency(newRent)}.

Por favor confirme si desea renovar el contrato.

Atentamente,
${agencyName || ''}`.trimEnd();

  const [message, setMessage] = useState(defaultMessage);
  const [editado, setEditado] = useState(false);
  // El nombre de la inmobiliaria llega después y el canon se cambia arriba:
  // mientras la persona no haya tocado el texto, el mensaje sigue al dato.
  useEffect(() => {
    if (!editado) setMessage(defaultMessage);
  }, [defaultMessage, editado]);

  return (
    <div className="space-y-4">
      {/* Proposed price — set by the agency */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Propuesta (la define la inmobiliaria)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="propIpc">IPC del año anterior (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="propIpc"
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
                className="w-32"
                data-testid="renovacion-ipc"
              />
              {suggestedRent ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => onNewRentChange(suggestedRent)}
                  data-testid="renovacion-aplicar-ipc"
                >
                  Aplicar al canon: {formatCurrency(suggestedRent)}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              El tope legal de aumento en vivienda es el IPC del año calendario
              anterior. El sistema no lo trae solo: escribí el que publicó el DANE.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="propNewRent">Nuevo canon</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="propNewRent"
                value={fmtInput(newRent)}
                onChange={(e) => onNewRentChange(parseMoney(e.target.value))}
                placeholder={formatCurrency(renovacion.currentRent)}
                className="pl-8 text-lg font-semibold"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Actual: {formatCurrency(renovacion.currentRent)}
              {suggestedRent ? ` · Con IPC ${ipcRate}%: ${formatCurrency(suggestedRent)}` : ''}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="propNewAdmin">Administración del conjunto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="propNewAdmin"
                value={fmtInput(newAdminFee)}
                onChange={(e) => onNewAdminFeeChange(parseMoney(e.target.value))}
                placeholder="Sin administración"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipient */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.notification.recipient')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center">
              <User className="h-5 w-5 text-fg-muted" />
            </div>
            <div>
              <p className="font-medium">{renovacion.tenantName}</p>
              <p className="text-sm text-muted-foreground">{renovacion.tenantEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Message */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.notification.messagePreview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => {
              setEditado(true);
              setMessage(e.target.value);
            }}
            rows={10}
            className="text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setEditado(false);
              setMessage(defaultMessage);
            }}
            className="text-xs text-muted-foreground hover:text-fg underline-offset-2 hover:underline"
          >
            Restaurar mensaje sugerido
          </button>
        </CardContent>
      </Card>

      {/* Send Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => onNotify('email', message)}
          disabled={!message.trim()}
          className="flex items-center gap-2"
        >
          <Envelope className="h-4 w-4" />
          {t('inmobiliaria.operaciones.renovacion.notification.sendEmail')}
        </Button>
        <Button
          variant="outline"
          onClick={() => onNotify('whatsapp', message)}
          disabled={!message.trim()}
          className="flex items-center gap-2 border-success/30 text-success hover:bg-success-soft"
        >
          <WhatsappLogo className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Se enviará por email y a la página del inquilino. WhatsApp abre el chat con el mensaje listo.
      </p>
    </div>
  );
}

export function StepAceptacion({
  renovacion,
  onContinue,
}: {
  renovacion: Renovacion;
  onContinue: () => void;
}) {
  const accepted = !!renovacion.tenantAcceptedAt;
  const finalRent = renovacion.negotiatedRent || renovacion.proposedRent || renovacion.currentRent;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Propuesta enviada al inquilino</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inquilino</span>
            <span className="font-medium">{renovacion.tenantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nuevo canon</span>
            <span className="font-semibold text-success">{formatCurrency(finalRent)}</span>
          </div>
        </CardContent>
      </Card>
      <Card className={accepted ? 'border-success/30 bg-success-soft' : ''}>
        <CardContent className="pt-4">
          {accepted ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" weight="fill" />
              <span className="font-medium">El inquilino aceptó la renovación</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-fg-muted">
              <Clock className="h-5 w-5" />
              <span>Esperando que el inquilino acepte desde su panel…</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Button className="w-full" size="lg" disabled={!accepted} onClick={onContinue}>
        <ArrowRight className="h-4 w-4 mr-2" />
        Continuar a la firma del contrato
      </Button>
    </div>
  );
}

export function StepNegotiation({
  renovacion,
  newRent,
  newAdminFee,
  onNewRentChange,
  onNewAdminFeeChange,
  onAccept,
  onContinueNegotiation,
}: {
  renovacion: Renovacion;
  newRent: number;
  newAdminFee: number;
  onNewRentChange: (value: number) => void;
  onNewAdminFeeChange: (value: number) => void;
  onAccept: () => void;
  onContinueNegotiation: (note: string) => void;
}) {
  const { t, locale } = useI18n();
  const [note, setNote] = useState<string>('');
  const currentAdminFee = renovacion.currentAdminFee ?? 0;
  const parseMoney = (v: string) => parseInt(v.replace(/[^\d]/g, '')) || 0;
  const fmtInput = (n: number) =>
    n > 0 ? n.toLocaleString(locale === 'es' ? 'es-CO' : 'en-US') : '';

  return (
    <div className="space-y-4">
      {/* New rent — controlled by the workflow (set in Revisión, adjustable here) */}
      <div className="space-y-2">
        <Label htmlFor="negNewRent">Nuevo canon (lo define la inmobiliaria)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="negNewRent"
            value={fmtInput(newRent)}
            onChange={(e) => onNewRentChange(parseMoney(e.target.value))}
            placeholder={formatCurrency(renovacion.currentRent)}
            className="pl-8 text-lg font-semibold"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Actual: {formatCurrency(renovacion.currentRent)}
        </p>
      </div>

      {/* Building administration fee (administración del conjunto) */}
      <div className="space-y-2">
        <Label htmlFor="negNewAdmin">Administración del conjunto</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="negNewAdmin"
            value={fmtInput(newAdminFee)}
            onChange={(e) => onNewAdminFeeChange(parseMoney(e.target.value))}
            placeholder="Sin administración"
            className="pl-8"
          />
        </div>
        {currentAdminFee > 0 && (
          <p className="text-xs text-muted-foreground">Actual: {formatCurrency(currentAdminFee)}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="negotiationNote">{t('inmobiliaria.operaciones.renovacion.negotiation.negotiationNotes')}</Label>
        <Textarea
          id="negotiationNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('inmobiliaria.operaciones.renovacion.negotiation.negotiationPlaceholder')}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => onContinueNegotiation(note)}
          disabled={!note.trim()}
        >
          <ChatCircle className="h-4 w-4 mr-2" />
          {t('inmobiliaria.operaciones.renovacion.negotiation.continueNegotiating')}
        </Button>
        <Button onClick={onAccept} disabled={newRent <= 0}>
          <CheckCircle className="h-4 w-4 mr-2" />
          {t('inmobiliaria.operaciones.renovacion.negotiation.acceptProposal')}
        </Button>
      </div>
    </div>
  );
}

export function StepApproval({
  renovacion,
  onOwnerApproved,
  onTenantApproved,
}: {
  renovacion: Renovacion;
  onOwnerApproved: () => void;
  onTenantApproved: () => void;
}) {
  const { t } = useI18n();
  const [ownerApproved, setOwnerApproved] = useState(false);
  // The tenant acceptance is READ-ONLY here — it comes from the tenant's own
  // panel. The agency cannot accept on the tenant's behalf.
  const tenantApproved = !!renovacion.tenantAcceptedAt;
  const finalRent = renovacion.negotiatedRent || renovacion.proposedRent || renovacion.currentRent;

  return (
    <div className="space-y-4">
      {/* Final Terms Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.approval.finalTerms')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.newRent')}</span>
            <span className="font-bold text-success">{formatCurrency(finalRent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.increase')}</span>
            <span>+{formatCurrency(finalRent - renovacion.currentRent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.term')}</span>
            <span>{t('inmobiliaria.operaciones.renovacion.approval.termMonths')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Approval Status */}
      <div className="space-y-3">
        <Card className={`transition-colors ${ownerApproved ? 'border-success/30 bg-success-soft' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  ownerApproved ? 'bg-success-soft' : 'bg-surface-muted'
                }`}>
                  <User className={`h-5 w-5 ${ownerApproved ? 'text-success' : 'text-fg-muted'}`} />
                </div>
                <div>
                  <p className="font-medium">{renovacion.propietarioName}</p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.ownerLabel')}</p>
                </div>
              </div>
              {ownerApproved ? (
                <Badge className="bg-success-soft text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('inmobiliaria.operaciones.renovacion.approval.approved')}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setOwnerApproved(true);
                    onOwnerApproved();
                  }}
                >
                  {t('inmobiliaria.operaciones.renovacion.approval.approve')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`transition-colors ${tenantApproved ? 'border-success/30 bg-success-soft' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  tenantApproved ? 'bg-success-soft' : 'bg-surface-muted'
                }`}>
                  <User className={`h-5 w-5 ${tenantApproved ? 'text-success' : 'text-fg-muted'}`} />
                </div>
                <div>
                  <p className="font-medium">{renovacion.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.tenantLabel')}</p>
                </div>
              </div>
              {tenantApproved ? (
                <Badge className="bg-success-soft text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('inmobiliaria.operaciones.renovacion.approval.approved')}
                </Badge>
              ) : (
                <Badge className="bg-surface-muted text-fg-muted">
                  <Clock className="h-3 w-3 mr-1" />
                  Esperando al inquilino
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!tenantApproved && (
        <p className="text-xs text-fg-muted text-center">
          El inquilino debe aceptar la propuesta desde su panel para poder continuar.
        </p>
      )}

      {ownerApproved && tenantApproved && (
        <Button className="w-full" size="lg" onClick={onTenantApproved}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Continuar a la firma
        </Button>
      )}
    </div>
  );
}

export function StepSignature({
  renovacion,
  onSignatureComplete,
}: {
  renovacion: Renovacion;
  onSignatureComplete: (file: File) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [signatureDate, setSignatureDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const handleComplete = async () => {
    if (!signedFile) return;
    setIsUploading(true);
    try {
      await onSignatureComplete(signedFile);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Contract Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('inmobiliaria.operaciones.renovacion.signature.newContract')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[8.5/11] bg-surface-muted/50 rounded-md flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('inmobiliaria.operaciones.renovacion.signature.preview')}</p>
              <Button variant="link" size="sm" className="mt-2">
                {t('inmobiliaria.operaciones.renovacion.signature.downloadPdf')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Signed Document */}
      <div className="space-y-2">
        <Label>{t('inmobiliaria.operaciones.renovacion.signature.upload')}</Label>
        <div
          className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
            signedFile
              ? 'border-success/30 bg-success-soft'
              : 'border-border hover:border-fg-muted/40'
          }`}
        >
          {signedFile ? (
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" weight="fill" />
              <span className="font-medium">{signedFile.name}</span>
            </div>
          ) : (
            <label className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('inmobiliaria.operaciones.renovacion.signature.dragOrClick')}
              </p>
              {/* allowlist: hidden type=file behind a custom drag/click dropzone (playbook file-input allowlist) */}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      </div>

      {/* Signature Date */}
      <div className="space-y-2">
        <Label htmlFor="signatureDate">{t('inmobiliaria.operaciones.renovacion.signature.date')}</Label>
        <Input
          id="signatureDate"
          type="date"
          value={signatureDate}
          onChange={(e) => setSignatureDate(e.target.value)}
        />
      </div>

      {/* Complete Button */}
      <Button
        onClick={handleComplete}
        className="w-full"
        size="lg"
        disabled={!signedFile || isUploading}
      >
        <PenNib className="h-4 w-4 mr-2" />
        {isUploading
          ? 'Subiendo documento…'
          : t('inmobiliaria.operaciones.renovacion.signature.register')}
      </Button>
    </div>
  );
}

export function StepCompleted({ renovacion }: { renovacion: Renovacion }) {
  const { t } = useI18n();
  const finalRent = renovacion.negotiatedRent || renovacion.proposedRent || renovacion.currentRent;

  return (
    <div className="space-y-4 text-center">
      <div className="py-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-success-soft flex items-center justify-center mb-4">
          <FlagCheckered className="h-10 w-10 text-success" weight="fill" />
        </div>
        <h3 className="text-xl font-bold mb-2">{t('inmobiliaria.operaciones.renovacion.completed.title')}</h3>
        <p className="text-muted-foreground">
          {t('inmobiliaria.operaciones.renovacion.completed.desc')}
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.completed.property')}</span>
              <span className="font-medium">{renovacion.propertyTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.completed.tenant')}</span>
              <span>{renovacion.tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.completed.newRent')}</span>
              <span className="font-bold text-success">{formatCurrency(finalRent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.completed.term')}</span>
              <span>{t('inmobiliaria.operaciones.renovacion.completed.termMonths')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Sidebar Timeline
// ============================================================================

export function WorkflowSidebar({
  renovacion,
  onAddNote,
}: {
  renovacion: Renovacion;
  onAddNote: (note: string) => void;
}) {
  const { t, locale } = useI18n();
  const [note, setNote] = useState('');
  const daysUntilExpiry = renovacion.daysUntilExpiry;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.sidebar.status')}</span>
            <Badge className={getRenovacionStatusColor(renovacion.status)}>
              {getRenovacionStatusLabel(renovacion.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Countdown */}
      <Card className={daysUntilExpiry <= 30 ? 'border-danger/30' : ''}>
        <CardContent className="pt-4 text-center">
          <Clock className={`h-8 w-8 mx-auto mb-2 ${
            daysUntilExpiry <= 30 ? 'text-danger' : 'text-warning'
          }`} />
          <p className={`text-3xl font-bold ${
            daysUntilExpiry <= 30 ? 'text-danger' : 'text-warning'
          }`}>
            {daysUntilExpiry}
          </p>
          <p className="text-sm text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.sidebar.daysUntilExpiry')}</p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.sidebar.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {renovacion.history.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-surface-muted" />
                  {index < renovacion.history.length - 1 && (
                    <div className="w-px h-full bg-surface-muted" />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US')} - {item.actor}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Note */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.sidebar.addNote')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('inmobiliaria.operaciones.renovacion.sidebar.notePlaceholder')}
              rows={2}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                if (note.trim()) {
                  onAddNote(note);
                  setNote('');
                }
              }}
              disabled={!note.trim()}
            >
              {t('inmobiliaria.operaciones.renovacion.sidebar.addNote')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
