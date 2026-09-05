'use client';

/**
 * «Nuevo mensaje»: elegir con quién hablar.
 *
 * Hasta acá la bandeja no podía iniciar NADA — su vacío decía «cuando te
 * comuniques con inquilinos» y no había botón; sólo se llenaba si el otro
 * escribía primero. Este cajón es el que faltaba, y muestra dos cosas según de
 * qué lado del mostrador esté quien mira:
 *
 *   · La inmobiliaria ve a sus inquilinos y propietarios, separados en
 *     pestañas (Nico, 2026-09-04: «aquí deberíamos de colocar tabs entre
 *     inquilinos y propietarios»).
 *   · Un inquilino o un propietario ve a sus inmobiliarias.
 *
 * La lista sale del mismo predicado del back que autoriza abrir el hilo, así
 * que nada de lo que aparece acá puede terminar en un «no tenés permiso».
 *
 * ── Quién filtra qué ───────────────────────────────────────────────────────
 * El BUSCADOR filtra en el back (`getDestinatariosDirectos(q)`, con rebote de
 * 300 ms, porque la lista está topada en 50). Las PESTAÑAS filtran acá, sobre
 * lo que ya llegó: son dos filtros distintos y por eso «hay resultados pero
 * ninguno en esta pestaña» es un vacío propio, con su propia salida, y no el
 * mismo cartel que «no hay a quién escribirle».
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Buildings, MagnifyingGlass, PaperPlaneTilt, Users } from '@phosphor-icons/react';
import { SegmentedControl, type SegmentedOption } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';

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

/** Las tres pestañas del lado de la inmobiliaria. */
type Pestana = 'todos' | 'inquilinos' | 'propietarios';

/**
 * A qué pestaña va cada quien.
 *
 * 🔴 `TENANT` y `LANDLORD` son los dos roles que la pantalla separa. Cualquier
 * otro —hoy un `AGENT` de otra inmobiliaria, mañana el que el back agregue—
 * NO cae en ninguna de las dos y se ve SÓLO en «Todos», que es justamente la
 * pestaña que abre por defecto. Es a propósito y en ese orden: meterlo a la
 * fuerza en «Inquilinos» sería mentir sobre su rol, y dejarlo fuera de las
 * tres sería desaparecer a alguien a quien el back sí autoriza a escribirle.
 * Por eso el conteo de «Todos» es el total y no la suma de las otras dos: la
 * diferencia, cuando la hay, es visible.
 */
function caeEnLaPestana(persona: DestinatarioPersona, pestana: Pestana): boolean {
  if (pestana === 'todos') return true;
  if (pestana === 'inquilinos') return persona.role === 'TENANT';
  return persona.role === 'LANDLORD';
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Recibe el id del hilo abierto para seleccionarlo en la bandeja. */
  onHiloAbierto: (conversationId: string) => void;
}

export function NuevoMensajeDrawer({ abierto, onCerrar, onHiloAbierto }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState<Pestana>('todos');
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

  // Se limpia al ABRIR, no al cerrar. El cajón ya no se desmonta de golpe:
  // sigue montado los 500 ms que dura la animación de salida, y limpiar ahí
  // se vería —el buscador vaciándose y la pestaña saltando a «Todos»
  // mientras el cajón se va.
  useEffect(() => {
    if (!abierto) return;
    setBusqueda('');
    setPestana('todos');
    setAbriendo(null);
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

  const personas = useMemo(() => datos?.personas ?? [], [datos]);
  const agencias = datos?.agencias ?? [];
  const esLadoAgencia = datos?.tipo === 'PERSONAS';
  const vacio = !cargando && !error && personas.length === 0 && agencias.length === 0;

  const conteos = useMemo(
    () => ({
      todos: personas.length,
      inquilinos: personas.filter((p) => p.role === 'TENANT').length,
      propietarios: personas.filter((p) => p.role === 'LANDLORD').length,
    }),
    [personas],
  );

  const enLaPestana = useMemo(
    () => personas.filter((p) => caeEnLaPestana(p, pestana)),
    [personas, pestana],
  );

  // Las pestañas sólo tienen sentido del lado de la inmobiliaria y sólo cuando
  // hay a quién repartir: mientras carga o si falló, un «Inquilinos · 0» sería
  // un número inventado.
  const hayPestanas = esLadoAgencia && !cargando && !error && personas.length > 0;

  const opciones: SegmentedOption<Pestana>[] = [
    { value: 'todos', label: `Todos · ${conteos.todos}` },
    { value: 'inquilinos', label: `Inquilinos · ${conteos.inquilinos}` },
    { value: 'propietarios', label: `Propietarios · ${conteos.propietarios}` },
  ];

  // Ojo: nada de `if (!abierto) return null`. Radix anima la salida sólo si el
  // contenido sigue montado con `data-state="closed"` mientras dura la
  // animación; desmontarlo de un tirón es lo que hacía que el cajón se cortara
  // al cerrar. El `open` de verdad deja que Radix lo saque deslizándose.
  return (
    <Sheet open={abierto} onOpenChange={(a) => !a && onCerrar()}>
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

        {/* Del lado de una persona la lista son sus inmobiliarias: no hay dos
            grupos que separar, así que no hay pestañas. */}
        {hayPestanas && (
          <div className="border-b border-border px-5 py-2.5" data-testid="pestanas-destinatarios">
            <SegmentedControl<Pestana>
              fullWidth
              size="sm"
              aria-label="Filtrar destinatarios por rol"
              value={pestana}
              onChange={setPestana}
              options={opciones}
            />
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
          ) : esLadoAgencia && enLaPestana.length === 0 ? (
            /* Sí hay gente; lo que no hay es gente de ESTE rol. Decirlo como
               «no hay a quién escribirle» sería falso y dejaría sin salida a
               quien sólo tiene que cambiar de pestaña. */
            <VacioDeLaPestana
              pestana={pestana}
              total={personas.length}
              hayBusqueda={busqueda.length > 0}
              onVerTodos={() => setPestana('todos')}
            />
          ) : (
            <ul className="divide-y divide-border">
              {enLaPestana.map((p) => (
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

/** «Hay gente, pero ninguna en esta pestaña» — con la salida puesta. */
function VacioDeLaPestana({
  pestana,
  total,
  hayBusqueda,
  onVerTodos,
}: {
  pestana: Pestana;
  total: number;
  hayBusqueda: boolean;
  onVerTodos: () => void;
}) {
  const quienes = pestana === 'inquilinos' ? 'inquilinos' : 'propietarios';
  const personas = total === 1 ? '1 persona' : `${total} personas`;

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      data-testid="pestana-vacia"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
        <Users className="h-6 w-6 text-fg-muted" weight="duotone" />
      </div>
      <p className="mb-1 text-sm font-semibold text-fg">No hay {quienes} en esta lista</p>
      <p className="max-w-xs text-sm text-fg-muted">
        {hayBusqueda
          ? `Tu búsqueda trajo ${personas}, pero ninguna es de este grupo. Mirá en «Todos» o buscá otra cosa.`
          : `Podés escribirle a ${personas}, pero ninguna es de este grupo. Están en las otras pestañas.`}
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        hideArrow
        className="mt-5"
        onClick={onVerTodos}
        data-testid="ver-todos-los-destinatarios"
      >
        Ver todos
      </Button>
    </div>
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
