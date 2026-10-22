'use client';

import { usePublish } from '@/lib/context/PublishContext';
import { SelectorDeCaracteristicas } from '@/components/property/SelectorDeCaracteristicas';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ariaDelGrupo, idDelCampo, idDelError } from '../campos-con-error';

export function StepAmenities() {
  const { draft, updateDraft, erroresDelServidor } = usePublish();
  const error = erroresDelServidor.amenities;
  const tituloId = `${idDelCampo('amenities')}-titulo`;

  return (
    <div className="space-y-6">
      <div>
        <h3 id={tituloId} className="text-sm font-medium text-fg mb-1">
          ¿Qué características tiene tu inmueble?
        </h3>
        <p className="text-sm text-fg-muted">
          Marca todas las que apliquen: del inmueble, del edificio o conjunto y del sector. Es lo que más
          miran quienes buscan.
        </p>
      </div>

      <div>
        {/*
          Sin «Otro» de texto libre (21-10-2026): el back sólo acepta las de la
          lista y rechazaba el inmueble entero con «Hay una amenidad que no
          está en la lista». Lo que no esté acá va en la descripción.
        */}
        <SelectorDeCaracteristicas
          value={draft.amenities}
          onChange={(amenities) => updateDraft({ amenities })}
          tituloId={tituloId}
          ariaDelError={ariaDelGrupo('amenities', error)}
        />
        <ErrorDelCampo id={idDelError('amenities')} mensaje={error} />
      </div>
    </div>
  );
}
