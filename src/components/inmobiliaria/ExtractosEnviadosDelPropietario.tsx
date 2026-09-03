'use client';

import { useEffect, useState } from 'react';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { mesEnTitulo } from '@/lib/utils/mes';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import type { ExtractoEnviado, EstadoDelExtractoEnviado } from '@/lib/types/inmobiliaria';

interface ExtractosEnviadosDelPropietarioProps {
  propietarioId: string;
  /**
   * Súbelo cuando se mande un extracto desde afuera (el «Enviar por email»
   * de la ficha) y la lista se vuelve a leer.
   */
  version?: number;
}

const VARIANTE_POR_ESTADO: Record<EstadoDelExtractoEnviado, 'success' | 'destructive' | 'secondary'> = {
  ENVIADO: 'success',
  FALLIDO: 'destructive',
  OMITIDO: 'secondary',
};

/**
 * ExtractosEnviadosDelPropietario — las últimas huellas de envío del extracto
 * mensual de un propietario: qué mes, si salió solo o lo mandó alguien, y si
 * no salió, por qué. Datos reales de GET /inmobiliaria/propietarios/:id/extractos.
 */
export function ExtractosEnviadosDelPropietario({ propietarioId, version = 0 }: ExtractosEnviadosDelPropietarioProps) {
  const { t, locale } = useI18n();
  const [huellas, setHuellas] = useState<ExtractoEnviado[] | null>(null);
  const [cargando, setCargando] = useState(true);
  // `{ mensaje: null }` = falló sin mensaje; se traduce al pintar, así el
  // efecto no depende de `t` (un `t` nuevo por render lo relanzaría sin fin).
  const [error, setError] = useState<{ mensaje: string | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    propietariosApi
      .extractosDe(propietarioId)
      .then((datos) => {
        if (!vigente) return;
        setHuellas(datos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setHuellas(null);
        setError({ mensaje: e instanceof Error && e.message ? e.message : null });
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [propietarioId, version]);

  return (
    <section
      className="rounded-xl border border-border bg-card p-5 space-y-3"
      data-testid="extractos-enviados"
      aria-labelledby="extractos-enviados-titulo"
    >
      <div className="flex items-center gap-2">
        <EnvelopeSimple className="w-4 h-4 text-muted-foreground" />
        <h3 id="extractos-enviados-titulo" className="text-base font-semibold text-foreground">
          {t('inmobiliaria.propietarios.detail.extractos.title')}
        </h3>
      </div>

      {cargando && (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {t('inmobiliaria.propietarios.detail.extractos.cargando')}
        </p>
      )}

      {!cargando && error && (
        <p className="text-sm text-danger" role="alert" data-testid="extractos-enviados-error">
          {error.mensaje ?? t('inmobiliaria.propietarios.detail.extractos.error')}
        </p>
      )}

      {!cargando && !error && huellas && huellas.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="extractos-enviados-vacio">
          {t('inmobiliaria.propietarios.detail.extractos.vacio')}
        </p>
      )}

      {!cargando && !error && huellas && huellas.length > 0 && (
        <ul className="divide-y divide-border" data-testid="extractos-enviados-lista">
          {huellas.map((h) => (
            <li key={h.id} className="flex items-start justify-between gap-3 py-2" data-estado={h.estado}>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {mesEnTitulo(h.month, locale)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {t(`inmobiliaria.propietarios.detail.extractos.${h.origen}`)}
                  </span>
                </p>
                <p className={cn('text-xs', h.estado === 'FALLIDO' ? 'text-danger' : 'text-muted-foreground')}>
                  {h.estado === 'ENVIADO'
                    ? [
                        h.enviadoAt ? formatDate(h.enviadoAt, locale) : null,
                        h.destinatario ? t('inmobiliaria.propietarios.detail.extractos.a', { correo: h.destinatario }) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : h.motivo ?? ''}
                </p>
              </div>
              <Badge variant={VARIANTE_POR_ESTADO[h.estado]} className="shrink-0">
                {t(`inmobiliaria.propietarios.detail.extractos.estado.${h.estado}`)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ExtractosEnviadosDelPropietario;
