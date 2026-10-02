/**
 * Publicar del propietario — cuándo y adónde va el foco tras un error
 * (sistema de errores, 02-10-2026).
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  ariaDelCampo,
  enfocarElPrimerError,
  hayErroresNuevos,
  idDelCampo,
  idDelError,
} from './campos-con-error';

const CANON = 'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.';
const AREA = 'El área no puede pasar de 10.000 m².';

describe('hayErroresNuevos', () => {
  it('un fallo al publicar (de nada a algo) es nuevo', () => {
    expect(hayErroresNuevos({}, { monthlyRent: CANON })).toBe(true);
  });

  it('el mismo objeto (un render cualquiera) no es nuevo', () => {
    const errores = { monthlyRent: CANON };
    expect(hayErroresNuevos(errores, errores)).toBe(false);
  });

  it('corregir un campo y que los demás sigan no es nuevo', () => {
    expect(hayErroresNuevos({ monthlyRent: CANON, area: AREA }, { area: AREA })).toBe(false);
  });

  it('quedar sin errores no es nuevo', () => {
    expect(hayErroresNuevos({ area: AREA }, {})).toBe(false);
  });

  it('el mismo error otra vez (volvió a publicar y falló igual) sí es nuevo', () => {
    expect(hayErroresNuevos({ area: AREA }, { area: AREA })).toBe(true);
  });

  it('otro mensaje en el mismo campo es nuevo', () => {
    expect(hayErroresNuevos({ area: AREA }, { area: 'El área debe ser un número entero de metros cuadrados.' })).toBe(true);
  });
});

describe('ariaDelCampo', () => {
  it('sin error no marca nada; con error nombra su mensaje', () => {
    expect(ariaDelCampo('title')).toEqual({ id: 'publicar-title', 'aria-invalid': undefined, 'aria-describedby': undefined });
    expect(ariaDelCampo('title', 'x')).toEqual({
      id: 'publicar-title',
      'aria-invalid': true,
      'aria-describedby': 'publicar-title-error',
    });
    expect(idDelError('title')).toBe(`${idDelCampo('title')}-error`);
  });
});

describe('enfocarElPrimerError', () => {
  let contenedor: HTMLDivElement;
  afterEach(() => contenedor?.remove());

  function montar(html: string) {
    contenedor = document.createElement('div');
    contenedor.innerHTML = html;
    document.body.appendChild(contenedor);
    return contenedor;
  }

  it('enfoca el primer control marcado, en el orden de la pantalla', () => {
    const c = montar(`
      <input id="a" />
      <input id="b" aria-invalid="true" />
      <input id="c" aria-invalid="true" />
    `);
    expect(enfocarElPrimerError(c)).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('en un grupo marcado, enfoca el botón elegido', () => {
    const c = montar(`
      <div role="group" aria-invalid="true">
        <button id="casa" aria-pressed="false">Casa</button>
        <button id="apto" aria-pressed="true">Apartamento</button>
      </div>
    `);
    enfocarElPrimerError(c);
    expect(document.activeElement?.id).toBe('apto');
  });

  it('en un grupo sin nada elegido, enfoca el primer botón', () => {
    const c = montar(`
      <div role="group" aria-invalid="true">
        <button id="bogota" aria-pressed="false">Bogotá</button>
        <button id="medellin" aria-pressed="false">Medellín</button>
      </div>
    `);
    enfocarElPrimerError(c);
    expect(document.activeElement?.id).toBe('bogota');
  });

  it('sin nada marcado no mueve el foco', () => {
    const c = montar('<input id="a" />');
    expect(enfocarElPrimerError(c)).toBe(false);
  });

  describe('con el orden del contexto (`ordenDeLosErrores`)', () => {
    it('🔴 enfoca el primero de ESE orden aunque en el DOM venga otro antes', () => {
      const c = montar(`
        <input id="publicar-adminFee" aria-invalid="true" aria-describedby="publicar-adminFee-error" />
        <input id="publicar-monthlyRent" aria-invalid="true" aria-describedby="publicar-monthlyRent-error" />
      `);
      expect(enfocarElPrimerError(c, ['monthlyRent', 'adminFee'])).toBe(true);
      expect(document.activeElement?.id).toBe('publicar-monthlyRent');
    });

    it('un campo del orden que no está en pantalla se salta: va al siguiente', () => {
      const c = montar(`
        <input id="publicar-title" aria-invalid="true" aria-describedby="publicar-title-error" />
        <input id="publicar-description" aria-invalid="true" aria-describedby="publicar-description-error" />
      `);
      enfocarElPrimerError(c, ['area', 'description', 'title']);
      expect(document.activeElement?.id).toBe('publicar-description');
    });

    it('un grupo del orden pasa el foco a su botón elegido', () => {
      const c = montar(`
        <input id="publicar-neighborhood" aria-invalid="true" aria-describedby="publicar-neighborhood-error" />
        <div role="group" aria-invalid="true" aria-describedby="publicar-city-error">
          <button id="bogota" aria-pressed="false">Bogotá</button>
          <button id="medellin" aria-pressed="true">Medellín</button>
        </div>
      `);
      enfocarElPrimerError(c, ['city', 'neighborhood']);
      expect(document.activeElement?.id).toBe('medellin');
    });

    it('si ninguno del orden está en pantalla, el primero marcado', () => {
      const c = montar(`
        <input id="b" aria-invalid="true" />
        <input id="c" aria-invalid="true" />
      `);
      expect(enfocarElPrimerError(c, ['area'])).toBe(true);
      expect(document.activeElement?.id).toBe('b');
    });

    it('un campo corregido (sin aria-invalid) no recibe el foco aunque siga nombrado', () => {
      const c = montar(`
        <input id="publicar-area" aria-describedby="publicar-area-error" />
        <input id="publicar-floor" aria-invalid="true" aria-describedby="publicar-floor-error" />
      `);
      enfocarElPrimerError(c, ['area', 'floor']);
      expect(document.activeElement?.id).toBe('publicar-floor');
    });
  });
});
