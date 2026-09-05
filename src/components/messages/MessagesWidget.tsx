'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chat,
  ChatCircle,
  MagnifyingGlass,
  PaperPlaneTilt,
  DotsThreeVertical,
  Check,
  Checks,
  Info,
  ArrowLeft,
  X,
  House,
  Envelope,
  Plus,
  IdentificationCard,
  Warning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { IconButton, MonoLabel } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { useAuth } from '@/lib/auth';
import { useConversations, useChat } from '@/lib/hooks/useMessages';
import { agentContactApi } from '@/lib/api/agent-contact.service';
import type { ChatConversation } from '@/lib/api/messages.types';
import { InsigniaDePerfil } from '@/components/messages/InsigniaDePerfil';
/* `BotonNuevoMensaje` ya NO se importa: era la pastilla primary «Nuevo
   mensaje» que ocupaba una fila entera arriba del buscador. Nico: «podrías
   mejor hacer el buscador un poco más pequeño y colocar el primary un + y se
   va a entender que es un nuevo mensaje». El botón vive ahora acá abajo
   (`BotonDeNuevoMensaje`), en la misma fila que el buscador. */
import { NuevoMensajeDrawer } from '@/components/messages/NuevoMensajeDrawer';
import { SelectorDeEmojis } from '@/components/messages/SelectorDeEmojis';
import { PlantillasDeMensajePopover } from '@/components/messages/PlantillasDeMensajePopover';
import { PendientesDelHiloPopover } from '@/components/messages/PendientesDelHiloPopover';
import { mesEnCurso } from '@/components/messages/pendientes-a-mensaje';
import { PQRS_SLA_BUSINESS_DAYS } from '@/lib/constants/response-sla';

// ============================================================================
// Widget props
// ============================================================================

export type MessagesActor = 'tenant' | 'landlord';

export interface MessagesWidgetProps {
  /**
   * Rol del usuario actual. Cambia copy de empty states ("propietario" vs "inquilino")
   * y las i18n keys (namespace `messages.*` para tenant, `landlord.messages.*` para landlord/agency).
   */
  actor: MessagesActor;
  /**
   * La interfaz ocupa TODO el área de contenido —de borde a borde, hasta el
   * sidebar y el header— sin título, sin bajada y sin la tarjeta que la
   * encerraba. Nico (2026-09-01): «pantalla completa, respetando la sidebar
   * y el header». Es el modo del panel de la inmobiliaria; los otros shells
   * siguen con el marco hasta que se decida lo mismo para ellos.
   */
  pantallaCompleta?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * El `+` que abre «Nuevo mensaje».
 *
 * Reemplaza a la pastilla primary de ancho completo que vivía arriba del
 * buscador: entre las dos se comían la mitad del alto útil de la columna, que
 * es donde tienen que estar las conversaciones. Nico: «esto está feo».
 *
 * 🔴 Un ícono solo NO es una etiqueta. Lleva `aria-label` (para quien navega
 * con lector de pantalla) y `title` (para quien pasa el mouse y no sabe qué
 * hace el cuadradito): el `+` se entiende una vez que lo usaste, no la primera
 * vez que lo viste.
 */
function BotonDeNuevoMensaje({
  onClick,
  locale,
  conEtiqueta = false,
}: {
  onClick: () => void;
  locale: string;
  /** En el vacío sí va con texto: ahí no hay nada más que mirar y es EL camino. */
  conEtiqueta?: boolean;
}) {
  const etiqueta = locale === 'es' ? 'Nuevo mensaje' : 'New message';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      data-testid="abrir-nuevo-mensaje"
      className={cn(
        'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-fg transition-opacity hover:opacity-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        conEtiqueta ? 'px-3' : 'w-9',
      )}
    >
      <Plus className="h-4 w-4" weight="bold" aria-hidden="true" />
      {conEtiqueta && <span>{etiqueta}</span>}
    </button>
  );
}

// ============================================================================
// Loading skeletons
// ============================================================================

function ConversationsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-surface-muted rounded" />
              <div className="h-3 w-10 bg-surface-muted rounded" />
            </div>
            <div className="h-3 w-36 bg-surface-muted rounded" />
            <div className="h-3 w-48 bg-surface-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <div className={cn(
            'h-12 rounded-lg',
            i % 2 === 0
              ? 'w-3/5 bg-surface-muted rounded-bl-sm'
              : 'w-2/5 bg-primary-soft rounded-br-sm'
          )} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main widget
// ============================================================================

