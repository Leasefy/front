/**
 * Las reglas del atajo ⌘B / Ctrl+B de la barra lateral (Nico, 02-10-2026).
 * El cableado con la barra real se prueba en `PlanSidebar.atajo.test.tsx`.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  atajoParaAria,
  esElAtajoDeLaBarra,
  esMac,
  hayUnModalAbierto,
  seEstaEscribiendo,
} from './atajo-de-la-barra';

const tecla = (extra: Partial<Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>>) => ({
  key: 'b',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('esMac — ⌘ o Ctrl', () => {
  it('macOS, iPad e iPhone con teclado: ⌘', () => {
    expect(esMac({ platform: 'MacIntel' })).toBe(true);
    expect(esMac({ userAgentData: { platform: 'macOS' } })).toBe(true);
    expect(esMac({ platform: 'iPad' })).toBe(true);
    expect(esMac({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(true);
  });

  it('Windows, Linux y ChromeOS: Ctrl', () => {
    expect(esMac({ platform: 'Win32' })).toBe(false);
    expect(esMac({ userAgentData: { platform: 'Windows' } })).toBe(false);
    expect(esMac({ platform: 'Linux x86_64' })).toBe(false);
    expect(esMac({ userAgentData: { platform: 'Chrome OS' } })).toBe(false);
  });

  it('userAgentData manda sobre platform (que los navegadores congelan)', () => {
    expect(esMac({ userAgentData: { platform: 'Windows' }, platform: 'MacIntel' })).toBe(false);
  });
});

describe('esElAtajoDeLaBarra', () => {
  it('macOS: ⌘B sí; Ctrl+B no', () => {
    expect(esElAtajoDeLaBarra(tecla({ metaKey: true }), true)).toBe(true);
    expect(esElAtajoDeLaBarra(tecla({ key: 'B', metaKey: true }), true)).toBe(true);
    expect(esElAtajoDeLaBarra(tecla({ ctrlKey: true }), true)).toBe(false);
  });

  it('el resto: Ctrl+B sí; ⌘/Windows+B no', () => {
    expect(esElAtajoDeLaBarra(tecla({ ctrlKey: true }), false)).toBe(true);
    expect(esElAtajoDeLaBarra(tecla({ metaKey: true }), false)).toBe(false);
  });

  it('con Mayúscula o Alt no (⌘⇧B es la barra de favoritos del navegador)', () => {
    expect(esElAtajoDeLaBarra(tecla({ metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(esElAtajoDeLaBarra(tecla({ metaKey: true, altKey: true }), true)).toBe(false);
    expect(esElAtajoDeLaBarra(tecla({ ctrlKey: true, shiftKey: true }), false)).toBe(false);
    expect(esElAtajoDeLaBarra(tecla({ ctrlKey: true, altKey: true }), false)).toBe(false);
  });

  it('con los dos modificadores, o sin ninguno, no', () => {
    expect(esElAtajoDeLaBarra(tecla({ metaKey: true, ctrlKey: true }), true)).toBe(false);
    expect(esElAtajoDeLaBarra(tecla({ metaKey: true, ctrlKey: true }), false)).toBe(false);
    expect(esElAtajoDeLaBarra(tecla({}), true)).toBe(false);
  });

  it('otra tecla no: ⌘K es del buscador', () => {
    expect(esElAtajoDeLaBarra(tecla({ key: 'k', metaKey: true }), true)).toBe(false);
    expect(esElAtajoDeLaBarra(tecla({ key: 'k', ctrlKey: true }), false)).toBe(false);
  });
});

describe('seEstaEscribiendo — la tecla es del campo', () => {
  it('input, textarea, select y contenteditable', () => {
    document.body.innerHTML = `
      <input id="i" /><textarea id="t"></textarea><select id="s"><option>a</option></select>
      <div id="e" contenteditable="true"><b id="dentro">negrita</b></div>
      <div id="vacio" contenteditable=""></div>`;
    for (const id of ['i', 't', 's', 'e', 'dentro', 'vacio']) {
      expect(seEstaEscribiendo(document.getElementById(id)), id).toBe(true);
    }
  });

  it('un botón, un enlace, el cuerpo o un contenteditable="false", no', () => {
    document.body.innerHTML = `<button id="b">x</button><a id="a" href="/">y</a><div id="no" contenteditable="false">z</div>`;
    expect(seEstaEscribiendo(document.getElementById('b'))).toBe(false);
    expect(seEstaEscribiendo(document.getElementById('a'))).toBe(false);
    expect(seEstaEscribiendo(document.getElementById('no'))).toBe(false);
    expect(seEstaEscribiendo(document.body)).toBe(false);
    expect(seEstaEscribiendo(null)).toBe(false);
    expect(seEstaEscribiendo(window)).toBe(false);
  });
});

describe('hayUnModalAbierto', () => {
  it('un diálogo de Radix abierto (⌘K, cajón, confirmación)', () => {
    document.body.innerHTML = `<div role="dialog" data-state="open"></div>`;
    expect(hayUnModalAbierto()).toBe(true);
    document.body.innerHTML = `<div role="alertdialog" data-state="open"></div>`;
    expect(hayUnModalAbierto()).toBe(true);
  });

  it('uno hecho a mano con aria-modal (el muro, la bienvenida, el recorrido)', () => {
    document.body.innerHTML = `<section role="dialog" aria-modal="true"></section>`;
    expect(hayUnModalAbierto()).toBe(true);
  });

  it('cerrado, o un panel no modal (el dock del piloto), no', () => {
    document.body.innerHTML = `
      <div role="dialog" data-state="closed"></div>
      <section role="dialog" aria-label="Procesos del piloto"></section>
      <aside role="dialog" aria-modal="false"></aside>`;
    expect(hayUnModalAbierto()).toBe(false);
  });
});

it('aria-keyshortcuts con los nombres del estándar', () => {
  expect(atajoParaAria(true)).toBe('Meta+B');
  expect(atajoParaAria(false)).toBe('Control+B');
});
