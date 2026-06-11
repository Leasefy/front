'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Lock,
  Bank,
  IdentificationCard,
  Phone,
  User,
  Warning,
  CheckCircle,
  XCircle,
  Clock,
  SpinnerGap,
  ArrowLeft,
} from '@phosphor-icons/react';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import { formatCurrency } from '@/lib/format';
import type { PSEBank, PSEDocumentType, SubscriptionCycle } from '@/lib/api/subscriptions.types';
import { cn } from '@/lib/utils';

// ─── Fallback banks in case API fails ───────────────────────────────────────
const FALLBACK_BANKS: PSEBank[] = [
  { code: 'BANCOLOMBIA', name: 'Bancolombia' },
  { code: 'BANCO_BOGOTA', name: 'Banco de Bogotá' },
  { code: 'DAVIVIENDA', name: 'Davivienda' },
  { code: 'BBVA', name: 'BBVA Colombia' },
  { code: 'BANCO_OCCIDENTE', name: 'Banco de Occidente' },
  { code: 'BANCO_POPULAR', name: 'Banco Popular' },
  { code: 'SCOTIABANK', name: 'Scotiabank Colpatria' },
  { code: 'AV_VILLAS', name: 'AV Villas' },
  { code: 'BANCO_AGRARIO', name: 'Banco Agrario' },
  { code: 'NEQUI', name: 'Nequi' },
];

const DOC_TYPES: { value: PSEDocumentType; label: string }[] = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
];

// Deterministic mock outcomes by last digit
const MOCK_OUTCOMES: Record<string, { label: string; description: string }> = {
  '0': { label: 'Fondos insuficientes', description: 'Tu cuenta no tiene saldo suficiente para realizar el pago.' },
  '1': { label: 'Rechazado por el banco', description: 'Tu banco rechazó la transacción. Comunicáte con tu entidad bancaria.' },
  '9': { label: 'Verificación pendiente', description: 'La transacción quedó en estado pendiente de verificación.' },
};

type PageState = 'form' | 'processing' | 'success' | 'error';

interface PSEError {
  title: string;
  description: string;
}

function PSEMockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planId = searchParams.get('planId') ?? '';
  const planName = searchParams.get('planName') ?? 'Plan';
  const amount = Number(searchParams.get('amount') ?? '0');
  const cycle = (searchParams.get('cycle') ?? 'MONTHLY') as SubscriptionCycle;
  const returnUrl = searchParams.get('returnUrl') ?? '/panel/inmobiliaria';

  const [banks, setBanks] = useState<PSEBank[]>(FALLBACK_BANKS);
  const [pageState, setPageState] = useState<PageState>('form');
  const [pseError, setPseError] = useState<PSEError | null>(null);

  // Form state
  const [bankCode, setBankCode] = useState('');
  const [docType, setDocType] = useState<PSEDocumentType>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    subscriptionsApi.getPSEBanks()
      .then(setBanks)
      .catch(() => setBanks(FALLBACK_BANKS));
  }, []);

  const validate = () => {
    if (!bankCode) return 'Seleccioná tu banco.';
    if (!docNumber.trim()) return 'Ingresá tu número de documento.';
    if (!holderName.trim()) return 'Ingresá el nombre del titular.';
    return null;
  };

  const submit = async (forceReject = false) => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setPageState('processing');

    // For "Rechazar": use a document number ending in 1 (banco rejection)
    const effectiveDocNumber = forceReject
      ? docNumber.slice(0, -1) + '1'
      : docNumber;

    try {
      await subscriptionsApi.subscribeWithPSE({
        planId,
        cycle,
        psePaymentData: {
          documentType: docType,
          documentNumber: effectiveDocNumber,
          bankCode,
          holderName: holderName.trim(),
          phoneNumber: phone.trim() || undefined,
        },
      });
      setPageState('success');
      setTimeout(() => router.push(returnUrl), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const lastDigit = effectiveDocNumber.slice(-1);
      const known = MOCK_OUTCOMES[lastDigit];
      setPseError({
        title: known?.label ?? 'Transacción rechazada',
        description: known?.description ?? (msg || 'La transacción no pudo completarse. Intentá de nuevo.'),
      });
      setPageState('error');
    }
  };

  // ─── Processing screen ───────────────────────────────────────────────────
  if (pageState === 'processing') {
    return (
      <PSEShell>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <SpinnerGap className="w-12 h-12 animate-spin text-[#008B5E]" />
          <p className="text-[15px] font-medium text-gray-700">Procesando tu pago...</p>
          <p className="text-sm text-gray-500">No cerrés esta ventana</p>
        </div>
      </PSEShell>
    );
  }

  // ─── Success screen ──────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <PSEShell>
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#E8F3EC] flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-[#2C7A53]" weight="fill" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">¡Pago aprobado!</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            Tu suscripción al plan <strong>{planName}</strong> fue activada exitosamente.
          </p>
          <p className="text-xs text-gray-400">Redirigiendo a tu panel...</p>
        </div>
      </PSEShell>
    );
  }

  // ─── Error screen ────────────────────────────────────────────────────────
  if (pageState === 'error' && pseError) {
    return (
      <PSEShell>
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F8EAE7] flex items-center justify-center">
            <XCircle className="w-9 h-9 text-[#C4503B]" weight="fill" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{pseError.title}</h2>
          <p className="text-sm text-gray-500 max-w-xs">{pseError.description}</p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Volver al checkout
            </button>
            <button
              onClick={() => { setPageState('form'); setPseError(null); }}
              className="px-4 py-2 text-sm bg-[#008B5E] text-white rounded-md hover:bg-[#006f4a] transition-colors font-medium"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </PSEShell>
    );
  }

  // ─── Main form ───────────────────────────────────────────────────────────
  return (
    <PSEShell>
      {/* Merchant info */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Pago a</p>
            <p className="text-base font-bold text-gray-800">Leasify</p>
            <p className="text-sm text-gray-600 mt-0.5">Plan {planName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Total</p>
            <p className="text-xl font-bold text-gray-800">
              {amount > 0 ? formatCurrency(amount) : '—'}
            </p>
            <p className="text-xs text-gray-400">{cycle === 'MONTHLY' ? 'mensual' : 'anual'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); submit(false); }}
        className="space-y-4"
      >
        {/* Bank */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Bank className="inline w-4 h-4 mr-1 text-gray-500" />
            Entidad bancaria
          </label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="w-full h-11 px-3 rounded-md border border-gray-300 bg-white text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#008B5E]/40 focus:border-[#008B5E]"
          >
            <option value="">Seleccioná tu banco</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Document */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <IdentificationCard className="inline w-4 h-4 mr-1 text-gray-500" />
              Tipo
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as PSEDocumentType)}
              className="w-full h-11 px-2 rounded-md border border-gray-300 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#008B5E]/40 focus:border-[#008B5E]"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.value}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de documento</label>
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1234567890"
              maxLength={12}
              className="w-full h-11 px-3 rounded-md border border-gray-300 bg-white text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#008B5E]/40 focus:border-[#008B5E]"
            />
          </div>
        </div>

        {/* Holder name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <User className="inline w-4 h-4 mr-1 text-gray-500" />
            Nombre del titular
          </label>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="Juan García"
            className="w-full h-11 px-3 rounded-md border border-gray-300 bg-white text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#008B5E]/40 focus:border-[#008B5E]"
          />
        </div>

        {/* Phone (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Phone className="inline w-4 h-4 mr-1 text-gray-500" />
            Teléfono celular
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="3001234567"
            maxLength={10}
            className="w-full h-11 px-3 rounded-md border border-gray-300 bg-white text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#008B5E]/40 focus:border-[#008B5E]"
          />
        </div>

        {/* Form error */}
        {formError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[#F8EAE7] border border-[#C4503B]/30">
            <Warning className="w-4 h-4 text-[#C4503B] shrink-0" />
            <p className="text-sm text-[#C4503B]">{formError}</p>
          </div>
        )}

        {/* Mock outcome hint */}
        <div className="p-3 rounded-md bg-[#F8F0E0] border border-[#B7791F]/30">
          <p className="text-xs text-[#B7791F] font-medium mb-1">Comportamiento del simulador</p>
          <p className="text-xs text-[#B7791F]">
            El resultado depende del <strong>último dígito</strong> del documento:
            &nbsp;<strong>0</strong> → fondos insuficientes · <strong>1</strong> → rechazo banco · <strong>9</strong> → pendiente · <strong>cualquier otro</strong> → éxito ✓
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => submit(true)}
            className="flex-1 h-12 rounded-md border-2 border-[#C4503B]/30 text-[#C4503B] text-sm font-semibold hover:bg-[#F8EAE7] transition-colors"
          >
            Rechazar pago
          </button>
          <button
            type="submit"
            className="flex-1 h-12 rounded-md bg-[#008B5E] hover:bg-[#006f4a] text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Confirmar pago
          </button>
        </div>
      </form>

      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="mt-6 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
      >
        <ArrowLeft className="w-3 h-3" />
        Volver al checkout
      </button>
    </PSEShell>
  );
}

// ─── Shell / layout que simula la UI de PSE ─────────────────────────────────
function PSEShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4">
      {/* PSE Header */}
      <div className="w-full max-w-md mb-4">
        <div className="bg-[#008B5E] rounded-t-xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <span className="text-[#008B5E] font-black text-xs">PSE</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">ACH Colombia</p>
              <p className="text-white/70 text-[11px]">Pagos Seguros en Línea</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#B7791F]/20 border border-[#B7791F]/30">
            <Warning className="w-3 h-3 text-[#B7791F]" weight="fill" />
            <span className="text-[#B7791F] text-[10px] font-bold uppercase tracking-wide">Simulación</span>
          </div>
        </div>

        {/* Security bar */}
        <div className="bg-[#006f4a] px-6 py-1.5 flex items-center gap-2">
          <Lock className="w-3 h-3 text-white/60" />
          <span className="text-white/60 text-[11px]">Conexión segura · Ambiente de pruebas</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-b-xl border border-gray-200 px-6 py-6">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400 text-center max-w-sm">
        Esta es una simulación del portal PSE para pruebas. No se realizan cobros reales.
      </p>
    </div>
  );
}

export default function PSEMockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-[#008B5E]" />
      </div>
    }>
      <PSEMockContent />
    </Suspense>
  );
}
