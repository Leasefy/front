/**
 * @vitest-environment happy-dom
 */
/**
 * GUARDIÁN: ningún componente del chat saca de la conversación.
 *
 * Nico, 23-09-2026 (22:51), con la captura de «Ver contrato 24» y «Gestionar
 * cobranza de Mateo Pérez» navegando a otra pantalla: «¿Por qué las acciones
 * siguen sacando fuera del chat? Debe todo funcionar dentro del chat… ya te
 * había dicho que sí para todas las acciones.»
 *
 * Ya lo había pedido el 27-08 y se volvió a romper cuando un atajo de
 * velocidad («si la acción tiene pantalla, que navegue») metió un `<Link>` en
 * `ResponseCard`. Por eso esto no es una prueba de UN componente: barre todo
 * `src/components/beta/` y falla si aparece cualquier forma de navegar.
 *
 * Lo único permitido, con su porqué:
 *   · `AppSwitcher.tsx` — el botón del marco para pasar del chat al panel. No
 *     vive dentro de la conversación: es la puerta que la persona elige.
 *   · `BetaLayout.tsx` — el «saltar al contenido» (`#beta-chat-main`), un ancla
 *     de la misma página (accesibilidad), no una salida.
 *   · `MarkdownRenderer.tsx` — un enlace a OTRO dominio que el texto trae, que
 *     se abre en otra pestaña con aviso (el chat no puede «traer» otro sitio).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DIR = join(process.cwd(), 'src/components/beta');

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Formas de navegar. Cada una con un nombre para que el fallo diga cuál. */
const SALIDAS: Array<[string, RegExp]> = [
  ['next/link', /from ['"]next\/link['"]/],
  ['<Link>', /<Link\b/],
  ['useRouter', /\buseRouter\s*\(/],
  ['router.push/replace', /\brouter\s*\.\s*(push|replace)\s*\(/],
  ['window.location', /\bwindow\s*\.\s*location\s*(\.\s*(href|assign|replace)\b|=)/],
  ['location.assign', /\blocation\s*\.\s*assign\s*\(/],
  ['window.open', /\bwindow\s*\.\s*open\s*\(/],
  ['<a href>', /<a\b[^>]*\bhref\s*=/],
  ['href en una acción', /\baction\.href\b/],
];

const PERMITIDOS: Record<string, string[]> = {
  'AppSwitcher.tsx': ['useRouter', 'router.push/replace'],
  'BetaLayout.tsx': ['<a href>'],
  'MarkdownRenderer.tsx': ['<a href>'],
};

describe('guardián: el chat no tiene salidas', () => {
  it('ningún archivo de src/components/beta/ navega (salvo los permitidos, con su porqué)', () => {
    const encontradas: string[] = [];
    for (const f of archivos(DIR)) {
      const nombre = relative(DIR, f);
      // Los comentarios cuentan la historia (y nombran `<Link>`); no navegan.
      const codigo = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      for (const [forma, re] of SALIDAS) {
        if (re.test(codigo) && !(PERMITIDOS[nombre] ?? []).includes(forma)) encontradas.push(`${nombre}: ${forma}`);
      }
    }
    expect(encontradas).toEqual([]);
  });

  it('el ancla permitida de BetaLayout es de la MISMA página, y el enlace del markdown sólo sale a otro dominio', () => {
    const layout = readFileSync(join(DIR, 'BetaLayout.tsx'), 'utf8');
    for (const m of layout.matchAll(/<a\b[^>]*\bhref\s*=\s*["{]([^"}]*)/g)) expect(m[1].startsWith('#')).toBe(true);
    const md = readFileSync(join(DIR, 'MarkdownRenderer.tsx'), 'utf8');
    // El único `<a>` del markdown vive detrás de `destinoExterno` (otro dominio).
    const antes = md.slice(0, md.indexOf('<a'));
    expect(antes.lastIndexOf('if (destino)')).toBeGreaterThan(antes.lastIndexOf('function EnlaceDelChat'));
  });
});

// ── Y pintado: la tarjeta de respuesta con las sugerencias de la captura ────

const { contexto } = vi.hoisted(() => ({
  contexto: {
    sendMessage: vi.fn(),
    anotarTarjetaAbierta: vi.fn(),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
    messages: [],
  },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
  useBetaChatOpcional: () => contexto,
}));

import { ResponseCard } from './ResponseCard';
import { suggestedActionToResponseAction } from '@/lib/api/ai-hub-chat';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  contexto.sendMessage.mockReset();
  contexto.anotarTarjetaAbierta.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('la captura de Nico (23-09, 22:51)', () => {
  it('«Ver contrato 24» y «Gestionar cobranza de Mateo Pérez» son mensajes de la persona, no enlaces', () => {
    const acciones = [
      suggestedActionToResponseAction(
        { label: 'Ver contrato 24', target: 'cartera', intencion: { accion: 'ver', entidad: { tipo: 'contrato', id: '24' } } },
        0,
      ),
      suggestedActionToResponseAction({ label: 'Gestionar cobranza de Mateo Pérez', target: 'cobranza' }, 1),
    ];
    act(() =>
      root.render(
        <ResponseCard
          meta={{ type: 'informative', title: 'Asistente Leasefy', summary: '', actions: acciones }}
          content="Mateo Pérez (contrato 24) vence en 8 días y lleva 261 días de mora."
          turnoId="t-1"
        />,
      ),
    );
    expect(container.querySelector('a[href]')).toBeNull();
    const [ver, gestionar] = [...container.querySelectorAll('button')];
    act(() => ver.click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('Ver contrato 24', {
      intencion: { accion: 'ver', entidad: { tipo: 'contrato', id: '24' } },
    });
    expect(contexto.anotarTarjetaAbierta).toHaveBeenCalledWith('t-1', { tipo: 'contrato', id: '24' });
    act(() => gestionar.click());
    expect(contexto.sendMessage).toHaveBeenLastCalledWith('Gestionar cobranza de Mateo Pérez', { intencion: null });
  });
});

void React;
