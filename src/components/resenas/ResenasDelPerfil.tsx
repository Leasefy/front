'use client';

/**
 * Las reseñas en el perfil de la inmobiliaria o del agente (28-10-2026; Nico: «Sólo clientes de Leasefy»). Cualquiera
 * las lee; reseña sólo quien tuvo con ella un contrato, una visita o una postulación por Leasefy (lo decide el back).
 */

import { useCallback, useEffect, useState } from 'react';
import { Star } from '@phosphor-icons/react';
import { Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/use-auth';
import { POR_QUE_RESENA, resenasApi, type ResenaPublica, type ResenasDeLaInmobiliaria } from '@/lib/api/resenas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';

const fecha = (iso: string) => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(new Date(iso));

export function Estrellas({ valor, tamano = 16 }: { valor: number; tamano?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={tamano} weight={n <= Math.round(valor) ? 'fill' : 'regular'} className={n <= Math.round(valor) ? 'text-warning' : 'text-fg-subtle'} aria-hidden="true" />
      ))}
    </span>
  );
}

export function TarjetaDeResena({ r, children }: { r: ResenaPublica; children?: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4" data-testid={`resena-${r.id}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-fg">{r.autor}</p>
        <Estrellas valor={r.calificacion} tamano={14} />
      </div>
      <p className="mt-0.5 text-caption text-fg-subtle">
        {POR_QUE_RESENA[r.motivo]} · {fecha(r.creadaEn)}
        {r.editada ? ' · editada' : ''}
      </p>
      <p className="mt-2 whitespace-pre-line text-body-sm text-fg">{r.texto}</p>
      {r.respuesta ? (
        <div className="mt-3 rounded-xl bg-surface-muted px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Respuesta</p>
          <p className="mt-0.5 whitespace-pre-line text-body-sm text-fg-muted">{r.respuesta}</p>
        </div>
      ) : null}
      {children}
    </li>
  );
}

export function ResenasDelPerfil({ agencyId, nombre }: { agencyId: string; nombre: string }) {
  const { user } = useAuth();
  const [datos, setDatos] = useState<ResenasDeLaInmobiliaria | null>(null);
  const [puedo, setPuedo] = useState<{ puede: boolean; mia: ResenaPublica | null } | null>(null);
  const [calificacion, setCalificacion] = useState(0);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [escribiendo, setEscribiendo] = useState(false);

  const leer = useCallback(() => {
    resenasApi.delPerfil(agencyId).then(setDatos).catch(() => setDatos({ promedio: null, total: 0, resenas: [] }));
  }, [agencyId]);
  useEffect(() => leer(), [leer]);
  useEffect(() => {
    if (!user) return;
    resenasApi
      .puedo(agencyId)
      .then((p) => {
        setPuedo(p);
        if (p.mia) {
          setCalificacion(p.mia.calificacion);
          setTexto(p.mia.texto);
        }
      })
      .catch(() => setPuedo(null));
  }, [agencyId, user]);

  const enviar = async () => {
    if (calificacion < 1) return setFallo('Elige de 1 a 5 estrellas.');
    if (texto.trim().length < 10) return setFallo('Cuéntanos un poco más (al menos 10 letras).');
    setGuardando(true);
    setFallo(null);
    try {
      await resenasApi.escribir(agencyId, { calificacion, texto: texto.trim() });
      setEscribiendo(false);
      leer();
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { accion: 'dejar tu reseña', porDefecto: 'No pudimos guardar tu reseña.' }));
    } finally {
      setGuardando(false);
    }
  };

  if (!datos) return null;
  return (
    <section className="mx-auto mt-12 max-w-[1280px] px-4 md:px-6" aria-labelledby="sus-resenas" data-testid="resenas-del-perfil">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sus-resenas" className="text-h3 text-fg">
            Lo que dicen sus clientes
          </h2>
          {datos.promedio !== null ? (
            <p className="mt-1 flex items-center gap-2 text-body-sm text-fg-muted">
              <span className="text-[22px] font-[420] text-fg">{datos.promedio.toLocaleString('es-CO')}</span>
              <Estrellas valor={datos.promedio} />
              <span>
                · {datos.total === 1 ? '1 reseña' : `${datos.total} reseñas`} de clientes de Leasefy
              </span>
            </p>
          ) : null}
        </div>
        {puedo?.puede && !escribiendo ? (
          <Button variant="secondary" hideArrow onClick={() => setEscribiendo(true)} data-testid="dejar-resena">
            {puedo.mia ? 'Editar mi reseña' : 'Dejar mi reseña'}
          </Button>
        ) : null}
      </div>

      {escribiendo ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4" data-testid="formulario-de-resena">
          <p className="text-body-sm font-medium text-fg">¿Cómo te fue con {nombre}?</p>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={calificacion === n} aria-label={`${n} estrellas`} onClick={() => setCalificacion(n)} className="rounded-md p-1 hover:bg-surface-muted">
                <Star size={26} weight={n <= calificacion ? 'fill' : 'regular'} className={n <= calificacion ? 'text-warning' : 'text-fg-subtle'} />
              </button>
            ))}
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Cuenta cómo fue el trato, la visita o el contrato."
            className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Tu reseña"
          />
          {fallo ? <p className="mt-1 text-caption text-danger">{fallo}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" hideArrow onClick={() => setEscribiendo(false)}>
              Cancelar
            </Button>
            <Button hideArrow isLoading={guardando} onClick={() => void enviar()}>
              Publicar mi reseña
            </Button>
          </div>
        </div>
      ) : null}

      {datos.resenas.length === 0 ? (
        <div className={cn('mt-4 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5')}>
          <Ilustracion nombre="mensajes" tamano={64} tono="auto" alt="" />
          <p className="text-body-sm text-fg-muted">Todavía no tiene reseñas. Las dejan sólo quienes arrendaron, visitaron o se postularon con {nombre} por Leasefy.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {datos.resenas.slice(0, 12).map((r) => (
            <TarjetaDeResena key={r.id} r={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
