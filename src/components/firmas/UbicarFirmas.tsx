'use client';

/**
 * «La pongo yo en el documento» (Nico, 28-10-2026: «las dos»): las páginas del PDF, y la firma de cada persona como
 * una caja de su color que se pone tocando la página y se mueve arrastrándola. Funciona con el dedo en el celular.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoDePuntero } from 'react';
import { X } from '@phosphor-icons/react';
import { Spinner } from '@leasefy/cadence';

import type { Posicion } from '@/lib/api/firmas.service';
import { abrirPdf, type DocumentoDePdf } from '@/lib/firmas/pdf-en-el-navegador';
import { cajaEn, COLORES_DE_FIRMANTE, moverCaja, type FirmanteEnElFormulario } from '@/lib/firmas/reglas-de-firmas';
import { cn } from '@/lib/utils';

interface Props {
  archivo: File;
  firmantes: FirmanteEnElFormulario[];
  alUbicar: (clave: string, posicion: Posicion | null) => void;
  alContarPaginas?: (n: number) => void;
}

export function UbicarFirmas({ archivo, firmantes, alUbicar, alContarPaginas }: Props) {
  const [pdf, setPdf] = useState<DocumentoDePdf | null>(null);
  const [tamanos, setTamanos] = useState<Array<{ ancho: number; alto: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState<string | null>(firmantes.find((f) => !f.posicion)?.clave ?? firmantes[0]?.clave ?? null);

  useEffect(() => {
    let vivo = true;
    let abierto: DocumentoDePdf | null = null;
    setError(null);
    abrirPdf(archivo)
      .then(async (doc) => {
        abierto = doc;
        if (!vivo) return;
        const medidas: Array<{ ancho: number; alto: number }> = [];
        for (let n = 1; n <= doc.numPages; n += 1) {
          const v = (await doc.getPage(n)).getViewport({ scale: 1 });
          medidas.push({ ancho: v.width, alto: v.height });
        }
        if (!vivo) return;
        setTamanos(medidas);
        setPdf(doc);
        alContarPaginas?.(doc.numPages);
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e.message : 'No pudimos abrir el PDF.');
      });
    return () => {
      vivo = false;
      void abierto?.destroy();
    };
    // alContarPaginas cambia en cada render del padre: el PDF se abre una vez por archivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo]);

  const color = (clave: string) => COLORES_DE_FIRMANTE[Math.max(0, firmantes.findIndex((f) => f.clave === clave)) % COLORES_DE_FIRMANTE.length];

  if (error) {
    return (
      <p className="rounded-xl bg-danger-soft px-4 py-3 text-body-sm text-fg" role="alert">
        {error} Puedes usar la hoja de firmas al final.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="ubicar-firmas">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-surface/95 px-1 py-2 backdrop-blur">
        <span className="text-[13px] text-fg-muted">Toca a la persona y luego el lugar de su firma:</span>
        {firmantes.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => setActivo(f.clave)}
            aria-pressed={activo === f.clave}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
              activo === f.clave ? 'border-transparent text-white' : 'border-border text-fg hover:bg-surface-muted',
            )}
            style={activo === f.clave ? { backgroundColor: color(f.clave) } : undefined}
            data-testid={`ubicar-${f.clave}`}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: activo === f.clave ? '#fff' : color(f.clave) }} aria-hidden="true" />
            {f.nombre.trim() || 'Sin nombre'}
            {f.posicion ? <span className="opacity-80">· pág. {f.posicion.pagina}</span> : null}
          </button>
        ))}
      </div>

      {!pdf ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-body-sm text-fg-muted">
          <Spinner size="sm" /> Abriendo el documento…
        </div>
      ) : (
        <div className="space-y-4">
          {tamanos.map((t, i) => (
            <PaginaConFirmas
              key={i}
              pdf={pdf}
              numero={i + 1}
              proporcion={t.alto / t.ancho}
              firmantes={firmantes}
              color={color}
              activo={activo}
              alUbicar={(clave, p) => {
                alUbicar(clave, p);
                // Sigue con la próxima persona sin ubicar.
                const siguiente = firmantes.find((f) => f.clave !== clave && !f.posicion);
                if (siguiente) setActivo(siguiente.clave);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PaginaConFirmas({
  pdf,
  numero,
  proporcion,
  firmantes,
  color,
  activo,
  alUbicar,
}: {
  pdf: DocumentoDePdf;
  numero: number;
  proporcion: number;
  firmantes: FirmanteEnElFormulario[];
  color: (clave: string) => string;
  activo: string | null;
  alUbicar: (clave: string, posicion: Posicion | null) => void;
}) {
  const marco = useRef<HTMLDivElement | null>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(numero <= 2);
  const [pintada, setPintada] = useState(false);
  const arrastre = useRef<{ clave: string; x: number; y: number; inicial: Posicion; movio: boolean } | null>(null);

  useEffect(() => {
    if (visible || !marco.current) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: '400px' });
    io.observe(marco.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || pintada || !lienzo.current || !marco.current) return;
    let vivo = true;
    void (async () => {
      const pagina = await pdf.getPage(numero);
      const ancho = marco.current?.clientWidth || 600;
      const base = pagina.getViewport({ scale: 1 });
      const escala = (ancho / base.width) * Math.min(2, window.devicePixelRatio || 1);
      const viewport = pagina.getViewport({ scale: escala });
      const c = lienzo.current;
      if (!c || !vivo) return;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      await pagina.render({ canvasContext: ctx, canvas: c, viewport }).promise;
      if (vivo) setPintada(true);
    })().catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [visible, pintada, pdf, numero]);

  const fraccion = useCallback((e: { clientX: number; clientY: number }) => {
    const r = marco.current!.getBoundingClientRect();
    return { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height, r };
  }, []);

  const aqui = firmantes.filter((f) => f.posicion?.pagina === numero);

  return (
    <div className="space-y-1">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Página {numero}</p>
      <div
        ref={marco}
        className={cn('relative w-full overflow-hidden rounded-lg border border-border bg-white shadow-sm', activo && 'cursor-crosshair')}
        style={{ aspectRatio: `1 / ${proporcion}` }}
        onClick={(e) => {
          if (!activo || arrastre.current?.movio) return;
          const { fx, fy } = fraccion(e);
          alUbicar(activo, cajaEn(numero, fx, fy));
        }}
        data-testid={`pagina-${numero}`}
      >
        <canvas ref={lienzo} className="absolute inset-0 h-full w-full" aria-label={`Página ${numero} del documento`} />
        {!pintada ? <div className="absolute inset-0 animate-pulse bg-surface-muted" aria-hidden="true" /> : null}
        {aqui.map((f) => {
          const p = f.posicion!;
          const tono = color(f.clave);
          const empezar = (e: EventoDePuntero<HTMLDivElement>) => {
            e.stopPropagation();
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            arrastre.current = { clave: f.clave, x: e.clientX, y: e.clientY, inicial: p, movio: false };
          };
          const mover = (e: EventoDePuntero<HTMLDivElement>) => {
            const a = arrastre.current;
            if (!a || a.clave !== f.clave || !marco.current) return;
            const r = marco.current.getBoundingClientRect();
            const dx = (e.clientX - a.x) / r.width;
            const dy = (e.clientY - a.y) / r.height;
            if (Math.abs(dx) + Math.abs(dy) > 0.004) a.movio = true;
            alUbicar(f.clave, moverCaja(a.inicial, dx, dy));
          };
          const soltar = () => {
            // Deja pasar el click que viene detrás sin crear otra caja.
            setTimeout(() => {
              arrastre.current = null;
            }, 0);
          };
          return (
            <div
              key={f.clave}
              role="button"
              tabIndex={0}
              aria-label={`Firma de ${f.nombre}. Arrástrala para moverla.`}
              onPointerDown={empezar}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                const paso = 0.01;
                const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
                if (d) {
                  e.preventDefault();
                  alUbicar(f.clave, moverCaja(p, d[0], d[1]));
                }
              }}
              className="absolute flex touch-none select-none items-end rounded-md border-2 border-dashed px-1.5 pb-1 text-[11px] font-medium shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: `${p.ancho * 100}%`,
                height: `${p.alto * 100}%`,
                borderColor: tono,
                backgroundColor: `${tono}1A`,
                color: tono,
                cursor: 'grab',
              }}
              data-testid={`caja-${f.clave}`}
            >
              <span className="truncate">Firma de {f.nombre.trim().split(' ')[0] || '…'}</span>
              <button
                type="button"
                aria-label={`Quitar la firma de ${f.nombre}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  alUbicar(f.clave, null);
                }}
                className="absolute -right-2.5 -top-2.5 inline-flex size-5 items-center justify-center rounded-full bg-surface text-fg shadow ring-1 ring-border"
              >
                <X size={10} weight="bold" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
