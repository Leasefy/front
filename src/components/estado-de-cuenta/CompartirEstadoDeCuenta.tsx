'use client';

/**
 * «Compartir» el estado de cuenta: PDF, correo, WhatsApp y enlace.
 *
 * CEO (vía Nico, 2026-09-13): «qué tan FÁCIL DE DISTRIBUIR sea dentro del
 * software». Hoy una inmobiliaria manda el estado de cuenta bajándolo del
 * sistema viejo, adjuntándolo a un correo y escribiéndolo a mano por WhatsApp.
 *
 * ── Tres decisiones ─────────────────────────────────────────────────────────
 *
 * 1. **Correo y WhatsApp llevan el ENLACE, no el PDF.** Un adjunto queda viejo
 *    el día que entra un abono y el cliente sigue mirando el saldo de la semana
 *    pasada; el enlace muestra siempre lo de hoy. El PDF sigue estando para
 *    quien lo necesita archivado.
 *
 * 2. **El enlace VENCE.** Es la deuda de una persona con nombre y documento:
 *    no puede quedar abierta en internet para siempre. El back manda `venceEl`
 *    y acá se dice al copiarlo — un enlace que vence sin avisar se convierte en
 *    una llamada de «no me abre».
 *
 * 3. **WhatsApp sale por el puente del chat, no por `wa.me`.** El back abre el
 *    hilo directo y escribe el mensaje; el puente lo relaya cuando la persona
 *    autorizó el canal (`aceptaWhatsapp`). Así queda registrado en la
 *    conversación —lo que se le mandó a un cliente tiene que poder auditarse— y
 *    se respeta el consentimiento. `wa.me` abriría el WhatsApp del empleado con
 *    un texto suelto, sin rastro y sin preguntarle a nadie; además el teléfono
 *    que devuelve el back viene RECORTADO a propósito (`+57 310 ••• 0479`), así
 *    que armar un `wa.me/<numero>` ni siquiera es posible.
 *
 * 🔴 Quién PUEDE recibir cada canal lo decide el back, que es el que sabe si
 * hay correo, cuenta del portal, teléfono y consentimiento; responde
 * `{ enviado: false, motivo }` con la razón en palabras y deja el enlace
 * creado. Acá no se duplica esa regla: se muestra su motivo tal cual.
 *
 * La REGLA de cada acción vive en `usar-compartir.ts`; acá sólo está el menú.
 */

import * as React from 'react';
import {
  DownloadSimple,
  Envelope,
  LinkSimple,
  ShareNetwork,
  WhatsappLogo,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { useTextoDelEstado } from './textos';
import { useCompartirEstado } from './usar-compartir';
import { useDescargarPdfDelEstado } from './usar-pdf';

export interface CompartirProps {
  doc: EstadoDeCuenta;
  /** `YYYY-MM-DD` local. */
  hoy: string;
  tipo: 'inquilino' | 'propietario';
  /** El id con el que el back arma el documento (`tenantRef` o `propietarioId`). */
  id: string;
  /**
   * El `User.id` de su cuenta del portal, para el hilo del chat. `null` cuando
   * la persona no tiene cuenta: entonces no hay a dónde escribirle y el ítem de
   * WhatsApp queda apagado en vez de fallar.
   */
  personaId?: string | null;
  /** Los filtros puestos, en palabras: viajan al PDF para que diga qué muestra. */
  nota?: string;
}

export function CompartirEstadoDeCuenta({
  doc,
  hoy,
  tipo,
  id,
  personaId,
  nota,
}: CompartirProps) {
  const t = useTextoDelEstado();
  const { copiarEnlace, enviarPorCorreo, enviarPorWhatsapp, ocupado } =
    useCompartirEstado({ tipo, id });
  // El PDF lo arma el hook compartido: el mismo archivo, con el mismo nombre,
  // sale del panel, del enlace público y de los dos portales.
  const { descargar: descargarPDF, armando } = useDescargarPdfDelEstado(doc, hoy, nota);

  return (
    <DropdownList>
      <DropdownListTrigger asChild>
        <Button
          variant="default"
          hideArrow
          isLoading={ocupado !== null || armando}
          data-testid="compartir-estado"
        >
          <ShareNetwork className="h-4 w-4" aria-hidden="true" />
          {t('estadoDeCuenta.compartir')}
        </Button>
      </DropdownListTrigger>
      <DropdownListContent align="end" className="w-60">
        <DropdownListItem onSelect={() => void descargarPDF()} data-testid="compartir-pdf">
          <DownloadSimple className="h-4 w-4" />
          <span className="text-sm">{t('estadoDeCuenta.descargarPDF')}</span>
        </DropdownListItem>
        <DropdownListSeparator />
        <DropdownListItem
          onSelect={() => void enviarPorCorreo()}
          data-testid="compartir-correo"
        >
          <Envelope className="h-4 w-4" />
          <span className="text-sm">{t('estadoDeCuenta.porCorreo')}</span>
        </DropdownListItem>
        <DropdownListItem
          onSelect={() => void enviarPorWhatsapp()}
          disabled={!personaId}
          data-testid="compartir-whatsapp"
        >
          <WhatsappLogo className="h-4 w-4" />
          <span className="text-sm">{t('estadoDeCuenta.porWhatsapp')}</span>
        </DropdownListItem>
        <DropdownListItem
          onSelect={() => void copiarEnlace()}
          data-testid="compartir-enlace"
        >
          <LinkSimple className="h-4 w-4" />
          <span className="text-sm">{t('estadoDeCuenta.copiarEnlace')}</span>
        </DropdownListItem>
      </DropdownListContent>
    </DropdownList>
  );
}
