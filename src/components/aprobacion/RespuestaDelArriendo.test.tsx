import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/components/tenant/PostularButton', () => ({
  PostularButton: ({ children, propertyId }: { children: React.ReactNode; propertyId: string }) => (
    <button data-testid="postular" data-property={propertyId}>{children}</button>
  ),
}));

import { RespuestaDelArriendo } from './RespuestaDelArriendo';
import { guardarArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let c: HTMLDivElement | null = null;

beforeEach(() => {
  window.sessionStorage.clear();
  guardarArriendoEnCurso({
    propertyId: 'p-1', titulo: 'Apartamento en Bello', ciudad: 'Bello', tipo: 'apartamento',
    foto: null, canon: 1_100_000, ingresoTotal: 3_100_000, canonMaximo: 2_066_666,
  });
});
afterEach(() => { act(() => root?.unmount()); c?.remove(); root = null; c = null; });

function montar(estado: string, tope: number | null) {
  c = document.createElement('div');
  document.body.appendChild(c);
  root = createRoot(c);
  act(() => root!.render(<RespuestaDelArriendo estado={estado} tope={tope} />));
}
const hay = (id: string) => c!.querySelector(`[data-testid="${id}"]`);

describe('<RespuestaDelArriendo> — paso 3', () => {
  it('aprobado y el canon cabe: «¡Te lo podemos arrendar!» y postularse a ESTE inmueble', () => {
    montar('aprobado', 2_000_000);
    expect(hay('respuesta-aprobado')).toBeTruthy();
    expect(hay('postular')?.getAttribute('data-property')).toBe('p-1');
  });

  it('aprobado pero el canon se pasa del tope: lo dice y abre otros inmuebles', () => {
    montar('aprobado', 900_000);
    expect(hay('respuesta-se-pasa')).toBeTruthy();
    expect(hay('postular')).toBeNull();
    expect(hay('ver-inmuebles-para-ti')?.getAttribute('href')).toBe('/inquilino/explorar');
  });

  it('rechazado: feedback y la puerta abierta a inmuebles que van con la persona', () => {
    montar('rechazado', null);
    expect(hay('respuesta-rechazado')?.textContent).toContain('Apartamento en Bello');
    expect(hay('ver-inmuebles-para-ti')).toBeTruthy();
  });

  it('sin recorrido desde una ficha no aparece', () => {
    window.sessionStorage.clear();
    montar('aprobado', 2_000_000);
    expect(hay('respuesta-del-arriendo')).toBeNull();
  });
});
