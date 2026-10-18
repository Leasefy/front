/**
 * @vitest-environment happy-dom
 *
 * POST-2 (QA de agentes 18-10): en la postulación, escribir «14» en el Día de la
 * fecha de nacimiento dejaba «1» y saltaba al Mes: no se podía escribir ningún
 * día del 10 al 31 (ni los meses 10–12). El blur del DateField de Cadence leía
 * el estado de antes del salto de foco. Esta prueba usa el campo REAL (las demás
 * usan el doble de `campos-de-fecha.doble-de-prueba.tsx`, por eso no lo vieron).
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { CampoDeNacimiento } from './campo-de-nacimiento';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Envoltura({ alCambiar }: { alCambiar: (v: string) => void }) {
  const [valor, setValor] = React.useState('');
  return (
    <CampoDeNacimiento
      id="nacimiento"
      etiqueta="Fecha de nacimiento"
      value={valor}
      onChange={(v) => {
        setValor(v);
        alCambiar(v);
      }}
    />
  );
}

/** Escribe como una persona: cada tecla agrega una cifra al campo que tiene el foco. */
function teclear(texto: string) {
  for (const cifra of texto) {
    const campo = document.activeElement as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(campo, campo.value + cifra);
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

describe('CampoDeNacimiento — se escribe de corrido (DD / MM / AAAA)', () => {
  let contenedor: HTMLDivElement;
  let raiz: Root;
  let ultimo = '';

  beforeEach(() => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    raiz = createRoot(contenedor);
    ultimo = '';
    act(() => raiz.render(<Envoltura alCambiar={(v) => (ultimo = v)} />));
  });

  afterEach(() => {
    act(() => raiz.unmount());
    contenedor.remove();
  });

  const campo = (etiqueta: string) => contenedor.querySelector(`input[aria-label="${etiqueta}"]`) as HTMLInputElement;

  it('«14» «12» «1988» queda 14/12/1988', () => {
    act(() => campo('Día').focus());
    teclear('14');
    expect(campo('Día').value).toBe('14');
    expect(document.activeElement).toBe(campo('Mes'));
    teclear('12');
    expect(campo('Mes').value).toBe('12');
    expect(document.activeElement).toBe(campo('Año'));
    teclear('1988');
    expect(ultimo).toBe('1988-12-14');
  });

  // POST-3 (18-10): con el cero adelante, «03» quedaba «3» (el tope lo pasaba a
  // número), no saltaba al Mes y la siguiente cifra caía en el Día: «03051990»
  // quedaba 30/12/990.
  it('«03» «05» «1990» con el cero adelante queda 03/05/1990', () => {
    act(() => campo('Día').focus());
    teclear('03');
    expect(campo('Día').value).toBe('03');
    expect(document.activeElement).toBe(campo('Mes'));
    teclear('05');
    expect(campo('Mes').value).toBe('05');
    expect(document.activeElement).toBe(campo('Año'));
    teclear('1990');
    expect(ultimo).toBe('1990-05-03');
  });

  it('un día de más se ajusta al tope (45 → 31), no se pierde', () => {
    act(() => campo('Día').focus());
    teclear('45');
    expect(campo('Día').value).toBe('31');
  });
});
