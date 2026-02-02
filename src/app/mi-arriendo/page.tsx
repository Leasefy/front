'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LeaseCard } from '@/components/lease/LeaseCard';
import { PaymentHistory } from '@/components/lease/PaymentHistory';
import { PaymentMethodSelector } from '@/components/lease/PaymentMethodSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getActiveLeasesForTenant,
  getPaymentsForLease,
  getNextPayment,
} from '@/lib/data/mock-leases';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Home,
  Calendar,
  CreditCard,
  FileText,
  Shield,
  MessageCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Package,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import type { PaymentMethod, Lease } from '@/lib/types/lease';

/**
 * Tenant Lease Dashboard
 * Shows active lease details, payment management, and documents
 */
export default function TenantLeasePage() {
  // Mock tenant ID - in real app would come from auth
  const tenantId = 'user-tenant-1';
  const leases = getActiveLeasesForTenant(tenantId);
  const [activeLease, setActiveLease] = useState<Lease | undefined>(leases[0]);

  const payments = activeLease ? getPaymentsForLease(activeLease.id) : [];
  const nextPayment = activeLease ? getNextPayment(activeLease.id) : undefined;

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  // Calculate days until payment due
  const daysUntilDue = nextPayment
    ? Math.ceil(
        (new Date(nextPayment.dueDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // No active lease - show empty state
  if (!activeLease) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            No tienes arriendos activos
          </h1>
          <p className="text-muted-foreground mb-6">
            Cuando tengas un contrato de arriendo firmado, podras ver los
            detalles y gestionar tus pagos desde aqui.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/propiedades">
              <Button>Explorar propiedades</Button>
            </Link>
            <Link href="/mis-aplicaciones">
              <Button variant="outline">Ver mis aplicaciones</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Mi Arriendo</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu arriendo y pagos mensuales
          </p>
        </div>

        {/* Multiple leases selector */}
        {leases.length > 1 && (
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Selecciona un arriendo
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {leases.map((lease) => (
                <button
                  key={lease.id}
                  onClick={() => setActiveLease(lease)}
                  className={cn(
                    'px-4 py-2 rounded-sm border text-sm whitespace-nowrap transition-colors',
                    activeLease?.id === lease.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-border'
                  )}
                >
                  {lease.propertyTitle}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lease hero card */}
        <div className="bg-white rounded-sm border border-border overflow-hidden mb-6">
          {/* Property image with overlay */}
          <div className="relative h-48 sm:h-56">
            <Image
              src={activeLease.propertyThumbnail}
              alt={activeLease.propertyTitle}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <Badge
                className={cn(
                  'mb-2 border',
                  activeLease.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                )}
              >
                {activeLease.status === 'active'
                  ? 'Contrato activo'
                  : 'Proximo a vencer'}
              </Badge>
              <h2 className="text-xl font-semibold text-white">
                {activeLease.propertyTitle}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {activeLease.propertyAddress}, {activeLease.propertyCity}
              </p>
            </div>
          </div>

          {/* Lease details */}
          <div className="p-5 sm:p-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Renta mensual
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {formatCurrency(activeLease.monthlyRent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Administracion
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {formatCurrency(activeLease.adminFee)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Dia de pago
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  Dia {activeLease.paymentDueDay}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Vence
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {formatDate(activeLease.endDate)}
                </p>
              </div>
            </div>

            {/* Contract period */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 p-3 bg-muted rounded-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                Periodo: {formatDate(activeLease.startDate)} -{' '}
                {formatDate(activeLease.endDate)}
              </span>
            </div>

            {/* Landlord contact */}
            <div className="border border-border rounded-sm p-4 mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Tu propietario
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {activeLease.landlordName}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {activeLease.landlordPhone}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {activeLease.landlordEmail}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {activeLease.contractUrl && (
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Ver contrato
                </Button>
              )}
              {activeLease.insuranceUrl && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Ver poliza
                </Button>
              )}
              {activeLease.inventoryUrl && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="w-4 h-4" />
                  Inventario
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Next payment card */}
        {nextPayment && (
          <div className="bg-white rounded-sm border border-border overflow-hidden mb-6">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Proximo pago</h3>
                {daysUntilDue <= 5 && daysUntilDue > 0 && (
                  <Badge variant="warning" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {daysUntilDue} dias
                  </Badge>
                )}
                {daysUntilDue <= 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Vencido
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(nextPayment.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vence el {formatDate(nextPayment.dueDate)}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => setShowPaymentSection(!showPaymentSection)}
                >
                  <CreditCard className="w-4 h-4" />
                  Pagar ahora
                </Button>
              </div>

              {/* Payment method selector - expandable */}
              {showPaymentSection && (
                <div className="pt-6 border-t border-border">
                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onSelect={setSelectedPaymentMethod}
                  />
                  {selectedPaymentMethod && (
                    <div className="mt-6 flex justify-end">
                      <Button size="lg" className="gap-2">
                        Confirmar pago de {formatCurrency(nextPayment.amount)}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment history */}
        <div className="bg-white rounded-sm border border-border overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-border">
            <h3 className="font-semibold text-foreground">Historial de pagos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tus pagos de arriendo y depositos
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <PaymentHistory payments={payments} showConcept />
          </div>
        </div>
      </div>
    </div>
  );
}
