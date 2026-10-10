'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { Check, ThumbsDown, ThumbsUp } from '@phosphor-icons/react';

import { marketplaceApi, paginaDe, type PreguntaPendiente } from '@/lib/api/marketplace.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';
import { LogoDeLaInmobiliaria } from './piezas';

/**
 * «¿Recomendarías a Nogal para arrendar? Sí o no» (Nico, 09-10-2026, como
 * Airbnb). Sale en el portal del inquilino y en el del propietario a los 3
 * meses del contrato y al terminar, hasta que vote: un voto por contrato y no
 * se cambia. El comentario es opcional y se publica con su nombre de pila.
 * «Ahora no» la guarda en este navegador hasta el próximo momento (al
 * terminar el contrato vuelve a salir si no votó).
 */

const LARGO_DEL_COMENTARIO = 600;
const clave = (p: PreguntaPendiente) => `leasefy-recomendacion-ahora-no:${p.contractId}:${p.momento}`;

function laDejoParaDespues(p: PreguntaPendiente): boolean {
  try {
    return window.localStorage.getItem(clave(p)) === '1';
  } catch {
    return false;
  }
}

export function PreguntaDeLaRecomendacion({ className }: { className?: string }) {
  const [pregunta, setPregunta] = useState<PreguntaPendiente | null>(null);
  const [recomienda, setRecomienda] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    let vigente = true;
    marketplaceApi
      .pendientes()
      .then((r) => vigente && setPregunta(r.find((p) => !laDejoParaDespues(p)) ?? null))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  if (!pregunta) return null;
  const nombre = pregunta.inmobiliaria.nombre;

  const enviar = async () => {
    if (recomienda === null || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await marketplaceApi.votar({
        contractId: pregunta.contractId,
        recomienda,
        comentario: comentario.trim() || null,
      });
      setLista(true);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos guardar tu respuesta.', accion: 'guardar tu respuesta' }));
    } finally {
      setEnviando(false);
    }
  };

  const ahoraNo = () => {
    try {
      window.localStorage.setItem(clave(pregunta), '1');
    } catch {
      // Sin almacenamiento, sólo se oculta por ahora.
    }
    setPregunta(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className={cn('rounded-xl border border-border bg-surface p-5', className)}
      aria-label={`¿Recomendarías a ${nombre} para arrendar?`}
      data-testid="pregunta-de-la-recomendacion"
    >
      <AnimatePresence mode="wait" initial={false}>
        {lista ? (
          <motion.div
            key="gracias"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionDuration.base, ease: motionEase.enter }}
            className="flex items-start gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" weight="bold" aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-medium text-fg">Gracias. Tu respuesta ayuda a quien busca arriendo.</p>
              <Link href={paginaDe(pregunta.inmobiliaria)} className="mt-1 inline-block text-[13.5px] font-medium text-primary hover:underline">
                Ver la página de {nombre}
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pregunta" exit={{ opacity: 0 }}>
            <div className="flex items-start gap-3">
              <LogoDeLaInmobiliaria i={{ nombre, logoUrl: pregunta.inmobiliaria.logoUrl }} tamano={40} />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[17px] font-semibold text-fg">¿Recomendarías a {nombre} para arrendar?</p>
                <p className="mt-0.5 text-[13.5px] text-fg-muted">
                  {pregunta.momento === 'FIN' ? 'Tu contrato terminó' : 'Ya cumpliste 3 meses de contrato'}
                  {pregunta.inmueble ? ` (${pregunta.inmueble})` : ''}. Se publica en su página, sólo con tu nombre de pila. Hay un
                  voto por contrato.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Tu respuesta">
              {[
                { valor: true, texto: 'Sí', icono: ThumbsUp },
                { valor: false, texto: 'No', icono: ThumbsDown },
              ].map(({ valor, texto, icono: Icono }) => (
                <button
                  key={texto}
                  type="button"
                  role="radio"
                  aria-checked={recomienda === valor}
                  onClick={() => setRecomienda(valor)}
                  className={cn(
                    'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border text-[14.5px] font-medium transition-colors duration-fast active:scale-[0.98] sm:flex-none sm:px-6',
                    recomienda === valor ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-fg hover:border-border-strong',
                  )}
                >
                  <Icono className="h-4 w-4" weight={recomienda === valor ? 'fill' : 'regular'} aria-hidden />
                  {texto}
                </button>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {recomienda !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: motionDuration.base, ease: motionEase.enter }}
                  className="overflow-hidden"
                >
                  <label htmlFor="comentario-de-la-recomendacion" className="mt-4 block text-[13.5px] text-fg">
                    ¿Algo que quieras contar? <span className="text-fg-muted">(opcional)</span>
                  </label>
                  <textarea
                    id="comentario-de-la-recomendacion"
                    rows={3}
                    maxLength={LARGO_DEL_COMENTARIO}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder={recomienda ? 'Qué te gustó de arrendar con ellos' : 'Qué no te gustó'}
                    className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[14.5px] text-fg placeholder:text-fg-placeholder focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-right font-mono text-[11.5px] tabular-nums text-fg-subtle">
                    {comentario.length}/{LARGO_DEL_COMENTARIO}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={ahoraNo} className="text-[13.5px] text-fg-muted hover:text-fg">
                Ahora no
              </button>
              <button
                type="button"
                onClick={enviar}
                disabled={recomienda === null || enviando}
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-fg transition-colors duration-fast hover:bg-primary-600 disabled:opacity-50 active:scale-[0.97]"
              >
                {enviando ? 'Guardando…' : 'Enviar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