export function MessagesWidget({ actor, pantallaCompleta = false }: MessagesWidgetProps) {
  const { t, locale } = useI18n();
  /* Para `{{inmobiliaria}}` de las plantillas: el nombre real de la agencia
     del usuario, no uno inventado. Ver `datosDePlantilla`. */
  const { agency } = useAuth();
  const {
    conversations,
    totalUnread,
    isLoading: isLoadingConversations,
    errorCrudo: errorConversaciones,
    refetch: refetchConversations,
  } = useConversations();

  const searchParams = useSearchParams();
  const router = useRouter();
  /**
   * En qué panel está montado el widget.
   *
   * `actor` NO alcanza para decidir si «Ver ficha» tiene sentido: `'landlord'`
   * es a la vez el panel de la inmobiliaria (`/panel/inmobiliaria/mensajes`) y
   * el del propietario (`/panel/mensajes`), y las fichas de inquilinos y
   * propietarios son de la inmobiliaria. Mandar a un propietario a
   * `/panel/inmobiliaria/inquilinos` sería un clic que rebota contra un guard.
   */
  const pathname = usePathname();
  const enPanelDeInmobiliaria = (pathname ?? '').startsWith('/panel/inmobiliaria');
  // contract-addendum-2.md §B.3 item 6 — the widget accepts BOTH the new
  // `?conversationId=` param and the legacy `?applicationId=` deep-link
  // (signed-contract flows still use the latter and must keep resolving).
  const urlConversationId = searchParams.get('conversationId');
  const urlApplicationId = searchParams.get('applicationId');

  // contract-addendum-2.md §B.3 — selection MUST key on `conversation.id`,
  // never on `applicationId` (which is `null` on a PROPERTY_INQUIRY thread —
  // keying on it made every null-application thread match the first one).
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showOptionsList, setShowOptionsList] = useState(false);
  // «Nuevo mensaje»: hasta acá la bandeja no podía iniciar ninguna
  // conversación — sólo se llenaba si el otro escribía primero.
  const [nuevoMensajeAbierto, setNuevoMensajeAbierto] = useState(false);
  /**
   * Las variables que una plantilla NO pudo reemplazar.
   *
   * Se guardan para poder DECIRLO debajo del campo: mandar «Hola {{nombre}}»
   * es peor que no haber tenido plantillas. Se limpia solo cuando el texto ya
   * no tiene ningún hueco —porque la persona lo completó a mano— y al mandar.
   */
  const [variablesSinResolver, setVariablesSinResolver] = useState<string[]>([]);
  // COMU-03: WhatsApp is a first-class channel but ROUTED BY THE AGENT — the
  // frontend never dispatches it. This flag is fed ONLY by the agent's
  // contact-ledger gate (agentContactApi.canContact), which returns
  // `allowed: false` today, so the WhatsApp affordance stays disabled.
  const [whatsappRoutingAllowed, setWhatsappRoutingAllowed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);
  /**
   * Dónde tiene que quedar el cursor DESPUÉS de que React repinte el campo.
   *
   * No se puede mover en el mismo tick que el `setState`: el `<input>` es
   * controlado, así que su `value` todavía es el viejo y `setSelectionRange`
   * apuntaría a un texto que ya no existe. Se anota acá y lo aplica el efecto
   * de abajo, cuando el DOM ya tiene el texto nuevo.
   */
  const cursorPendiente = useRef<number | null>(null);

  const {
    messages,
    isLoading: isLoadingMessages,
    isSending,
    error: errorDeEnvio,
    limpiarError,
    sendMessage,
    markAsRead,
  } = useChat(selectedConversationId);

  // Copy por actor (tenant ve "propietarios", landlord/agency ve "inquilinos").
  const isTenant = actor === 'tenant';
  const otherParty = isTenant
    ? (locale === 'es' ? 'propietarios' : 'landlords')
    : (locale === 'es' ? 'inquilinos' : 'tenants');
  const headerTitle = isTenant ? t('messages.title') : t('landlord.messages.title');
  const headerSubtitle = isTenant ? t('messages.subtitle') : t('landlord.messages.subtitle');

  // Auto-select: URL (?conversationId= new, ?applicationId= legacy,
  // resolved to the matching thread) > current selection > first available.
  // Abre el panel mobile cuando el usuario llega vía deep-link desde otra pantalla.
  useEffect(() => {
    if (urlConversationId && urlConversationId !== selectedConversationId) {
      setSelectedConversationId(urlConversationId);
      setShowMobileChat(true);
      return;
    }
    if (urlApplicationId) {
      const match = conversations.find((c) => c.applicationId === urlApplicationId);
      if (match && match.id !== selectedConversationId) {
        setSelectedConversationId(match.id);
        setShowMobileChat(true);
        return;
      }
    }
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, urlConversationId, urlApplicationId]);

  const selectedConversation: ChatConversation | undefined = conversations.find(
    (c) => c.id === selectedConversationId,
  );

  /**
   * Un hilo recién abierto todavía no está en la lista: se selecciona primero
   * —así el panel de la derecha ya puede cargar sus mensajes por id— y recién
   * después se vuelve a pedir la bandeja para que aparezca la fila.
   */
  const alAbrirHiloNuevo = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      setShowMobileChat(true);
      void refetchConversations();
    },
    [refetchConversations],
  );

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.property.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // COMU-03: ask the agent's contact-ledger whether WhatsApp routing is
  // permitted for this thread (tenant only). The frontend never dispatches —
  // it only reflects the gate. Today canContact resolves `allowed:false`
  // (endpoint not live → 'unavailable'), so the affordance stays disabled.
  const selectedConvId = selectedConversation?.id;
  const selectedConvLeaseId = selectedConversation?.leaseId;
  useEffect(() => {
    if (!isTenant || !selectedConvId) {
      setWhatsappRoutingAllowed(false);
      return;
    }
    let active = true;
    agentContactApi.canContact('whatsapp', selectedConvLeaseId).then((res) => {
      if (active) setWhatsappRoutingAllowed(res.allowed);
    });
    return () => {
      active = false;
    };
  }, [isTenant, selectedConvId, selectedConvLeaseId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsListRef.current && !optionsListRef.current.contains(event.target as Node)) {
        setShowOptionsList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectConversation = useCallback(
    (conv: ChatConversation) => {
      setSelectedConversationId(conv.id);
      setShowMobileChat(true);
      setShowInfoPanel(false);
      setShowOptionsList(false);
      limpiarError();
      /* 🔴 `conv.id`, EXPLÍCITO. Sin el argumento, `markAsRead` es el del
         render anterior y marcaba como leído el hilo que se estaba dejando:
         abrir la conversación de Beto limpiaba los no leídos de Ana y los de
         Beto se quedaban ahí para siempre. */
      markAsRead(conv.id);
      setTimeout(() => refetchConversations(), 500);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [markAsRead, limpiarError, refetchConversations],
  );

  /**
   * Mandar.
   *
   * 🔴 Antes: se vaciaba el campo y se llamaba a `sendMessage` sin mirar el
   * resultado. Si el POST fallaba, el hook sacaba la burbuja optimista y
   * guardaba el error — que esta pantalla nunca leía. El mensaje desaparecía
   * en silencio Y el texto se perdía, así que había que reescribirlo de
   * memoria sin saber siquiera que no había salido.
   *
   * Ahora, si falla, el texto VUELVE al campo (lo escrito no se tira) y el
   * cartel de abajo lo dice con un botón para reintentar.
   */
  const handleSendMessage = useCallback(async () => {
    const text = messageText.trim();
    if (!text || isSending) return;
    setMessageText('');
    setVariablesSinResolver([]);
    const salio = await sendMessage(text);
    if (!salio) {
      setMessageText(text);
      return;
    }
    refetchConversations();
  }, [messageText, isSending, sendMessage, refetchConversations]);

  /**
   * Mete un texto EN LA POSICIÓN DEL CURSOR y deja el cursor después.
   *
   * Es lo que usan los tres: el emoji, la plantilla y el pendiente. Si hay algo
   * seleccionado, lo reemplaza —que es lo que hace cualquier editor—. Sin
   * cursor (el campo nunca tuvo foco) va al final, que es el único lugar
   * razonable.
   */
  const insertarEnElCursor = useCallback((fragmento: string) => {
    /* La selección se lee ACÁ, una vez, y no adentro del updater: React puede
       reinvocar un updater (StrictMode lo hace en desarrollo) y leer el DOM
       desde adentro lo volvería impredecible. */
    const campo = inputRef.current;
    const inicioLeido = campo?.selectionStart ?? null;
    const finLeido = campo?.selectionEnd ?? null;

    setMessageText((actual) => {
      // Sin cursor —el campo nunca tuvo foco— va al final, que es el único
      // lugar razonable.
      const inicio = inicioLeido ?? actual.length;
      const fin = finLeido ?? actual.length;
      cursorPendiente.current = inicio + fragmento.length;
      return actual.slice(0, inicio) + fragmento + actual.slice(fin);
    });
  }, []);

  /* Devuelve el foco al campo y pone el cursor donde corresponde, ya con el
     texto nuevo pintado. Sin esto hay que volver a hacer clic para escribir. */
  useEffect(() => {
    const posicion = cursorPendiente.current;
    if (posicion === null) return;
    cursorPendiente.current = null;
    const campo = inputRef.current;
    if (!campo) return;
    campo.focus();
    campo.setSelectionRange?.(posicion, posicion);
  }, [messageText]);

  /** La plantilla llena el campo; NUNCA manda. Lo que quedó con hueco se dice. */
  const alElegirPlantilla = useCallback(
    (texto: string, sinResolver: string[]) => {
      insertarEnElCursor(texto);
      setVariablesSinResolver(sinResolver);
    },
    [insertarEnElCursor],
  );

  const alElegirPendiente = useCallback(
    (texto: string) => {
      insertarEnElCursor(texto);
      /* Un pendiente trae datos reales, no plantilla: si venía un aviso de
         variables sin resolver de antes, ya no describe lo que hay en el campo. */
      setVariablesSinResolver([]);
    },
    [insertarEnElCursor],
  );

  /*
   * 🔴 Acá vivían CINCO acciones que no hacían nada: «Archivar», «Silenciar»,
   * «Reportar», el clip de adjuntos y el botón de imagen.
   *
   * Ninguna tiene ruta en el back —`archiveConversation`, `muteConversation` y
   * `reportConversation` devuelven `'unavailable'` por 404, y `sendAttachment`
   * ni siquiera hace el POST: está escrito para resolver `null`—, así que las
   * cinco terminaban en un toast «estará disponible próximamente». El menú de
   * los tres puntos era una lista de disculpas, y el clip era peor: abría el
   * explorador de archivos, dejaba elegir uno, validaba su tamaño y después
   * decía que no. Reportar era el más grave de todos: alguien podía denunciar
   * una conversación abusiva y creer que quedó denunciada.
   *
   * Se retiran hasta que exista el endpoint. Lo que queda del menú es lo único
   * que funciona: «Ver ficha», que navega de verdad. La casilla de WhatsApp
   * del panel de información se queda porque NO es un botón: es un renglón
   * apagado, con `aria-disabled` y la razón escrita, atado a la respuesta real
   * del `contact-ledger` del agente.
   */

  /**
   * A dónde lleva «Ver ficha» y cómo se llama el renglón.
   *
   * Tres condiciones, y las tres son necesarias: estar en el panel de la
   * inmobiliaria (las fichas son suyas), tener el `User.id` del interlocutor, y
   * que ese interlocutor sea una persona con ficha —un inquilino o un
   * propietario—. Un agente de la misma inmobiliaria o la inmobiliaria misma no
   * tienen ficha en estas dos listas, así que el renglón no aparece. Ofrecer un
   * destino que no existe es peor que no ofrecer nada.
   */
  const fichaDeLaContraparte = useMemo(() => {
    if (!enPanelDeInmobiliaria || !selectedConversation?.contraparteId) return null;
    const id = selectedConversation.contraparteId;
    if (selectedConversation.perfil === 'TENANT') {
      return {
        href: `/panel/inmobiliaria/inquilinos?persona=${encodeURIComponent(id)}`,
        etiqueta: locale === 'es' ? 'Ver ficha del inquilino' : "View tenant's profile",
      };
    }
    if (selectedConversation.perfil === 'LANDLORD') {
      return {
        href: `/panel/inmobiliaria/propietarios?persona=${encodeURIComponent(id)}`,
        etiqueta: locale === 'es' ? 'Ver ficha del propietario' : "View owner's profile",
      };
    }
    return null;
  }, [enPanelDeInmobiliaria, selectedConversation, locale]);

  const verFicha = useCallback(() => {
    if (!fichaDeLaContraparte) return;
    setShowOptionsList(false);
    router.push(fichaDeLaContraparte.href);
  }, [fichaDeLaContraparte, router]);

  /**
   * Con qué se resuelven las variables de una plantilla.
   *
   * Sólo lo que se SABE de verdad. Las ocho plantillas sugeridas usan cinco
   * variables y acá había tres: `{{inmobiliaria}}` y `{{saldo}}` salían
   * siempre como hueco, y esos huecos viajaban tal cual en el mensaje que se
   * le manda a un cliente («Hola Ana, tu saldo con {{inmobiliaria}} es
   * {{saldo}}»).
   *
   * `inmobiliaria` SÍ se puede resolver: es la agencia del usuario que está
   * escribiendo, y ya la trae `useAuth()`. Se resuelve.
   *
   * `saldo` NO, y sigue afuera a propósito: el widget no tiene ningún número
   * de cartera, y ponerle cualquier cosa sería mandarle a un cliente una
   * deuda que nadie calculó. El que sí lo tiene es el botón de pendientes
   * —arma el mensaje con el cobro real, su fecha y su mora—, así que el aviso
   * de abajo manda para allá en vez de dejar el hueco sin explicación.
   */
  const datosDePlantilla = useMemo(
    () => ({
      nombre: selectedConversation?.name ?? '',
      inmueble: selectedConversation?.property ?? '',
      mes: mesEnCurso(),
      inmobiliaria: agency?.name ?? '',
    }),
    [selectedConversation, agency?.name],
  );

  /* El aviso se apaga solo cuando ya no queda ningún hueco en el campo: quien
     completó «{{saldo}}» a mano no tiene por qué seguir viendo una alerta. */
  const huecosVisibles =
    variablesSinResolver.length > 0 && messageText.includes('{{')
      ? variablesSinResolver
      : [];

  return (
    <div className="h-[calc(100vh-64px)] bg-bg overflow-hidden flex flex-col">
      <div
        className={cn(
          'flex-1 flex flex-col w-full overflow-hidden',
          !pantallaCompleta && 'max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8',
        )}
      >
        {/* Header — en pantalla completa no hay título ni bajada: el sidebar
            ya dice «Mensajes» y el contador de no leídos vive en su badge. */}
        {!pantallaCompleta && (
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex-shrink-0"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {headerTitle}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {headerSubtitle}
              </p>
            </div>
            {totalUnread > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-soft rounded-full shrink-0">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  {totalUnread} {locale === 'es' ? 'sin leer' : 'unread'}
                </span>
              </div>
            )}
          </div>
        </motion.header>
        )}

        {/* Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: pantallaCompleta ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: pantallaCompleta ? 0 : 0.1 }}
          className={cn(
            'bg-card overflow-hidden flex-1 min-h-0',
            !pantallaCompleta && 'rounded-lg border border-border',
          )}
        >
          <div className="h-full flex">
            {/* Conversations List */}
            <div
              className={cn(
                'w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-muted/30',
                showMobileChat && 'hidden md:flex',
              )}
            >
              {/*
                Buscador y «nuevo mensaje» en UNA fila.
                Antes eran dos bloques apilados —una pastilla primary de ancho
                completo arriba y un buscador de 44 px de alto abajo— y entre
                los dos ocupaban ~110 px de la columna donde tienen que estar
                las conversaciones. Ahora el buscador se estira y el `+` es un
                cuadrado de la misma altura al lado.
              */}
              <div className="flex items-center gap-2 border-b border-border bg-card p-3">
                <div className="relative min-w-0 flex-1">
                  <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={locale === 'es' ? 'Buscar conversación' : 'Search conversation'}
                    aria-label={locale === 'es' ? 'Buscar conversación' : 'Search conversation'}
                    className="h-9 rounded-md bg-surface-muted pl-9 pr-3 text-sm md:text-sm"
                  />
                </div>
                <BotonDeNuevoMensaje
                  locale={locale}
                  onClick={() => setNuevoMensajeAbierto(true)}
                />
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations ? (
                  <ConversationsSkeleton />
                ) : errorConversaciones ? (
                  /* Sin esto, una consulta caída se leía como «Sin
                     conversaciones»: le decíamos a alguien que nunca habló con
                     nadie cuando lo que pasó fue que no pudimos preguntar. */
                  <FalloDeCarga
                    error={errorConversaciones}
                    queEs="tus conversaciones"
                    onReintentar={refetchConversations}
                    enmarcado={false}
                    className="py-10"
                  />
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Chat className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {locale === 'es' ? 'Sin conversaciones' : 'No conversations'}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {searchQuery
                        ? (locale === 'es' ? 'No se encontraron conversaciones' : 'No conversations found')
                        : (locale === 'es'
                            ? `Escribile a ${otherParty} desde acá; las conversaciones te van a quedar en esta lista.`
                            : `Message ${otherParty} from here; your conversations will stay in this list.`)}
                    </p>
                    {/* Acá SÍ va con texto: en un vacío el `+` de arriba es lo
                        único que hay para hacer, y conviene nombrarlo. */}
                    {!searchQuery && (
                      <div className="mt-4">
                        <BotonDeNuevoMensaje
                          locale={locale}
                          conEtiqueta
                          onClick={() => setNuevoMensajeAbierto(true)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredConversations.map((conversation, index) => (
                      <motion.button
                        key={conversation.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectConversation(conversation)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-4 text-left transition-all',
                          selectedConversationId === conversation.id
                            ? 'bg-card border-l-2 border-l-primary'
                            : 'hover:bg-card/80',
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
                            {getInitials(conversation.name)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p
                              className={cn(
                                'truncate text-sm text-foreground',
                                conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {conversation.name}
                            </p>
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {conversation.lastMessageTime}
                            </span>
                          </div>
                          <div className="mb-1 flex min-w-0 items-center gap-1.5">
                            <InsigniaDePerfil perfil={conversation.perfil} conIcono={false} />
                            {conversation.property && (
                              <span className="truncate text-xs text-muted-foreground">
                                {conversation.property}
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              'text-sm truncate',
                              conversation.unreadCount > 0
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {conversation.lastMessage}
                          </p>
                        </div>

                        {conversation.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1 bg-primary text-primary-foreground tabular-nums text-xs font-semibold rounded-full flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div
              className={cn(
                'flex-1 flex flex-col bg-card',
                !showMobileChat && 'hidden md:flex',
              )}
            >
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={ChatCircle}
                    title={locale === 'es' ? 'Sin mensajes' : 'No messages'}
                    description={locale === 'es' ? 'Selecciona una conversación para ver los mensajes.' : 'Select a conversation to view messages.'}
                  />
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <IconButton
                        variant="ghost"
                        onClick={() => setShowMobileChat(false)}
                        aria-label={locale === 'es' ? 'Volver' : 'Back'}
                        icon={<ArrowLeft className="w-5 h-5" />}
                        className="md:hidden -ml-2 rounded-full text-muted-foreground"
                      />
                      <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-sm">
                        {getInitials(selectedConversation.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedConversation.name}
                        </p>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <InsigniaDePerfil perfil={selectedConversation.perfil} />
                          {selectedConversation.property && (
                            <span className="truncate text-xs text-muted-foreground">
                              {selectedConversation.property}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        variant="ghost"
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={cn(
                          'rounded-full',
                          showInfoPanel
                            ? 'bg-primary-soft text-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        aria-label={locale === 'es' ? 'Información' : 'Information'}
                        icon={<Info className="w-5 h-5" />}
                      />

                      {/* Sin ficha a dónde ir, el menú queda vacío: entonces no
                          hay menú. Un `⋮` que abre una lista de nada es ruido. */}
                      {fichaDeLaContraparte && (
                      <div className="relative" ref={optionsListRef}>
                        <IconButton
                          variant="ghost"
                          onClick={() => setShowOptionsList(!showOptionsList)}
                          className={cn(
                            'rounded-full',
                            showOptionsList
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          aria-label={locale === 'es' ? 'Más opciones' : 'More options'}
                          icon={<DotsThreeVertical className="w-5 h-5" />}
                        />

                        <AnimatePresence>
                          {showOptionsList && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              /*
                                `w-52` (208 px) no le daba: «Silenciar
                                notificaciones» se partía en dos renglones y
                                quedaba descolgado del ícono, y los otros dos
                                ítems —de una línea— dejaban el menú con tres
                                ritmos distintos. Ahora el ancho lo fija el
                                contenido (`w-max`) con un piso y un techo, y
                                cada renglón es `whitespace-nowrap`: los cuatro
                                miden lo mismo de alto.
                              */
                              className="absolute right-0 top-full z-50 mt-2 w-max min-w-56 max-w-[18rem] overflow-hidden rounded-lg border border-border bg-surface py-1.5"
                            >
                              {/*
                                «Ver ficha» va PRIMERO: es lo que Nico pidió
                                («que desde acá se pueda ir a ver el detalle del
                                inquilino») y es lo único del menú que lleva a
                                otro lado — archivar, silenciar y reportar
                                actúan sobre el hilo. Sólo aparece cuando hay a
                                dónde ir; ver `fichaDeLaContraparte`.
                              */}
                              <button
                                onClick={verFicha}
                                data-testid="ver-ficha"
                                className="flex w-full items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm text-fg transition-colors hover:bg-surface-muted"
                              >
                                <IdentificationCard className="h-4 w-4 flex-shrink-0 text-fg-muted" />
                                {fichaDeLaContraparte.etiqueta}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      )}
                    </div>
                  </div>

                  {/* Main Chat Content */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Messages Area */}
                    <div className={cn('flex-1 flex flex-col', showInfoPanel && 'hidden lg:flex')}>
                      {/*
                        Tenant-only arriendo context header (COMU-01). Ties the chat
                        VISUALLY to the arriendo NOW using the REAL `property` field —
                        never a fabricated arriendo. Renders nothing when `property`
                        is empty; landlord/agency (actor!=='tenant') see NOTHING new
                        (byte-identical). No presence/liveness indicators anywhere.
                      */}
                      {isTenant && selectedConversation.property && (
                        <div className="flex items-start gap-3 px-6 py-3 border-b border-border bg-muted/40">
                          <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center flex-shrink-0 mt-0.5">
                            <House className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {locale === 'es'
                                ? `Sobre tu arriendo — ${selectedConversation.property}`
                                : `About your rental — ${selectedConversation.property}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {locale === 'es'
                                ? 'Estamos conectando cada chat a su arriendo; el hilo por arriendo llega próximamente.'
                                : "We're tying each chat to its rental; per-rental threads are coming soon."}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
                        {isLoadingMessages ? (
                          <MessagesSkeleton />
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 border border-border">
                              <ChatCircle className="w-6 h-6 text-muted-foreground" weight="duotone" />
                            </div>
                            <p className="text-sm font-semibold text-foreground mb-1">
                              {locale === 'es' ? 'Sin mensajes' : 'No messages'}
                            </p>
                            <p className="text-sm text-muted-foreground max-w-xs">
                              {locale === 'es'
                                ? 'Envía un mensaje para iniciar la conversación.'
                                : 'Send a message to start the conversation.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <AnimatePresence initial={false}>
                              {messages.map((message, index) => (
                                <motion.div
                                  key={message.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.02 }}
                                  className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}
                                >
                                  <div
                                    className={cn(
                                      'max-w-[75%] px-4 py-3 rounded-lg',
                                      message.isMine
                                        ? 'bg-primary-soft text-primary border border-primary/30 rounded-br-sm'
                                        : 'bg-card text-foreground border border-border rounded-bl-sm',
                                    )}
                                  >
                                    {/* Quién habla, sólo al empezar una tanda:
                                        repetirlo en cada burbuja es ruido, y
                                        omitirlo siempre deja sin saber cuál de
                                        los agentes contestó. */}
                                    {!message.isMine &&
                                      messages[index - 1]?.senderName !== message.senderName && (
                                        <div className="mb-1.5 flex items-center gap-1.5">
                                          <span className="text-xs font-semibold text-foreground">
                                            {message.senderName}
                                          </span>
                                          <InsigniaDePerfil perfil={message.perfil} conIcono={false} />
                                        </div>
                                      )}
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                    <div
                                      className={cn(
                                        'flex items-center justify-end gap-1.5 mt-1.5',
                                        message.isMine
                                          ? 'text-primary'
                                          : 'text-muted-foreground',
                                      )}
                                    >
                                      <span className="text-xs">{formatMessageTime(message.createdAt)}</span>
                                      {message.isMine && (message.readAt ? (
                                        <Checks className="w-3.5 h-3.5 text-primary" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="px-6 py-4 border-t border-border bg-card">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {/*
                              Plantillas y pendientes: los dos LLENAN el campo y
                              ninguno manda. Van del lado del adjunto —a la
                              izquierda del campo— porque son «traer algo al
                              mensaje», como el clip; el emoji vive adentro del
                              campo porque decora lo que ya se está escribiendo.
                            */}
                            {/* 🔴 Sólo en el panel de la inmobiliaria. Las
                                plantillas («Hola {{nombre}}, te recordamos el
                                pago de {{mes}}») y los pendientes (los cobros
                                y documentos que la agencia le reclama a esta
                                persona) son herramientas de cobro: no tienen
                                sentido en la bandeja del inquilino ni en la
                                del propietario, que son justamente a quienes
                                se les cobra. `actor` no alcanza para decidirlo
                                —'landlord' es la inmobiliaria Y el
                                propietario—, por eso va por la ruta. */}
                            {enPanelDeInmobiliaria && (
                              <PlantillasDeMensajePopover
                                locale={locale}
                                datos={datosDePlantilla}
                                onElegir={alElegirPlantilla}
                              />
                            )}
                            {/* `key` por conversación: los pendientes de Ana no
                                pueden quedar cacheados en el panel de Beto ni
                                por un cuadro. Remontar es más barato y más
                                seguro que acordarse de limpiar el estado. */}
                            {enPanelDeInmobiliaria && (
                              <PendientesDelHiloPopover
                                key={selectedConversation.id}
                                locale={locale}
                                conversationId={selectedConversation.id}
                                nombre={selectedConversation.name}
                                onElegir={alElegirPendiente}
                              />
                            )}
                          </div>
                          <div className="flex-1 relative">
                            <Input
                              ref={inputRef}
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder={locale === 'es' ? 'Escribe un mensaje...' : 'Type a message...'}
                              aria-label={locale === 'es' ? 'Escribe un mensaje' : 'Type a message'}
                              className="h-12 pl-5 pr-12 rounded-full bg-muted"
                            />
                            {/* La colocación va en un envoltorio, no en el
                                `className` del selector: su raíz es `relative`
                                (ancla su propio panel) y Tailwind emite
                                `.relative` después de `.absolute`, así que
                                pasarle la posición por prop no habría hecho
                                nada — y sin error. */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <SelectorDeEmojis locale={locale} onElegir={insertarEnElCursor} />
                            </div>
                          </div>
                          <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!messageText.trim() || isSending}
                            aria-label={locale === 'es' ? 'Enviar mensaje' : 'Send message'}
                            hideArrow
                            className="rounded-full shrink-0"
                          >
                            <PaperPlaneTilt className="w-5 h-5" />
                          </Button>
                        </div>

                        {/*
                          🔴 El envío que falló, DICHO — con el texto de vuelta
                          en el campo y un botón para reintentar. Sin esto, un
                          POST caído borraba la burbuja y no dejaba rastro.
                        */}
                        {errorDeEnvio && (
                          <div
                            data-testid="mensaje-no-enviado"
                            role="alert"
                            className="mt-2 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
                          >
                            <Warning className="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1">
                              {locale === 'es'
                                ? 'No se pudo enviar. Tu mensaje quedó en el campo: probá de nuevo.'
                                : "Couldn't send. Your message is back in the box — try again."}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleSendMessage()}
                              disabled={!messageText.trim() || isSending}
                              className="shrink-0 font-medium underline underline-offset-2 disabled:opacity-50"
                            >
                              {locale === 'es' ? 'Reintentar' : 'Retry'}
                            </button>
                          </div>
                        )}

                        {/*
                          🔴 Los huecos que la plantilla no pudo llenar, DICHOS.
                          Sin esto se manda «Hola {{nombre}}, tu saldo es
                          {{saldo}}» y el que queda mal es quien apretó el
                          botón. No bloquea el envío —puede que el hueco sea a
                          propósito— pero no deja que pase desapercibido.
                        */}
                        {huecosVisibles.length > 0 && (
                          <p
                            data-testid="plantilla-con-huecos"
                            className="mt-2 flex items-start gap-1.5 text-xs text-warning"
                          >
                            <Warning className="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <span>
                              {locale === 'es'
                                ? `Falta completar: ${huecosVisibles.map((v) => `{{${v}}}`).join(', ')}. Revisá el mensaje antes de mandarlo.`
                                : `Still to fill in: ${huecosVisibles.map((v) => `{{${v}}}`).join(', ')}. Check the message before sending.`}
                              {huecosVisibles.includes('saldo') && (
                                <>
                                  {' '}
                                  {locale === 'es'
                                    ? 'El saldo no se completa solo: sacalo del botón de pendientes, que trae el cobro real.'
                                    : 'The balance is not filled in automatically: take it from the pending items button, which carries the real charge.'}
                                </>
                              )}
                            </span>
                          </p>
                        )}

                        {/*
                          Static expected-response hint (COMU-04, tenant only).
                          Neutral and consistent with the PQRS SLA (Ley 1480/2011
                          art. 58 → 15 días hábiles). It MUST NOT imply an instant
                          human reply and is NOT a live countdown — the real SLA
                          clock is v7-06. landlord/agency see nothing new.
                        */}
                        {isTenant && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
                            <span>
                              {locale === 'es'
                                ? `Respondemos en horario hábil. Los reclamos formales tienen respuesta en hasta ${PQRS_SLA_BUSINESS_DAYS} días hábiles.`
                                : `We reply during business hours. Formal claims are answered within ${PQRS_SLA_BUSINESS_DAYS} business days.`}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Info Panel */}
                    <AnimatePresence>
                      {showInfoPanel && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="w-full lg:w-80 border-l border-border bg-card overflow-y-auto"
                        >
                          {/* Panel Header */}
                          <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-base font-semibold text-foreground">
                              {locale === 'es' ? 'Información' : 'Information'}
                            </h3>
                            <IconButton
                              variant="ghost"
                              aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                              onClick={() => setShowInfoPanel(false)}
                              icon={<X className="w-4 h-4" />}
                              className="rounded-full text-muted-foreground"
                            />
                          </div>

                          <div className="p-6">
                            <div className="text-center mb-6">
                              <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-2xl mx-auto mb-3">
                                {getInitials(selectedConversation.name)}
                              </div>
                              <h4 className="text-base font-semibold text-foreground">
                                {selectedConversation.name}
                              </h4>
                              <div className="mt-1 flex justify-center">
                                <InsigniaDePerfil perfil={selectedConversation.perfil} />
                              </div>
                            </div>

                            <div className="space-y-4">
                              {selectedConversation.property && (
                                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                  <div className="w-9 h-9 rounded-md bg-card flex items-center justify-center">
                                    <House className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">
                                      {locale === 'es' ? 'Propiedad' : 'Property'}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {selectedConversation.property}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedConversation.email && (
                                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                  <div className="w-9 h-9 rounded-md bg-card flex items-center justify-center">
                                    <Envelope className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">
                                      {locale === 'es' ? 'Correo' : 'Email'}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {selectedConversation.email}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Acciones rápidas — hoy la única que queda es el
                                renglón apagado de WhatsApp (tenant). Sin él, el
                                bloque no tiene contenido y no se pinta. */}
                            {isTenant && (
                            <div className="mt-6 pt-6 border-t border-border">
                              <MonoLabel className="block mb-3 text-muted-foreground">
                                {locale === 'es' ? 'Acciones rápidas' : 'Quick actions'}
                              </MonoLabel>
                              <div className="space-y-2">
                                {/*
                                  WhatsApp — first-class channel but ROUTED BY THE
                                  AGENT (COMU-03). Disabled affordance (tenant only),
                                  never a send button: its state is wired to the
                                  agent's contact-ledger via canContact, which
                                  returns allowed:false today → stays "Próximamente".
                                  No portal-side reminder counter, no dispatch.
                                */}
                                {isTenant && (
                                  <div
                                    aria-disabled={!whatsappRoutingAllowed}
                                    title={locale === 'es' ? 'Aún no disponible' : 'Not available yet'}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground bg-muted/50 rounded-lg select-none cursor-not-allowed"
                                  >
                                    <ChatCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                    <span>
                                      {locale === 'es'
                                        ? 'WhatsApp — ruteado por tu inmobiliaria · Próximamente'
                                        : 'WhatsApp — routed by your agency · Coming soon'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>


      <NuevoMensajeDrawer
        abierto={nuevoMensajeAbierto}
        onCerrar={() => setNuevoMensajeAbierto(false)}
        onHiloAbierto={alAbrirHiloNuevo}
      />
    </div>
  );
}
