'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkle,
  Coin,
  ShoppingCart,
  CheckCircle,
  WarningCircle,
  X,
  Info,
  Calendar,
  Lock,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { PageGuard } from '@/components/auth/PageGuard';
import { BackButton } from '@/components/ui/back-button';
import { Button, Badge, Input, Spinner } from '@/components/ui';
import { ErrorState } from '@/components/ui/error-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { agentCreditsApi } from '@/lib/api/agent-credits.service';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type {
  AgentCreditsBalance,
  AgentCreditPack,
  PurchaseCreditsPaymentData,
} from '@/lib/api/agent-credits.service';
import type { PSEBank, PSEDocumentType } from '@/lib/api/subscriptions.types';

// ============================================================================
// Page
// ============================================================================

function CreditosContent() {
  const router = useRouter();

  const [balance, setBalance] = useState<AgentCreditsBalance | null>(null);
  const [packs, setPacks] = useState<AgentCreditPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<AgentCreditPack | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [b, p] = await Promise.all([
        agentCreditsApi.getBalance(),
        agentCreditsApi.getPacks(),
      ]);
      setBalance(b);
      setPacks(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar créditos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const expiresAt = formatDate(balance?.planExpiresAt);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <BackButton label="Volver" />
        </div>

        <header className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg flex items-center gap-2">
            <Coin className="w-6 h-6 text-primary" weight="duotone" />
            Créditos del agente
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            Cada evaluación del agente de IA consume 1 crédito. Los créditos del plan se
            regeneran cada mes; los comprados no expiran.
          </p>
        </header>

        {/* Balance */}
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
            <Spinner size="md" variant="muted" />
          </div>
        ) : error ? (
          <ErrorState
            title="No pudimos cargar tus créditos"
            description={error}
            onRetry={() => loadData()}
            className="mb-8"
          />
        ) : balance ? (
          <section className="rounded-xl bg-primary p-6 text-white mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70 font-medium mb-2">
                  Saldo total
                </p>
                <p className="text-5xl font-bold tabular-nums">
                  {balance.total}
                  <span className="text-2xl font-normal text-white/80 ml-2">créditos</span>
                </p>
              </div>
              <Sparkle className="w-10 h-10 text-white/80" weight="duotone" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70 mb-1">Del plan</p>
                <p className="text-2xl font-semibold tabular-nums">{balance.planBalance}</p>
                {expiresAt && (
                  <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expiran el {expiresAt}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-white/70 mb-1">Comprados</p>
                <p className="text-2xl font-semibold tabular-nums">{balance.purchasedBalance}</p>
                <p className="text-xs text-white/70 mt-1">Sin vencimiento</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* How consumption works */}
        <div className="rounded-xl bg-primary-soft border border-primary/30 p-4 mb-8">
          <p className="text-xs text-primary flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>FIFO:</strong> los créditos del plan se consumen primero para que no
              expiren sin usar. Los créditos comprados se reservan para cuando se agota el
              plan.
            </span>
          </p>
        </div>

        {/* Packs */}
        {!isLoading && packs.length > 0 && (
          <>
            <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Comprar créditos extra
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map((pack) => (
                <PackCard
                  key={pack.packSize}
                  pack={pack}
                  onSelect={() => setSelectedPack(pack)}
                />
              ))}
            </div>
          </>
        )}

        {!isLoading && packs.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay packs de créditos disponibles por el momento.
            </p>
          </div>
        )}
      </div>

      {/* Purchase modal */}
      {selectedPack && (
        <PurchaseModal
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
          onSuccess={() => {
            setSelectedPack(null);
            loadData();
          }}
          onRedirect={(url) => {
            window.location.href = url;
          }}
          router={router}
        />
      )}
    </div>
  );
}

// ============================================================================
// Pack card
// ============================================================================

