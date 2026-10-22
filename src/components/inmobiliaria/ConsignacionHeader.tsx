'use client';

import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
import { TEXTO_CANON_POR_CONFIRMAR } from '@/lib/inmuebles/canon-por-confirmar';
import { CanonPorConfirmarBadge } from './CanonPorConfirmar';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  MapPin,
  PencilSimple,
  Eye,
  DotsThree,
  CaretDown,
  XCircle,
  Wrench,
  CheckCircle,
  Timer,
  Images,
  Car,
  Mountains,
  Prohibit,
  Plus,
  CalendarPlus,
} from '@phosphor-icons/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Button,
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
} from '@/components/ui';
import { CampoDeMedianoche, IconButton, Ilustracion, StatusBadge, type SemanticTone } from '@leasefy/cadence';
import type { Consignacion, PropertyAvailability, ConsignacionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { textoDeLaComision } from '@/lib/inmuebles/comision-del-mandato';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { cajonDelInmueble } from '@/lib/inmobiliaria/cajon-del-inmueble';

interface ConsignacionHeaderProps {
  consignacion: Consignacion;
  /**
   * First photo of the linked `Property` (from `properties.mapper.ts` →
   * `thumbnailUrl`). `consignacion.propertyThumbnail` is never populated by
   * the back — the consignaciones endpoint doesn't own property photos, the
   * Property entity does (T-0022 WU-1). Falls back to
   * `consignacion.propertyThumbnail` only in case the back ever starts
   * sending it directly; falsy/empty renders the placeholder, which is
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
  /** Las migas de pan («‹ Inmuebles / …»): van en la misma fila que las acciones. */
  migas?: ReactNode;
  /** Una acción de la página que va antes de las de la ficha («Pedir cita»). */
  accionPrevia?: ReactNode;
  /** La franja viva bajo el canon: inquilino · hasta cuándo · asesor (`FranjaDelArriendo`). */
  franja?: ReactNode;
  /** Vacante hace más de 30 días: el estado «Disponible» pide atención (ámbar). */
  vacanciaLarga?: boolean;
  /** «Agendar visita» en el menú ⋯ (sólo cuando se puede: inmueble disponible). */
  onAgendarVisita?: () => void;
  /** El precio de venta del inmueble (`property.salePrice`): en una venta es la cifra protagonista. */
  precioDeVenta?: number | null;
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

// Availability: el tono del estado (punto + palabra) y el ícono del menú para cambiarlo.
const AVAILABILITY_STYLES: Record<PropertyAvailability, { tono: SemanticTone; text: string; labelKey: string; icon: React.ElementType }> = {
  available: {
    tono: 'neutral',
    text: 'text-success',
    labelKey: 'inmobiliaria.consignaciones.availability.available',
    icon: CheckCircle,
  },
  // Arrendado es la buena noticia: hay contrato y entra el canon.
  rented: {
    tono: 'success',
    text: 'text-primary',
    labelKey: 'inmobiliaria.consignaciones.availability.rented',
    icon: House,
  },
  in_process: {
    tono: 'warning',
    text: 'text-warning',
    labelKey: 'inmobiliaria.consignaciones.availability.inProcess',
    icon: Timer,
  },
  maintenance: {
    tono: 'critical',
    text: 'text-danger',
    labelKey: 'inmobiliaria.consignaciones.availability.maintenance',
    icon: Wrench,
  },
};

// El estado del mandato sólo se dice cuando NO es el normal (activo).
const STATUS_STYLES: Record<ConsignacionStatus, { tono: SemanticTone; labelKey: string }> = {
  active: { tono: 'success', labelKey: 'inmobiliaria.consignaciones.status.active' },
  pending: { tono: 'warning', labelKey: 'inmobiliaria.consignaciones.status.pending' },
  expired: { tono: 'neutral', labelKey: 'inmobiliaria.consignaciones.status.expired' },
  // Apagado, no rojo: un mandato terminado no es una alarma, es un registro
  // cerrado (Nico, 2026-09-13).
  terminated: { tono: 'neutral', labelKey: 'inmobiliaria.consignaciones.status.terminated' },
};

/** Para comparar textos sin tildes ni mayúsculas («ACUARELA DEL RIO» = «Acuarela del Río»). */
function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * La línea de la dirección sin repetir lo que ya dice el título: «Apartamento en
 * Acuarela del Rio, Caldas» no necesita otra vez «ACUARELA DEL RIO, Caldas».
 */
export function direccionSinRepetir(c: Pick<Consignacion, 'propertyTitle' | 'propertyAddress' | 'propertyZone' | 'propertyCity'>): string {
  const titulo = sinTildes(c.propertyTitle ?? '');
  const queda = (v?: string | null) => (v && !titulo.includes(sinTildes(v)) ? v : null);
  // El título que ES la dirección (cartera migrada: «CR 53 CL 129 SUR - 58 INT 701…»): no se repite.
  return [queda(c.propertyAddress), barrioYCiudad(queda(c.propertyZone), queda(c.propertyCity))].filter(Boolean).join(', ');
}

/**
 * ConsignacionHeader — la portada de la ficha del inmueble.
 *
 * 🔴 21-10-2026 (revisión de diseño, 4,4 → rehecha): arriba, en la fila de las
 * migas, las acciones (UNA azul: Editar). La portada responde la pregunta con
 * la que se abre la ficha: qué es, cuánto paga y —en la franja— quién vive,
 * hasta cuándo y quién lo lleva. Los hechos del mandato (desde, comisión,
 * mínimo) se fueron a «Mandato y giro». El estado se cambia tocándolo. Sin
 * foto, la portada es el momento de marca de la pantalla: el campo de
 * medianoche con la casa 3D y «Agregar fotos».
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
  migas,
  accionPrevia,
  franja,
  vacanciaLarga = false,
  onAgendarVisita,
  precioDeVenta = null,
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
  // QA con avatares (04-10): un borrador no está publicado; decía «Disponible».
  const esBorrador = cajonDelInmueble({ kind: 'consignacion', ...consignacion }) === 'borrador';
  const availability = esBorrador
    ? { tono: 'neutral' as SemanticTone, labelKey: 'inmobiliaria.consignaciones.availability.draft' }
    : AVAILABILITY_STYLES[consignacion.availability];
  const tonoDelEstado: SemanticTone =
    !esBorrador && consignacion.availability === 'available' && vacanciaLarga ? 'warning' : availability.tono;
  const status = STATUS_STYLES[consignacion.status];
  const thumbnailUrl = propertyThumbnailUrl || consignacion.propertyThumbnail;
  const canViewPortal = !!consignacion.propertyId;
  const cantidadDeFotos = fotos?.length ?? 0;
  const portadaAbre = cantidadDeFotos > 0 && !!onVerFotos;

  return (
    <div className="space-y-4">
      {/* ── Fila de arriba: dónde estoy y qué hago ───────────────────── */}
      <div className="flex min-h-9 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">{migas}</div>
        <div className="flex shrink-0 items-center gap-2">
          {accionPrevia}

          {/*
            Revisión 21-10: arriba sólo lo que se puede hacer. «Ver el aviso público» vive en el
            menú ⋯ y en «Arrendarlo», junto al interruptor del marketplace. Con el mandato
            terminado no hay botones apagados: lo que sigue es una consignación nueva.
          */}
          {terminada ? (
            // La salida correcta. El wizard «existente» sólo lista inmuebles
            // SIN mandato y `agencyId + propertyId` es único: hoy no hay un
            // flujo que reabra ESTE inmueble; el enlace lleva a Nueva
            // consignación y el reporte lo deja dicho.
            <Button
              size="sm"
              hideArrow
              asChild
              title={t('inmobiliaria.consignaciones.header.terminada.nuevaConsignacionAyuda')}
            >
              <Link href="/panel/inmobiliaria/inmuebles/nuevo?origen=existente" data-testid="header-nueva-consignacion">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('inmobiliaria.consignaciones.header.terminada.nuevaConsignacion')}</span>
              </Link>
            </Button>
          ) : null}

          {/* Editar: la única azul con el mandato vivo; con el mandato terminado, sólo lo del inmueble y en gris. */}
          {!(terminada && !consignacion.propertyId) ? (
            <Button
              variant={terminada ? 'secondary' : 'default'}
              size="sm"
              hideArrow
              onClick={onEdit}
              title={terminada ? t('inmobiliaria.consignaciones.header.terminada.editarAyuda') : undefined}
              data-testid="header-editar"
            >
              <PencilSimple className="h-4 w-4" />
              {terminada
                ? t('inmobiliaria.consignaciones.header.terminada.editar')
                : t('inmobiliaria.consignaciones.header.edit')}
            </Button>
          ) : null}

          {!terminada ? (
            <DropdownList>
              <DropdownListTrigger asChild>
                <IconButton
                  variant="outline"
                  size="sm"
                  aria-label={t('inmobiliaria.consignaciones.header.moreActions')}
                  icon={<DotsThree className="h-5 w-5" weight="bold" />}
                />
              </DropdownListTrigger>
              <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
                {onAgendarVisita ? (
                  <DropdownListItem onSelect={() => onAgendarVisita()} data-testid="menu-agendar-visita">
                    <CalendarPlus className="h-4 w-4" />
                    Agendar visita
                  </DropdownListItem>
                ) : null}
                {canViewPortal ? (
                  <DropdownListItem onSelect={() => onViewPortal?.()} data-testid="menu-ver-aviso">
                    <Eye className="h-4 w-4" />
                    {t('inmobiliaria.consignaciones.header.viewOnPortal')}
                  </DropdownListItem>
                ) : null}
                <DropdownListItem onSelect={() => onTerminate?.()} className="text-danger focus:text-danger">
                  <XCircle className="h-4 w-4" />
                  {t('inmobiliaria.consignaciones.header.terminateConsignment')}
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          ) : null}
        </div>
      </div>

      {/* ── La portada ──────────────────────────────────────────────── */}
      {/* `overflow-hidden` en la tarjeta y NINGÚN radio en la imagen: antes la imagen se
          recortaba sola con otro radio y las dos curvas nunca coincidían (Nico, 2026-09-03). */}
      <article className="overflow-hidden rounded-[28px] border border-border-faint bg-surface shadow-[0_1px_2px_rgba(20,19,15,0.04),0_16px_40px_-20px_rgba(20,19,15,0.18)] dark:border-border-strong dark:bg-bg">
        <div className="flex flex-col lg:flex-row">
          {/* La foto, o el campo de medianoche con la casa */}
          <div
            className={cn(
              'relative w-full shrink-0 overflow-hidden lg:h-auto lg:min-h-[320px] lg:w-[340px] xl:w-[380px]',
              thumbnailUrl ? 'h-56 bg-surface-muted dark:bg-ink sm:h-72' : 'h-28 sm:h-56',
            )}
          >
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
                className={cn('h-full w-full object-cover', terminada && 'grayscale')}
              />
            ) : terminada ? (
              // Terminada: sin marca, en gris. Es un registro cerrado.
              <div className="flex h-full w-full items-center justify-center bg-surface-muted dark:bg-ink" data-testid="portada-sin-foto">
                <Ilustracion nombre="casa" tono="grafito" tamano={160} className="h-24 w-24 opacity-70 lg:h-36 lg:w-36" />
              </div>
            ) : (
              // El momento de marca de la pantalla: medianoche, la retícula y la casa en voltaje.
              <CampoDeMedianoche
                as="div"
                cruces={false}
                className="flex h-full w-full flex-row items-center justify-center gap-5 rounded-none px-6 py-3 sm:py-5 lg:flex-col lg:gap-4"
                data-testid="portada-sin-foto"
              >
                <Ilustracion nombre="casa" tono="voltaje" tamano={176} className="h-20 w-20 sm:h-36 sm:w-36 lg:h-44 lg:w-44" />
                <a
                  href="#fotos"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-body-sm font-medium text-ink-fg ring-1 ring-inset ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  data-testid="portada-agregar-fotos"
                >
                  <Images className="h-4 w-4" aria-hidden="true" />
                  {t('inmobiliaria.consignaciones.header.agregarFotos')}
                </a>
              </CampoDeMedianoche>
            )}

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
                <Images className="h-4 w-4" />
                {cantidadDeFotos === 1
                  ? t('inmobiliaria.consignaciones.header.verFoto')
                  : t('inmobiliaria.consignaciones.header.verFotos', { count: cantidadDeFotos })}
              </Button>
            )}
          </div>

          {/* Lo que es, cuánto paga y quién vive */}
          <div className="min-w-0 flex-1 p-6 lg:p-8">
            {/* Estado (punto + palabra; tocándolo se cambia) · tipo · el mandato si no está activo */}
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* La disponibilidad sale de `availability` (no del contrato) y con
                  el mandato terminado ya no describe nada: se esconde. */}
              {!terminada && (
                <DropdownList>
                  <DropdownListTrigger asChild>
                    <button
                      type="button"
                      className="group -m-0.5 inline-flex items-center gap-1 rounded-[8px] p-0.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      data-testid="cambiar-estado"
                    >
                      <StatusBadge tone={tonoDelEstado}>{t(availability.labelKey)}</StatusBadge>
                      <CaretDown className="h-3.5 w-3.5 text-fg-subtle transition-colors group-hover:text-fg" aria-hidden="true" />
                      <span className="sr-only">{t('inmobiliaria.consignaciones.header.changeStatus')}</span>
                    </button>
                  </DropdownListTrigger>
                  <DropdownListContent align="start" className="w-64">
                    {(Object.entries(AVAILABILITY_STYLES) as [PropertyAvailability, (typeof AVAILABILITY_STYLES)[PropertyAvailability]][]).map(([key, style]) => {
                      const Icon = style.icon;
                      // IN-21 (QA 04-10): con contrato vigente, «Disponible» viene
                      // apagado y dice por qué (el back igual lo frena).
                      const frenadoPorContrato = key === 'available' && consignacion.arrendado === true;
                      return (
                        <DropdownListItem
                          key={key}
                          disabled={frenadoPorContrato}
                          data-testid={`cambiar-estado-${key}`}
                          onSelect={() => onChangeStatus?.(key)}
                          className={cn(consignacion.availability === key && 'bg-surface-muted dark:bg-ink')}
                        >
                          <Icon className={cn('h-4 w-4', style.text)} />
                          <span className="text-fg dark:text-fg-subtle">
                            {t(style.labelKey)}
                            {frenadoPorContrato && (
                              <span className="block text-xs text-fg-muted">
                                Tiene un contrato vigente: primero hay que terminarlo.
                              </span>
                            )}
                          </span>
                          {consignacion.availability === key && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
                        </DropdownListItem>
                      );
                    })}
                  </DropdownListContent>
                </DropdownList>
              )}
              {consignacion.status !== 'active' ? (
                <StatusBadge tone={status.tono}>
                  {t('inmobiliaria.consignaciones.header.consignacion')} {t(status.labelKey)}
                </StatusBadge>
              ) : null}
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                <PropertyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`inmobiliaria.consignaciones.propertyType.${consignacion.propertyType}`)}
              </span>
            </div>

            <h1 className="mb-2 text-[28px] font-[420] leading-[1.1] tracking-[-0.02em] text-fg [text-wrap:balance] lg:text-[34px]">
              {consignacion.propertyTitle}
            </h1>

            {/* Terminada: una línea callada bajo el título (el chip ya dice «terminada»),
                no otra caja ámbar dentro de la portada. */}
            {terminada && (
              <p role="status" className="mb-3 text-body-sm text-fg-muted" data-testid="banner-consignacion-terminada">
                <Prohibit className="mr-1.5 inline h-4 w-4 -translate-y-px text-fg-subtle" aria-hidden="true" />
                {fechaDeTerminacion
                  ? t('inmobiliaria.consignaciones.header.terminada.titulo', { fecha: formatDate(fechaDeTerminacion) })
                  : t('inmobiliaria.consignaciones.header.terminada.tituloSinFecha')}
                {' · '}
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
            )}

            {direccionSinRepetir(consignacion) ? (
              <p className="mb-5 flex items-start gap-2 text-[15px] text-fg-muted dark:text-fg-subtle">
                <MapPin className="mt-[3px] h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{direccionSinRepetir(consignacion)}</span>
              </p>
            ) : (
              <div className="mb-5" />
            )}

            {/* El canon (o, en una venta, la comisión de venta — §A.2: nunca «$0/mes»). */}
            {consignacion.listingType === 'sale' ? (
              // Venta (revisión 21-10): la cifra grande es el PRECIO; la comisión, un dato chico.
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" data-testid="precio-de-venta">
                {precioDeVenta != null && precioDeVenta > 0 ? (
                  <>
                    <span className="font-mono text-[32px] font-[420] tabular-nums tracking-[-0.03em] text-fg lg:text-[40px]">
                      {formatCurrency(precioDeVenta)}
                    </span>
                    <span className="text-body text-fg-muted dark:text-fg-subtle">precio de venta</span>
                  </>
                ) : (
                  <span className="text-[22px] font-[420] text-fg-muted">Sin precio de venta</span>
                )}
                <span className="basis-full text-body-sm text-fg-muted">
                  {t('inmobiliaria.consignaciones.header.saleCommission')}:{' '}
                  <span className="font-mono tabular-nums text-fg">{textoDeLaComision(consignacion)}</span>
                </span>
                {/* Nico 14-10: la venta que entró sin precio. */}
                {consignacion.canonPorConfirmar ? (
                  <CanonPorConfirmarBadge inmuebleId={consignacion.propertyId} esVenta />
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {/* Terminada: el canon ya no rige; se dice como «Último canon», chico y en gris. */}
                {terminada ? <span className="text-body-sm text-fg-muted">Último canon</span> : null}
                <span
                  className={cn(
                    'font-mono font-[420] tabular-nums tracking-[-0.03em]',
                    terminada ? 'text-[17px] text-fg-muted' : 'text-[32px] text-fg lg:text-[40px]',
                  )}
                >
                  {consignacion.canonPorConfirmar
                    ? TEXTO_CANON_POR_CONFIRMAR
                    : consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
                </span>
                {consignacion.canonPorConfirmar ? (
                  <CanonPorConfirmarBadge inmuebleId={consignacion.propertyId} />
                ) : (
                  <span className="font-mono text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.header.perMonth')}</span>
                )}
                {/* `!!x && x > 0`: con `adminFee = 0`, `{0 && …}` pintaba un «0»
                    suelto al lado de «/mes» (Nico, 2026-09-13, con captura). */}
                {!!consignacion.adminFee && consignacion.adminFee > 0 && (
                  <span className="text-sm text-fg-subtle dark:text-fg-muted">
                    + <span className="font-mono tabular-nums">{formatCurrency(consignacion.adminFee)}</span> {t('inmobiliaria.consignaciones.header.admin')}
                  </span>
                )}
              </div>
            )}

            {franja ? <div className="mt-6 border-t border-border-faint pt-6 dark:border-border-strong">{franja}</div> : null}
          </div>
        </div>
      </article>
    </div>
  );
}

export default ConsignacionHeader;
