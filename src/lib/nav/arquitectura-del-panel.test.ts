/**
 * Guardianes de la arquitectura de información del panel.
 *
 * La estructura vive como datos en `arquitectura-del-panel.ts` y de ahí salen
 * el sidebar, las pestañas de cada módulo y el breadcrumb. Estos tests cuidan
 * lo que un ojo no ve leyendo el archivo:
 *
 *   · toda ruta declarada —y toda pestaña de agente— tiene su `page.tsx`;
 *   · la etiqueta y la ruta dicen lo mismo (regla 4 de la propuesta);
 *   · ningún icono ni nombre se repite entre filas del sidebar (ni entre las
 *     pestañas de un mismo módulo): dos filas con el mismo glifo se leen como
 *     la misma cosa, y dos filas con el mismo nombre no se distinguen;
 *   · ningún grupo queda con una sola fila (regla R3: es un error de modelo);
 *   · no queda ninguna ruta bajo `/ai/` (el namespace paralelo murió), ni en
 *     la arquitectura ni en el código;
 *   · cada agente declarado existe en `agentWorkspaceNav.ts` y apunta a la
 *     misma ruta, y viceversa.
 *
 * Los dos de la cabecera (Inicio y Chat) viven en el layout y no se tocan:
 * acá sólo se verifica que ningún módulo les pise el icono.
 *
 * Reemplaza a `nav-sidebar.test.ts` (que leía el layout por regex) y a la
 * cuenta por regex de `una-sola-seccion-de-inmuebles.test.ts`.
 */

import { existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';
import { AirTrafficControl, ChatsCircle } from '@phosphor-icons/react';

import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';
import { AGENT_WORKSPACES } from './agentWorkspaceNav';
import {
  ARQUITECTURA_DEL_PANEL,
  PANEL,
  modulosDelPanel,
  pestanasDelModulo,
  moduloDeLaRuta,
  pestanaActiva,
} from './arquitectura-del-panel';

const APP = join(process.cwd(), 'src/app/panel/inmobiliaria');

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

const modulos = modulosDelPanel();
const pantallas = modulos.flatMap((m) => pestanasDelModulo(m));
/**
 * ¿Existe `page.tsx` para esta ruta? Baja segmento a segmento y, en cada nivel,
 * también por los route groups `(…)` (que no aparecen en la URL): las tres
 * pantallas de Retención viven en `contratos/(retencion)/…`.
 */
function tienePagina(href: string): boolean {
  const segmentos = href.replace(PANEL, '').split('/').filter(Boolean);
  const buscar = (dir: string, i: number): boolean => {
    if (i === segmentos.length) return existsSync(join(dir, 'page.tsx'));
    if (!existsSync(dir)) return false;
    const candidatos = [join(dir, segmentos[i]!)];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')')) {
        candidatos.push(join(dir, e.name, segmentos[i]!));
      }
    }
    return candidatos.some((c) => buscar(c, i + 1));
  };
  return buscar(APP, 0);
}

