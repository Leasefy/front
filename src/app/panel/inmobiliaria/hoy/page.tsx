'use client';

import Link from 'next/link';
import { Users, CurrencyDollar, Robot, Wrench, ArrowRight, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context';
import { workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';
import { seVeElEnlace } from '@/lib/nav/se-ve-el-enlace';

/** A link/row inside a system block. `soon` renders muted + "Pronto" pill. */
interface BlockItem {
  labelKey: string;
  href: string;
  soon?: boolean;
  /**
   * Sólo estos roles lo ven (el administrador de la plataforma, siempre). Sin
   * `roles`, todos. 🔴 FA-R31 (QA-FACT, 03-10-2026): «Facturación» salía a
   * todos y la asesora caía en la pantalla negada.
   */
  roles?: readonly AgencyRole[];
}

interface SystemBlock {
  key: string;
  icon: React.ElementType;
  /** static tailwind classes — never build dynamically */
  iconWrap: string;
  iconColor: string;
  titleKey: string;
  descKey: string;
  cta: string;
  items: BlockItem[];
}

const BLOCKS: SystemBlock[] = [
  {
    key: 'crm',
    icon: Users,
    iconWrap: 'bg-primary-soft',
    iconColor: 'text-primary',
    titleKey: 'inmobiliaria.hoy.crmTitle',
    descKey: 'inmobiliaria.hoy.crmDesc',
    cta: '/panel/inmobiliaria/propietarios',
    items: [
      { labelKey: 'inmobiliaria.nav.propietarios', href: '/panel/inmobiliaria/propietarios' },
      { labelKey: 'inmobiliaria.nav.propiedades', href: '/panel/inmobiliaria/inmuebles' },
      { labelKey: 'inmobiliaria.nav.portafolio', href: '/panel/inmobiliaria/inmuebles' },
      { labelKey: 'inmobiliaria.nav.pipeline', href: '/panel/inmobiliaria/pipeline' },
      { labelKey: 'inmobiliaria.nav.agentes', href: '/panel/inmobiliaria/configuracion/equipo' },
      { labelKey: 'inmobiliaria.nav.mensajes', href: '/panel/inmobiliaria/mensajes' },
    ],
  },
  {
    key: 'erp',
    icon: CurrencyDollar,
    iconWrap: 'bg-success-soft',
    iconColor: 'text-success',
    titleKey: 'inmobiliaria.hoy.erpTitle',
    descKey: 'inmobiliaria.hoy.erpDesc',
    cta: '/panel/inmobiliaria/pagos/cartera/cobros',
    items: [
      // «Cobros» dejó de ser un módulo el 2026-09-15: la lista de documentos
      // emitidos es una lectura de Cartera, y se nombra como allá.
      { labelKey: 'inmobiliaria.nav.cartera', href: '/panel/inmobiliaria/pagos/cartera' },
      { labelKey: 'cartera.pestanas.cobrosEmitidos', href: '/panel/inmobiliaria/pagos/cartera/cobros' },
      { labelKey: 'inmobiliaria.nav.dispersiones', href: '/panel/inmobiliaria/pagos/dispersiones' },
      { labelKey: 'inmobiliaria.nav.tesoreria', href: '/panel/inmobiliaria/pagos/liquidaciones' },
      {
        labelKey: 'inmobiliaria.nav.facturacion',
        href: '/panel/inmobiliaria/facturacion',
        // Nico (03-10-2026): Facturación es sólo de administrador y contador.
        roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR],
      },
      { labelKey: 'inmobiliaria.nav.conciliacion', href: '/panel/inmobiliaria/conciliacion' },
      { labelKey: 'inmobiliaria.nav.reportes', href: '/panel/inmobiliaria/reportes' },
      { labelKey: 'inmobiliaria.nav.analitica', href: '/panel/inmobiliaria/reportes/ia' },
    ],
  },
  {
    key: 'autopilot',
    icon: Robot,
    iconWrap: 'bg-surface-muted',
    iconColor: 'text-fg-muted',
    titleKey: 'inmobiliaria.hoy.autopilotTitle',
    descKey: 'inmobiliaria.hoy.autopilotDesc',
    cta: '/panel/inmobiliaria/configuracion/agentes',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.cobranza', href: '/panel/inmobiliaria/pagos/cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cotizador', href: '/panel/inmobiliaria/postulaciones/asegurabilidad' },
    ],
  },
  {
    key: 'ops',
    icon: Wrench,
    iconWrap: 'bg-warning-soft',
    iconColor: 'text-warning',
    titleKey: 'inmobiliaria.hoy.opsTitle',
    descKey: 'inmobiliaria.hoy.opsDesc',
    cta: '/panel/inmobiliaria/mantenimientos',
    items: [
      { labelKey: 'inmobiliaria.nav.operaciones', href: '/panel/inmobiliaria/mantenimientos' },
      { labelKey: 'inmobiliaria.nav.pqrs', href: '/panel/inmobiliaria/solicitudes' },
      { labelKey: 'inmobiliaria.nav.documentos', href: '/panel/inmobiliaria/documentos' },
      { labelKey: 'inmobiliaria.nav.agenda', href: '/panel/inmobiliaria/agenda' },
    ],
  },
];

