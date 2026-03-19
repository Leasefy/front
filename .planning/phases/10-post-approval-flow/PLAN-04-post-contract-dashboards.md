---
phase: "10-post-approval-flow"
plan: "04"
title: "Post-Contract Dashboards"
wave: 2
autonomous: true
must_haves:
  truths:
    - "Landlord sees active leases with tenant info"
    - "Tenant sees their active lease details"
    - "Payment history visible to both parties"
    - "Payment method selection UI"
    - "Quick actions for common tasks"
  artifacts:
    - path: "src/lib/types/lease.ts"
      description: "Lease and payment types"
      min_lines: 70
    - path: "src/lib/data/mock-leases.ts"
      description: "Mock active leases and payments"
      min_lines: 100
    - path: "src/components/lease/LeaseCard.tsx"
      description: "Active lease card component"
      min_lines: 80
    - path: "src/components/lease/PaymentHistory.tsx"
      description: "Payment history table"
      min_lines: 70
    - path: "src/components/lease/PaymentMethodSelector.tsx"
      description: "Payment method selection"
      min_lines: 80
    - path: "src/app/panel/leases/page.tsx"
      description: "Landlord active leases page"
      min_lines: 100
    - path: "src/app/mi-arriendo/page.tsx"
      description: "Tenant lease dashboard"
      min_lines: 120
  key_links:
    - from: "LeaseCard"
      to: "Lease types"
      via: "lease data"
---

# Plan 04: Post-Contract Dashboards

## Objective

Create post-contract views for both landlord and tenant, showing active lease information and payment management.

## Context

After a contract is signed:
- **Landlord** needs to see their active leases, track payments, communicate with tenants
- **Tenant** needs to see their lease details, make payments, access documents

Both need:
- Clear lease status
- Payment tracking
- Communication channel
- Document access

## Tasks

### Task 1: Create Lease Types
**File**: `src/lib/types/lease.ts`

```tsx
export type LeaseStatus = 'active' | 'ending_soon' | 'ended' | 'terminated';
export type PaymentStatus = 'pending' | 'paid' | 'late' | 'failed';
export type PaymentMethod = 'pse' | 'credit_card' | 'debit_card' | 'nequi' | 'daviplata' | 'cash';

export interface Lease {
  id: string;
  contractId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: LeaseStatus;

  // Terms
  monthlyRent: number;
  depositAmount: number;
  depositPaid: boolean;
  startDate: string;
  endDate: string;
  paymentDueDay: number;

  // Property info (denormalized for display)
  propertyTitle: string;
  propertyAddress: string;
  propertyThumbnail: string;

  // Tenant info (denormalized for landlord view)
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAvatar?: string;

  // Landlord info (denormalized for tenant view)
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;

  // Documents
  contractUrl?: string;
  insuranceUrl?: string;

  createdAt: string;
}

export interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  reference?: string;
}

export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}
```

**Verification**: Lease and payment types defined.

### Task 2: Create Mock Leases Data
**File**: `src/lib/data/mock-leases.ts`