describe('arquitectura del panel — rutas', () => {
  it.each(pantallas.map((p) => [p.href] as const))('%s tiene su page.tsx', (href) => {
    expect(tienePagina(href), `falta ${href.replace(PANEL, '')}/page.tsx`).toBe(true);
  });

  it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as const)))(
    'pestaña del agente %s → %s tiene su page.tsx',
    (_slug, href) => {
      expect(tienePagina(href)).toBe(true);
    },
  );

  it('ninguna ruta vive bajo /ai/', () => {
    const bajoAi = [...pantallas.map((p) => p.href), ...AGENT_WORKSPACES.map((w) => w.basePath)].filter(
      (h) => h.includes('/ai/') || h.endsWith('/ai'),
    );
    expect(bajoAi).toEqual([]);
  });

  it('el código tampoco enlaza a /panel/inmobiliaria/ai (el namespace murió)', () => {
    // Los tipos generados del back tienen `/ai/analyze/...`: son rutas del BACK.
    const salida = execSync(
      "grep -rIl --include='*.ts' --include='*.tsx' --include='*.mjs' '/panel/inmobiliaria/ai\\b' src tests 2>/dev/null | grep -v 'src/lib/api/generated/' | grep -v 'arquitectura-del-panel.test.ts' || true",
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    expect(salida.trim().split('\n').filter(Boolean)).toEqual([]);
  });

  it('toda ruta empieza por el prefijo del panel y no termina en barra', () => {
    for (const p of pantallas) {
      expect(p.href.startsWith(`${PANEL}/`)).toBe(true);
      expect(p.href.endsWith('/')).toBe(false);
    }
  });

  it('las pantallas de un módulo cuelgan de la ruta del módulo', () => {
    for (const m of modulos) {
      for (const p of m.pantallas ?? []) {
        expect(p.href.startsWith(`${m.href}/`), `${p.href} no cuelga de ${m.href}`).toBe(true);
      }
    }
  });

  it('ninguna ruta se declara dos veces', () => {
    const hrefs = pantallas.map((p) => p.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('arquitectura del panel — sidebar', () => {
  it('ningún icono se usa en dos filas (ni pisa a Inicio o Chat)', () => {
    const porIcono = new Map<unknown, string[]>();
    porIcono.set(AirTrafficControl, ['Inicio']);
    porIcono.set(ChatsCircle, ['Chat']);
    for (const m of modulos) porIcono.set(m.icon, [...(porIcono.get(m.icon) ?? []), m.key]);
    const repetidos = [...porIcono.values()].filter((v) => v.length > 1);
    expect(repetidos).toEqual([]);
  });

  it('dentro de un módulo ninguna pestaña repite icono ni nombre', () => {
    for (const m of modulos) {
      const tabs = pestanasDelModulo(m);
      expect(new Set(tabs.map((t) => t.icon)).size, `iconos en ${m.key}`).toBe(tabs.length);
      const nombres = tabs.map((t) => leer(es, t.labelKey));
      expect(new Set(nombres).size, `nombres en ${m.key}`).toBe(tabs.length);
    }
  });

  it('ningún nombre en español se repite entre filas del sidebar', () => {
    const textos = modulos.map((m) => leer(es, m.labelKey));
    for (const t of textos) expect(typeof t, 'clave i18n sin texto').toBe('string');
    expect(new Set(textos).size).toBe(textos.length);
  });

  it('toda clave i18n del sidebar y de las pestañas existe en es y en en', () => {
    const claves = new Set<string>();
    for (const g of ARQUITECTURA_DEL_PANEL) if (g.labelKey) claves.add(g.labelKey);
    for (const p of pantallas) {
      claves.add(p.labelKey);
      if (p.hintKey) claves.add(p.hintKey);
    }
    for (const w of AGENT_WORKSPACES) {
      claves.add(w.labelKey);
      for (const i of w.items) claves.add(i.labelKey);
    }
    const faltan = [...claves].filter((k) => typeof leer(es, k) !== 'string' || typeof leer(en, k) !== 'string');
    expect(faltan).toEqual([]);
  });

  it('ningún grupo con cabecera tiene una sola fila (R3)', () => {
    for (const g of ARQUITECTURA_DEL_PANEL) {
      if (g.labelKey === null) continue;
      expect(g.modulos.length, `grupo ${g.key}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('el sidebar tiene 18 módulos en 4 grupos con nombre (+ Inicio y Chat = 20 filas)', () => {
    // La propuesta contaba 21 porque incluía «Ayuda», que en el panel no existe
    // como fila (ni existía antes): no se inventa.
    expect(ARQUITECTURA_DEL_PANEL.filter((g) => g.labelKey !== null)).toHaveLength(4);
    expect(modulos).toHaveLength(18);
  });

  it('el menú tiene UNA entrada de inmuebles, no dos', () => {
    expect(modulos.filter((m) => m.href === `${PANEL}/inmuebles`)).toHaveLength(1);
  });

  it('la etiqueta y la ruta se escriben igual (R4): el segmento sale del nombre', () => {
    // Último segmento de la ruta vs. texto en español sin tildes. Las
    // excepciones son de vocabulario (docs/VOCABULARIO.md) o de compuestos.
    const norm = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '-');
    const excepciones: Record<string, string> = {
      '/postulaciones/estudio': 'evaluacion-de-candidatos', // vocabulario: «Estudio» murió
      '/postulaciones/asegurabilidad': 'asegurabilidad',
      '/configuracion/ia': 'automatizacion-ia',
      '/reportes/ia': 'desempeno-ia',
      '/reportes/resumen': 'resumen-del-negocio',
      '/configuracion/agentes': 'agentes-ia',
      '/mantenimientos/tickets': 'tickets',
      '/contratos/aprobar': 'por-aprobar',
    };
    for (const p of pantallas) {
      const segmento = p.href.split('/').pop() ?? '';
      const texto = norm(String(leer(es, p.labelKey)));
      const esperado = excepciones[p.href.replace(PANEL, '')];
      if (esperado) {
        expect(texto, p.href).toBe(esperado);
        continue;
      }
      expect(texto.startsWith(segmento) || segmento.startsWith(texto), `${p.href} ↔ «${texto}»`).toBe(true);
    }
  });
});

describe('arquitectura del panel — agentes', () => {
  it('cada pantalla con `agente` es un workspace registrado en la misma ruta', () => {
    for (const p of pantallas.filter((x) => x.agente)) {
      const ws = AGENT_WORKSPACES.find((w) => w.slug === p.agente);
      expect(ws, `workspace «${p.agente}» no existe`).toBeTruthy();
      expect(ws?.basePath).toBe(p.href);
    }
  });

  it('cada workspace registrado tiene su puerta en la arquitectura', () => {
    const conAgente = new Set(pantallas.map((p) => p.agente).filter(Boolean));
    for (const ws of AGENT_WORKSPACES) {
      expect(conAgente.has(ws.slug), `workspace «${ws.slug}» sin puerta`).toBe(true);
    }
  });

  it('toda pantalla con `agente` lleva la marca IA', () => {
    for (const p of pantallas.filter((x) => x.agente)) expect(p.ia, p.href).toBe(true);
  });

  it('las pantallas de Retención son hermanas directas de Contratos, no un workspace anidado', () => {
    // La propuesta las dibuja como N3 de Contratos (/contratos/riesgo, /contratos/aprobar)
    // y comparten un solo gate vía el route group `contratos/(retencion)/`.
    const contratos = modulos.find((m) => m.key === 'contratos')!;
    const hrefs = (contratos.pantallas ?? []).map((p) => p.href);
    expect(hrefs).toEqual(expect.arrayContaining([`${PANEL}/contratos/retencion`, `${PANEL}/contratos/riesgo`, `${PANEL}/contratos/aprobar`]));
    expect(AGENT_WORKSPACES.some((w) => w.slug === 'retencion')).toBe(false);
  });

  it('un agente que es raíz de módulo excluye a sus hermanas (Pagos)', () => {
    const pagos = AGENT_WORKSPACES.find((w) => w.slug === 'pagos')!;
    const modulo = modulos.find((m) => m.key === 'pagos')!;
    for (const hermana of modulo.pantallas ?? []) {
      expect(pagos.excluir ?? [], hermana.href).toContain(hermana.href);
    }
  });
});

describe('arquitectura del panel — resolución de rutas', () => {
  it('el módulo dueño es el de prefijo más largo', () => {
    expect(moduloDeLaRuta(`${PANEL}/cobros/cobranza/deudores/1`)?.key).toBe('cobros');
    expect(moduloDeLaRuta(`${PANEL}/pagos/dispersiones/lotes/2`)?.key).toBe('pagos');
    expect(moduloDeLaRuta(`${PANEL}/piloto`)).toBeNull();
    expect(moduloDeLaRuta(PANEL)).toBeNull();
  });

  it('la pestaña activa es la de href más largo que coincida', () => {
    const cobros = modulos.find((m) => m.key === 'cobros')!;
    const tabs = pestanasDelModulo(cobros);
    expect(pestanaActiva(tabs, `${PANEL}/cobros/cobranza/deudores/1`)?.href).toBe(`${PANEL}/cobros/cobranza`);
    expect(pestanaActiva(tabs, `${PANEL}/cobros/cartera`)?.href).toBe(`${PANEL}/cobros/cartera`);
    expect(pestanaActiva(tabs, `${PANEL}/cobros?estado=vencidos`)?.href).toBe(`${PANEL}/cobros`);
  });

  it('la raíz de un módulo es exacta: en una ficha o un flujo ninguna pestaña está activa', () => {
    const cobros = modulos.find((m) => m.key === 'cobros')!;
    expect(pestanaActiva(pestanasDelModulo(cobros), `${PANEL}/cobros/7/cuenta-de-cobro`)).toBeNull();
    expect(pestanaActiva(pestanasDelModulo(cobros), `${PANEL}/cobros/reglas-de-mora`)).toBeNull();
    const inmuebles = modulos.find((m) => m.key === 'inmuebles')!;
    expect(pestanaActiva(pestanasDelModulo(inmuebles), `${PANEL}/inmuebles/nuevo`)).toBeNull();
    expect(pestanaActiva(pestanasDelModulo(inmuebles), `${PANEL}/inmuebles/9`)).toBeNull();
  });

  it('cuando la raíz es la Sala de un agente, todo el agente la deja activa y las hermanas ganan', () => {
    const pagos = modulos.find((m) => m.key === 'pagos')!;
    const tabs = pestanasDelModulo(pagos);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/cola`)?.href).toBe(`${PANEL}/pagos`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/abc-123`)?.href).toBe(`${PANEL}/pagos`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/dispersiones/lotes/1`)?.href).toBe(`${PANEL}/pagos/dispersiones`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/liquidaciones`)?.href).toBe(`${PANEL}/pagos/liquidaciones`);
  });
});
