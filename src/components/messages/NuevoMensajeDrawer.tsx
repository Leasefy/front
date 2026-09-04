'use client';

/**
 * «Nuevo mensaje»: elegir con quién hablar.
 *
 * Hasta acá la bandeja no podía iniciar NADA — su vacío decía «cuando te
 * comuniques con inquilinos» y no había botón; sólo se llenaba si el otro
 * escribía primero. Este cajón es el que faltaba, y muestra dos cosas según de
 * qué lado del mostrador esté quien mira:
 *
 *   · La inmobiliaria ve a sus inquilinos y propietarios, con la insignia de
 *     rol de cada uno.
 *   · Un inquilino o un propietario ve a sus inmobiliarias.
 *
 * La lista sale del mismo predicado del back que autoriza abrir el hilo, así
 * que nada de lo que aparece acá puede terminar en un «no tenés permiso».
 */

import { useCallback, useEffect, useState } from 'react';
import { Buildings, MagnifyingGlass, PaperPlaneTilt } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { InsigniaDePerfil } from '@/components/messages/InsigniaDePerfil';
import { messagesApi } from '@/lib/api/messages.service';
import {
  nombreDelDestinatario,
  type DestinatarioAgencia,
  type DestinatarioPersona,
  type DestinatariosDirectos,
  type PerfilEnLaConversacion,
} from '@/lib/api/messages.types';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function perfilDe(role: string): PerfilEnLaConversacion {
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'AGENT') return role;
  return 'DESCONOCIDO';
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Recibe el id del hilo abierto para seleccionarlo en la bandeja. */
  onHiloAbierto: (conversationId: string) => void;
}

