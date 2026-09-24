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
 * ── Auditoría de casos de error 13-09 ──────────────────────────────────────
 *
 *   · E1 — Compartir pide el permiso de VER ese documento: `cobros:view` el del
 *     inquilino, `dispersiones:view` el del propietario (el back lo exige con
 *     `PermisoSegunElTipoGuard`). Sin él, las acciones salen apagadas y dicen
 *     por qué, en vez de terminar en un 403.
 *   · E2 — Correo y WhatsApp son un envío REAL a un cliente: antes de salir, un
 *     diálogo dice a quién y por dónde. La dirección exacta no se sabe antes:
 *     la resuelve el back al mandar (no hay ruta que la adelante), y se
 *     confirma en el aviso de después.
 *   · E3 — «Enlaces compartidos…» lista los abiertos y los revoca.
 *   · E4 — Con un filtro puesto, el enlace muestra EXACTAMENTE la vista
 *     filtrada: el recorte viaja con el enlace y el back se lo aplica a quien
 *     lo abra. Antes se avisaba que iba entero, que es documentar la fuga en
 *     vez de cerrarla. Si el back responde que no lo pudo guardar (su migración
 *     todavía sin aplicar), el aviso posterior lo dice — `usar-compartir.ts`.
 *
 * La REGLA de cada acción vive en `usar-compartir.ts`; acá sólo está el menú.
 * Los textos nuevos van escritos acá y no en `textos.ts`, que está en manos de
 * otra tanda de cambios.
 */

