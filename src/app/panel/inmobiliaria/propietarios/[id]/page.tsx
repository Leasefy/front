'use client';

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
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Modal */}
        <div
          className={cn(
            'pointer-events-auto bg-white dark:bg-[#141416] w-full rounded-2xl shadow-2xl flex flex-col max-h-[85vh]',
            sizeClasses[size]
          )}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-[#2a2a2c] shrink-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#1f1f21] flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
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
    available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rented: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_process: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    maintenance: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
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
      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
          {consignacion.propertyThumbnail ? (
            <img
              src={consignacion.propertyThumbnail}
              alt={consignacion.propertyTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <House className="w-8 h-8 text-neutral-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                {consignacion.propertyTitle}
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                {consignacion.propertyAddress}
              </p>
            </div>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', statusColors[consignacion.availability])}>
              {statusLabels[consignacion.availability]}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {formatCurrency(consignacion.monthlyRent)}
              </p>
              <p className="text-xs text-neutral-500">{t('inmobiliaria.common.perMonth')}</p>
            </div>
            <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {consignacion.commissionPercent}%
              </p>
              <p className="text-xs text-neutral-500">{t('inmobiliaria.agentes.commission')}</p>
            </div>
            {consignacion.currentTenantName && (
              <>
                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
                    {consignacion.currentTenantName}
                  </p>
                  <p className="text-xs text-neutral-500">{t('inmobiliaria.propietarios.detail.tenant')}</p>
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
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
    <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          dispersion.status === 'completed'
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : 'bg-amber-100 dark:bg-amber-900/30'
        )}>
          {dispersion.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-white capitalize">
            {monthLabel}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {dispersion.items.length} {t('inmobiliaria.propietarios.detail.propertiesCount')}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold text-neutral-900 dark:text-white">
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
export default function PropietarioDetailPage() {
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
  const [activeTab, setActiveTab] = useState<'properties' | 'payments' | 'notes'>('properties');
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch propietario and keep local state for updates
  const { propietario: fetchedPropietario } = usePropietario(id);
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

  if (!propietario) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <User className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            {t('inmobiliaria.propietarios.notFound')}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            {t('inmobiliaria.propietarios.notFoundDesc')}
          </p>
          <button
            onClick={() => router.push('/panel/inmobiliaria/propietarios')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono font-medium transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            {t('inmobiliaria.propietarios.backToList')}
          </button>
        </div>
      </div>
    );
  }

  const isCompany = propietario.documentType === 'NIT';

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
      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <button
          onClick={() => router.push('/panel/inmobiliaria/propietarios')}
          className="hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          {t('inmobiliaria.propietarios.title')}
        </button>
        <CaretRight className="w-3 h-3" />
        <span className="text-neutral-900 dark:text-white">{propietario.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center shrink-0',
            isCompany
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
          )}>
            {isCompany ? <Buildings className="w-8 h-8" /> : <User className="w-8 h-8" />}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {propietario.name}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {propietario.documentType}: {propietario.documentNumber}
            </p>

            {/* Tags */}
            {propietario.tags && propietario.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {propietario.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400"
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <PencilSimple className="w-4 h-4" />
            {t('inmobiliaria.propietarios.edit')}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <DotsThree className="w-5 h-5" weight="bold" />
            </button>

            <AnimatePresence>
              {showActionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                >
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">{t('inmobiliaria.propietarios.detail.generateStatement')}</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{t('inmobiliaria.propietarios.detail.exportData')}</span>
                  </button>
                  <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <TrashSimple className="w-4 h-4" />
                    <span className="text-sm">{t('inmobiliaria.common.delete')}</span>
                  </button>
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
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
              {t('inmobiliaria.propietarios.detail.contactInfo')}
            </h3>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Envelope className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.email')}</p>
                    <a
                      href={`mailto:${propietario.email}`}
                      className="text-neutral-900 dark:text-white hover:text-indigo-500 transition-colors"
                    >
                      {propietario.email}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(propietario.email, 'email')}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.phone')}</p>
                    <a
                      href={`tel:${propietario.phone}`}
                      className="text-neutral-900 dark:text-white hover:text-indigo-500 transition-colors"
                    >
                      {propietario.phone}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(propietario.phone, 'phone')}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  {copiedPhone ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Address */}
              {propietario.address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.detail.address')}</p>
                    <p className="text-neutral-900 dark:text-white">
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
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] text-sm text-neutral-500 dark:text-neutral-400">
            <p>{t('inmobiliaria.propietarios.detail.createdAt')}: {new Date(propietario.createdAt).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'long' })}</p>
            <p>{t('inmobiliaria.propietarios.detail.updatedAt')}: {new Date(propietario.updatedAt).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'long' })}</p>
          </div>
        </div>

        {/* Right Column - Properties & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 w-fit">
            {[
              { key: 'properties', label: t('inmobiliaria.propietarios.detail.properties'), count: consignaciones.length },
              { key: 'payments', label: t('inmobiliaria.propietarios.detail.payments'), count: dispersiones.length },
              { key: 'notes', label: t('inmobiliaria.propietarios.detail.notes') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    activeTab === tab.key
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

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
                  <div className="text-center py-12 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <House className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                      {t('inmobiliaria.propietarios.detail.noProperties')}
                    </p>
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono text-sm font-medium transition-colors">
                      <Plus className="w-4 h-4" />
                      {t('inmobiliaria.propietarios.detail.newConsignment')}
                    </button>
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
                  <div className="text-center py-12 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <CurrencyDollar className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400">
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
                <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                  <div className="flex items-center gap-2 mb-4">
                    <Note className="w-5 h-5 text-neutral-500" />
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {t('inmobiliaria.propietarios.detail.internalNotes')}
                    </h3>
                  </div>

                  {propietario.notes ? (
                    <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                      {propietario.notes}
                    </p>
                  ) : (
                    <p className="text-neutral-400 italic">{t('inmobiliaria.propietarios.detail.noNotes')}</p>
                  )}

                  <button
                    onClick={() => {
                      setNotesValue(propietario.notes || '');
                      setShowNotesModal(true);
                    }}
                    className="mt-4 text-sm text-indigo-500 hover:text-indigo-600 font-medium"
                  >
                    {propietario.notes ? t('inmobiliaria.propietarios.detail.editNotes') : t('inmobiliaria.propietarios.detail.addNotes')}
                  </button>
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
          <p className="text-neutral-600 dark:text-neutral-400">
            {t('inmobiliaria.propietarios.deleteConfirm', { name: propietario.name })}
          </p>
          {propietario.propertyCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Warning className="w-4 h-4" />
                <p className="text-sm">
                  {t('inmobiliaria.propietarios.deleteWarningProperties', { count: propietario.propertyCount })}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 justify-end pt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {t('inmobiliaria.common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white uppercase tracking-wide font-mono font-medium transition-colors"
            >
              {t('inmobiliaria.common.delete')}
            </button>
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
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('inmobiliaria.propietarios.detail.notesAbout', { name: propietario.name })}
            </label>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder={t('inmobiliaria.propietarios.detail.notesPlaceholder')}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
            <p className="mt-2 text-xs text-neutral-500">
              {t('inmobiliaria.propietarios.detail.notesPrivacy')}
            </p>
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              onClick={() => setShowNotesModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {t('inmobiliaria.common.cancel')}
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingNotes ? (
                <>
                  <SpinnerGap className="w-4 h-4 animate-spin" />
                  {t('inmobiliaria.common.saving')}
                </>
              ) : (
                t('inmobiliaria.propietarios.detail.saveNotes')
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
