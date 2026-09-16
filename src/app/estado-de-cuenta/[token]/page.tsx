'use client';

/**
 * El estado de cuenta detrás de un enlace, SIN sesión.
 *
 * Es a dónde llega el inquilino o el propietario cuando la inmobiliaria le
 * manda su estado de cuenta por correo o por WhatsApp. No hay login: el único
 * permiso es el token de la URL, que el back firma y vence.
 *
 * Vive fuera de `/panel` a propósito —no hay guard, no hay sidebar— y muestra
 * EXACTAMENTE el mismo documento que ve la inmobiliaria, con el logo de la
 * inmobiliaria arriba. Que el cliente vea otra cosa que su gestor es como se
 * empiezan las discusiones por plata.
 *
 * Sin barra de filtros: filtrar es la herramienta de quien revisa la cartera.
 * Lo que el cliente ve es lo que la inmobiliaria decidió mostrarle.
 *
 * 🔴 Y eso puede ser una vista RECORTADA (auditoría 13-09, E4): si al compartir
 * había un filtro puesto —sólo pendientes, un rango, un contrato—, el recorte
 * quedó guardado con el enlace y el back ya lo aplicó. El documento llega
 * diciendo con qué recorte se armó (`doc.filtro`), y de ahí sale la nota que
 * ponen la pantalla y el PDF: los dos tienen que decir lo mismo, porque son el
 * mismo documento y el cliente los va a comparar.
 */

import { useCallback } from 'react';
import { useParams } from 'next/navigation';

import { PantallaDelEstadoDeCuenta } from '@/components/estado-de-cuenta/PantallaDelEstadoDeCuenta';
import { BotonDescargarPDF } from '@/components/estado-de-cuenta/BotonDescargarPDF';
import { estadoDeCuentaPublico } from '@/lib/api/estado-de-cuenta.service';

export default function EstadoDeCuentaPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const cargar = useCallback(() => estadoDeCuentaPublico(token), [token]);

  return (
    <main className="min-h-screen bg-bg">
      <PantallaDelEstadoDeCuenta
        cargar={cargar}
        sinFiltros
        acciones={(doc, nota) => (
          <BotonDescargarPDF doc={doc} hoy={doc.fecha} nota={nota} />
        )}
      />
    </main>
  );
}
