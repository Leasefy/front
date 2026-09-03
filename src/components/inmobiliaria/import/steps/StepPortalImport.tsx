'use client';

/**
 * Importar desde un portal (FincaRaíz, Metrocuadrado, Ciencuadras).
 *
 * ── Por qué esto NO es una integración por API ────────────────────────────
 * Ninguno de los tres publica una API para que una inmobiliaria saque sus
 * propios inmuebles. La integración que sí existe va al revés: los CRMs
 * PUBLICAN hacia el portal por XML. El portal es el destino, no la fuente —
 * su negocio es cobrar por publicar.
 *
 * Lo que hay dando vueltas son scrapers de terceros (Apify, PropAPIS). Son de
 * pago, no oficiales, van contra los términos de los portales y se rompen
 * cada vez que el portal cambia el HTML. No es algo que se pueda poner
 * adelante de una inmobiliaria y prometer que va a seguir andando.
 *
 * ── Lo que sí funciona hoy ────────────────────────────────────────────────
 * El inventario ya lo tiene la inmobiliaria en el panel de su portal, y de ahí
 * se puede bajar. Así que esta pantalla hace lo mismo que «Desde software»:
 * te lleva a bajar tu inventario y a subirlo acá, donde el lector se adapta a
 * las columnas que traiga.
 *
 * Antes esto era una pantalla «Próximamente» con una caja de correo cuyo
 * `handleEmailSubmit` marcaba «listo» y **tiraba la dirección**: le prometía a
 * una persona que la iban a avisar, sin nada detrás.
 */

import { Globe, FileArrowUp, ArrowSquareOut, Info, LinkSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import type { ImportStepProps } from '../ImportWizard';

interface PortalItem {
  id: string;
  name: string;
  domain: string;
  color: string;
  /** Dónde entra la inmobiliaria a su panel. URLs verificadas. */
  panel: string;
}

const PORTALS: PortalItem[] = [
  {
    id: 'fincaraiz',
    name: 'FincaRaíz',
    domain: 'fincaraiz.com.co',
    color: 'bg-success',
    panel: 'https://www.fincaraiz.com.co/',
  },
  {
    id: 'metrocuadrado',
    name: 'Metrocuadrado',
    domain: 'metrocuadrado.com',
    color: 'bg-primary',
    panel: 'https://www.metrocuadrado.com/publicar-inmuebles/',
  },
  {
    id: 'ciencuadras',
    name: 'Ciencuadras',
    domain: 'ciencuadras.com',
    color: 'bg-warning',
    panel: 'https://www.ciencuadras.com/publicacion-inmuebles/inmobiliaria',
  },
];

export function StepPortalImport({ updateState }: ImportStepProps) {
  const { t } = useI18n();

  // Mismo atajo que «Desde software»: el archivo se sube en el paso 2.
  const irASubirArchivo = () => updateState({ method: 'excel' });

  // La otra salida, y para pocos inmuebles la más corta: el enlace de la ficha
  // del portal es público y trae el dato rotulado. Va acá porque es acá donde
  // la persona está buscando cómo traer sus inmuebles.
  const irAPegarEnlaces = () => updateState({ method: 'enlaces' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          {t('inmobiliaria.import.portal.title')}
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.import.portal.subtitle')}
        </p>
      </div>

      {/* Por qué hay que pasar por el panel del portal. Decirlo de frente sale
          mejor que un «Próximamente» que no explica nada. */}
      <div className="rounded-md bg-surface-muted dark:bg-ink border border-border dark:border-border-strong p-3 flex items-start gap-2">
        <Info className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-body-sm text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.import.portal.porQue')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PORTALS.map((portal, index) => (
          <div
            key={portal.id}
            className="animate-stagger-in rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg p-5 flex flex-col gap-3"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', portal.color)}>
              <Globe className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-fg dark:text-white text-sm">{portal.name}</p>
              <p className="text-xs font-mono text-fg-subtle dark:text-fg-muted mt-0.5">
                {portal.domain}
              </p>
            </div>
            <a
              href={portal.panel}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              {t('inmobiliaria.import.portal.abrirPanel')}
              <ArrowSquareOut className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        ))}
      </div>

      <div className="pt-2 flex flex-col items-center gap-3">
        <Button type="button" size="lg" hideArrow onClick={irASubirArchivo} className="gap-2">
          <FileArrowUp className="w-5 h-5" aria-hidden="true" />
          {t('inmobiliaria.import.portal.yaLoTengo')}
        </Button>

        <p className="text-body-sm text-fg-muted text-center max-w-md">
          {t('inmobiliaria.import.portal.oEnlaces')}
        </p>

        <Button
          type="button"
          variant="outline"
          hideArrow
          onClick={irAPegarEnlaces}
          className="gap-2"
          data-testid="portal-pegar-enlaces"
        >
          <LinkSimple className="w-4 h-4" aria-hidden="true" />
          {t('inmobiliaria.import.portal.pegarEnlaces')}
        </Button>
      </div>
    </div>
  );
}
