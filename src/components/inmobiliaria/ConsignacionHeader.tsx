'use client';

import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  MapPin,
  CalendarBlank,
  Percent,
  PencilSimple,
  Eye,
  DotsThree,
  CaretDown,
  ArrowSquareOut,
  XCircle,
  Wrench,
  CheckCircle,
  Timer,
  Images,
  Car,
  Mountains,
  Prohibit,
  Plus,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Button,
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
} from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import type { Consignacion, PropertyAvailability, ConsignacionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { textoDeLaComision } from '@/lib/inmuebles/comision-del-mandato';

interface ConsignacionHeaderProps {
  consignacion: Consignacion;
  /**
   * First photo of the linked `Property` (from `properties.mapper.ts` →
   * `thumbnailUrl`). `consignacion.propertyThumbnail` is never populated by
   * the back — the consignaciones endpoint doesn't own property photos, the
   * Property entity does (T-0022 WU-1). Falls back to
   * `consignacion.propertyThumbnail` only in case the back ever starts
   * sending it directly; falsy/empty renders the placeholder icon, which is
   * also the correct state while the property is loading or its fetch failed.
   */
  propertyThumbnailUrl?: string;
  /**
   * Todas las fotos del inmueble (ordenadas, la primera es la portada). Con
   * al menos una, la portada del encabezado se puede abrir en grande y
   * muestra cuántas hay (Nico, 2026-09-02: «me debería dejar ver todas las
   * imágenes que tenga el inmueble»).
   */
  fotos?: string[];
  onVerFotos?: () => void;
  onEdit?: () => void;
  onViewPortal?: () => void;
  onChangeStatus?: (status: PropertyAvailability) => void;
  onTerminate?: () => void;
  /**
   * Cuándo terminó el mandato (ISO), sacado del evento `consignacion_terminada`
   * del historial. `null` = terminó antes de que existiera ese evento: el
   * banner lo dice sin fecha antes que inventar una.
   */
  fechaDeTerminacion?: string | null;
  /**
   * El inmueble tiene un contrato de arriendo vigente. Con el mandato
   * terminado hay que decirlo: el contrato sigue su curso por su lado.
   */
  contratoVigente?: boolean;
  /*
   * 🔴 `onRenew` se retiró junto con su renglón del menú: «Renovar
   * consignación» sólo mostraba «próximamente». No hay endpoint de renovación
   * de consignación (el `RenovacionesService` del back renueva CONTRATOS, que
   * es otra cosa). Un ítem que sólo se disculpa es peor que ninguno: ocupa el
   * lugar de la acción real. Vuelve cuando exista la ruta.
   */
}

// Property type icons
const PROPERTY_TYPE_ICONS: Record<Consignacion['propertyType'], React.ElementType> = {
  apartment: Buildings,
  house: House,
  studio: Buildings,
  commercial: Storefront,
  office: Briefcase,
  warehouse: Warehouse,
  parking: Car,
  land: Mountains,
};

// Availability status colors (labels resolved via i18n in component)
const AVAILABILITY_STYLES: Record<PropertyAvailability, { bg: string; text: string; labelKey: string; icon: React.ElementType }> = {
  available: {
    bg: 'bg-success-soft',
    text: 'text-success',
    labelKey: 'inmobiliaria.consignaciones.availability.available',
    icon: CheckCircle,
  },
  rented: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    labelKey: 'inmobiliaria.consignaciones.availability.rented',
    icon: House,
  },
  in_process: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    labelKey: 'inmobiliaria.consignaciones.availability.inProcess',
    icon: Timer,
  },
  maintenance: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    labelKey: 'inmobiliaria.consignaciones.availability.maintenance',
    icon: Wrench,
  },
};

// Consignacion status colors (labels resolved via i18n in component)
const STATUS_STYLES: Record<ConsignacionStatus, { bg: string; text: string; labelKey: string }> = {
  active: {
    bg: 'bg-success-soft',
    text: 'text-success',
    labelKey: 'inmobiliaria.consignaciones.status.active',
  },
  pending: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    labelKey: 'inmobiliaria.consignaciones.status.pending',
  },
  expired: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    labelKey: 'inmobiliaria.consignaciones.status.expired',
  },
  // Apagado, no rojo: un mandato terminado no es una alarma, es un registro
  // cerrado (Nico, 2026-09-13).
  terminated: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    labelKey: 'inmobiliaria.consignaciones.status.terminated',
  },
};

