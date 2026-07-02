'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PencilSimple, Eraser } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface SignaturePadProps {
  /**
   * Callback cuando la firma cambia. Recibe el base64 PNG (data URL con prefix)
   * o null cuando el canvas está vacío.
   */
  onChange: (dataUrl: string | null) => void;
  /** Nombre del firmante para label */
  signerName?: string;
  /** Deshabilita interacciones */
  disabled?: boolean;
  className?: string;
}

/**
 * Canvas para firma dibujada. Retorna base64 PNG via `onChange` cuando el usuario
 * termina cada trazo. El backend estampa esa imagen sobre el PDF (ver handoff de
 * firma electrónica).
 */
export function SignaturePad({ onChange, signerName, disabled = false, className }: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 180 });

  // Resize canvas al ancho disponible para que el trazo se renderice nítido en HiDPI.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const resize = () => {
      const w = el.clientWidth;
      if (w > 0) setCanvasSize({ width: w, height: 180 });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleEnd = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const empty = c.isEmpty();
    setIsEmpty(empty);
    onChange(empty ? null : c.toDataURL('image/png'));
  }, [onChange]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    setIsEmpty(true);
    onChange(null);
  }, [onChange]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-fg inline-flex items-center gap-1.5">
          <PencilSimple className="w-3.5 h-3.5 text-primary" />
          Dibujá tu firma {signerName && <span className="text-fg-muted">({signerName})</span>}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="text-xs gap-1 text-fg-muted hover:text-fg"
        >
          <Eraser className="w-3.5 h-3.5" />
          Borrar
        </Button>
      </div>

      {/* El canvas SIEMPRE va con fondo blanco (como una hoja de papel), independiente
          del tema. La tinta es negra y se ve nítida en cualquier modo. El PNG que se
          exporta al backend también queda con fondo blanco → el estampado en el PDF es
          consistente. */}
      <div
        ref={containerRef}
        className={cn(
          'relative rounded-xl border-2 border-dashed bg-surface overflow-hidden transition-colors',
          isEmpty
            ? 'border-border dark:border-border-strong'
            : 'border-primary/30',
          disabled && 'opacity-50 pointer-events-none'
        )}
        style={{ height: canvasSize.height }}
      >
        {canvasSize.width > 0 && (
          <SignatureCanvas
            ref={canvasRef}
            backgroundColor="#ffffff"
            penColor="#111827"
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              className: 'w-full h-full touch-none',
            }}
            onEnd={handleEnd}
          />
        )}
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-fg-muted select-none">
              Firmá acá con el mouse, dedo o stylus
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-fg-muted">
        Tu firma se va a estampar en el PDF final junto con tu nombre, fecha y certificado de autenticidad.
      </p>
    </div>
  );
}
