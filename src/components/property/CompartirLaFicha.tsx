'use client';

/**
 * «Copiar ficha» y «Enviar por WhatsApp» (Juan y Nico, 21-10-2026: «cuando
 * se comparta el enlace la idea es que genere una mini ficha como esta»).
 *
 * La ficha es el texto que Portofino copia con su botón «Copiar ficha»: el
 * título, el precio, los m², las habitaciones y los baños, y el enlace al
 * final. Pegado en WhatsApp, el enlace arma además la vista previa con la
 * foto (`app/propiedades/[id]/layout.tsx`): queda igual al ejemplo de Juan.
 *
 * Es para quien comparte inmuebles con sus clientes —la inmobiliaria—: va en
 * el panel «Comparte esta propiedad» de la ficha pública y en la tarjeta
 * «Publicado en el marketplace» del panel. El ícono de compartir de la ficha
 * sigue copiando sólo el enlace (Nico, 12-10-2026).
 */

import { useCallback } from 'react';
import { ClipboardText, Copy, WhatsappLogo } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useIdioma } from '@/lib/idioma/use-idioma';
import { textoDeLaFicha, type InmuebleParaCompartir } from '@/lib/inmuebles/ficha-para-compartir';
import { cn } from '@/lib/utils';

/** El enlace público del inmueble, con el origen de donde se está. */
export function enlaceDelInmueble(propertyId: string): string {
  return typeof window === 'undefined' ? `/propiedades/${propertyId}` : `${window.location.origin}/propiedades/${propertyId}`;
}

/** WhatsApp con el texto escrito; quien comparte elige el chat. */
export function enlaceDeWhatsapp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

async function copiar(texto: string): Promise<boolean> {
  try {
    // En contexto inseguro `navigator.clipboard` ni existe: el acceso tira y cae al `catch`.
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

interface CompartirLaFichaProps {
  propertyId: string;
  ficha: InmuebleParaCompartir;
  /** Suma «Copiar enlace» (en el panel, donde no hay otro botón que lo copie). */
  conEnlace?: boolean;
  className?: string;
}

export function CompartirLaFicha({ propertyId, ficha, conEnlace = false, className }: CompartirLaFichaProps) {
  const idioma = useIdioma();
  const en = idioma === 'en';

  const falloAlCopiar = useCallback(() => {
    toast.error(en ? 'We could not copy it' : 'No pudimos copiarla', {
      description: en
        ? 'Your browser did not allow it. Copy the link from the address bar.'
        : 'El navegador no lo permitió. Copia el enlace desde la barra de direcciones.',
    });
  }, [en]);

  const copiarFicha = useCallback(async () => {
    const ok = await copiar(textoDeLaFicha(ficha, enlaceDelInmueble(propertyId), idioma));
    if (!ok) return falloAlCopiar();
    toast.success(en ? 'We copied the listing card' : 'Copiamos la ficha del inmueble', {
      description: en
        ? 'Paste it in a chat: the link adds the photo preview.'
        : 'Pégala en el chat: el enlace suma la vista previa con la foto.',
    });
  }, [en, falloAlCopiar, ficha, idioma, propertyId]);

  const copiarEnlace = useCallback(async () => {
    const ok = await copiar(enlaceDelInmueble(propertyId));
    if (!ok) return falloAlCopiar();
    toast.success(en ? 'We copied the link' : 'Copiamos el enlace del inmueble');
  }, [en, falloAlCopiar, propertyId]);

  const enviarPorWhatsapp = useCallback(() => {
    window.open(
      enlaceDeWhatsapp(textoDeLaFicha(ficha, enlaceDelInmueble(propertyId), idioma)),
      '_blank',
      'noopener,noreferrer',
    );
  }, [ficha, idioma, propertyId]);

  return (
    <div className={cn('grid gap-2', conEnlace ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2', className)}>
      {conEnlace && (
        <Button type="button" variant="outline" size="sm" hideArrow onClick={() => void copiarEnlace()} data-testid="copiar-enlace" className="gap-2">
          <Copy className="h-4 w-4 shrink-0" />
          {en ? 'Copy link' : 'Copiar enlace'}
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" hideArrow onClick={() => void copiarFicha()} data-testid="copiar-ficha" className="gap-2">
        <ClipboardText className="h-4 w-4 shrink-0" />
        {en ? 'Copy card' : 'Copiar ficha'}
      </Button>
      <Button type="button" variant="outline" size="sm" hideArrow onClick={enviarPorWhatsapp} data-testid="enviar-por-whatsapp" className="gap-2">
        <WhatsappLogo className="h-4 w-4 shrink-0" />
        WhatsApp
      </Button>
    </div>
  );
}
