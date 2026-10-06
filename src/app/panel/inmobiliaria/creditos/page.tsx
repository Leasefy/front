'use client';

import { AnimatedNumber, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence';
import { useEffect, useState, useCallback } from 'react';
import {
  Sparkle,
  Coin,
  ShoppingCart,
  WarningCircle,
  Info,
  Calendar,
  Lock,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { PageGuard } from '@/components/auth/PageGuard';
import { BackButton } from '@/components/ui/back-button';
import { Button, Badge, Input, Spinner } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { agentCreditsApi } from '@/lib/api/agent-credits.service';
import { pseCheckoutApi } from '@/lib/api/pse-checkout.service';
import { useAuth } from '@/lib/auth';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import type {
  AgentCreditsBalance,
  AgentCreditPack,
} from '@/lib/api/agent-credits.service';
import type {
  PseFinancialInstitution,
  PseLegalIdType,
  PseUserType,
} from '@/lib/api/pse-checkout.types';

// La cifra tal cual la pintaba la pantalla (sin separador de miles), contando.
const comoEntero = (n: number) => String(Math.round(n));

// ============================================================================
// Page
// ============================================================================

function CreditosContent() {
  const [balance, setBalance] = useState<AgentCreditsBalance | null>(null);
  const [packs, setPacks] = useState<AgentCreditPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedPack, setSelectedPack] = useState<AgentCreditPack | null>(null);
  /*
   * El modal se CIERRA con su salida (ARREGLOS-8, MOV-A6): el pack elegido se
   * queda montado y `compraAbierta` lo abre y lo cierra. `vezDeLaCompra` lo
   * vuelve a montar en cada apertura, así el formulario arranca limpio como
   * antes. Con `{selectedPack && …}` se desmontaba de golpe al cerrar.
   */
  const [compraAbierta, setCompraAbierta] = useState(false);
  const [vezDeLaCompra, setVezDeLaCompra] = useState(0);

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
      setError(err);
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
          <h1 className="text-h2 text-fg flex items-center gap-2">
            <Coin className="w-6 h-6 text-primary" weight="duotone" />
            Créditos del agente
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            Cada evaluación del agente de IA consume 1 crédito. Los créditos del plan se
            regeneran cada mes; los comprados no expiran.
          </p>
        </header>

        {/* Balance: cargando → saldo (o el fallo) con fundido cruzado. */}
        <CrossFade swapKey={isLoading ? 'cargando' : error ? 'fallo' : balance ? 'saldo' : 'nada'}>
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center">
            <Spinner size="md" variant="muted" />
          </div>
        ) : error ? (
          <FalloDeCarga
            error={error}
            queEs="tus créditos"
            onReintentar={() => loadData()}
            className="mb-8"
          />
        ) : balance ? (
          <section className="rounded-lg bg-primary p-6 text-primary-fg mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70 font-medium mb-2">
                  Saldo total
                </p>
                <p className="text-5xl font-bold tabular-nums">
                  {/* Después de comprar, el saldo cuenta hasta el nuevo. */}
                  <AnimatedNumber value={balance.total} format={comoEntero} />
                  <span className="text-2xl font-normal text-white/80 ml-2">créditos</span>
                </p>
              </div>
              <Sparkle className="w-10 h-10 text-white/80" weight="duotone" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70 mb-1">Del plan</p>
                <p className="text-2xl font-semibold tabular-nums"><AnimatedNumber value={balance.planBalance} format={comoEntero} /></p>
                {expiresAt && (
                  <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expiran el {expiresAt}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-white/70 mb-1">Comprados</p>
                <p className="text-2xl font-semibold tabular-nums"><AnimatedNumber value={balance.purchasedBalance} format={comoEntero} /></p>
                <p className="text-xs text-white/70 mt-1">Sin vencimiento</p>
              </div>
            </div>
          </section>
        ) : null}
        </CrossFade>

        {/* How consumption works */}
        <div className="rounded-lg bg-primary-soft border border-primary/30 p-4 mb-8">
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

            {/* Los packs llegan después de cargar: entran escalonados (ARREGLOS-8, MOV-A6). */}
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map((pack) => (
                <StaggerItem key={pack.packSize} className="grid">
                  <PackCard
                    pack={pack}
                    onSelect={() => {
                      setSelectedPack(pack);
                      setVezDeLaCompra((n) => n + 1);
                      setCompraAbierta(true);
                    }}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </>
        )}

        {!isLoading && packs.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay packs de créditos disponibles por el momento.
            </p>
          </div>
        )}
      </div>

      {/* Purchase modal */}
      {selectedPack && (
        <PurchaseModal
          key={vezDeLaCompra}
          abierto={compraAbierta}
          pack={selectedPack}
          onClose={() => setCompraAbierta(false)}
          onRedirect={(url) => {
            window.location.assign(url);
          }}
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
        'relative rounded-lg border bg-card p-5 flex flex-col',
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
// Purchase modal — PSE real (Wompi)
// ============================================================================

/**
 * 🔴 23-09: este formulario pedía el banco a `/pse-mock/banks` —una lista
 * INVENTADA del banco simulado— y mandaba los datos a
 * `POST /agent-credits/purchase`, que «cobraba» contra ese simulador y
 * acreditaba el pack en el acto. En producción el back rechaza el riel
 * simulado, así que nadie lograba comprar.
 *
 * Ahora es el mismo camino que el plan del propietario (`/panel/checkout`):
 * catálogo REAL de bancos de Wompi, tipo de persona, documento, titular y
 * correo; el back pone el monto con el pack y devuelve la URL del banco, y los
 * créditos llegan cuando Wompi confirma el pago.
 */
const DOCUMENT_TYPES: Array<{ value: PseLegalIdType; label: string }> = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
];

/** La misma regla que el back (`PseCreditsCheckoutDto.legalId`). */
const DOCUMENTO_VALIDO = /^\d{6,15}$/;

/** Los campos del pagador que pueden traer un error del back (02-10-2026). */
type CampoDelPagador = 'banco' | 'documento' | 'nombre' | 'correo';

/** El `id` de cada campo, para el foco y el `aria-describedby` de su error. */
const ID_DEL_CAMPO: Record<CampoDelPagador, string> = {
  banco: 'creditos-banco',
  documento: 'creditos-documento',
  nombre: 'creditos-nombre',
  correo: 'creditos-correo',
};

function PurchaseModal({
  abierto,
  pack,
  onClose,
  onRedirect,
}: {
  abierto: boolean;
  pack: AgentCreditPack;
  onClose: () => void;
  onRedirect: (url: string) => void;
}) {
  const { user } = useAuth();
  const [bancos, setBancos] = useState<PseFinancialInstitution[]>([]);
  /** El fallo al traer los bancos; se dice con el traductor bajo el campo. */
  const [bancosError, setBancosError] = useState<unknown>(null);
  const [banco, setBanco] = useState('');
  const [tipoDePersona, setTipoDePersona] = useState<PseUserType>('NATURAL');
  const [tipoDeDocumento, setTipoDeDocumento] = useState<PseLegalIdType>('CC');
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Lo que el back dijo de cada campo del pagador: va debajo de su campo. */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDelPagador, string>>>({});
  const olvidar = (campo: CampoDelPagador) =>
    setDelServidor((previo) => (campo in previo ? { ...previo, [campo]: undefined } : previo));
  /** Lo que el input dice de su error, para el lector de pantalla. */
  const aria = (campo: CampoDelPagador, mensaje?: string | null) => ({
    'aria-invalid': mensaje ? true : undefined,
    'aria-describedby': mensaje ? `${ID_DEL_CAMPO[campo]}-error` : undefined,
  });

  useEffect(() => {
    if (user?.email) setCorreo((actual) => actual || user.email);
  }, [user?.email]);

  useEffect(() => {
    pseCheckoutApi
      .getFinancialInstitutions()
      .then(setBancos)
      .catch((e: unknown) => setBancosError(e ?? new Error('Sin bancos')));
  }, []);

  /** El error del banco: la lista que no llegó, o lo que dijo el back. */
  const errorDelBanco = bancosError
    ? mensajeParaLaPersona(bancosError, {
        porDefecto: 'No pudimos traer la lista de bancos de PSE. Cierra y vuelve a intentar.',
        accion: 'traer la lista de bancos de PSE',
      })
    : (delServidor.banco ?? null);

  const datosCompletos =
    !!banco &&
    DOCUMENTO_VALIDO.test(documento.trim()) &&
    nombre.trim().length > 0 &&
    /.+@.+\..+/.test(correo.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !datosCompletos) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setDelServidor({});
    try {
      const res = await agentCreditsApi.startPseCheckout({
        packSize: pack.packSize,
        userType: tipoDePersona,
        legalIdType: tipoDeDocumento,
        legalId: documento.trim(),
        financialInstitutionCode: banco,
        email: correo.trim(),
        fullName: nombre.trim(),
      });
      if (res.asyncPaymentUrl) {
        onRedirect(res.asyncPaymentUrl);
        return;
      }
      setSubmitError(
        'El banco todavía no devolvió el enlace de pago. Intenta de nuevo en un momento.'
      );
    } catch (err) {
      // Lo que el back dijo de un dato del pagador va debajo de ese dato, con
      // el foco ahí (02-10-2026); lo demás, al aviso, con la regla de oro.
      const reparto = repartirErroresDelServidor<CampoDelPagador>(err, {
        mapa: {
          legalId: 'documento',
          email: 'correo',
          fullName: 'nombre',
          financialInstitutionCode: 'banco',
        },
        campos: ['banco', 'documento', 'nombre', 'correo'],
        porDefecto: 'No se pudo iniciar el pago por PSE.',
        accion: 'iniciar el pago por PSE',
      });
      setDelServidor(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero) document.getElementById(ID_DEL_CAMPO[primero])?.focus();
      setSubmitError(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(sigueAbierto) => {
        // Mientras se inicia el pago no se sale (ni con Esc, ni con el velo, ni con la ✕).
        if (!sigueAbierto && !isSubmitting) onClose();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Comprar créditos</DialogTitle>
          <DialogDescription>
            <span className="font-mono tabular-nums">{pack.packSize}</span> créditos ·{' '}
            <span className="font-mono tabular-nums">{formatCurrency(pack.price)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* El pie vive FUERA del <form> (el DialogContent lo saca al pie fijo):
            el botón de pagar lo apunta con `form=`. */}
        <form id={ID_DE_LA_COMPRA} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="creditos-banco" className="block text-sm font-medium text-foreground mb-1">
              Banco
            </label>
            <Select
              value={banco || undefined}
              onValueChange={(v) => {
                setBanco(v);
                olvidar('banco');
              }}
              disabled={Boolean(bancosError) || bancos.length === 0}
            >
              <SelectTrigger id="creditos-banco" {...aria('banco', errorDelBanco)}>
                <SelectValue placeholder="Selecciona tu banco" />
              </SelectTrigger>
              <SelectContent>
                {bancos.map((b) => (
                  <SelectItem key={b.financial_institution_code} value={b.financial_institution_code}>
                    {b.financial_institution_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorDelCampo id="creditos-banco-error" mensaje={errorDelBanco} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="creditos-persona" className="block text-sm font-medium text-foreground mb-1">
                Tipo de persona
              </label>
              <Select value={tipoDePersona} onValueChange={(v) => setTipoDePersona(v as PseUserType)}>
                <SelectTrigger id="creditos-persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATURAL">Natural</SelectItem>
                  <SelectItem value="JURIDICA">Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="creditos-tipo-doc" className="block text-sm font-medium text-foreground mb-1">
                Tipo de documento
              </label>
              <Select
                value={tipoDeDocumento}
                onValueChange={(v) => setTipoDeDocumento(v as PseLegalIdType)}
              >
                <SelectTrigger id="creditos-tipo-doc">
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
          </div>

          <div>
            <label htmlFor="creditos-documento" className="block text-sm font-medium text-foreground mb-1">
              Número de documento
            </label>
            <Input
              id="creditos-documento"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono"
              value={documento}
              onChange={(e) => {
                setDocumento(e.target.value.replace(/\D/g, '').slice(0, 15));
                olvidar('documento');
              }}
              {...aria('documento', delServidor.documento)}
            />
            <ErrorDelCampo id="creditos-documento-error" mensaje={delServidor.documento} />
          </div>

          <div>
            <label htmlFor="creditos-nombre" className="block text-sm font-medium text-foreground mb-1">
              Nombre del titular
            </label>
            <Input
              id="creditos-nombre"
              autoComplete="name"
              maxLength={200}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                olvidar('nombre');
              }}
              {...aria('nombre', delServidor.nombre)}
            />
            <ErrorDelCampo id="creditos-nombre-error" mensaje={delServidor.nombre} />
          </div>

          <div>
            <label htmlFor="creditos-correo" className="block text-sm font-medium text-foreground mb-1">
              Correo
            </label>
            <Input
              id="creditos-correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                olvidar('correo');
              }}
              {...aria('correo', delServidor.correo)}
            />
            <ErrorDelCampo id="creditos-correo-error" mensaje={delServidor.correo} />
          </div>

          {submitError && (
            <div
              role="alert"
              className="rounded-md bg-danger-soft border border-danger/30 px-3 py-2 text-sm text-danger flex items-start gap-2"
            >
              <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <p className="text-sm text-fg-muted flex items-center gap-1.5 pt-2">
            <Lock className="w-4 h-4" />
            Pago por PSE. Te llevamos al sitio de tu banco; los créditos llegan cuando el banco
            confirme el pago.
          </p>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            hideArrow
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_DE_LA_COMPRA}
            hideArrow
            isLoading={isSubmitting}
            disabled={isSubmitting || !datosCompletos}
            title={!datosCompletos ? 'Completa los datos del pagador' : undefined}
          >
            Pagar <span className="font-mono tabular-nums">{formatCurrency(pack.price)}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ID_DE_LA_COMPRA = 'form-comprar-creditos';

// ============================================================================
// Default export
// ============================================================================

/**
 * 🔴 P-03 (18-09-2026): «TODO INCLUIDO EN EL PLAN — no hay créditos de IA; el
 * precio por contrato cubre el uso (el estudio lo sigue pagando el inquilino)».
 *
 * La pantalla NO SE BORRA: quien tenía saldo comprado tiene que poder verlo, y
 * borrar la ruta dejaría un 404 a quien la tenga guardada. Lo que se retira es
 * la COMPRA — el back responde 410 a `POST /agent-credits/purchase`, así que un
 * botón que la ofreciera llevaría a un error.
 *
 * Se apaga desde el front con `NEXT_PUBLIC_CREDITOS_DE_IA_ENABLED`, que espeja
 * `CREDITOS_DE_IA_ENABLED` del back. Los dos por defecto: apagado.
 */
// 🔴 Sin `export`: un archivo de página sólo puede exportar el juego cerrado
// que Next admite, y esto no lo importa nadie más. No rompía `next build`
// —`ignoreBuildErrors` está en true— ni lo veía el CI; sólo aparece al correr
// `tsc` después de compilar en local.
const CREDITOS_APAGADOS =
  process.env.NEXT_PUBLIC_CREDITOS_DE_IA_ENABLED !== 'true';

function CreditosIncluidosEnElPlan() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-4 p-6"
      data-testid="creditos-incluidos-en-el-plan"
    >
      <BackButton />
      <div className="rounded-lg border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold text-fg">
          El uso de IA va incluido en tu plan
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Ya no hay créditos que comprar: el precio por contrato activo cubre el
          uso de los agentes. El estudio del inquilino lo sigue pagando el
          solicitante, con su recibo y su factura.
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          Si te quedó saldo comprado, no se perdió: escríbenos a{' '}
          <a className="text-primary" href="mailto:hola@leasefy.co">
            hola@leasefy.co
          </a>{' '}
          y lo resolvemos contigo.
        </p>
      </div>
    </div>
  );
}

export default function CreditosPage() {
  return (
    <PageGuard module="configuracion">
      {CREDITOS_APAGADOS ? <CreditosIncluidosEnElPlan /> : <CreditosContent />}
    </PageGuard>
  );
}