```tsx
import type { Lease, Payment, PaymentMethodOption } from '@/lib/types/lease';

export const MOCK_LEASES: Lease[] = [
  {
    id: 'lease-1',
    contractId: 'contract-1',
    propertyId: '1',
    landlordId: 'user-1',
    tenantId: 'user-2',
    status: 'active',
    monthlyRent: 2500000,
    depositAmount: 5000000,
    depositPaid: true,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    paymentDueDay: 5,
    propertyTitle: 'Apartamento Moderno en Chapinero',
    propertyAddress: 'Cra 7 #72-45, Bogotá',
    propertyThumbnail: '/images/properties/prop-1.jpg',
    tenantName: 'Carlos Rodríguez',
    tenantEmail: 'carlos@email.com',
    tenantPhone: '+57 300 123 4567',
    tenantAvatar: '/images/avatars/tenant-1.jpg',
    landlordName: 'María González',
    landlordEmail: 'maria@email.com',
    landlordPhone: '+57 310 987 6543',
    contractUrl: '/documents/contract-1.pdf',
    insuranceUrl: '/documents/insurance-1.pdf',
    createdAt: '2026-01-01',
  },
  // More mock leases...
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'payment-1',
    leaseId: 'lease-1',
    amount: 2500000,
    dueDate: '2026-01-05',
    paidDate: '2026-01-03',
    status: 'paid',
    method: 'pse',
    reference: 'PSE-123456',
  },
  {
    id: 'payment-2',
    leaseId: 'lease-1',
    amount: 2500000,
    dueDate: '2026-02-05',
    status: 'pending',
  },
  // More payments...
];

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'pse',
    name: 'PSE',
    description: 'Transferencia bancaria',
    icon: '🏦',
    enabled: true,
  },
  {
    id: 'credit_card',
    name: 'Tarjeta de crédito',
    description: 'Visa, Mastercard, Amex',
    icon: '💳',
    enabled: true,
  },
  {
    id: 'debit_card',
    name: 'Tarjeta débito',
    description: 'Débito automático',
    icon: '💳',
    enabled: true,
  },
  {
    id: 'nequi',
    name: 'Nequi',
    description: 'Pago con Nequi',
    icon: '📱',
    enabled: true,
  },
  {
    id: 'daviplata',
    name: 'Daviplata',
    description: 'Pago con Daviplata',
    icon: '📱',
    enabled: true,
  },
  {
    id: 'cash',
    name: 'Efectivo',
    description: 'Próximamente',
    icon: '💵',
    enabled: false,
  },
];

export function getLeasesForLandlord(landlordId: string): Lease[] {
  return MOCK_LEASES.filter((l) => l.landlordId === landlordId);
}

export function getLeasesForTenant(tenantId: string): Lease[] {
  return MOCK_LEASES.filter((l) => l.tenantId === tenantId);
}

export function getPaymentsForLease(leaseId: string): Payment[] {
  return MOCK_PAYMENTS.filter((p) => p.leaseId === leaseId);
}
```

**Verification**: Mock data available.

### Task 3: Create LeaseCard Component
**File**: `src/components/lease/LeaseCard.tsx`

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, MessageCircle, FileText } from 'lucide-react';
import type { Lease } from '@/lib/types/lease';

interface LeaseCardProps {
  lease: Lease;
  view: 'landlord' | 'tenant';
  className?: string;
}

