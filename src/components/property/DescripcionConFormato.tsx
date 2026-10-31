import { Fragment, type ReactNode } from 'react';

import { bloquesDeLaDescripcion, type Trozo } from '@/lib/inmuebles/descripcion-con-formato';
import { cn } from '@/lib/utils';

/**
 * La descripción del inmueble con su formato (negrilla, cursiva, listas; Nico 31-10-2026). Se pinta con elementos de
 * React a partir del texto (`descripcion-con-formato.ts`): nada de lo que escriba la inmobiliaria entra como HTML. Una
 * descripción sin marcas se ve igual que antes: cada línea en su sitio.
 */
export function DescripcionConFormato({ texto, className }: { texto: string; className?: string }) {
  const bloques = bloquesDeLaDescripcion(texto);
  if (bloques.length === 0) return null;
  return (
    <div className={cn('space-y-3 break-words', className)} data-testid="descripcion-con-formato">
      {bloques.map((b, i) => {
        if (b.tipo === 'parrafo') {
          return (
            <p key={i}>
              {b.lineas.map((linea, n) => (
                <Fragment key={n}>
                  {n > 0 && <br />}
                  {pintar(linea)}
                </Fragment>
              ))}
            </p>
          );
        }
        if (b.tipo === 'vinetas') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-fg-subtle">
              {b.items.map((item, n) => (
                <li key={n}>{pintar(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={i} start={b.desde} className="list-decimal space-y-1 pl-5 marker:font-mono marker:text-fg-subtle">
            {b.items.map((item, n) => (
              <li key={n}>{pintar(item)}</li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

function pintar(trozos: Trozo[]): ReactNode {
  return trozos.map((t, i) => {
    if (t.tipo === 'texto') return <Fragment key={i}>{t.texto}</Fragment>;
    // La negrilla de la persona se ve con el peso medio de la marca y la tinta plena (DESIGN.md §4: sin `font-bold`).
    if (t.tipo === 'negrilla') {
      return (
        <strong key={i} className="font-medium text-fg">
          {pintar(t.hijos)}
        </strong>
      );
    }
    return <em key={i}>{pintar(t.hijos)}</em>;
  });
}
