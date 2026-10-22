/**
 * Portada del marketplace (21-10-2026): lo que sólo afina la búsqueda no gasta
 * el cupo con IA; lo que pregunta, sí va a la IA.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({}), useSearchParams: () => new URLSearchParams() }));

import { esPreguntaParaLaIa } from './ConversacionDelMarketplace';

describe('esPreguntaParaLaIa', () => {
  it('los filtros que el buscador entiende son búsqueda, no pregunta', () => {
    expect(esPreguntaParaLaIa('con balcón', true)).toBe(false);
    expect(esPreguntaParaLaIa('en Belén hasta 3 millones', true)).toBe(false);
  });
  it('lo que pregunta va a la IA, aunque traiga filtros', () => {
    expect(esPreguntaParaLaIa('¿cuál me recomiendas?', false)).toBe(true);
    expect(esPreguntaParaLaIa('cuál es el más barato', true)).toBe(true);
    expect(esPreguntaParaLaIa('¿tienen algo en Belén con balcón?', true)).toBe(true);
    expect(esPreguntaParaLaIa('aceptan mascotas', true)).toBe(true);
  });
  it('lo que el buscador no entiende también va a la IA', () => {
    expect(esPreguntaParaLaIa('somos una pareja que trabaja desde la casa', false)).toBe(true);
  });
});