/**
 * ConsignacionHeader - Header section for consignacion detail page
 * Displays property info, status, and action buttons
 */
export function ConsignacionHeader({
  consignacion,
  propertyThumbnailUrl,
  fotos,
  onVerFotos,
  onEdit,
  onViewPortal,
  onChangeStatus,
  onTerminate,
  fechaDeTerminacion,
  contratoVigente,
}: ConsignacionHeaderProps) {
  const { t, formatDate } = useI18n();

  /*
   * 🔴 Un mandato TERMINADO se ve y se comporta distinto (Nico, 2026-09-13,
   * después de «Terminar consignación»: «es súper raro» — la ficha seguía
   * igual, con el chip «Arrendado», y el kebab ofrecía terminarla otra vez).
   * Acá: la foto en gris, sin chip de disponibilidad (ya no rige), un banner
   * que dice cuándo terminó y qué implica, y sólo las acciones que tienen
   * sentido: editar el INMUEBLE (lo descriptivo; el back rechaza los términos
   * del mandato con 409) y abrir una consignación nueva. «Ver en Portal» queda
   * deshabilitado con el porqué; «Cambiar estado» y «Terminar» desaparecen.
   */
  const terminada = consignacion.status === 'terminated';

  const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType];
  const availability = AVAILABILITY_STYLES[consignacion.availability];
  const status = STATUS_STYLES[consignacion.status];
  const AvailabilityIcon = availability.icon;
  const thumbnailUrl = propertyThumbnailUrl || consignacion.propertyThumbnail;
  const canViewPortal = !!consignacion.propertyId;
  const cantidadDeFotos = fotos?.length ?? 0;
  const portadaAbre = cantidadDeFotos > 0 && !!onVerFotos;

  // `overflow-hidden` en el card y NINGÚN radio en la imagen: antes la imagen se
  // recortaba sola con `rounded-l-xl` (32 px) dentro de un card `rounded-lg`
  // (22 px) y las dos curvas nunca coincidían —se veía la costura abajo a la
  // izquierda y la esquina de arriba sin redondear (Nico, 2026-09-03).
  return (
    <div className="overflow-hidden rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
      <div className="flex flex-col lg:flex-row">
        {/* Image/Thumbnail Section */}
        <div className="relative w-full lg:w-80 xl:w-96 h-48 lg:h-auto shrink-0 bg-surface-muted dark:bg-ink overflow-hidden">
          {thumbnailUrl && portadaAbre ? (
            <button
              type="button"
              onClick={onVerFotos}
              className="group block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              aria-label={t('inmobiliaria.consignaciones.header.abrirFotos')}
              data-testid="portada-abrir"
            >
              <img
                src={thumbnailUrl}
                alt={consignacion.propertyTitle}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]',
                  terminada && 'grayscale',
                )}
              />
            </button>
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={consignacion.propertyTitle}
              className={cn('w-full h-full object-cover', terminada && 'grayscale')}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PropertyIcon className="w-20 h-20 text-fg-subtle dark:text-fg-muted" />
            </div>
          )}

          {/* Property type badge */}
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1.5 rounded-full bg-surface-muted backdrop-blur-sm text-sm font-medium text-fg dark:text-fg-subtle flex items-center gap-1.5">
              <PropertyIcon className="w-4 h-4" />
              {t(`inmobiliaria.consignaciones.propertyType.${consignacion.propertyType}`)}
            </span>
          </div>

          {/* Cuántas fotos hay y que se pueden ver todas */}
          {portadaAbre && (
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={onVerFotos}
              className="absolute bottom-3 right-3 h-auto gap-1.5 bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white/70"
              data-testid="portada-ver-fotos"
            >
              <Images className="w-4 h-4" />
              {cantidadDeFotos === 1
                ? t('inmobiliaria.consignaciones.header.verFoto')
                : t('inmobiliaria.consignaciones.header.verFotos', { count: cantidadDeFotos })}
            </Button>
          )}

          {/* Commission pill — a SALE mandate's commissionPercent is always
              0 (contract-addendum-2.md §A.3); show saleCommissionPercent. */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-1.5">
              <Percent className="w-4 h-4" />
              {textoDeLaComision(consignacion)}{' '}
              {consignacion.listingType === 'sale'
                ? t('inmobiliaria.consignaciones.header.saleCommission')
                : t('inmobiliaria.consignaciones.header.commission')}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5 lg:p-6">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* La disponibilidad sale de `availability` (no del contrato) y con
                el mandato terminado ya no describe nada: se esconde. */}
            {!terminada && (
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5', availability.bg, availability.text)}>
                <AvailabilityIcon className="w-4 h-4" />
                {t(availability.labelKey)}
              </span>
            )}
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium', status.bg, status.text)}>
              {t('inmobiliaria.consignaciones.header.consignacion')} {t(status.labelKey)}
            </span>
          </div>

          {terminada && (
            <div
              role="status"
              className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2 mb-4"
              data-testid="banner-consignacion-terminada"
            >
              <Prohibit className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-warning">
                  {fechaDeTerminacion
                    ? t('inmobiliaria.consignaciones.header.terminada.titulo', { fecha: formatDate(fechaDeTerminacion) })
                    : t('inmobiliaria.consignaciones.header.terminada.tituloSinFecha')}
                </p>
                <p className="text-body-sm text-fg-muted mt-0.5">
                  {t('inmobiliaria.consignaciones.header.terminada.detalle')}
                  {contratoVigente && (
                    <>
                      {' '}
                      <span className="font-medium text-fg" data-testid="terminada-con-contrato">
                        {t('inmobiliaria.consignaciones.header.terminada.conContrato')}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-fg mb-2">
            {consignacion.propertyTitle}
          </h1>

          {/* Address */}
          <div className="flex items-center gap-2 text-fg-muted dark:text-fg-subtle mb-4">
            <MapPin className="w-5 h-5 shrink-0" />
            <span className="text-base">
              {consignacion.propertyAddress}, {consignacion.propertyZone}, {consignacion.propertyCity}
            </span>
          </div>

          {/* Rent and Admin Fee — a SALE mandate has no canon (§A.2): show
              the sale commission instead, never "$0" or "$0/mes". */}
          {consignacion.listingType === 'sale' ? (
            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <span className="text-3xl lg:text-4xl font-bold text-fg">
                {consignacion.saleCommissionPercent != null ? `${consignacion.saleCommissionPercent}%` : '—'}
              </span>
              <span className="text-lg text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.header.saleCommission')}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <span className="text-3xl lg:text-4xl font-bold text-fg">
                {consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
              </span>
              <span className="text-lg text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.header.perMonth')}</span>
              {/* `!!x && x > 0`: con `adminFee = 0`, `{0 && …}` pintaba un «0»
                  suelto al lado de «/mes» (Nico, 2026-09-13, con captura). */}
              {!!consignacion.adminFee && consignacion.adminFee > 0 && (
                <span className="text-sm text-fg-subtle dark:text-fg-muted">
                  + {formatCurrency(consignacion.adminFee)} {t('inmobiliaria.consignaciones.header.admin')}
                </span>
              )}
            </div>
          )}

          {/* Contract Dates */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-fg-muted dark:text-fg-subtle mb-6">
            <div className="flex items-center gap-1.5">
              <CalendarBlank className="w-4 h-4" />
              <span>{t('inmobiliaria.consignaciones.header.from')} {formatDate(consignacion.contractDate)}</span>
            </div>
            {consignacion.contractEndDate && (
              <div className="flex items-center gap-1.5">
                <CalendarBlank className="w-4 h-4" />
                <span>{t('inmobiliaria.consignaciones.header.until')} {formatDate(consignacion.contractEndDate)}</span>
              </div>
            )}
            {!!consignacion.minimumTerm && consignacion.minimumTerm > 0 && (
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4" />
                <span>{t('inmobiliaria.consignaciones.header.minimum')} {consignacion.minimumTerm} {t('inmobiliaria.consignaciones.header.months')}</span>
              </div>
            )}
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-faint dark:border-border-strong">
            {/* Edit Button — con el mandato terminado, sólo lo del inmueble */}
            <Button
              hideArrow
              onClick={onEdit}
              disabled={terminada && !consignacion.propertyId}
              title={terminada ? t('inmobiliaria.consignaciones.header.terminada.editarAyuda') : undefined}
              data-testid="header-editar"
            >
              <PencilSimple className="w-4 h-4" />
              {terminada
                ? t('inmobiliaria.consignaciones.header.terminada.editar')
                : t('inmobiliaria.consignaciones.header.edit')}
            </Button>

            {/* View Portal Button */}
            <Button
              variant="secondary"
              hideArrow
              onClick={onViewPortal}
              disabled={!canViewPortal || terminada}
              title={
                terminada
                  ? t('inmobiliaria.consignaciones.header.terminada.viewOnPortal')
                  : canViewPortal
                    ? undefined
                    : t('inmobiliaria.consignaciones.header.viewOnPortalUnavailable')
              }
            >
              <Eye className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.header.viewOnPortal')}
              <ArrowSquareOut className="w-4 h-4" />
            </Button>

            {terminada ? (
              // La salida correcta. El wizard «existente» sólo lista inmuebles
              // SIN mandato y `agencyId + propertyId` es único: hoy no hay un
              // flujo que reabra ESTE inmueble; el enlace lleva a Nueva
              // consignación y el reporte lo deja dicho.
              <Button
                variant="secondary"
                hideArrow
                asChild
                title={t('inmobiliaria.consignaciones.header.terminada.nuevaConsignacionAyuda')}
              >
                <Link href="/panel/inmobiliaria/inmuebles/nuevo?origen=existente" data-testid="header-nueva-consignacion">
                  <Plus className="w-4 h-4" />
                  {t('inmobiliaria.consignaciones.header.terminada.nuevaConsignacion')}
                </Link>
              </Button>
            ) : (
              <>
                {/* Status Dropdown */}
                <DropdownList>
                  <DropdownListTrigger asChild>
                    <Button variant="secondary" hideArrow>
                      {t('inmobiliaria.consignaciones.header.changeStatus')}
                      <CaretDown className="w-4 h-4" />
                    </Button>
                  </DropdownListTrigger>
                  <DropdownListContent align="start" className="w-48">
                    {(Object.entries(AVAILABILITY_STYLES) as [PropertyAvailability, typeof AVAILABILITY_STYLES[PropertyAvailability]][]).map(([key, style]) => {
                      const Icon = style.icon;
                      return (
                        <DropdownListItem
                          key={key}
                          onSelect={() => onChangeStatus?.(key)}
                          className={cn(consignacion.availability === key && 'bg-surface-muted dark:bg-ink')}
                        >
                          <Icon className={cn('w-4 h-4', style.text)} />
                          <span className="text-fg dark:text-fg-subtle">{t(style.labelKey)}</span>
                          {consignacion.availability === key && (
                            <CheckCircle className="w-4 h-4 ml-auto text-primary" />
                          )}
                        </DropdownListItem>
                      );
                    })}
                  </DropdownListContent>
                </DropdownList>

                {/* More Actions Menu */}
                <DropdownList>
                  <DropdownListTrigger asChild>
                    <IconButton
                      variant="outline"
                      aria-label={t('inmobiliaria.consignaciones.header.moreActions')}
                      className="ml-auto"
                      icon={<DotsThree className="w-5 h-5" weight="bold" />}
                    />
                  </DropdownListTrigger>
                  <DropdownListContent align="end" className="w-48">
                    <DropdownListItem
                      onSelect={() => onTerminate?.()}
                      className="text-danger focus:text-danger"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('inmobiliaria.consignaciones.header.terminateConsignment')}
                    </DropdownListItem>
                  </DropdownListContent>
                </DropdownList>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsignacionHeader;
