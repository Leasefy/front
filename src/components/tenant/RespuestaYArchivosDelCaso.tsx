'use client';

/**
 * PQRS-FIX (04-10-2026): lo que el inquilino (o el propietario) ve de SU
 * solicitud además del historial.
 *   · SO-06: «Respuesta de la inmobiliaria: …» — hasta hoy veía «Resuelta» sin
 *     saber qué se resolvió.
 *   · SO-18: sus archivos (se abren con un enlace que dura una hora) y «Agregar
 *     foto o PDF» mientras no esté cerrada.
 */
import { useRef, useState } from 'react';
import { ChatCircleText, FilePdf, Image as Imagen, Paperclip } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { pqrsApi } from '@/lib/api/pqrs.service';
import { ACCEPT_DE_ADJUNTOS, problemaDelAdjunto } from '@/lib/api/pqrs-adjuntos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service';

interface Props {
  caseId: string;
  solicitud: {
    estado: string;
    respuesta?: { texto: string; at: string; medio: string } | null;
    adjuntos?: Array<{ id: string; nombre: string; tipo: string; subidoAt: string }>;
  };
  /** Tras subir un archivo: vuelve a leer el caso. */
  onCambio?: () => void;
}

const MEDIO: Record<string, string> = {
  PORTAL: 'en tu portal',
  CORREO: 'por correo',
  TELEFONO: 'por teléfono',
  PRESENCIAL: 'en persona',
};

export function RespuestaYArchivosDelCaso({ caseId, solicitud, onCambio }: Props) {
  const [adjuntos, setAdjuntos] = useState(solicitud.adjuntos ?? []);
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cerrada = solicitud.estado === 'cerrada';

  async function subir(archivo: File) {
    const problema = problemaDelAdjunto(archivo);
    if (problema) {
      toast.error('No se pudo adjuntar', { description: problema });
      return;
    }
    setSubiendo(true);
    try {
      const nuevo = await pqrsApi.subirAdjunto(caseId, archivo);
      setAdjuntos((a) => [...a, { id: nuevo.id, nombre: nuevo.nombre, tipo: nuevo.tipo, subidoAt: nuevo.subidoAt }]);
      toast.success(`«${archivo.name}» quedó adjunto a tu solicitud`);
      onCambio?.();
    } catch (e) {
      toast.error('No se pudo adjuntar', {
        description: mensajeParaLaPersona(e, { porDefecto: 'Prueba de nuevo en un momento.', accion: 'adjuntar el archivo' }),
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function abrir(id: string) {
    try {
      const { url } = await pqrsApi.abrirAdjunto(caseId, id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('No se pudo abrir el archivo', {
        description: mensajeParaLaPersona(e, { porDefecto: 'Prueba de nuevo en un momento.', accion: 'abrir el archivo' }),
      });
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5 sm:p-6 dark:border-border-strong dark:bg-surface-muted">
      {solicitud.respuesta ? (
        <div className="space-y-2" data-testid="caso-respuesta">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg dark:text-white">
            <ChatCircleText className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            Respuesta de la inmobiliaria
          </h2>
          <p className="whitespace-pre-wrap text-sm text-fg dark:text-white">{solicitud.respuesta.texto}</p>
          <p className="text-xs text-fg-muted">
            {fechaLegible(solicitud.respuesta.at)}
            {solicitud.respuesta.medio && solicitud.respuesta.medio !== 'PORTAL'
              ? ` · te la dieron ${MEDIO[solicitud.respuesta.medio] ?? ''}`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="space-y-2" data-testid="caso-adjuntos">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg dark:text-white">Archivos</h2>
          {!cerrada && (
            <>
              <input
                ref={input}
                type="file"
                accept={ACCEPT_DE_ADJUNTOS}
                className="sr-only"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = '';
                  if (archivo) void subir(archivo);
                }}
                data-testid="caso-adjuntar-input"
              />
              <Button variant="outline" size="sm" hideArrow disabled={subiendo} onClick={() => input.current?.click()}>
                <Paperclip className="h-4 w-4" />
                {subiendo ? 'Subiendo…' : 'Agregar foto o PDF'}
              </Button>
            </>
          )}
        </div>
        {adjuntos.length === 0 ? (
          <p className="text-sm text-fg-subtle">No has adjuntado archivos.</p>
        ) : (
          <ul className="space-y-1.5">
            {adjuntos.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => void abrir(a.id)}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                  data-testid="caso-adjunto"
                >
                  {a.tipo === 'application/pdf' ? (
                    <FilePdf className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                  ) : (
                    <Imagen className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-fg dark:text-white">{a.nombre}</span>
                  <span className="shrink-0 text-xs text-fg-muted">{fechaLegible(a.subidoAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