import * as React from 'react';
import {
  DownloadSimple,
  Envelope,
  LinkBreak,
  LinkSimple,
  ShareNetwork,
  WhatsappLogo,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import type {
  EstadoDeCuenta,
  FiltrosDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';
import { EnlacesCompartidos } from './EnlacesCompartidos';
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
  /**
   * El recorte que hay en pantalla. VIAJA con el enlace (E4): el back lo guarda
   * y se lo aplica a quien lo abra, así que el cliente ve lo mismo que la
   * inmobiliaria está mirando.
   */
  filtros?: FiltrosDelEstadoDeCuenta;
}

/** E4: lo que se dice bajo los ítems que comparten el enlace, con filtros. */
const VA_FILTRADO = 'Va con el filtro que tienes puesto';

/** Un ítem del menú con su línea de aclaración, si la tiene. */
function Rotulo({ texto, aclaracion }: { texto: string; aclaracion?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-sm">{texto}</span>
      {aclaracion ? <span className="text-caption text-fg-muted">{aclaracion}</span> : null}
    </span>
  );
}

export function CompartirEstadoDeCuenta({
  doc,
  hoy,
  tipo,
  id,
  personaId,
  nota,
  filtros,
}: CompartirProps) {
  const t = useTextoDelEstado();
  const {
    copiarEnlace,
    ocupado,
    envioPorConfirmar,
    pedirEnvio,
    cancelarEnvio,
    confirmarEnvio,
    olvidarEnlace,
  } = useCompartirEstado({ tipo, id, filtros });
  // El PDF lo arma el hook compartido: el mismo archivo, con el mismo nombre,
  // sale del panel, del enlace público y de los dos portales.
  const { descargar: descargarPDF, armando } = useDescargarPdfDelEstado(doc, hoy, nota);
  const [viendoEnlaces, setViendoEnlaces] = React.useState(false);

  /*
   * E1. Sin proveedor de permisos (fuera del panel) no se adivina: la última
   * palabra es del back. Mientras los permisos se resuelven, `canAccess` da
   * `false` y las acciones esperan apagadas un instante.
   */
  const permisos = usePermissionsContextSafe();
  const modulo = tipo === 'propietario' ? 'dispersiones' : 'cobros';
  const puedeCompartir = permisos ? permisos.canAccess(modulo, 'view') : true;
  const sinPermiso = puedeCompartir
    ? undefined
    : 'Tu rol no puede compartir este documento';

  const conFiltros = Boolean(nota);
  const aclaracionDelEnlace = sinPermiso ?? (conFiltros ? VA_FILTRADO : undefined);

  const cliente = doc.cliente.nombre;
  const documento = doc.cliente.documento;

  return (
    <>
      {/* `modal={false}`: este menú abre diálogos. Con el menú modal, Radix deja
          el `pointer-events: none` del cuerpo puesto al pasar al diálogo y la
          pantalla queda muerta al cerrarlo. */}
      <DropdownList modal={false}>
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
        <DropdownListContent align="end" className="w-64">
          <DropdownListItem onSelect={() => void descargarPDF()} data-testid="compartir-pdf">
            <DownloadSimple className="h-4 w-4" />
            <span className="text-sm">{t('estadoDeCuenta.descargarPDF')}</span>
          </DropdownListItem>
          <DropdownListSeparator />
          <DropdownListItem
            onSelect={() => pedirEnvio('CORREO')}
            disabled={!puedeCompartir}
            data-testid="compartir-correo"
          >
            <Envelope className="h-4 w-4" />
            <Rotulo texto={t('estadoDeCuenta.porCorreo')} aclaracion={aclaracionDelEnlace} />
          </DropdownListItem>
          <DropdownListItem
            onSelect={() => pedirEnvio('WHATSAPP')}
            disabled={!personaId || !puedeCompartir}
            data-testid="compartir-whatsapp"
          >
            <WhatsappLogo className="h-4 w-4" />
            <Rotulo texto={t('estadoDeCuenta.porWhatsapp')} aclaracion={aclaracionDelEnlace} />
          </DropdownListItem>
          <DropdownListItem
            onSelect={() => void copiarEnlace()}
            disabled={!puedeCompartir}
            data-testid="compartir-enlace"
          >
            <LinkSimple className="h-4 w-4" />
            <Rotulo texto={t('estadoDeCuenta.copiarEnlace')} aclaracion={aclaracionDelEnlace} />
          </DropdownListItem>
          <DropdownListSeparator />
          <DropdownListItem
            onSelect={() => setViendoEnlaces(true)}
            disabled={!puedeCompartir}
            data-testid="compartir-enlaces"
          >
            <LinkBreak className="h-4 w-4" />
            <Rotulo texto="Enlaces compartidos…" aclaracion={sinPermiso ?? 'Ver y revocar los abiertos'} />
          </DropdownListItem>
        </DropdownListContent>
      </DropdownList>

      {/* E2: un envío real a un cliente se confirma antes de salir. */}
      <AlertDialog
        open={envioPorConfirmar !== null}
        onOpenChange={(abierto) => {
          if (!abierto && ocupado === null) cancelarEnvio();
        }}
      >
        <AlertDialogContent data-testid="confirmar-envio-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {envioPorConfirmar === 'WHATSAPP'
                ? `¿Mandar el estado de cuenta por WhatsApp a ${cliente}?`
                : `¿Mandar el estado de cuenta por correo a ${cliente}?`}
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="confirmar-envio-detalle">
              {`Le llega a ${cliente}${documento ? ` (documento ${documento})` : ''} un enlace a su estado de cuenta que vence en 30 días. `}
              {envioPorConfirmar === 'WHATSAPP'
                ? 'Sale por el chat de su cuenta del portal, sólo si aceptó recibir mensajes por WhatsApp. '
                : 'Sale al correo de su cuenta del portal; si no tiene cuenta, no se manda y el enlace queda creado para mandarlo a mano. '}
              El {envioPorConfirmar === 'WHATSAPP' ? 'teléfono' : 'correo'} exacto te lo confirmamos al enviarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {conFiltros ? (
            <p
              className="rounded-md bg-surface-muted px-3 py-2 text-body-sm text-fg"
              data-testid="confirmar-envio-filtros"
            >
              El enlace muestra la MISMA vista filtrada que tienes en pantalla, no el estado de
              cuenta entero.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Se cierra cuando el back contestó, no al hacer clic.
                e.preventDefault();
                void confirmarEnvio();
              }}
              disabled={ocupado !== null}
              data-testid="confirmar-envio"
            >
              {ocupado !== null ? 'Enviando…' : 'Mandar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* E3 */}
      <EnlacesCompartidos
        abierto={viendoEnlaces}
        onCerrar={() => setViendoEnlaces(false)}
        tipo={tipo}
        id={id}
        onRevocado={olvidarEnlace}
      />
    </>
  );
}
