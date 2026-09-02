'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretLeft,
  User,
  Buildings,
  Envelope,
  Phone,
  MapPin,
  PencilSimple,
  DotsThree,
  TrashSimple,
  Clock,
  CurrencyDollar,
  CalendarCheck,
  House,
  Warning,
  CheckCircle,
  X,
  FileText,
  Download,
  Plus,
  ArrowRight,
  Tag,
  Copy,
  Check,
  CaretRight,
  Note,
  SpinnerGap,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { SegmentedControl, IconButton } from '@leasefy/cadence';
import {
  PropietarioStats,
  PropietarioBankInfo,
  PropietarioForm,
} from '@/components/inmobiliaria';
import {
  usePropietario,
  useConsignaciones,
  useDispersiones,
} from '@/lib/hooks/useInmobiliaria';
import type { Propietario, PropietarioFormData, Consignacion, Dispersion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

/**
 * Modal Component - Uses portal to render at document.body level
 */
function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [mounted, setMounted] = useState(false);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Block body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
        document.documentElement.style.overflow = '';
      };
    }
  }, [open]);

  if (!open || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop - separate fixed element */}
      {/* Modal layer = z-[300] (misma capa que <Dialog>/<Sheet>). Antes z-[9998/9999],
          que tapaba cualquier AlertDialog disparado desde adentro. Ver DESIGN.md §17. */}
      <div
        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Modal */}
        <div
          className={cn(
            'pointer-events-auto bg-card w-full rounded-[20px] flex flex-col max-h-[85vh]',
            sizeClasses[size]
          )}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
            <h3 className="text-base font-semibold text-foreground">
              {title}
            </h3>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Cerrar"
              icon={<X className="w-4 h-4" />}
            />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>
        </div>
      </div>
    </>
  );

  // Render modal at document.body level to escape any transform contexts
  return createPortal(modalContent, document.body);
}

/**
 * Property Card Component
 */