export default function HoyPage() {
  const { t } = useI18n();
  const flota = usePilotoFlotaCompartida();
  const actuan = (flota.data?.agentes ?? []).filter((a) => a.actua ?? a.corre);
  const { isAdmin, agencyRole, isLoading } = usePermissions();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header — product framing */}
      <header className="space-y-2">
        <SectionLabel dotVariant="success">{t('inmobiliaria.hoy.title')}</SectionLabel>
        <h1 className="text-h2 text-foreground">{t('inmobiliaria.hoy.heading')}</h1>
        <p className="text-body text-muted-foreground max-w-2xl">{t('inmobiliaria.hoy.subtitle')}</p>
      </header>

      {/* Acá había un panel de «Insights & Alertas» con números escritos a
          mano («42 inquilinos en mora», «$84.000.000 por dispersar») cuyos
          botones llevaban a pantallas reales que no tenían nada de eso. Las
          alertas reales viven en el Piloto (/panel/inmobiliaria/piloto). */}

      {/* El Piloto, con LA verdad del Piloto: la flota real que lee la píldora
          del encabezado. Antes esto contaba el catálogo («5 agentes
          ejecutando») mientras el encabezado decía «Apagado». */}
      {flota.data && (
        <section
          data-testid="hoy-piloto"
          className="rounded-lg border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              {flota.data.activo && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-success" />
              )}
              <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', flota.data.activo ? 'bg-success' : 'bg-border-strong')} />
            </span>
            <div>
              <p className="text-overline text-muted-foreground">
                {flota.data.activo ? 'Piloto activo' : 'Piloto apagado'}
              </p>
              <p className="text-body-sm text-foreground mt-0.5">
                {flota.data.activo
                  ? actuan.length === 1
                    ? '1 agente actúa'
                    : `${actuan.length} agentes actúan`
                  : 'Ningún agente actúa por su cuenta.'}
                {flota.data.activo && actuan.length > 0 && (
                  <span className="text-muted-foreground"> · {actuan.map((a) => workspaceVocab(t, 'agente', a.agente)).join(' · ')}</span>
                )}
              </p>
            </div>
          </div>
          <Link
            href="/panel/inmobiliaria/piloto"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline transition-colors flex-shrink-0"
          >
            Ver el Piloto
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* Tu sistema — bloque map */}
      <section className="space-y-4">
        <SectionLabel>{t('inmobiliaria.hoy.systemLabel')}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BLOCKS.map((block) => {
            const Icon = block.icon;
            return (
              <div key={block.key} className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', block.iconWrap)}>
                      <Icon className={cn('w-5 h-5', block.iconColor)} />
                    </div>
                    <div>
                      <h3 className="text-h4 text-foreground">{t(block.titleKey)}</h3>
                      <p className="text-caption text-muted-foreground mt-0.5">{t(block.descKey)}</p>
                    </div>
                  </div>
                  <Link
                    href={block.cta}
                    aria-label={t(block.titleKey)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <ul className="grid grid-cols-2 gap-1">
                  {block.items.filter((item) => seVeElEnlace(item, { isAdmin, agencyRole, isLoading })).map((item) =>
                    item.soon ? (
                      <li
                        key={item.labelKey}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-body-sm text-muted-foreground/60 cursor-default"
                        title={t('inmobiliaria.nav.pronto')}
                      >
                        <span className="truncate">{t(item.labelKey)}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-muted text-fg-muted flex-shrink-0">
                          {t('inmobiliaria.nav.pronto')}
                        </span>
                      </li>
                    ) : (
                      <li key={item.labelKey}>
                        <Link
                          href={item.href}
                          className="group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-body-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <span className="truncate">{t(item.labelKey)}</span>
                          <CaretRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
