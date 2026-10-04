'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Textarea } from '@/components/ui';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { embudoApi, notasSinMarcas, type NotaDelLead } from '@/lib/api/embudo.service';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaDeLaCasa, horaDeLaCasa } from '@/lib/agenda/hora-de-la-casa';

/**
 * 🔴 PL-13 (QA del 04-10-2026): las notas del interesado SE GUARDAN, con quién
 * las escribió y cuándo, y se ven al reabrir. Antes el campo era sólo estado
 * de la pantalla: nada viajaba al back.
 */
export function NotasDelLead({
  pipelineItemId,
  notasViejas,
  puedeEscribir,
}: {
  pipelineItemId: string;
  /** Lo que ya traía la tarjeta (sin las marcas de la sincronización). */
  notasViejas?: string | null;
  puedeEscribir: boolean;
}) {
  const [notas, setNotas] = useState<NotaDelLead[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    embudoApi
      .notas(pipelineItemId)
      .then((r) => setNotas(r.notas ?? []))
      .catch(() => setNotas([]))
      .finally(() => setCargando(false));
  }, [pipelineItemId]);
  useEffect(() => {
    setTexto('');
    setError(null);
    cargar();
  }, [cargar]);

  const guardar = async () => {
    const t = texto.trim();
    if (!t || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const nota = await embudoApi.agregarNota(pipelineItemId, t);
      setNotas((n) => [nota, ...n]);
      setTexto('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(mensajeParaLaPersona(err, { porDefecto: 'No se pudo guardar la nota.', accion: 'guardar la nota' }));
    } finally {
      setGuardando(false);
    }
  };

  const viejas = notasSinMarcas(notasViejas);

  return (
    <div className="space-y-3" data-testid="notas-del-lead">
      {puedeEscribir && (
        <div className="space-y-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void guardar();
              }
            }}
            placeholder="Escribe una nota: qué dijo, qué quedó pendiente…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none"
            data-testid="nota-texto"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-subtle">Ctrl + Enter para guardar</span>
            <Button size="sm" hideArrow disabled={!texto.trim() || guardando} isLoading={guardando} onClick={() => void guardar()} data-testid="nota-guardar">
              Guardar nota
            </Button>
          </div>
          <ErrorDelCampo id="nota-error" mensaje={error} />
        </div>
      )}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {notas.map((n) => {
            const d = new Date(n.creadaEl);
            const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            return (
              <motion.li
                key={n.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="rounded-md bg-muted p-3"
                data-testid="nota-del-lead"
              >
                <p className="whitespace-pre-wrap text-sm text-foreground">{n.texto}</p>
                <p className="mt-1 text-caption text-muted-foreground">
                  {n.autorNombre} · {diaDeLaCasa(d)} · {horaDeLaCasa(hh)}
                </p>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {viejas && (
          <li className="rounded-md bg-muted/60 p-3">
            <p className="whitespace-pre-wrap text-sm text-foreground">{viejas}</p>
            <p className="mt-1 text-caption text-muted-foreground">Nota de cuando entró</p>
          </li>
        )}
        {!cargando && notas.length === 0 && !viejas && (
          <li className="text-caption text-muted-foreground">Todavía no hay notas.</li>
        )}
      </ul>
    </div>
  );
}