function PackCard({
  pack,
  onSelect,
}: {
  pack: AgentCreditPack;
  onSelect: () => void;
}) {
  const pricePerCredit = pack.packSize > 0 ? Math.round(pack.price / pack.packSize) : 0;

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-5 flex flex-col',
        pack.highlighted ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
      )}
    >
      {pack.highlighted && (
        <span className="absolute -top-2.5 left-4">
          <Badge variant="default">Más popular</Badge>
        </span>
      )}

      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-3xl font-bold text-fg tabular-nums">{pack.packSize}</p>
        <p className="text-sm text-fg-muted">créditos</p>
      </div>

      {pack.name && (
        <p className="text-sm font-medium text-fg mb-2">{pack.name}</p>
      )}

      {pack.description && (
        <p className="text-xs text-fg-muted mb-4">{pack.description}</p>
      )}

      <div className="mt-auto space-y-3">
        <div>
          <p className="text-2xl font-bold text-fg tabular-nums">
            {formatCurrency(pack.price)}
          </p>
          <p className="text-xs text-fg-muted">
            ~ {formatCurrency(pricePerCredit)} / crédito
            {pack.discount && pack.discount > 0 && (
              <span className="ml-1.5 text-success font-medium">
                (-{pack.discount}%)
              </span>
            )}
          </p>
        </div>

        <Button
          onClick={onSelect}
          hideArrow
          variant={pack.highlighted ? 'default' : 'secondary'}
          className="w-full"
        >
          Comprar pack
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Purchase modal — PSE form
// ============================================================================

const DOCUMENT_TYPES: Array<{ value: PSEDocumentType; label: string }> = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
];

function PurchaseModal({
  pack,
  onClose,
  onSuccess,
  onRedirect,
}: {
  pack: AgentCreditPack;
  onClose: () => void;
  onSuccess: () => void;
  onRedirect: (url: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [banks, setBanks] = useState<PSEBank[]>([]);
  const [form, setForm] = useState<PurchaseCreditsPaymentData>({
    documentType: 'CC',
    documentNumber: '',
    bankCode: '',
    holderName: '',
    phoneNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    subscriptionsApi
      .getPSEBanks()
      .then(setBanks)
      .catch(() => {
        // Keep the list empty — user sees "no banks" state
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await agentCreditsApi.purchase({
        packSize: pack.packSize,
        psePaymentData: form,
      });
      if (res.pseUrl) {
        onRedirect(res.pseUrl);
        return;
      }
      setSuccessMessage(
        '¡Compra iniciada! Los créditos se acreditarán cuando se confirme el pago.'
      );
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Error al procesar la compra'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    form.documentNumber.trim() &&
    form.bankCode &&
    form.holderName.trim() &&
    !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />
      <div className="relative bg-background rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-fg">Comprar créditos</h3>
            <p className="text-xs text-fg-muted">
              {pack.packSize} créditos · {formatCurrency(pack.price)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            hideArrow
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMessage ? (
            <div className="rounded-xl bg-success-soft border border-success/30 p-4 text-sm text-success flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Tipo de documento
                </label>
                <Select
                  value={form.documentType}
                  onValueChange={(v) =>
                    setForm({ ...form, documentType: v as PSEDocumentType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Número de documento
                </label>
                <Input
                  type="text"
                  value={form.documentNumber}
                  onChange={(e) =>
                    setForm({ ...form, documentNumber: e.target.value })
                  }
                  placeholder="1234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nombre del titular
                </label>
                <Input
                  type="text"
                  value={form.holderName}
                  onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Banco
                </label>
                <Select
                  value={form.bankCode || undefined}
                  onValueChange={(v) => setForm({ ...form, bankCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Teléfono (opcional)
                </label>
                <Input
                  type="tel"
                  value={form.phoneNumber ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, phoneNumber: e.target.value })
                  }
                  placeholder="3001234567"
                />
              </div>

              {submitError && (
                <div className="rounded-md bg-danger-soft border border-danger/30 px-3 py-2 text-xs text-danger">
                  {submitError}
                </div>
              )}

              <p className="text-[11px] text-fg-muted flex items-center gap-1.5 pt-2">
                <Lock className="w-3 h-3" />
                Pago seguro vía PSE. Serás redirigido al sitio de tu banco.
              </p>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  hideArrow
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  hideArrow
                  isLoading={isSubmitting}
                  disabled={!canSubmit}
                  className="flex-1"
                >
                  Pagar {formatCurrency(pack.price)}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Default export
// ============================================================================

export default function CreditosPage() {
  return (
    <PageGuard module="configuracion">
      <CreditosContent />
    </PageGuard>
  );
}