function PropertyCard({ consignacion }: { consignacion: Consignacion }) {
  const { t } = useI18n();

  const statusColors = {
    available: 'bg-success-soft text-success',
    rented: 'bg-primary-soft text-primary',
    in_process: 'bg-warning-soft text-warning',
    maintenance: 'bg-danger-soft text-danger',
  };

  const statusLabels = {
    available: t('inmobiliaria.portafolio.status.available'),
    rented: t('inmobiliaria.portafolio.status.rented'),
    in_process: t('inmobiliaria.propietarios.detail.statusInProcess'),
    maintenance: t('inmobiliaria.portafolio.status.maintenance'),
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl border border-border bg-card transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 overflow-hidden">
          {consignacion.propertyThumbnail ? (
            <img
              src={consignacion.propertyThumbnail}
              alt={consignacion.propertyTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <House className="w-8 h-8 text-fg-subtle" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-base font-semibold text-foreground line-clamp-1">
                {consignacion.propertyTitle}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {consignacion.propertyAddress}
              </p>
            </div>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', statusColors[consignacion.availability])}>
              {statusLabels[consignacion.availability]}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3">
            {/* contract-addendum-2.md §A.2/§A.10 — a SALE mandate has no
                canon (`monthlyRent: null`) and `commissionPercent: 0`; the
                agreed figure lives in `saleCommissionPercent` instead. */}
            {consignacion.listingType === 'sale' ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  {consignacion.saleCommissionPercent != null ? `${consignacion.saleCommissionPercent}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.saleCommission')}</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-base font-semibold tabular-nums text-foreground">
                    {consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.common.perMonth')}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {consignacion.commissionPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.agentes.commission')}</p>
                </div>
              </>
            )}
            {consignacion.currentTenantName && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {consignacion.currentTenantName}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.tenant')}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Payment History Item Component
 */
function PaymentHistoryItem({ dispersion }: { dispersion: Dispersion }) {
  const { t, locale } = useI18n();

  const statusColors = {
    pending: 'bg-warning-soft text-warning',
    processing: 'bg-primary-soft text-primary',
    completed: 'bg-success-soft text-success',
    failed: 'bg-danger-soft text-danger',
  };

  const statusLabels = {
    pending: t('inmobiliaria.dispersiones.status.pending'),
    processing: t('inmobiliaria.dispersiones.status.processed'),
    completed: t('inmobiliaria.common.completed'),
    failed: t('inmobiliaria.dispersiones.status.failed'),
  };

  const monthLabel = new Date(dispersion.month + '-01').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          dispersion.status === 'completed'
            ? 'bg-success-soft'
            : 'bg-warning-soft'
        )}>
          {dispersion.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : (
            <Clock className="w-5 h-5 text-warning" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground capitalize">
            {monthLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {dispersion.items.length} {t('inmobiliaria.propietarios.detail.propertiesCount')}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(dispersion.netToPropietario)}
        </p>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColors[dispersion.status])}>
          {statusLabels[dispersion.status]}
        </span>
      </div>
    </div>
  );
}

/**
 * Propietario Detail Page
 * Full profile view with properties, payments, and history
 */
function PropietarioDetailContent() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setTab] = useState<'properties' | 'payments' | 'notes'>('properties');
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch propietario and keep local state for updates
  const { propietario: fetchedPropietario, isLoading } = usePropietario(id);
  const [propietario, setPropietario] = useState(fetchedPropietario);

  // Update local state when fetched data changes
  useEffect(() => {
    if (fetchedPropietario) {
      setPropietario(fetchedPropietario);
    }
  }, [fetchedPropietario]);

  // Fetch related data
  const { consignaciones } = useConsignaciones({ propietarioId: id });
  const { dispersiones } = useDispersiones({ propietarioId: id });

  // Mientras carga no es «no encontrado»: ese cartel salía un instante en
  // cada ficha y después llegaba el dato (Nico, 2026-09-02 12:47).
  if (!propietario && isLoading) {
    return (
      <div className="p-6 lg:p-8" role="status" aria-live="polite" data-testid="propietario-cargando">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner size="sm" />
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!propietario) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" weight="duotone" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            {t('inmobiliaria.propietarios.notFound')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {t('inmobiliaria.propietarios.notFoundDesc')}
          </p>
          <Button hideArrow onClick={() => router.push('/panel/inmobiliaria/propietarios')}>
            <CaretLeft className="w-4 h-4" />
            {t('inmobiliaria.propietarios.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  const isCompany = propietario.documentType === 'NIT';
  const email = propietario.email;
  const phone = propietario.phone;

  const handleCopy = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
      toast.success(t('inmobiliaria.propietarios.detail.copied'));
    } catch (err) {
      toast.error(t('inmobiliaria.propietarios.detail.copyError'));
    }
  };

  const handleEditSubmit = async (data: PropietarioFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(t('inmobiliaria.propietarios.toasts.updated'));
    setShowEditModal(false);
  };

  const handleDelete = () => {
    toast.success(t('inmobiliaria.propietarios.toasts.deleted', { name: propietario.name }));
    router.push('/panel/inmobiliaria/propietarios');
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Update local state
      if (propietario) {
        setPropietario({
          ...propietario,
          notes: notesValue,
          updatedAt: new Date().toISOString(),
        });
      }
      toast.success(t('inmobiliaria.propietarios.detail.notesSaved'));
      setShowNotesModal(false);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button
          variant="link"
          size="sm"
          hideArrow
          onClick={() => router.push('/panel/inmobiliaria/propietarios')}
          className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          {t('inmobiliaria.propietarios.title')}
        </Button>
        <CaretRight className="w-3 h-3" />
        <span className="text-foreground">{propietario.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn(
            'w-16 h-16 rounded-xl flex items-center justify-center shrink-0',
            isCompany
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary-soft text-primary'
          )}>
            {isCompany ? <Buildings className="w-8 h-8" /> : <User className="w-8 h-8" />}
          </div>

          {/* Info */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {propietario.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {propietario.documentType}: {propietario.documentNumber}
            </p>

            {/* Tags */}
            {propietario.tags && propietario.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {propietario.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" hideArrow onClick={() => setShowEditModal(true)}>
            <PencilSimple className="w-4 h-4" />
            {t('inmobiliaria.propietarios.edit')}
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              hideArrow
              aria-label={t('inmobiliaria.propietarios.detail.exportData')}
              onClick={() => setShowActionsMenu(!showActionsMenu)}
            >
              <DotsThree className="w-5 h-5" weight="bold" />
            </Button>

            <AnimatePresence>
              {showActionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-border bg-card z-10"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    className="w-full justify-start gap-3 px-3 font-normal text-foreground"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{t('inmobiliaria.propietarios.detail.generateStatement')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    className="w-full justify-start gap-3 px-3 font-normal text-foreground"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('inmobiliaria.propietarios.detail.exportData')}</span>
                  </Button>
                  <div className="h-px bg-border my-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full justify-start gap-3 px-3 font-normal text-danger hover:bg-danger-soft"
                  >
                    <TrashSimple className="w-4 h-4" />
                    <span>{t('inmobiliaria.common.delete')}</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats */}
      <PropietarioStats propietario={propietario} variant="full" />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Bank */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <h3 className="text-base font-semibold text-foreground mb-4">
              {t('inmobiliaria.propietarios.detail.contactInfo')}
            </h3>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Envelope className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.email')}</p>
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {email}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                {email && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(email, 'email')}
                    aria-label={t('inmobiliaria.propietarios.detail.copied')}
                    icon={copiedEmail ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  />
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.phone')}</p>
                    {phone ? (
                      <a
                        href={`tel:${phone}`}
                        className="text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {phone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                {phone && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(phone, 'phone')}
                    aria-label={t('inmobiliaria.propietarios.detail.copied')}
                    icon={copiedPhone ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  />
                )}
              </div>

              {/* Address */}
              {propietario.address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.address')}</p>
                    <p className="text-sm text-foreground">
                      {propietario.address}
                      {propietario.city && `, ${propietario.city}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank Info */}
          <PropietarioBankInfo
            bankAccount={propietario.bankAccount}
            onEdit={() => setShowEditModal(true)}
          />

          {/* Timestamps */}
          <div className="p-4 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-0.5">
            <p>{t('inmobiliaria.propietarios.detail.createdAt')}: {new Date(propietario.createdAt).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'long' })}</p>
            <p>{t('inmobiliaria.propietarios.detail.updatedAt')}: {new Date(propietario.updatedAt).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'long' })}</p>
          </div>
        </div>

        {/* Right Column - Properties & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <SegmentedControl<typeof activeTab>
            value={activeTab}
            onChange={setTab}
            aria-label={t('inmobiliaria.propietarios.detail.properties')}
            options={[
              {
                value: 'properties',
                ariaLabel: t('inmobiliaria.propietarios.detail.properties'),
                label: (
                  <span className="flex items-center gap-2">
                    {t('inmobiliaria.propietarios.detail.properties')}
                    <span className="tabular-nums text-fg-muted">{consignaciones.length}</span>
                  </span>
                ),
              },
              {
                value: 'payments',
                ariaLabel: t('inmobiliaria.propietarios.detail.payments'),
                label: (
                  <span className="flex items-center gap-2">
                    {t('inmobiliaria.propietarios.detail.payments')}
                    <span className="tabular-nums text-fg-muted">{dispersiones.length}</span>
                  </span>
                ),
              },
              {
                value: 'notes',
                label: t('inmobiliaria.propietarios.detail.notes'),
              },
            ]}
          />

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'properties' && (
              <motion.div
                key="properties"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {consignaciones.length > 0 ? (
                  consignaciones.map((consignacion) => (
                    <PropertyCard key={consignacion.id} consignacion={consignacion} />
                  ))
                ) : (
                  <div className="flex flex-col items-center text-center py-14 rounded-xl border border-border bg-card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <House className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                      {t('inmobiliaria.propietarios.detail.noProperties')}
                    </p>
                    <Button hideArrow onClick={() => toast.info('Próximamente')}>
                      <Plus className="w-4 h-4" />
                      {t('inmobiliaria.propietarios.detail.newConsignment')}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {dispersiones.length > 0 ? (
                  dispersiones.map((dispersion) => (
                    <PaymentHistoryItem key={dispersion.id} dispersion={dispersion} />
                  ))
                ) : (
                  <div className="flex flex-col items-center text-center py-14 rounded-xl border border-border bg-card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <CurrencyDollar className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {t('inmobiliaria.propietarios.detail.noPayments')}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-5 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Note className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">
                      {t('inmobiliaria.propietarios.detail.internalNotes')}
                    </h3>
                  </div>

                  {propietario.notes ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {propietario.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{t('inmobiliaria.propietarios.detail.noNotes')}</p>
                  )}

                  <Button
                    variant="link"
                    hideArrow
                    className="mt-4 h-auto p-0"
                    onClick={() => {
                      setNotesValue(propietario.notes || '');
                      setShowNotesModal(true);
                    }}
                  >
                    {propietario.notes ? t('inmobiliaria.propietarios.detail.editNotes') : t('inmobiliaria.propietarios.detail.addNotes')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('inmobiliaria.propietarios.editOwner')}
        size="lg"
      >
        <PropietarioForm
          initialData={propietario}
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
          mode="edit"
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('inmobiliaria.propietarios.deleteOwner')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('inmobiliaria.propietarios.deleteConfirm', { name: propietario.name })}
          </p>
          {propietario.propertyCount > 0 && (
            <div className="p-3 rounded-xl bg-warning-soft border border-warning/30">
              <div className="flex items-center gap-2 text-warning">
                <Warning className="w-4 h-4" />
                <p className="text-sm">
                  {t('inmobiliaria.propietarios.deleteWarningProperties', { count: propietario.propertyCount })}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 justify-end pt-4">
            <Button variant="secondary" hideArrow onClick={() => setShowDeleteModal(false)}>
              {t('inmobiliaria.common.cancel')}
            </Button>
            <Button variant="destructive" hideArrow onClick={handleDelete}>
              {t('inmobiliaria.common.delete')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notes Modal */}
      <Modal
        open={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title={t('inmobiliaria.propietarios.detail.internalNotes')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('inmobiliaria.propietarios.detail.notesAbout', { name: propietario.name })}
            </label>
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder={t('inmobiliaria.propietarios.detail.notesPlaceholder')}
              rows={6}
              className="resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('inmobiliaria.propietarios.detail.notesPrivacy')}
            </p>
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <Button variant="secondary" hideArrow onClick={() => setShowNotesModal(false)}>
              {t('inmobiliaria.common.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleSaveNotes}
              isLoading={isSavingNotes}
              disabled={isSavingNotes}
            >
              {isSavingNotes ? t('inmobiliaria.common.saving') : t('inmobiliaria.propietarios.detail.saveNotes')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function PropietarioDetailPage() {
  return (
    <PageGuard module="propietarios">
      <PropietarioDetailContent />
    </PageGuard>
  );
}
