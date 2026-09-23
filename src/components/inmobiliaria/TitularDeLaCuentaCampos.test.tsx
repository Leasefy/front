/**
 * TitularDeLaCuentaCampos — dos defectos del QA en el navegador (23-09).
 *
 * 1. Validación en dos vueltas: sin tipo de documento, el número no se
 *    revisaba; el primer intento marcaba tipo y nombre, y el número vacío
 *    aparecía recién en el segundo. Todo lo que falta se marca de una vez.
 * 2. Cerrado, el selector de tipo pintaba «Permiso por Protección Temporal
 *    (PPT)» partido en tres líneas y salido de su caja: cerrado va la
 *    etiqueta corta, y el nombre entero queda en la lista y en el `title`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* El es.json REAL: una clave que falta sale cruda y la prueba la ve. */
vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>;
  const t = (clave: string, params: Record<string, string | number> = {}) => {
    const valor = clave.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es);
    if (typeof valor !== 'string') return clave;
    return valor.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''));
  };
  return { useI18n: () => ({ t, locale: 'es' }) };
});

import { TitularDeLaCuentaCampos, erroresDelTitular } from './TitularDeLaCuentaCampos';
import { revisarDocumentoDelTitular } from '@/lib/propietarios/titular-de-la-cuenta';

const tIdentidad = (clave: string) => clave;

describe('erroresDelTitular marca todo lo que falta de una vez', () => {
  it('🔴 otra persona sin nada: tipo, número y nombre en la MISMA vuelta', () => {
    const errores = erroresDelTitular(
      tIdentidad,
      { titular: 'TERCERO', nombre: '', tipo: '', numero: '' },
      revisarDocumentoDelTitular,
    );
    expect(Object.keys(errores).sort()).toEqual(['nombre', 'numero', 'tipo']);
    expect(errores.numero).toBe('inmobiliaria.propietario.form.titularErrVacio');
  });

  it('sin tipo pero con número escrito, sólo falta el tipo: el largo depende de él', () => {
    const errores = erroresDelTitular(
      tIdentidad,
      { titular: 'TERCERO', nombre: 'María Fernanda Ruiz', tipo: '', numero: '5123456' },
      revisarDocumentoDelTitular,
    );
    expect(Object.keys(errores)).toEqual(['tipo']);
  });

  it('completa, no hay errores; del propietario, nunca', () => {
    expect(
      erroresDelTitular(
        tIdentidad,
        { titular: 'TERCERO', nombre: 'María Fernanda Ruiz', tipo: 'PPT', numero: '5123456' },
        revisarDocumentoDelTitular,
      ),
    ).toEqual({});
    expect(
      erroresDelTitular(tIdentidad, { titular: 'PROPIETARIO', nombre: '', tipo: '', numero: '' }, revisarDocumentoDelTitular),
    ).toEqual({});
  });
});

describe('el selector de tipo de documento no se sale de su caja', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('🔴 con PPT elegido, cerrado dice «PPT» y el nombre entero va en el title', () => {
    act(() => {
      root.render(
        <TitularDeLaCuentaCampos
          valor={{ titular: 'TERCERO', nombre: 'María Fernanda Ruiz', tipo: 'PPT', numero: '5123456' }}
          onCambiar={() => {}}
          nombreDelPropietario="Jorge Restrepo"
        />,
      );
    });
    const trigger = container.querySelector<HTMLElement>('[data-testid="titular-tipo-documento"]')!;
    expect(trigger.textContent?.trim()).toBe('PPT');
    expect(trigger.getAttribute('title')).toBe('Permiso por Protección Temporal (PPT)');
    expect(trigger.className).toContain('[&>span]:truncate');
  });
});