export function NuevoMensajeDrawer({ abierto, onCerrar, onHiloAbierto }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState<DestinatariosDirectos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  const traer = useCallback(async (q: string) => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await messagesApi.getDestinatariosDirectos(q));
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }, []);

  // El filtro lo resuelve el back (la lista puede ser larga y está topada en
  // 50), así que se espera a que la persona deje de escribir en vez de pedir
  // una vez por tecla.
  useEffect(() => {
    if (!abierto) return;
    const id = setTimeout(() => void traer(busqueda), busqueda ? 300 : 0);
    return () => clearTimeout(id);
  }, [abierto, busqueda, traer]);

  useEffect(() => {
    if (!abierto) {
      setBusqueda('');
      setAbriendo(null);
    }
  }, [abierto]);

  const abrirHilo = async (
    destino: { agencyId?: string; counterpartId?: string },
    clave: string,
  ) => {
    setAbriendo(clave);
    try {
      const { conversationId } = await messagesApi.abrirHiloDirecto(destino);
      onHiloAbierto(conversationId);
      onCerrar();
    } catch (err) {
      // El back distingue «no hay relación» de un fallo cualquiera, y esa
      // diferencia le importa a quien está mirando: una es una regla, la otra
      // es un problema.
      const mensaje =
        err instanceof ApiError && err.status === 403
          ? 'Solo podés escribirle a alguien con quien tengas un inmueble o un contrato en común.'
          : 'No pudimos abrir la conversación. Intentá de nuevo.';
      toast.error(mensaje);
      setAbriendo(null);
    }
  };

  if (!abierto) return null;

  const personas = datos?.personas ?? [];
  const agencias = datos?.agencias ?? [];
  const esLadoAgencia = datos?.tipo === 'PERSONAS';
  const vacio = !cargando && !error && personas.length === 0 && agencias.length === 0;

  return (
    <Sheet open onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-md"
        aria-describedby={undefined}
        data-testid="nuevo-mensaje-cajon"
      >
        <SheetTitle className="border-b border-border px-5 py-4 text-lg">
          Nuevo mensaje
        </SheetTitle>

        {/* Buscar sólo tiene sentido del lado de la inmobiliaria: una persona
            tiene una o dos inmobiliarias, no una lista para filtrar. */}
        {esLadoAgencia && (
          <div className="border-b border-border px-5 py-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo"
                aria-label="Buscar destinatario"
                className="h-10 rounded-full pl-9"
                data-testid="nuevo-mensaje-buscar"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <FalloDeCarga
              error={error}
              queEs="la lista de destinatarios"
              onReintentar={() => void traer(busqueda)}
              enmarcado={false}
              className="py-10"
            />
          ) : vacio ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
                <Buildings className="h-6 w-6 text-fg-muted" weight="duotone" />
              </div>
              <p className="mb-1 text-sm font-semibold text-fg">
                {busqueda ? 'Nadie coincide con esa búsqueda' : 'Todavía no hay a quién escribirle'}
              </p>
              <p className="max-w-xs text-sm text-fg-muted">
                {busqueda
                  ? 'Probá con otro nombre o con el correo.'
                  : esLadoAgencia
                    ? 'Acá van a aparecer los propietarios y los inquilinos con un inmueble o un contrato en la inmobiliaria.'
                    : 'Vas a poder escribirle a tu inmobiliaria cuando tengas un inmueble o un contrato con ella.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {personas.map((p) => (
                <FilaPersona
                  key={p.id}
                  persona={p}
                  abriendo={abriendo === p.id}
                  deshabilitado={abriendo !== null && abriendo !== p.id}
                  onElegir={() => void abrirHilo({ counterpartId: p.id }, p.id)}
                />
              ))}
              {agencias.map((a) => (
                <FilaAgencia
                  key={a.id}
                  agencia={a}
                  abriendo={abriendo === a.id}
                  deshabilitado={abriendo !== null && abriendo !== a.id}
                  onElegir={() => void abrirHilo({ agencyId: a.id }, a.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const FILA =
  'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50';

function FilaPersona({
  persona,
  abriendo,
  deshabilitado,
  onElegir,
}: {
  persona: DestinatarioPersona;
  abriendo: boolean;
  deshabilitado: boolean;
  onElegir: () => void;
}) {
  const nombre = nombreDelDestinatario(persona);
  return (
    <li>
      <button
        type="button"
        onClick={onElegir}
        disabled={abriendo || deshabilitado}
        className={FILA}
        data-testid={`destinatario-${persona.id}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {persona.avatarUrl ? (
            <img src={persona.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            iniciales(nombre)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">{nombre}</span>
            <InsigniaDePerfil perfil={perfilDe(persona.role)} conIcono={false} />
          </span>
          <span className="block truncate text-xs text-fg-muted">{persona.email}</span>
        </span>
        <IconoDeAccion abriendo={abriendo} />
      </button>
    </li>
  );
}

function FilaAgencia({
  agencia,
  abriendo,
  deshabilitado,
  onElegir,
}: {
  agencia: DestinatarioAgencia;
  abriendo: boolean;
  deshabilitado: boolean;
  onElegir: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onElegir}
        disabled={abriendo || deshabilitado}
        className={FILA}
        data-testid={`destinatario-${agencia.id}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary">
          {agencia.logoUrl ? (
            <img src={agencia.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Buildings className="h-5 w-5" weight="duotone" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">{agencia.name}</span>
            <InsigniaDePerfil perfil="AGENCY" conIcono={false} />
          </span>
        </span>
        <IconoDeAccion abriendo={abriendo} />
      </button>
    </li>
  );
}

function IconoDeAccion({ abriendo }: { abriendo: boolean }) {
  return abriendo ? (
    <Spinner size="sm" />
  ) : (
    <PaperPlaneTilt className={cn('h-4 w-4 shrink-0 text-fg-subtle')} weight="fill" />
  );
}

/** El botón que abre el cajón. Vive acá para que la bandeja no lo repita. */
export function BotonNuevoMensaje({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      hideArrow
      onClick={onClick}
      className="gap-1.5"
      data-testid="abrir-nuevo-mensaje"
    >
      <PaperPlaneTilt className="h-4 w-4" weight="fill" />
      Nuevo mensaje
    </Button>
  );
}
