'use client';

/**
 * `/coleccion/<token>` — la colección que el agente le mandó al cliente (28-10-2026). Sin cuenta: el enlace es la
 * llave. El cliente ve los inmuebles, marca «Me gusta / No» y comenta; el agente lo ve en su panel. Primero el
 * celular: así llega por WhatsApp.
 */

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChatCircleText, Heart, ThumbsDown, WhatsappLogo } from '@phosphor-icons/react';
import { Ilustracion, enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { coleccionesApi, type ColeccionPublica, type ReaccionDelCliente } from '@/lib/api/colecciones.service';
import { celularParaMarcar } from '@/lib/tu-dia/tu-dia';
import { cn } from '@/lib/utils';

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export default function ColeccionDelCliente({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const reducido = usePrefersReducedMotion();
  const [coleccion, setColeccion] = useState<ColeccionPublica | null | 'no-existe'>(null);

  useEffect(() => {
    let vivo = true;
    coleccionesApi
      .publica(token)
      .then((c) => vivo && setColeccion(c))
      .catch(() => vivo && setColeccion('no-existe'));
    return () => {
      vivo = false;
    };
  }, [token]);

  if (coleccion === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <CargaDeMarca tamano="lg" />
      </div>
    );
  }
  if (coleccion === 'no-existe') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center" data-testid="coleccion-no-existe">
        <Ilustracion nombre="lupa" tamano={112} tono="auto" alt="" />
        <h1 className="mt-5 text-h3 text-fg">Esta colección ya no está disponible</h1>
        <p className="mt-2 max-w-sm text-body text-fg-muted">Pídele a tu agente que te mande el enlace de nuevo, o mira los arriendos del marketplace.</p>
        <Button asChild className="mt-6">
          <a href="/propiedades">Ver el marketplace</a>
        </Button>
      </div>
    );
  }

  const cel = celularParaMarcar(coleccion.agente.whatsapp);
  const primerNombre = coleccion.paraQuien.trim().split(/\s+/)[0];
  const saludo = `Hola ${coleccion.agente.nombre.split(' ')[0]}, vi la colección que me mandaste.`;

  return (
    <div className="min-h-screen bg-bg pb-28" data-testid="coleccion-del-cliente">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[960px] items-center gap-3 px-4 py-4 sm:px-6">
          {coleccion.agente.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo de la inmobiliaria (URL de su perfil)
            <img src={coleccion.agente.logo} alt="" className="size-11 rounded-xl object-cover" />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft font-medium text-primary">
              {coleccion.agente.nombre.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-fg">{coleccion.agente.nombre}</p>
            <p className="truncate text-caption text-fg-subtle">{coleccion.agente.inmobiliaria ?? 'Tu agente'}</p>
          </div>
          <LeasefyLogotype size={16} className="hidden text-fg-subtle sm:block" title="Leasefy" />
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-4 pt-8 sm:px-6">
        <motion.div initial={reducido ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={enterTransition(reducido)}>
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">Para {coleccion.paraQuien}</p>
          <h1 className="mt-2 text-[28px] font-[420] leading-tight tracking-[-0.03em] text-fg sm:text-[34px]">
            {primerNombre}, te escogí {coleccion.inmuebles.length === 1 ? 'este inmueble' : `estos ${coleccion.inmuebles.length} inmuebles`}
          </h1>
          {coleccion.nota ? <p className="mt-3 max-w-[60ch] rounded-2xl bg-surface-muted px-4 py-3 text-body text-fg">«{coleccion.nota}»</p> : null}
          <p className="mt-3 text-body-sm text-fg-muted">Marca los que te gustan y los que no: tu agente lo ve y te propone visitas.</p>
        </motion.div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {coleccion.inmuebles.map((i) => (
            <TarjetaDelCliente key={i.id} token={token} inmueble={i} />
          ))}
        </ul>
      </main>

      {cel ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3">
            <p className="hidden text-body-sm text-fg-muted sm:block">¿Te gustó alguno? Escríbele a {coleccion.agente.nombre.split(' ')[0]} para visitarlo.</p>
            <Button asChild className="w-full sm:w-auto">
              <a href={`https://wa.me/${cel}?text=${encodeURIComponent(saludo)}`} target="_blank" rel="noreferrer noopener" data-testid="coleccion-whatsapp">
                <WhatsappLogo size={18} weight="fill" aria-hidden="true" className="mr-1.5" />
                Escribirle por WhatsApp
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TarjetaDelCliente({ token, inmueble }: { token: string; inmueble: ColeccionPublica['inmuebles'][number] }) {
  const [reaccion, setReaccion] = useState<ReaccionDelCliente | null>(inmueble.reaccion);
  const [comentario, setComentario] = useState(inmueble.comentario ?? '');
  const [escribiendo, setEscribiendo] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const marcar = (r: ReaccionDelCliente) => {
    const nueva = reaccion === r ? null : r;
    setReaccion(nueva);
    void coleccionesApi.marcar(token, inmueble.id, { reaccion: nueva }).catch(() => setReaccion(reaccion));
  };
  const guardarComentario = async () => {
    try {
      await coleccionesApi.marcar(token, inmueble.id, { comentario: comentario.trim() || null });
      setGuardado(true);
      setEscribiendo(false);
    } catch {
      setGuardado(false);
    }
  };

  const precio = inmueble.canon ? `${pesos(inmueble.canon)} al mes` : inmueble.venta ? pesos(inmueble.venta) : null;
  const datos = [
    inmueble.habitaciones ? `${inmueble.habitaciones} hab.` : null,
    inmueble.banos ? `${inmueble.banos} baños` : null,
    inmueble.area ? `${inmueble.area} m²` : null,
  ].filter(Boolean);

  return (
    <li className={cn('overflow-hidden rounded-2xl border bg-surface', reaccion === 'me_gusta' ? 'border-primary/40 ring-2 ring-primary/15' : 'border-border')} data-testid={`coleccion-inmueble-${inmueble.id}`}>
      <a href={`/es/propiedades/${inmueble.id}`} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-surface-muted">
        {inmueble.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto del inmueble del marketplace
          <img src={inmueble.foto} alt={inmueble.titulo} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="flex size-full items-center justify-center">
            <Ilustracion nombre="casa" tamano={96} tono="auto" alt="" />
          </span>
        )}
      </a>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{inmueble.titulo}</p>
            <p className="truncate text-caption text-fg-subtle">{[inmueble.barrio, inmueble.ciudad].filter(Boolean).join(', ')}</p>
          </div>
          {precio ? <p className="shrink-0 font-mono text-body-sm font-medium text-fg">{precio}</p> : null}
        </div>
        {datos.length > 0 ? <p className="mt-1 text-caption text-fg-muted">{datos.join(' · ')}</p> : null}
        {!inmueble.disponible ? <p className="mt-2 text-caption text-warning-ink">Ya no está disponible</p> : null}
        <div className="mt-3 flex items-center gap-2">
          <Button type="button" size="sm" variant={reaccion === 'me_gusta' ? 'default' : 'secondary'} hideArrow onClick={() => marcar('me_gusta')} aria-pressed={reaccion === 'me_gusta'} data-testid={`me-gusta-${inmueble.id}`}>
            <Heart size={15} weight={reaccion === 'me_gusta' ? 'fill' : 'bold'} aria-hidden="true" className="mr-1.5" />
            Me gusta
          </Button>
          <Button type="button" size="sm" variant={reaccion === 'no' ? 'default' : 'ghost'} hideArrow onClick={() => marcar('no')} aria-pressed={reaccion === 'no'} data-testid={`no-${inmueble.id}`}>
            <ThumbsDown size={15} weight="bold" aria-hidden="true" className="mr-1.5" />
            No
          </Button>
          <button type="button" onClick={() => setEscribiendo((e) => !e)} className="ml-auto inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline">
            <ChatCircleText size={15} aria-hidden="true" />
            {comentario ? 'Tu comentario' : 'Comentar'}
          </button>
        </div>
        {escribiendo ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="¿Qué te pareció? ¿Qué te gustaría saber?"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label={`Comentario sobre ${inmueble.titulo}`}
            />
            <Button type="button" size="sm" hideArrow onClick={() => void guardarComentario()}>
              Enviar a mi agente
            </Button>
          </div>
        ) : guardado ? (
          <p className="mt-2 text-caption text-success-ink">Tu agente ya ve tu comentario.</p>
        ) : null}
      </div>
    </li>
  );
}
