'use client';

/**
 * «Copiar ficha» desde el menú de los tres puntos de Inmuebles (Nico,
 * 22-10-2026: «en los 3 puntos debemos agregar otra opción… copiar ficha, la
 * ficha del marketplace que se puede compartir a WhatsApp y que se vea así
 * hermosa con lo de la opción A»).
 *
 * Copia el MISMO texto del botón «Copiar ficha» de la ficha pública
 * (`textoDeLaFicha`: título, lugar, precio, m², habitaciones, baños,
 * parqueaderos y «Conoce más detalles aquí:» con el enlace). Pegado en
 * WhatsApp, el enlace arma la tarjeta con la foto (la opción A).
 *
 * 🔴 Un enlace de un inmueble que NO se ve en el marketplace lleva a una
 * ficha que el cliente no puede abrir: en ese caso no se copia y se dice por
 * qué, con «Publicarlo» a la mano si es que no está publicado.
 */

import { useCallback } from 'react';

import { toast } from '@/components/ui/toast';
import { enlaceDelInmueble } from '@/components/property/CompartirLaFicha';
import { propertiesApi } from '@/lib/api/properties.service';
import { marketplaceDelPortafolioApi, type InmuebleParaElegir } from '@/lib/api/marketplace-del-portafolio.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useIdioma } from '@/lib/idioma/use-idioma';
import { fichaDelInmueble, textoDeLaFicha } from '@/lib/inmuebles/ficha-para-compartir';
import { copiarTextoQueLlega } from '@/lib/inmuebles/copiar-texto-que-llega';

/** El inmueble existe pero no sale en el marketplace. */
class NoSeVeEnElMarketplace extends Error {
  constructor(readonly inmueble: InmuebleParaElegir) {
    super('El inmueble no se ve en el marketplace.');
  }
}

export function useCopiarLaFicha(publicar?: (propertyIds: string[]) => void) {
  const idioma = useIdioma();

  return useCallback(
    async (propertyId: string) => {
      const texto = Promise.all([
        propertiesApi.getById(propertyId),
        // Sin la ruta o sin la migración se copia igual: no se sabe que no se vea.
        marketplaceDelPortafolioApi.uno(propertyId).catch(() => null),
      ]).then(([inmueble, marketplace]) => {
        if (marketplace?.disponible && marketplace.inmueble && !marketplace.inmueble.seVe) {
          throw new NoSeVeEnElMarketplace(marketplace.inmueble);
        }
        return textoDeLaFicha(fichaDelInmueble(inmueble), enlaceDelInmueble(propertyId), idioma);
      });

      const copiada = await copiarTextoQueLlega(texto);
      try {
        await texto;
      } catch (error) {
        if (error instanceof NoSeVeEnElMarketplace) {
          const sinPublicar = !error.inmueble.publicado;
          toast.error('Este inmueble no se ve en el marketplace', {
            description: sinPublicar
              ? 'Publícalo primero: el enlace de la ficha llevaría a una página que tu cliente no puede abrir.'
              : (error.inmueble.porQueNoSeVe ?? 'El enlace llevaría a una página que tu cliente no puede abrir.'),
            ...(sinPublicar && publicar
              ? { action: { label: 'Publicarlo', onClick: () => publicar([propertyId]) } }
              : {}),
          });
          return;
        }
        toast.error('No pudimos armar la ficha', {
          description: mensajeParaLaPersona(error, { accion: 'armar la ficha del inmueble' }),
        });
        return;
      }
      if (!copiada) {
        toast.error('No pudimos copiarla', {
          description: 'El navegador no lo permitió. Ábrela con «Ver el aviso público» y cópiala desde ahí.',
        });
        return;
      }
      toast.success('Copiamos la ficha del inmueble', {
        description: 'Pégala en WhatsApp: el enlace suma la vista previa con la foto.',
      });
    },
    [idioma, publicar],
  );
}
