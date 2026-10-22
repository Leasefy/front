'use client';

import { useState } from 'react';

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/cadence';
import { ImportWizard } from '@/components/inmobiliaria/import/ImportWizard';
import { FotosEnUnZip } from '@/components/inmobiliaria/import/FotosEnUnZip';

function ImportarContent() {
  const { t } = useI18n();
  const [opcion, setOpcion] = useState<'datos' | 'fotos'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('que') === 'fotos' ? 'fotos' : 'datos',
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* El contenedor y el encabezado de todo el panel (antes p-4 md:p-6 y un
          título con ícono propio, distinto al resto de Inmuebles). */}
      <div className="space-y-3">
        <BackButton
          href="/panel/inmobiliaria/inmuebles"
          label={t('inmobiliaria.portafolio.detail.backToPortfolio')}
        />
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.nav.inmuebles')}
          titulo={t('inmobiliaria.import.title')}
          descripcion={t('inmobiliaria.import.subtitle')}
        />
      </div>

      {/* Dos caminos, como en la migración (Nico, 09-10-2026: «ambas, Excel o
          ZIP»): los datos de muchos inmuebles desde un Excel, o las fotos de
          muchos inmuebles desde un ZIP. */}
      <div className="inline-flex rounded-full bg-surface-muted p-1" role="tablist" aria-label="Qué vas a cargar">
        {([
          ['datos', 'Datos de muchos inmuebles (Excel)'],
          ['fotos', 'Fotos de muchos inmuebles (ZIP)'],
        ] as const).map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={opcion === clave}
            onClick={() => setOpcion(clave)}
            className={
              opcion === clave
                ? 'h-9 rounded-full bg-surface px-4 text-[14px] font-medium text-fg shadow-sm'
                : 'h-9 rounded-full px-4 text-[14px] text-fg-muted hover:text-fg'
            }
            data-testid={`importar-${clave}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {/* Wizard. Desde Inmuebles la importación SÍ va al centro de procesos
          (decisión (b) de Nico, 06-10); la de la Puesta en marcha no. */}
      {opcion === 'datos' ? <ImportWizard origen="inmuebles" /> : <FotosEnUnZip />}
    </div>
  );
}

export default function ImportarPage() {
  return (
    <PageGuard module="portafolio">
      <ImportarContent />
    </PageGuard>
  );
}
