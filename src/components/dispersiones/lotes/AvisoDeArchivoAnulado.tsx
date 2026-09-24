'use client';

/**
 * 🔴 Los pagos de este lote que YA salieron en el archivo de un lote anulado
 * (back, 23-09-2026: `salieronEnUnArchivoAnulado` en `ver` y en `armar`).
 *
 * Anular un lote cuyo archivo se generó libera sus pagos, y el lote siguiente
 * los vuelve a girar. Si el archivo viejo sí se subió al banco, el propietario
 * cobra dos veces. El back exige confirmarlo al anular; esto es la otra mitad:
 * quien arma, aprueba o gira el lote NUEVO lo ve antes de hacerlo, con el
 * nombre, el valor y de qué lote viene cada pago.
 */

import Link from 'next/link';
import { Banner } from '@leasefy/cadence';

import type { SalioEnUnArchivoAnulado } from '@/lib/api/lotes-de-dispersion.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

const RUTA_DEL_LOTE = '/panel/inmobiliaria/pagos/dispersiones/lotes';

export function AvisoDeArchivoAnulado({ pagos }: { pagos: SalioEnUnArchivoAnulado[] | undefined }) {
  const { t } = useI18n();
  if (!pagos || pagos.length === 0) return null;
  const titulo =
    pagos.length === 1
      ? t('inmobiliaria.dispersiones.lote.archivoAnulado.tituloUno')
      : t('inmobiliaria.dispersiones.lote.archivoAnulado.titulo', { n: pagos.length });
  return (
    <Banner variant="warning" title={titulo}>
      {/* Sólo contenido en línea: el Banner envuelve a sus hijos en un <p>, y
          un <div>/<p>/<ul> adentro es un error de hidratación (QA 23-09). */}
      <span className="block space-y-2" data-testid="aviso-archivo-anulado">
        <span className="block">{t('inmobiliaria.dispersiones.lote.archivoAnulado.texto')}</span>
        <span role="list" className="block space-y-1">
          {pagos.map((p) => (
            <span role="listitem" className="block" key={p.dispersionId} data-testid={`salio-en-archivo-anulado-${p.dispersionId}`}>
              <span className="font-medium">{p.nombre}</span>{' '}
              <span className="font-mono">{formatCurrency(p.valorCop)}</span>{' '}
              —{' '}
              <Link className="underline" href={`${RUTA_DEL_LOTE}/${p.loteAnteriorId}`}>
                {t('inmobiliaria.dispersiones.lote.archivoAnulado.fila', {
                  generado: p.archivoGeneradoAt ? formatDateTime(p.archivoGeneradoAt) : '—',
                  anulado: p.anuladoAt ? formatDateTime(p.anuladoAt) : '—',
                })}
              </Link>
              {p.motivoDeLaAnulacion ? (
                <span className="block text-fg-muted">
                  {t('inmobiliaria.dispersiones.lote.archivoAnulado.motivo', {
                    motivo: p.motivoDeLaAnulacion,
                  })}
                </span>
              ) : null}
            </span>
          ))}
        </span>
      </span>
    </Banner>
  );
}
