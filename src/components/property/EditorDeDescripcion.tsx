'use client';

import * as React from 'react';
import { Eye, ListBullets, ListNumbers, PencilSimple, Smiley, TextB, TextItalic } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';
import { DescripcionConFormato } from '@/components/property/DescripcionConFormato';
import { alternarLista, alternarMarca, insertar, type Edicion } from '@/lib/inmuebles/descripcion-con-formato';
import { GRUPOS_DE_EMOJIS } from '@/lib/inmuebles/emojis-de-la-descripcion';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';

/**
 * El campo de la descripción del inmueble con su barra de formato (Nico 31-10-2026: «que en el text area de la
 * descripción tenga lo de bold, etc… agregar emojis… para que puedan agregar mejor sus descripciones»).
 *
 * Es el MISMO `Textarea` de siempre con una barra arriba: recibe sus mismas props (value, onChange, onBlur, aria,
 * maxLength…), así que cada formulario lo cambia sin tocar su estado. La barra escribe las marcas de WhatsApp
 * (`*negrilla*`, `_cursiva_`, «- » y «1. »; ver `descripcion-con-formato.ts`) y avisa el cambio por el `onChange` del
 * formulario, como si la persona lo hubiera tecleado. «Ver cómo queda» la muestra como en la ficha.
 */
export const EditorDeDescripcion = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function EditorDeDescripcion(
  { className, onKeyDown, maxLength, ...props },
  ref,
) {
  const tr = useTr();
  const interno = React.useRef<HTMLTextAreaElement | null>(null);
  const [vistaPrevia, setVistaPrevia] = React.useState(false);
  const [emojisAbiertos, setEmojisAbiertos] = React.useState(false);

  const unirRef = React.useCallback(
    (el: HTMLTextAreaElement | null) => {
      interno.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const aplicar = React.useCallback(
    (hacer: (valor: string, inicio: number, fin: number) => Edicion) => {
      const el = interno.current;
      if (!el || el.disabled || el.readOnly) return;
      const edicion = hacer(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length);
      if (maxLength !== undefined && edicion.valor.length > maxLength) return;
      // El setter nativo + un `input` hacen que React llame el `onChange` del formulario como si se hubiera tecleado.
      const fijar = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      fijar?.call(el, edicion.valor);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(edicion.inicio, edicion.fin));
    },
    [maxLength],
  );

  const negrilla = () => aplicar((v, i, f) => alternarMarca(v, i, f, '*'));
  const cursiva = () => aplicar((v, i, f) => alternarMarca(v, i, f, '_'));

  const alTeclear = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const tecla = e.key.toLowerCase();
    if (tecla === 'b') {
      e.preventDefault();
      negrilla();
    } else if (tecla === 'i') {
      e.preventDefault();
      cursiva();
    }
  };

  const apagada = Boolean(props.disabled || props.readOnly);
  const tecla = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
  const acciones = [
    { etiqueta: tr('Negrilla'), atajo: `${tecla}B`, icono: TextB, hacer: negrilla },
    { etiqueta: tr('Cursiva'), atajo: `${tecla}I`, icono: TextItalic, hacer: cursiva },
    { etiqueta: tr('Lista con viñetas'), icono: ListBullets, hacer: () => aplicar((v, i, f) => alternarLista(v, i, f, 'vinetas')) },
    { etiqueta: tr('Lista numerada'), icono: ListNumbers, hacer: () => aplicar((v, i, f) => alternarLista(v, i, f, 'numerada')) },
  ];

  return (
    <div className="space-y-1.5" data-testid="editor-de-descripcion">
      <div role="toolbar" aria-label={tr('Formato de la descripción')} className="flex flex-wrap items-center gap-0.5">
        {acciones.map(({ etiqueta, atajo, icono: Icono, hacer }) => (
          <IconTooltip key={etiqueta} label={atajo ? `${etiqueta} · ${atajo}` : etiqueta}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-fg-muted hover:text-fg"
              aria-label={etiqueta}
              disabled={apagada || vistaPrevia}
              // Que el clic no le quite el foco ni la selección al campo.
              onMouseDown={(e) => e.preventDefault()}
              onClick={hacer}
            >
              <Icono className="h-4 w-4" aria-hidden />
            </Button>
          </IconTooltip>
        ))}
        <Popover open={emojisAbiertos} onOpenChange={setEmojisAbiertos}>
          <IconTooltip label={tr('Emojis')}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-fg-muted hover:text-fg"
                aria-label={tr('Agregar un emoji')}
                disabled={apagada || vistaPrevia}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Smiley className="h-4 w-4" aria-hidden />
              </Button>
            </PopoverTrigger>
          </IconTooltip>
          <PopoverContent
            align="start"
            className="w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {GRUPOS_DE_EMOJIS.map((grupo) => (
              <div key={grupo.titulo} role="group" aria-label={tr(grupo.titulo)}>
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{tr(grupo.titulo)}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {grupo.emojis.map(({ emoji, nombre }) => (
                    <button
                      key={nombre}
                      type="button"
                      aria-label={tr(nombre)}
                      title={tr(nombre)}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[20px] leading-none transition-transform duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        aplicar((v, i, f) => insertar(v, i, f, `${emoji} `));
                        setEmojisAbiertos(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-8 gap-1.5 px-2 text-fg-muted hover:text-fg"
          aria-pressed={vistaPrevia}
          onClick={() => setVistaPrevia((v) => !v)}
          data-testid="descripcion-vista-previa"
        >
          {vistaPrevia ? <PencilSimple className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          {vistaPrevia ? tr('Seguir escribiendo') : tr('Ver cómo queda')}
        </Button>
      </div>
      <Textarea
        ref={unirRef}
        maxLength={maxLength}
        onKeyDown={alTeclear}
        className={cn(className, vistaPrevia && 'hidden')}
        {...props}
      />
      {vistaPrevia && (
        <div className="min-h-[96px] rounded-[12px] border border-border px-4 py-3 text-[15px] leading-[1.6] text-fg-muted" aria-live="polite">
          {String(props.value ?? '').trim() ? (
            <DescripcionConFormato texto={String(props.value)} />
          ) : (
            <p className="text-fg-subtle">{tr('Todavía no hay descripción.')}</p>
          )}
        </div>
      )}
    </div>
  );
});
