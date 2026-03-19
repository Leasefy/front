'use client';

import { useState } from 'react';
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
import { getCurrentIPC, calculateNewRent } from '@/lib/constants/inmobiliaria-data';

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
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700" />
      <div
        className="absolute top-5 left-0 h-0.5 bg-emerald-500 transition-all duration-300"
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = index <= currentIndex;

          return (
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
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/50'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" weight="bold" /> : step.icon}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-medium ${
                    isCurrent
                      ? 'text-emerald-600 dark:text-emerald-400'
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
  onContinue,
}: {
  renovacion: Renovacion;
  onContinue: () => void;
}) {
  const { t, locale } = useI18n();
  const ipc = getCurrentIPC();
  const proposedRent = calculateNewRent(renovacion.currentRent, ipc.rate);
  const increase = proposedRent - renovacion.currentRent;

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
              <span className="font-medium text-amber-600">
                {new Date(renovacion.leaseEndDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.revision.currentRent')}</span>
              <span className="font-medium">{formatCurrency(renovacion.currentRent)}</span>
            </div>
          </CardContent>
        </Card>

        {/* IPC Preview */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <TrendUp className="h-4 w-4" />
              {t('inmobiliaria.operaciones.renovacion.revision.ipcProjection', { rate: String(ipc.rate) })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.revision.proposedRent')}</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(proposedRent)}</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                +{formatCurrency(increase)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onContinue} className="w-full" size="lg">
        {t('inmobiliaria.operaciones.renovacion.revision.continue')}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

export function StepNotification({
  renovacion,
  onNotify,
  onMarkNotified,
}: {
  renovacion: Renovacion;
  onNotify: (channel: 'email' | 'whatsapp') => void;
  onMarkNotified: () => void;
}) {
  const { t, locale } = useI18n();
  const ipc = getCurrentIPC();
  const proposedRent = calculateNewRent(renovacion.currentRent, ipc.rate);

  const messagePreview = `Estimado/a ${renovacion.tenantName},

Le informamos que su contrato de arrendamiento del inmueble ubicado en ${renovacion.propertyAddress} vence el ${new Date(renovacion.leaseEndDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US')}.

Conforme a la Ley 820 de 2003, el nuevo canon propuesto sera de ${formatCurrency(proposedRent)} (incremento IPC ${ipc.rate}%).

Por favor confirme si desea renovar el contrato.

Atentamente,
Arriendos Premium`;

  return (
    <div className="space-y-4">
      {/* Recipient */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.notification.recipient')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="font-medium">{renovacion.tenantName}</p>
              <p className="text-sm text-muted-foreground">{renovacion.tenantEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('inmobiliaria.operaciones.renovacion.notification.messagePreview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm whitespace-pre-line">
            {messagePreview}
          </div>
        </CardContent>
      </Card>

      {/* Send Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => onNotify('email')}
          className="flex items-center gap-2"
        >
          <Envelope className="h-4 w-4" />
          {t('inmobiliaria.operaciones.renovacion.notification.sendEmail')}
        </Button>
        <Button
          variant="outline"
          onClick={() => onNotify('whatsapp')}
          className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400"
        >
          <WhatsappLogo className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.notification.or')}</span>
        </div>
      </div>

      <Button onClick={onMarkNotified} variant="secondary" className="w-full">
        <CheckCircle className="h-4 w-4 mr-2" />
        {t('inmobiliaria.operaciones.renovacion.notification.markNotified')}
      </Button>
    </div>
  );
}

export function StepNegotiation({
  renovacion,
  onAccept,
  onContinueNegotiation,
}: {
  renovacion: Renovacion;
  onAccept: (finalRent: number) => void;
  onContinueNegotiation: (note: string) => void;
}) {
  const { t, locale } = useI18n();
  const [counterOffer, setCounterOffer] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const ipc = getCurrentIPC();
  const proposedRent = renovacion.proposedRent || calculateNewRent(renovacion.currentRent, ipc.rate);

  const handleCounterOfferChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    const formatted = numericValue ? parseInt(numericValue).toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : '';
    setCounterOffer(formatted);
  };

  const counterOfferValue = parseInt(counterOffer.replace(/\./g, '')) || 0;

  return (
    <div className="space-y-4">
      {/* Proposed Rent */}
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10">
        <CardContent className="pt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">{t('inmobiliaria.operaciones.renovacion.negotiation.proposedRent', { rate: String(ipc.rate) })}</p>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(proposedRent)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Counter Offer */}
      <div className="space-y-2">
        <Label htmlFor="counterOffer">{t('inmobiliaria.operaciones.renovacion.negotiation.counterOfferLabel')}</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="counterOffer"
            value={counterOffer}
            onChange={(e) => handleCounterOfferChange(e.target.value)}
            placeholder={t('inmobiliaria.operaciones.renovacion.negotiation.counterOfferPlaceholder')}
            className="pl-8"
          />
        </div>
        {counterOfferValue > 0 && counterOfferValue < proposedRent && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Warning className="h-3 w-3" />
            {t('inmobiliaria.operaciones.renovacion.negotiation.counterOfferWarning', { amount: formatCurrency(proposedRent - counterOfferValue) })}
          </p>
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
        <Button onClick={() => onAccept(counterOfferValue || proposedRent)}>
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
  const [tenantApproved, setTenantApproved] = useState(false);
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
            <span className="font-bold text-emerald-600">{formatCurrency(finalRent)}</span>
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
        <Card className={`transition-colors ${ownerApproved ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  ownerApproved ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <User className={`h-5 w-5 ${ownerApproved ? 'text-emerald-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className="font-medium">{renovacion.propietarioName}</p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.ownerLabel')}</p>
                </div>
              </div>
              {ownerApproved ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
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

        <Card className={`transition-colors ${tenantApproved ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  tenantApproved ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <User className={`h-5 w-5 ${tenantApproved ? 'text-emerald-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className="font-medium">{renovacion.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.operaciones.renovacion.approval.tenantLabel')}</p>
                </div>
              </div>
              {tenantApproved ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('inmobiliaria.operaciones.renovacion.approval.approved')}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setTenantApproved(true);
                    onTenantApproved();
                  }}
                >
                  {t('inmobiliaria.operaciones.renovacion.approval.approve')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {ownerApproved && tenantApproved && (
        <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" weight="fill" />
              <span className="font-medium">{t('inmobiliaria.operaciones.renovacion.approval.bothApproved')}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function StepSignature({
  renovacion,
  onSignatureComplete,
}: {
  renovacion: Renovacion;
  onSignatureComplete: () => void;
}) {
  const { t } = useI18n();
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [signatureDate, setSignatureDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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
          <div className="aspect-[8.5/11] bg-slate-100 dark:bg-slate-900/50 rounded-lg flex items-center justify-center">
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
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            signedFile
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          {signedFile ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" weight="fill" />
              <span className="font-medium">{signedFile.name}</span>
            </div>
          ) : (
            <label className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('inmobiliaria.operaciones.renovacion.signature.dragOrClick')}
              </p>
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
        onClick={onSignatureComplete}
        className="w-full"
        size="lg"
        disabled={!signedFile}
      >
        <PenNib className="h-4 w-4 mr-2" />
        {t('inmobiliaria.operaciones.renovacion.signature.register')}
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
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <FlagCheckered className="h-10 w-10 text-emerald-600" weight="fill" />
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
              <span className="font-bold text-emerald-600">{formatCurrency(finalRent)}</span>
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
  onTerminate,
}: {
  renovacion: Renovacion;
  onAddNote: (note: string) => void;
  onTerminate: () => void;
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
      <Card className={daysUntilExpiry <= 30 ? 'border-red-200 dark:border-red-800' : ''}>
        <CardContent className="pt-4 text-center">
          <Clock className={`h-8 w-8 mx-auto mb-2 ${
            daysUntilExpiry <= 30 ? 'text-red-500' : 'text-amber-500'
          }`} />
          <p className={`text-3xl font-bold ${
            daysUntilExpiry <= 30 ? 'text-red-600' : 'text-amber-600'
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
                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  {index < renovacion.history.length - 1 && (
                    <div className="w-px h-full bg-slate-200 dark:bg-slate-700" />
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

      {/* Quick Actions */}
      <Button
        variant="outline"
        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
        onClick={onTerminate}
      >
        <X className="h-4 w-4 mr-2" />
        {t('inmobiliaria.operaciones.renovacion.sidebar.terminate')}
      </Button>
    </div>
  );
}