export function LeaseCard({ lease, view, className }: LeaseCardProps) {
  const statusConfig = {
    active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
    ending_soon: { label: 'Próximo a vencer', color: 'bg-amber-100 text-amber-700' },
    ended: { label: 'Finalizado', color: 'bg-slate-100 text-slate-600' },
    terminated: { label: 'Terminado', color: 'bg-red-100 text-red-700' },
  };

  const status = statusConfig[lease.status];
  const contactName = view === 'landlord' ? lease.tenantName : lease.landlordName;
  const contactLabel = view === 'landlord' ? 'Arrendatario' : 'Propietario';

  return (
    <div className={cn(
      'bg-white rounded-sm border border-slate-100 overflow-hidden',
      className
    )}>
      <div className="flex flex-col sm:flex-row">
        {/* Property image */}
        <div className="relative w-full sm:w-48 h-32 sm:h-auto shrink-0">
          <Image
            src={lease.propertyThumbnail}
            alt={lease.propertyTitle}
            fill
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className={cn('mb-2', status.color)}>
                {status.label}
              </Badge>
              <h3 className="font-semibold text-slate-900">
                {lease.propertyTitle}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <MapPin className="w-4 h-4" />
                {lease.propertyAddress}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(lease.monthlyRent)}
                <span className="text-sm text-slate-400 font-normal">/mes</span>
              </p>
            </div>
          </div>

          {/* Contact and dates */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
            <div>
              <span className="text-slate-400">{contactLabel}:</span>{' '}
              {contactName}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Mensaje
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Contrato
            </Button>
            {view === 'tenant' && lease.status === 'active' && (
              <Link href={`/mi-arriendo/${lease.id}/pagar`}>
                <Button size="sm">
                  Pagar renta
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Verification**: LeaseCard renders with correct info.

### Task 4: Create PaymentHistory Component
**File**: `src/components/lease/PaymentHistory.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle, X } from 'lucide-react';
import type { Payment } from '@/lib/types/lease';

interface PaymentHistoryProps {
  payments: Payment[];
  className?: string;
}

export function PaymentHistory({ payments, className }: PaymentHistoryProps) {
  const statusConfig = {
    paid: {
      label: 'Pagado',
      color: 'bg-emerald-100 text-emerald-700',
      icon: Check,
    },
    pending: {
      label: 'Pendiente',
      color: 'bg-amber-100 text-amber-700',
      icon: Clock,
    },
    late: {
      label: 'Atrasado',
      color: 'bg-red-100 text-red-700',
      icon: AlertCircle,
    },
    failed: {
      label: 'Fallido',
      color: 'bg-red-100 text-red-700',
      icon: X,
    },
  };

  if (payments.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        No hay historial de pagos
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Fecha vencimiento
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Monto
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Estado
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Fecha pago
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Referencia
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const status = statusConfig[payment.status];
              const StatusIcon = status.icon;

              return (
                <tr key={payment.id} className="border-b border-slate-50">
                  <td className="py-3 px-4">
                    {formatDate(payment.dueDate)}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={cn('gap-1', status.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                    {payment.reference || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Verification**: Payment history table renders.

### Task 5: Create PaymentMethodSelector Component
**File**: `src/components/lease/PaymentMethodSelector.tsx`

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/data/mock-leases';
import type { PaymentMethod } from '@/lib/types/lease';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  className?: string;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-slate-700">
        Método de pago
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            onClick={() => method.enabled && onSelect(method.id)}
            disabled={!method.enabled}
            className={cn(
              'flex items-center gap-3 p-4 rounded-sm border text-left transition-colors',
              method.enabled && selectedMethod === method.id
                ? 'border-primary bg-primary/5'
                : method.enabled
                ? 'border-slate-200 hover:border-slate-300'
                : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
            )}
          >
            <span className="text-2xl">{method.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{method.name}</p>
              <p className="text-xs text-slate-500">{method.description}</p>
            </div>
            {selectedMethod === method.id && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Verification**: Payment method selector works.

### Task 6: Create Landlord Leases Page
**File**: `src/app/panel/leases/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { LeaseCard, PaymentHistory } from '@/components/lease';
import { getLeasesForLandlord, getPaymentsForLease } from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/format';
import { Home, DollarSign, Users } from 'lucide-react';

export default function LandlordLeasesPage() {
  // Mock landlord ID
  const landlordId = 'user-1';
  const leases = getLeasesForLandlord(landlordId);

  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(
    leases[0]?.id || null
  );

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);
  const payments = selectedLeaseId ? getPaymentsForLease(selectedLeaseId) : [];

  // Stats
  const activeLeases = leases.filter((l) => l.status === 'active').length;
  const totalMonthlyRent = leases
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + l.monthlyRent, 0);

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Mis Arriendos Activos
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeLeases}</p>
                <p className="text-sm text-slate-500">Arriendos activos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totalMonthlyRent)}
                </p>
                <p className="text-sm text-slate-500">Ingresos mensuales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{leases.length}</p>
                <p className="text-sm text-slate-500">Arrendatarios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leases list */}
        <div className="space-y-4 mb-8">
          {leases.map((lease) => (
            <div
              key={lease.id}
              onClick={() => setSelectedLeaseId(lease.id)}
              className={cn(
                'cursor-pointer transition-shadow',
                selectedLeaseId === lease.id && 'ring-2 ring-primary rounded-sm'
              )}
            >
              <LeaseCard lease={lease} view="landlord" />
            </div>
          ))}
        </div>

        {/* Payment history for selected lease */}
        {selectedLease && (
          <div className="bg-white rounded-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">
              Historial de pagos - {selectedLease.propertyTitle}
            </h2>
            <PaymentHistory payments={payments} />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Verification**: Landlord leases page renders.

### Task 7: Create Tenant Lease Dashboard
**File**: `src/app/mi-arriendo/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LeaseCard,
  PaymentHistory,
  PaymentMethodSelector
} from '@/components/lease';
import { Button } from '@/components/ui/button';
import { getLeasesForTenant, getPaymentsForLease } from '@/lib/data/mock-leases';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Home,
  Calendar,
  CreditCard,
  FileText,
  Shield,
  MessageCircle
} from 'lucide-react';
import type { PaymentMethod } from '@/lib/types/lease';

export default function TenantLeasePage() {
  // Mock tenant ID
  const tenantId = 'user-2';
  const leases = getLeasesForTenant(tenantId);
  const activeLease = leases.find((l) => l.status === 'active');

  const payments = activeLease ? getPaymentsForLease(activeLease.id) : [];
  const nextPayment = payments.find((p) => p.status === 'pending');

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  if (!activeLease) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center">
        <div className="text-center">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            No tienes arriendos activos
          </h1>
          <p className="text-slate-500 mb-4">
            Explora propiedades y aplica para comenzar
          </p>
          <Link href="/propiedades">
            <Button>Ver propiedades</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Mi Arriendo
        </h1>

        {/* Lease hero card */}
        <div className="bg-white rounded-sm border border-slate-100 overflow-hidden mb-6">
          <div className="relative h-48">
            <Image
              src={activeLease.propertyThumbnail}
              alt={activeLease.propertyTitle}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <h2 className="text-xl font-semibold">{activeLease.propertyTitle}</h2>
              <p className="text-white/80 text-sm">{activeLease.propertyAddress}</p>
            </div>
          </div>

          <div className="p-6">
            {/* Key info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-slate-500">Renta mensual</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatCurrency(activeLease.monthlyRent)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Día de pago</p>
                <p className="text-lg font-semibold text-slate-900">
                  Día {activeLease.paymentDueDay}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Inicio</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(activeLease.startDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Fin</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(activeLease.endDate)}
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contactar propietario
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Ver contrato
              </Button>
              {activeLease.insuranceUrl && (
                <Button variant="outline" size="sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Ver póliza
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Next payment */}
        {nextPayment && (
          <div className="bg-white rounded-sm border border-slate-100 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              Próximo pago
            </h3>

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(nextPayment.amount)}
                </p>
                <p className="text-sm text-slate-500">
                  Vence el {formatDate(nextPayment.dueDate)}
                </p>
              </div>
              <Button size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar ahora
              </Button>
            </div>

            <PaymentMethodSelector
              selectedMethod={selectedPaymentMethod}
              onSelect={setSelectedPaymentMethod}
            />
          </div>
        )}

        {/* Payment history */}
        <div className="bg-white rounded-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Historial de pagos
          </h3>
          <PaymentHistory payments={payments} />
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Tenant dashboard renders with all sections.

### Task 8: Create Lease Components Index
**File**: `src/components/lease/index.ts`

```tsx
export { LeaseCard } from './LeaseCard';
export { PaymentHistory } from './PaymentHistory';
export { PaymentMethodSelector } from './PaymentMethodSelector';
```

**Verification**: Lease components exported.

### Task 9: Add Navigation Links
**File**: Update navigation to include lease pages

Add links in sidebar/navigation:
- Landlord: "Mis Arriendos" → `/panel/leases`
- Tenant: "Mi Arriendo" → `/mi-arriendo`

**Verification**: Navigation updated with lease links.

## Verification Checklist

- [ ] Lease types with payment tracking
- [ ] Mock leases and payments data
- [ ] LeaseCard shows correct info per view
- [ ] PaymentHistory table renders
- [ ] PaymentMethodSelector works
- [ ] Landlord /panel/leases page
- [ ] Tenant /mi-arriendo page
- [ ] Navigation links added
- [ ] Build passes without errors

## Output

After completion:
1. Complete lease management types
2. Mock data for leases and payments
3. Reusable lease components
4. Landlord dashboard at /panel/leases
5. Tenant dashboard at /mi-arriendo
6. Payment method selection
7. Payment history tracking
