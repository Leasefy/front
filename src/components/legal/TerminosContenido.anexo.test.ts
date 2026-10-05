/**
 * 🔴 Decisión 2 del 05-10-2026 (FALTANTES): el «Anexo de Encargo» no existe y
 * no se inventa. La frase de la §19 de los términos remite al contrato de
 * mandato firmado con la inmobiliaria, y el texto queda marcado «PENDIENTE
 * REVISIÓN LEGAL» para que el abogado de Leasefy lo vea antes de publicarlo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (rel: string) => readFileSync(resolve(__dirname, '../../..', rel), 'utf8');

/** Sólo lo que se ve: sin los comentarios de JSX ni de JS. */
function loQueSeVe(fuente: string): string {
  return fuente
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');
}

describe('§19 de los términos: el encargo remite al contrato de mandato', () => {
  const fuente = leer('src/components/legal/TerminosContenido.tsx');

  it('la frase aprobada sigue tal cual y remite al contrato de mandato', () => {
    const visible = loQueSeVe(fuente);
    expect(visible).toContain(
      'La inmobiliaria autoriza a Leasefy a revisar, en los términos de la §16 de la Política, las preguntas que su equipo hace al asistente, con el único fin de mejorar el servicio.',
    );
    expect(visible).toContain(
      'Esta autorización y el encargo de esta sección hacen parte del contrato de mandato que la inmobiliaria firma con Leasefy.',
    );
  });

  it('ningún texto visible nombra un «Anexo de Encargo»', () => {
    expect(loQueSeVe(fuente)).not.toMatch(/anexo/i);
    expect(loQueSeVe(leer('src/app/privacidad/page.tsx'))).not.toMatch(/anexo de encargo/i);
  });

  it('el cambio queda marcado para la revisión legal', () => {
    expect(fuente).toContain('PENDIENTE REVISIÓN LEGAL');
  });
});
