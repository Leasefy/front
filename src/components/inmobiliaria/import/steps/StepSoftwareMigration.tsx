'use client';

import { useState } from 'react';
import {
  Buildings,
  Desktop,
  HouseLine,
  CloudArrowUp,
  ChartLineUp,
  FileArrowUp,
  Question,
  CaretDown,
  CaretUp,
  Storefront,
  Bank,
  SquaresFour,
  Notebook,
  Receipt,
  Key,
  Stack,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonoLabel } from '@leasefy/cadence';
import type { ImportStepProps } from '../ImportWizard';

interface SoftwareItem {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  popular: boolean;
  /**
   * Sitio del fabricante, para que la persona busque ahí cómo exportar.
   *
   * Las instrucciones de exportación son GENÉRICAS para todos (buscá
   * Exportar/Descargar). Escribir el camino exacto de menú de cada sistema
   * sin haberlo visto sería mandar a la gente a buscar una opción que quizás
   * no existe. El link es lo único verificable que podemos dar hoy.
   */
  sitio?: string;
}

const SOFTWARE_LIST: SoftwareItem[] = [
  {
    id: 'simi',
    name: 'SIMI CRM',
    description: 'Líder del mercado desde 1992',
    color: 'bg-primary',
    icon: Buildings,
    popular: true,
    sitio: 'https://tae-sas.com/',
  },
  {
    id: 'daytona',
    name: 'Daytona Cyber',
    description: 'Segunda plataforma más usada',
    color: 'bg-surface-muted dark:bg-ink',
    icon: Desktop,
    popular: true,
    sitio: 'https://daytona.cloud/',
  },
  {
    id: 'domus',
    name: 'DOMUS',
    description: 'Sistema tradicional',
    color: 'bg-success',
    icon: HouseLine,
    popular: false,
    sitio: 'https://domus.la/',
  },
  {
    id: 'wasi',
    name: 'WASI',
    description: 'Plataforma cloud moderna',
    color: 'bg-warning',
    icon: CloudArrowUp,
    popular: false,
    sitio: 'https://wasi.co/',
  },
  {
    id: 'inmoflex',
    name: 'Inmoflex',
    description: 'En crecimiento',
    color: 'bg-danger',
    icon: ChartLineUp,
    popular: false,
    sitio: 'https://inmoflex.com/',
  },
  // ── Agregados tras revisar el mercado colombiano ──────────────────────────
  // Cada uno se verificó contra el sitio del fabricante. Las descripciones
  // dicen sólo lo que se pudo comprobar ahí; no hay posiciones de mercado
  // inventadas.
  {
    id: 'nuby',
    name: 'Nuby',
    description: 'CRM + ERP desde Medellín, con facturación DIAN',
    color: 'bg-primary',
    icon: SquaresFour,
    popular: false,
    sitio: 'https://nuby.ai/',
  },
  {
    id: 'sinco',
    name: 'SINCO ERP',
    description: 'ERP de construcción e inmobiliaria',
    color: 'bg-success',
    icon: Bank,
    popular: false,
    sitio: 'https://www.sinco.co/',
  },
  {
    id: 'smarthome',
    name: 'Smart Home',
    description: 'Muy usado por constructoras',
    color: 'bg-warning',
    icon: Key,
    popular: false,
    sitio: 'https://crm.smart-home.com.co/',
  },
  {
    id: 'nuwwe',
    name: 'Nuwwe',
    description: 'ERP inmobiliario 100% web',
    color: 'bg-danger',
    icon: Stack,
    popular: false,
    sitio: 'https://nuwwe.com/',
  },
  {
    id: 'mispropiedades',
    name: 'MisPropiedades',
    description: 'Administración de arriendos en la nube',
    color: 'bg-surface-muted dark:bg-ink',
    icon: Storefront,
    popular: false,
    sitio: 'https://www.mispropiedades.co/',
  },
  {
    id: 'arrendasoft',
    name: 'Arrendasoft',
    description: 'Administración inmobiliaria, desde Medellín',
    color: 'bg-primary',
    icon: Receipt,
    popular: false,
  },
  {
    id: 'deb',
    name: 'DeB Inmobiliaria',
    description: 'Arriendos, ventas y avalúos',
    color: 'bg-success',
    icon: Notebook,
    popular: false,
  },
];

