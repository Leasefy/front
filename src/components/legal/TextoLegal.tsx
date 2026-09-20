/**
 * Dibuja un texto legal guardado como datos (`lib/legal/politica-v3.ts`).
 *
 * El marcado vive acá y sólo acá: publicar una versión nueva es editar el
 * contenido, no reescribir 600 líneas de JSX. Mover un párrafo a mano es cómo
 * se pierde, sin que nadie lo note, una frase que alguien ya autorizó.
 *
 * 🔴 El énfasis se escribe `**así**` y se renderiza como `<strong>` partiendo la
 * cadena, NUNCA con `dangerouslySetInnerHTML`: un texto legal es justo donde no
 * se quiere una puerta de inyección, por más que hoy el contenido sea nuestro.
 */

import type { Bloque, Seccion } from '@/lib/legal/politica-v3';

/** Parte `a **b** c` en nodos, sin HTML crudo. */
function conEnfasis(texto: string): React.ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((trozo, i) =>
    trozo.startsWith('**') && trozo.endsWith('**') ? (
      <strong key={i} className="font-medium text-foreground">
        {trozo.slice(2, -2)}
      </strong>
    ) : (
      trozo
    ),
  );
}

function BloqueLegal({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case 'sub':
      return (
        <h3 className="text-[15px] font-medium text-foreground mt-6 mb-2">
          {bloque.texto}
        </h3>
      );
    case 'lista':
      return (
        <ul className="mb-3 space-y-1.5 pl-5 list-disc marker:text-muted-foreground/50">
          {(bloque.items ?? []).map((item, i) => (
            <li key={i}>{conEnfasis(item)}</li>
          ))}
        </ul>
      );
    case 'aviso':
      // Lo que más le cuesta a alguien descubrir tarde va destacado, no
      // enterrado en el sexto párrafo de una sección.
      return (
        <p className="mb-3 rounded-lg border border-border bg-surface px-4 py-3">
          {conEnfasis(bloque.texto ?? '')}
        </p>
      );
    default:
      return <p className="mb-3">{conEnfasis(bloque.texto ?? '')}</p>;
  }
}

export function TextoLegal({ secciones }: { secciones: Seccion[] }) {
  return (
    <div className="space-y-10 text-[15px] leading-[1.7] text-muted-foreground">
      {secciones.map((s) => (
        <section key={s.n} id={`seccion-${s.n}`} className="scroll-mt-28">
          <h2 className="text-[18px] font-medium text-foreground mb-3">
            {s.n}. {s.titulo}
          </h2>
          {s.bloques.map((b, i) => (
            <BloqueLegal key={i} bloque={b} />
          ))}
        </section>
      ))}
    </div>
  );
}

/** El índice: 19 secciones sin índice es un documento que nadie recorre. */
export function IndiceLegal({ secciones }: { secciones: Seccion[] }) {
  return (
    <nav aria-label="Contenido" className="mb-12 rounded-lg border border-border bg-surface p-5">
      <p className="text-[13px] font-medium text-foreground mb-3">Contenido</p>
      <ol className="space-y-1 text-[14px] text-muted-foreground">
        {secciones.map((s) => (
          <li key={s.n}>
            <a href={`#seccion-${s.n}`} className="hover:text-foreground transition-colors">
              {s.n}. {s.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