export function StepSoftwareMigration({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleHaveFile = () => {
    updateState({ method: 'excel' });
  };

  const exportSteps = [
    t('inmobiliaria.import.software.exportSteps.step1'),
    t('inmobiliaria.import.software.exportSteps.step2'),
    t('inmobiliaria.import.software.exportSteps.step3'),
    t('inmobiliaria.import.software.exportSteps.step4'),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          {t('inmobiliaria.import.software.title')}
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.import.software.subtitle')}
        </p>
      </div>

      {/* Software Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOFTWARE_LIST.map((software, index) => {
          const SoftwareIcon = software.icon;
          const isExpanded = expandedId === software.id;

          return (
            <div
              key={software.id}
              className={cn(
                'animate-stagger-in rounded-xl border transition-all cursor-pointer',
                isExpanded
                  ? 'border-primary/30 bg-primary-soft/50 dark:bg-primary/10'
                  : 'border-border dark:border-border-strong hover:border-border dark:hover:border-border-strong bg-surface dark:bg-bg'
              )}
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={() => handleCardClick(software.id)}
            >
              <div className="p-5">
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      software.color
                    )}>
                      <SoftwareIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg dark:text-white text-sm">
                          {software.name}
                        </span>
                        {software.popular && (
                          <Badge variant="default">
                            {t('inmobiliaria.import.software.popular')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
                        {software.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {isExpanded ? (
                      <CaretUp className="w-4 h-4 text-fg-subtle" />
                    ) : (
                      <CaretDown className="w-4 h-4 text-fg-subtle" />
                    )}
                  </div>
                </div>

                {/* Expandable export instructions */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border-faint dark:border-border-strong">
                    <MonoLabel className="block text-xs text-fg-muted dark:text-fg-subtle mb-3">
                      Instrucciones de exportación
                    </MonoLabel>
                    <ol className="space-y-2.5">
                      {exportSteps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className="animate-content-reveal flex items-start gap-3"
                          style={{ animationDelay: `${stepIndex * 60}ms` }}
                        >
                          <div className="w-7 h-7 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-mono text-fg-muted dark:text-fg-subtle">
                              {stepIndex + 1}
                            </span>
                          </div>
                          <span className="text-sm text-fg dark:text-fg-subtle leading-relaxed">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>

                    {software.sitio && (
                      <a
                        href={software.sitio}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        Ver el sitio de {software.name}
                        <ArrowSquareOut className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* «Mi software no está en la lista».
          Era un <a href="#"> con preventDefault: parecía un enlace, decía
          «Solicitar ayuda» y no hacía nada. La respuesta de verdad es que la
          lista no importa — el lector se adapta a las columnas que traiga el
          archivo — así que ahora lleva a subirlo. */}
      <button
        type="button"
        onClick={handleHaveFile}
        className="w-full text-left flex items-start gap-4 p-5 rounded-xl border border-warning/30 bg-warning-soft hover:bg-warning-soft transition-colors group"
        data-testid="software-no-listado"
      >
        <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center shrink-0">
          <Question className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-fg dark:text-white text-sm">
            {t('inmobiliaria.import.software.otherSoftware')}
          </p>
          <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
            {t('inmobiliaria.import.software.otherSoftwareDesc')}
          </p>
        </div>
        <MonoLabel className="text-xs text-warning group-hover:text-warning dark:group-hover:text-warning transition-colors self-center">
          {t('inmobiliaria.import.software.requestHelp')}
        </MonoLabel>
      </button>

      {/* Have file CTA */}
      <div className="pt-2 flex justify-center">
        <Button
          type="button"
          size="lg"
          hideArrow
          onClick={handleHaveFile}
          className="gap-2"
        >
          <FileArrowUp className="w-5 h-5" />
          {t('inmobiliaria.import.software.haveFile')}
        </Button>
      </div>
    </div>
  );
}
