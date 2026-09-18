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
 *     misma ruta, y viceversa;
 *   · todos los agentes viven en «Agentes IA», el primer grupo, y ninguna sala
 *     la reclaman dos lugares (Nico, 2026-09-16).
 *
 * Los dos de la cabecera (Inicio y Chat) viven en el layout y no se tocan:
 * acá sólo se verifica que ningún módulo les pise el icono.
 *
 * Reemplaza a `nav-sidebar.test.ts` (que leía el layout por regex) y a la
 * cuenta por regex de `una-sola-seccion-de-inmuebles.test.ts`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { describe, it, expect } from 'vitest';
import { AirTrafficControl, ChatsCircle } from '@phosphor-icons/react';

import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { PESTANAS_DE_CARTERA } from '@/components/cartera/PestanasDeCartera';
import { AGENT_WORKSPACES, findAgentWorkspace } from './agentWorkspaceNav';
import { filterAgencyNav, pasaGateDeFila, type NavFilterContext } from './agency-nav-filter';
import { filasDelSidebar, resolverEntradaDeModulo } from './sidebar-del-panel';
import { hrefDeLaFilaActiva } from './fila-activa-del-menu';
import {
  ARQUITECTURA_DEL_PANEL,
  CARAS_DE_LA_PLATA,
  PANEL,
  RUTAS_FUERA_DEL_SIDEBAR,
  grupoDelModulo,
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

// Recorre todo `src` (grep + readdir): bajo la suite completa pasa de los 5 s
// por defecto y caía «a veces» — en CI y en local. El tiempo no es la prueba.
describe('arquitectura del panel — rutas', { timeout: 60_000 }, () => {
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
    //
    // Recorre `src` y `tests` en Node en vez de shellear a `grep`: el pipe
    // `grep ... 2>/dev/null | grep -v ... | grep -v ... || true` original
    // asume un shell POSIX y rompe bajo el `cmd.exe` que `execSync` usa por
    // default en un checkout Windows nativo (el mismo tipo de fricción de
    // shell que ya documentó el CRLF de `naira` — T-0060).
    const PATRON = /\/panel\/inmobiliaria\/ai\b/;
    const EXTENSIONES = new Set(['.ts', '.tsx', '.mjs']);
    const encontrados: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, e.name);
        if (e.isDirectory()) {
          recorrer(ruta);
          continue;
        }
        if (!EXTENSIONES.has(e.name.slice(e.name.lastIndexOf('.')))) continue;
        const relativa = ruta.split(sep).join('/');
        if (relativa.includes('src/lib/api/generated/')) continue;
        if (relativa.endsWith('arquitectura-del-panel.test.ts')) continue;
        if (PATRON.test(readFileSync(ruta, 'utf8'))) encontrados.push(relativa);
      }
    };
    for (const raiz of ['src', 'tests']) {
      if (existsSync(join(process.cwd(), raiz))) recorrer(join(process.cwd(), raiz));
    }
    expect(encontrados).toEqual([]);
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

  it('el sidebar tiene 26 módulos en 5 grupos con nombre (+ Inicio y Chat = 28 filas)', () => {
    // Eran 18 hasta que Configuración salió del sidebar (Nico, 2026-09-03): se
    // entra por el menú del perfil. Eran 17 hasta que «Cobros» y «Pagos» se
    // volvieron un solo módulo de plata (Nico + CEO, 2026-09-15). Eran 16 en 4
    // grupos hasta que los agentes tuvieron su sección (2026-09-16): cinco
    // pantallas que eran secciones de otro módulo pasaron a ser filas, más la
    // del equipo de pagos, que no tenía ninguna. Conciliación ya era fila: sólo
    // cambió de grupo. La propuesta original contaba 21 porque incluía
    // «Ayuda», que en el panel no existe como fila: no se inventa. Eran 22
    // hasta que entró NÓMINA (2026-09-17), que además es la primera fila con
    // `moduloPago`: existe en el catálogo pero NO se le muestra a quien no
    // compró el módulo (ver `agency-nav-filter.ts`). Eran 23 hasta que entró «Portales» (18-09-2026, publicación a portales con las
    // cuentas de cada inmobiliaria): va como FILA hermana de Inmuebles y no
    // como su sub-pantalla justamente por la regla de abajo — el riel no se
    // dibuja con una card sola, así que una única sub-pantalla de Inmuebles
    // quedaría inalcanzable desde el menú. Eran 24 hasta que entró «Listas»
    // (C-06, 18-09-2026): va como fila y no como sub-pantalla de Propietarios
    // porque las listas restrictivas aplican a TODOS los terceros —propietarios,
    // inquilinos, codeudores y proveedores— y colgarla de uno solo la
    // escondería para los demás.
    expect(ARQUITECTURA_DEL_PANEL.filter((g) => g.labelKey !== null)).toHaveLength(5);
    // Eran 25 hasta que entró «Proveedores» (H-04, 18-09-2026): el registro de
    // a quién se llama para cada oficio. Va como FILA por la misma regla de
    // Portales — Mantenimientos no tiene secciones, y una sola card no dibuja
    // el riel, así que colgarla de ahí la volvería inalcanzable.
    expect(modulos).toHaveLength(26);
  });

  it('Agenda vive en «Captación y arriendo», detrás de Pipeline', () => {
    // Nico, 2026-09-12: «Agenda interna: la sección de agenda la debemos llevar
    // para la sección de captación y arriendo». Estaba en Operación. Va detrás
    // de Pipeline porque lo que llena la agenda son las visitas del prospecto.
    const captacion = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'captacion');
    const operacion = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'operacion');
    const claves = captacion!.modulos.map((m) => m.key);
    expect(claves).toContain('agenda');
    expect(claves.indexOf('agenda')).toBe(claves.indexOf('pipeline') + 1);
    expect(operacion!.modulos.map((m) => m.key)).not.toContain('agenda');
    // Cambiar de grupo no cambia quién la ve: mismo gate, mismo encuadre.
    const agenda = captacion!.modulos.find((m) => m.key === 'agenda');
    expect(agenda!.module).toBe('operaciones');
    expect(agenda!.scope).toBe('administracion');
  });

  it('Configuración NO es una fila del sidebar: se entra por el menú del perfil', () => {
    // Había dos puertas a lo mismo (la fila y el ítem del menú del perfil).
    // Quedó una. Las rutas siguen vivas —y son destino de redirecciones—, por
    // eso están declaradas en `RUTAS_FUERA_DEL_SIDEBAR`.
    expect(modulos.map((m) => m.key)).not.toContain('configuracion');
    expect(pantallas.map((p) => p.href).filter((h) => h.startsWith(`${PANEL}/configuracion`))).toEqual([]);
    expect(RUTAS_FUERA_DEL_SIDEBAR).toContain(`${PANEL}/configuracion`);
    // Y sin dueño en el árbol, el riel de secciones se calla solo.
    expect(moduloDeLaRuta(`${PANEL}/configuracion`)).toBeNull();
    expect(moduloDeLaRuta(`${PANEL}/configuracion/equipo`)).toBeNull();
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
      '/reportes/ia': 'desempeno-ia',
      '/reportes/resumen': 'resumen-del-negocio',
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

  /**
   * 🔴 La píldora «IA» anunciaba «acá hay un agente trabajando» en medio de
   * pantallas que no lo eran. Desde el 2026-09-16 los agentes viven juntos en
   * «Agentes IA», y ahí la píldora sobra: la cabecera ya lo dice. Queda para
   * lo ASISTIDO por IA que se quedó en su módulo (Postulaciones, Soportes,
   * Solicitudes).
   */
  it('ninguna fila de «Agentes IA» lleva la marca IA: la sección ya lo dice', () => {
    const agentes = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'agentes')!;
    for (const m of agentes.modulos) expect(m.ia, m.key).toBeFalsy();
    for (const p of pantallas.filter((x) => x.agente)) expect(p.ia, p.href).toBeFalsy();
  });

  it('🔴 «Pagos» no es la sala de ningún agente: es LA PLATA de la inmobiliaria', () => {
    // Nico, 2026-09-16: «no debe llamarse Pagos IA». Primero se le quitó la
    // píldora; el mismo día se fue el `agente`, porque mientras estuviera la
    // raíz seguía dibujando un TERCER renglón de pestañas que contradecía la
    // separación inquilinos/propietarios de arriba («eso de inquilinos y
    // propietarios no se entiende realmente»). Las nueve pestañas de esa Sala
    // están repartidas o retiradas en la NOTA al pie de `agentWorkspaceNav.ts`.
    const pagos = modulos.find((m) => m.key === 'pagos')!;
    expect(pagos.ia).toBeFalsy();
    expect(pagos.agente).toBeUndefined();
    expect(AGENT_WORKSPACES.find((w) => w.slug === 'pagos')).toBeUndefined();
    // Sin agente en la raíz, la raíz vuelve a ser EXACTA: una ficha de caso
    // (`/pagos/<id>`) no marca ninguna pestaña, como cualquier otra ficha.
    expect(pestanasDelModulo(pagos)[0]?.exact).toBe(true);
    // Y Cobranza, que sí es la sala de un agente, ya no cuelga de acá: es su
    // propia fila en «Agentes IA» (2026-09-16), con la misma URL.
    expect((pagos.pantallas ?? []).map((p) => p.href)).not.toContain(`${PANEL}/pagos/cobranza`);
    expect(modulos.find((m) => m.key === 'cobranza')?.agente).toBe('cobranza');
  });

  it('🔴 las dos pantallas del agente que se mudaron son pestañas de Cobranza', () => {
    // «Pagos fallidos» (columnas: Inquilino · Valor · Motivo, con «link
    // vencido» y «banco rechazó») y «Recordatorios» son plata del INQUILINO que
    // no entró: cobranza, no giro al propietario.
    const cobranza = AGENT_WORKSPACES.find((w) => w.slug === 'cobranza')!;
    const hrefs = cobranza.items.map((i) => i.href);
    expect(hrefs).toContain(`${PANEL}/pagos/cobranza/fallidos`);
    expect(hrefs).toContain(`${PANEL}/pagos/cobranza/recordatorios`);
    // Y se gatean con el módulo que las ofrece, no por rol: una pestaña que se
    // ve y devuelve al inicio es el defecto MSJ-6.
    for (const href of [`${PANEL}/pagos/cobranza/fallidos`, `${PANEL}/pagos/cobranza/recordatorios`]) {
      const item = cobranza.items.find((i) => i.href === href)!;
      expect(item.module, href).toBe('cobranza');
      expect(item.roles, href).toBeUndefined();
    }
  });

  it('Retención NO está en el catálogo: no va a producción todavía (Nico, 2026-09-03)', () => {
    // Las rutas existen bajo `contratos/(retencion)/`, pero ninguna pestaña,
    // fila ni píldora las ofrece.
    const hrefs = pantallas.map((p) => p.href);
    for (const seg of ['/contratos/retencion', '/contratos/riesgo', '/contratos/aprobar']) {
      expect(hrefs).not.toContain(`${PANEL}${seg}`);
    }
  });

  it('Evaluación de candidatos NO está en el catálogo: oculta por ahora (Nico, 2026-09-08)', () => {
    // Las páginas siguen bajo `postulaciones/estudio/` y su layout devuelve a
    // Postulaciones; ninguna card, fila ni workspace la ofrece mientras tanto.
    const hrefs = pantallas.map((p) => p.href);
    expect(hrefs.some((h) => h.startsWith(`${PANEL}/postulaciones/estudio`))).toBe(false);
    expect(AGENT_WORKSPACES.find((w) => w.slug === 'estudio')).toBeUndefined();
    expect(existsSync(join(APP, 'postulaciones/estudio/layout.tsx')), 'la puerta que devuelve a Postulaciones').toBe(true);
    expect(existsSync(join(APP, 'postulaciones/estudio/page.tsx')), 'las páginas siguen vivas').toBe(true);
  });

  it('Tickets (agente de mantenimiento) NO está en el catálogo ni tiene workspace: es mock-first sin endpoint (Nico, 2026-09-03)', () => {
    const hrefs = pantallas.map((p) => p.href);
    expect(hrefs.some((h) => h.includes('/mantenimientos/tickets'))).toBe(false);
    expect(AGENT_WORKSPACES.find((w) => w.slug === 'mantenimiento')).toBeUndefined();
    // Y el módulo no promete IA que no tiene.
    expect(modulos.find((m) => m.key === 'mantenimientos')?.ia).toBeFalsy();
  });

  it('ningún agente es hoy la raíz de un módulo CON hermanas: nadie necesita `excluir`', () => {
    // `excluir` existía para la Sala de Pagos, que era el agente Y la raíz del
    // módulo de plata, y tenía que declarar a sus seis hermanas para no
    // tragárselas. Esa Sala se fue el 2026-09-16. Conciliación sigue siendo la
    // raíz de su módulo pero no tiene hermanas, así que no excluye nada.
    for (const ws of AGENT_WORKSPACES) {
      const modulo = modulos.find((m) => m.href === ws.basePath);
      const hermanas = modulo?.pantallas ?? [];
      for (const hermana of hermanas) {
        expect(ws.excluir ?? [], `${ws.slug} ↔ ${hermana.href}`).toContain(hermana.href);
      }
    }
  });
});

describe('arquitectura del panel — resolución de rutas', () => {
  it('el módulo dueño es el de prefijo más largo', () => {
    // Desde el 2026-09-16 Cobranza es su propio módulo (en «Agentes IA») y su
    // href es más largo que el de Pagos: la sala es suya, no de Pagos.
    expect(moduloDeLaRuta(`${PANEL}/pagos/cobranza/deudores/1`)?.key).toBe('cobranza');
    expect(moduloDeLaRuta(`${PANEL}/pagos/cartera/cobros`)?.key).toBe('pagos');
    expect(moduloDeLaRuta(`${PANEL}/pagos/dispersiones/lotes/2`)?.key).toBe('pagos');
    expect(moduloDeLaRuta(`${PANEL}/piloto`)).toBeNull();
    expect(moduloDeLaRuta(PANEL)).toBeNull();
  });

  it('«Cobros» ya no es un módulo: ninguna ruta del árbol cuelga de /cobros', () => {
    // Nico + CEO, 2026-09-15. Las URLs viejas siguen vivas, pero por
    // redirección (`un-solo-modulo-de-plata.data.mjs`), no por una fila.
    expect(modulos.map((m) => m.key)).not.toContain('cobros');
    expect(pantallas.map((p) => p.href).filter((h) => h.startsWith(`${PANEL}/cobros`))).toEqual([]);
    expect(moduloDeLaRuta(`${PANEL}/cobros`)).toBeNull();
  });

  it('la pestaña activa es la de href más largo que coincida', () => {
    const pagos = modulos.find((m) => m.key === 'pagos')!;
    const tabs = pestanasDelModulo(pagos);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/dispersiones/lotes/2`)?.href).toBe(`${PANEL}/pagos/dispersiones`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/cartera`)?.href).toBe(`${PANEL}/pagos/cartera`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos?estado=vencidos`)?.href).toBe(`${PANEL}/pagos`);
  });

  it('lo que cuelga de Cartera la deja marcada a ella (la lista de cobros es una lectura suya)', () => {
    const pagos = modulos.find((m) => m.key === 'pagos')!;
    const tabs = pestanasDelModulo(pagos);
    for (const bajoCartera of ['/cobros', '/cobros/7/cuenta-de-cobro', '/conceptos', '/por-pagar', '/reglas-de-mora']) {
      expect(
        pestanaActiva(tabs, `${PANEL}/pagos/cartera${bajoCartera}`)?.href,
        bajoCartera,
      ).toBe(`${PANEL}/pagos/cartera`);
    }
  });

  it('la raíz de un módulo es exacta: en una ficha o un flujo ninguna pestaña está activa', () => {
    const inmuebles = modulos.find((m) => m.key === 'inmuebles')!;
    expect(pestanaActiva(pestanasDelModulo(inmuebles), `${PANEL}/inmuebles/nuevo`)).toBeNull();
    expect(pestanaActiva(pestanasDelModulo(inmuebles), `${PANEL}/inmuebles/9`)).toBeNull();
    const contratos = modulos.find((m) => m.key === 'contratos')!;
    expect(pestanaActiva(pestanasDelModulo(contratos), `${PANEL}/contratos/7`)).toBeNull();
  });

  it('cuando la raíz es la Sala de un agente, todo el agente la deja activa (Conciliación)', () => {
    const conciliacion = modulos.find((m) => m.key === 'conciliacion')!;
    const tabs = pestanasDelModulo(conciliacion);
    expect(pestanaActiva(tabs, `${PANEL}/conciliacion/cola`)?.href).toBe(`${PANEL}/conciliacion`);
    expect(pestanaActiva(tabs, `${PANEL}/conciliacion/caso-9`)?.href).toBe(`${PANEL}/conciliacion`);
  });

  it('🔴 Pagos ya NO: su raíz es exacta y su ficha de caso no marca ninguna pestaña', () => {
    // Mientras fue la Sala del agente, `/pagos/<id>` dejaba «Pagos» marcada y
    // el módulo dibujaba un tercer renglón de pestañas. Desde el 2026-09-16 la
    // raíz se comporta como cualquier otra: exacta, y la ficha trae su propia
    // cabecera con su «Volver».
    const pagos = modulos.find((m) => m.key === 'pagos')!;
    const tabs = pestanasDelModulo(pagos);
    expect(pestanaActiva(tabs, `${PANEL}/pagos`)?.href).toBe(`${PANEL}/pagos`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/abc-123`)).toBeNull();
    expect(pestanaActiva(tabs, `${PANEL}/pagos/dispersiones/lotes/1`)?.href).toBe(`${PANEL}/pagos/dispersiones`);
    expect(pestanaActiva(tabs, `${PANEL}/pagos/liquidaciones/por-aprobar`)?.href).toBe(
      `${PANEL}/pagos/liquidaciones`,
    );
  });
});

describe('secciones (cards debajo del header) — la píldora IA no repite el nombre', () => {
  // «Agentes IA» + píldora «IA» se leía «Agentes IA IA» en la card de la sección
  // (visto en el navegador el 2026-09-03). Si el nombre ya dice IA, la marca
  // `ia: true` sobra: es para pantallas cuyo nombre no lo dice (Cobranza, Avalúos…).
  it('ninguna pantalla cuyo nombre termina en «IA» lleva además ia: true', () => {
    const repetidas = pantallas
      .filter((p) => p.ia)
      .map((p) => ({ href: p.href, es: String(leer(es, p.labelKey) ?? ''), en: String(leer(en, p.labelKey) ?? '') }))
      .filter((p) => /\bIA$/.test(p.es) || /\bAI$/.test(p.en));
    expect(repetidas).toEqual([]);
  });
});

describe('arquitectura del panel — Contratos vive en Operación (Nico, 2026-09-12)', () => {
  const grupoDe = (key: string) =>
    ARQUITECTURA_DEL_PANEL.find((g) => g.modulos.some((m) => m.key === key))?.key ?? null;

  it('🔴 «Contratos va dentro de OPERACIÓN»: ya no está en Captación y arriendo', () => {
    expect(grupoDe('contratos')).toBe('operacion');
  });

  it('es la primera fila de Operación: lo que se opera es el contrato', () => {
    const operacion = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'operacion');
    expect(operacion?.modulos[0]?.key).toBe('contratos');
  });

  it('cambiar de grupo no le cambió el permiso, el encuadre ni el ancla del tour', () => {
    // Reordenar no abre ni cierra pantallas a nadie (`sidebar-del-panel.ts`).
    const contratos = modulosDelPanel().find((m) => m.key === 'contratos');
    expect(contratos?.module).toBe('contratos');
    expect(contratos?.scope).toBe('administracion');
    expect(contratos?.dataTourTarget).toBe('sidebar-contratos');
    // «Firmas» entró el 18-09-2026 (A-13: la invitación vence a los 7 días).
    // Lo que este test sostiene es que mudar de grupo no le cambió el permiso
    // ni el encuadre, no cuántas pantallas tiene.
    expect(contratos?.pantallas?.map((p) => p.href)).toEqual([
      `${PANEL}/contratos/renovaciones`,
      `${PANEL}/contratos/firmas`,
    ]);
  });

  /*
   * La lista era EXACTA (`['pipeline', 'inmuebles', 'postulaciones']`) y se
   * puso roja el mismo día: otra tanda mudó la Agenda a Captación y este test
   * no se enteró. Lo que hay que sostener es la REGLA R3 —un grupo no se queda
   * con una sola fila— y que Contratos ya no esté acá; cuál es el resto del
   * grupo es una decisión de navegación que cambia sola y no tiene por qué
   * romper la mudanza de Contratos.
   */
  it('Captación sigue con al menos dos filas (R3) después de la mudanza', () => {
    const captacion = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'captacion');
    const claves = captacion?.modulos.map((m) => m.key) ?? [];
    expect(claves.length).toBeGreaterThanOrEqual(2);
    expect(claves).toEqual(expect.arrayContaining(['pipeline', 'inmuebles', 'postulaciones']));
    expect(claves).not.toContain('contratos');
  });
});


describe('arquitectura del panel — un solo módulo de plata (Nico + CEO, 2026-09-15)', () => {
  const pagos = modulos.find((m) => m.key === 'pagos')!;
  const tabs = pestanasDelModulo(pagos);
  const porHref = (seg: string) => tabs.find((t) => t.href === `${PANEL}${seg}`);

  it('🔴 «Cobros» desapareció del sidebar y Pagos quedó con cuatro pantallas', () => {
    // «Hay dos cosas de lo mismo, que son Cobros y uno en Pagos y el otro en
    // Cobros […] que se fuera lo de Cobros, porque todo funciona alrededor del
    // estado de cuenta del contrato» (Nico). El CEO: «inquilinos […] y
    // dispersión a propietarios, todo en un solo módulo». Eran cinco hasta que
    // Cobranza se mudó a «Agentes IA» (2026-09-16).
    expect(pagos.pantallas?.map((p) => p.href)).toEqual([
      `${PANEL}/pagos/recaudo`,
      `${PANEL}/pagos/cartera`,
      `${PANEL}/pagos/liquidaciones`,
      `${PANEL}/pagos/dispersiones`,
    ]);
  });

  it('las dos caras están declaradas y en orden: primero lo que ENTRA, después lo que SALE', () => {
    expect(pagos.pantallas?.map((p) => p.cara)).toEqual([
      'inquilinos',
      'inquilinos',
      'propietarios',
      'propietarios',
    ]);
    // Y las dos caras tienen su rótulo y su matiz en los dos idiomas (lo pinta
    // `SeccionesDelModulo` a partir de `CARAS_DE_LA_PLATA`).
    for (const c of CARAS_DE_LA_PLATA) {
      expect(typeof leer(es, c.labelKey), c.labelKey).toBe('string');
      expect(typeof leer(en, c.labelKey), c.labelKey).toBe('string');
      expect(typeof leer(es, c.detalleKey), c.detalleKey).toBe('string');
      expect(typeof leer(en, c.detalleKey), c.detalleKey).toBe('string');
    }
    expect(CARAS_DE_LA_PLATA.map((c) => c.cara)).toEqual(['inquilinos', 'propietarios']);
  });

  it('🔴 TODAS las pantallas tienen cara, la raíz incluida', () => {
    // La raíz no tenía, así que se dibujaba como primera card en las DOS caras
    // — y lo que muestra es la deuda de los INQUILINOS. Elegir «Propietarios» y
    // encontrarse eso es el mismo defecto que Nico venía señalando, un piso más
    // abajo (2026-09-16). `pestanasDelModulo` le pasa la `cara` del módulo.
    expect(tabs[0]?.href).toBe(pagos.href);
    expect(tabs[0]?.cara).toBe('inquilinos');
    expect(tabs.filter((t) => !t.cara)).toEqual([]);
  });

  it('el rótulo de cada cara lleva VERBO: «Inquilinos» a secas ya nombra otra fila', () => {
    // El directorio tiene una fila «Inquilinos» y otra «Propietarios». La misma
    // palabra significando dos cosas distintas en el mismo panel es media
    // explicación de por qué «no se entendía» (Nico, 2026-09-16).
    const rotulos = CARAS_DE_LA_PLATA.map((c) => String(leer(es, c.labelKey)));
    expect(rotulos).toEqual(['Cobrar a inquilinos', 'Pagar a propietarios']);
    const filas = modulos.map((m) => String(leer(es, m.labelKey)));
    for (const r of rotulos) expect(filas, r).not.toContain(r);
  });

  it('🔴 PERMISOS: cada pantalla conserva EXACTAMENTE el gate que tenía como fila propia', () => {
    // Unificar no puede abrirle a nadie una pantalla que no tenía ni cerrarle
    // una que usaba. Estos son los gates de ANTES, uno por uno.
    expect({ module: pagos.module, roles: pagos.roles }).toEqual({
      module: null,
      roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR],
    });
    expect(porHref('/pagos/recaudo')?.module).toBe('cobros');
    expect(porHref('/pagos/cartera')?.module).toBe('cobros');
    expect(porHref('/pagos/liquidaciones')?.module).toBeNull();
    expect(porHref('/pagos/liquidaciones')?.roles).toEqual([AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]);
    expect(porHref('/pagos/dispersiones')?.module).toBe('dispersiones');
    // Ninguna de las que venían de Cobros gana un gate de rol nuevo: si lo
    // ganaran, quien tiene `cobros` y no es contador perdería su trabajo.
    // (Cobranza, la tercera, se cuida en el bloque de «Agentes IA».)
    for (const seg of ['/pagos/recaudo', '/pagos/cartera']) {
      expect(porHref(seg)?.roles, seg).toBeUndefined();
    }
  });

  it('🔴 PERMISOS: quien sólo tiene `cobros` entra igual, y no ve la dispersión', () => {
    // El mecanismo es `resolverEntradaDeModulo`: si la raíz no le pasa, la
    // fila se abre en la primera pestaña que sí. Es el MISMO que ya usaban
    // Inmuebles/Avalúos, no uno nuevo.
    const ctx = {
      canAccess: (m: string) => m === 'cobros',
      isAdmin: false,
      agencyRole: AGENCY_ROLES.VIEWER as string,
    };
    expect(resolverEntradaDeModulo(pagos, ctx)?.href).toBe(`${PANEL}/pagos/recaudo`);
    const visibles = tabs.filter((t) => pasaGateDeFila(t, ctx)).map((t) => t.href);
    expect(visibles).toEqual([`${PANEL}/pagos/recaudo`, `${PANEL}/pagos/cartera`]);
  });

  it('🔴 PERMISOS: el contador no pierde liquidaciones ni dispersiones', () => {
    const ctx = {
      canAccess: () => true,
      isAdmin: false,
      agencyRole: AGENCY_ROLES.CONTADOR as string,
    };
    expect(resolverEntradaDeModulo(pagos, ctx)?.href).toBe(`${PANEL}/pagos`);
    expect(tabs.filter((t) => pasaGateDeFila(t, ctx))).toHaveLength(tabs.length);
  });

  it('el módulo conserva su encuadre de finanzas y lo hereda a las cuatro', () => {
    // `AGENTE` (comercial) no ve finanzas, y no veía Cobros antes tampoco.
    expect(pagos.scope).toBe('finanzas');
    for (const t of tabs) expect(t.scope, t.href).toBe('finanzas');
  });

  it('🔴 dentro de Pagos el ÚNICO agente es Cobranza, y sólo en su propia ruta', () => {
    // Antes la raíz era la Sala de Pagos y se tragaba todo lo que colgara de
    // `/pagos` salvo lo que declarara en `excluir`. Ahora no hay nada que
    // excluir: fuera de `/pagos/cobranza` no hay workspace de agente.
    expect(findAgentWorkspace(`${PANEL}/pagos/cobranza/deudores/1`)?.slug).toBe('cobranza');
    expect(findAgentWorkspace(`${PANEL}/pagos/cobranza/fallidos`)?.slug).toBe('cobranza');
    for (const suelta of ['', '/abc-123', '/cartera/cobros', '/liquidaciones/por-aprobar', '/dispersiones']) {
      expect(findAgentWorkspace(`${PANEL}/pagos${suelta}`), suelta).toBeNull();
    }
  });

  it('la lista de cobros emitidos es una lectura de Cartera, no una fila', () => {
    // Un cobro es el DOCUMENTO con el que se reclama parte de la deuda, y la
    // deuda nace con el contrato. Un documento no es un módulo.
    expect(pantallas.map((p) => p.href)).not.toContain(`${PANEL}/pagos/cartera/cobros`);
    expect(PESTANAS_DE_CARTERA.map((p) => p.href)).toContain(`${PANEL}/pagos/cartera/cobros`);
    expect(existsSync(join(APP, 'pagos/cartera/cobros/page.tsx'))).toBe(true);
  });

  it('las maquetas del tercer renglón murieron con él (eran la duplicación señalada)', () => {
    // «Cobros a inquilinos» cayó el 15-09; «Generar cobros», «Reglas» y «Pagos
    // a propietarios» el 16-09, con la Sala entera. Las cuatro eran pantallas
    // con datos escritos a mano y botones en «Próximamente».
    for (const muerta of ['pagos/cobros', 'pagos/generar', 'pagos/reglas', 'pagos/propietarios']) {
      expect(existsSync(join(APP, muerta)), muerta).toBe(false);
    }
    // Y no quedó ni un workspace de agente colgando de la raíz del módulo.
    expect(AGENT_WORKSPACES.filter((w) => w.basePath === `${PANEL}/pagos`)).toEqual([]);
  });
});

describe('🔴 «Agentes IA»: los agentes tienen su propia sección (Nico, 2026-09-16)', () => {
  // «Todo lo que tenemos de AI en este momento —no lo que está sin sacar, lo
  // que hay en este momento— creemos una sección sólo de agentes, y los
  // metamos todos ahí. Arriba de la sección de captación.»
  const agentes = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'agentes')!;
  const fila = (key: string) => agentes.modulos.find((m) => m.key === key)!;
  const ADMIN_Y_CONTADOR = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR];
  const t = (k: string) => k;

  it('es el PRIMER grupo del catálogo, justo arriba de «Captación y arriendo»', () => {
    expect(ARQUITECTURA_DEL_PANEL[0]?.key).toBe('agentes');
    expect(ARQUITECTURA_DEL_PANEL[1]?.key).toBe('captacion');
    expect(leer(es, agentes.labelKey!)).toBe('Agentes IA');
    expect(leer(en, agentes.labelKey!)).toBe('AI Agents');
  });

  it('trae lo que funciona hoy en el orden de los módulos de donde vino; después el equipo de pagos y Desempeño IA', () => {
    expect(agentes.modulos.map((m) => m.key)).toEqual([
      'avaluos',
      'matching',
      'asegurabilidad',
      'cobranza',
      'conciliacion',
      'agente-de-pagos',
      'desempeno-ia',
    ]);
  });

  it('🔴 las URLs NO se movieron: cada sala sigue donde estaba', () => {
    // La última mudanza de URLs tocó 151 archivos. Lo que había que resolver
    // —que la sala se viera dentro de Agentes— lo resuelve `moduloDeLaRuta`
    // sin mover nada (ver el test del módulo dueño, abajo).
    expect(agentes.modulos.map((m) => m.href.replace(PANEL, ''))).toEqual([
      '/inmuebles/avaluos',
      '/postulaciones/matching',
      '/postulaciones/asegurabilidad',
      '/pagos/cobranza',
      '/conciliacion',
      '/pagos/agente',
      '/reportes/ia',
    ]);
  });

  it('TODA sala de agente vive acá, y cada workspace registrado tiene acá su puerta', () => {
    const deAgentes = new Set(agentes.modulos.map((m) => m.href));
    const salas = pantallas.filter((p) => p.agente);
    for (const sala of salas) expect(deAgentes.has(sala.href), sala.href).toBe(true);
    expect(new Set(salas.map((p) => p.agente))).toEqual(new Set(AGENT_WORKSPACES.map((w) => w.slug)));
  });

  it('🔴 una sala la reclama UN solo lugar: ningún otro módulo la tiene como sección', () => {
    const fuera = ARQUITECTURA_DEL_PANEL.filter((g) => g.key !== 'agentes')
      .flatMap((g) => g.modulos)
      .flatMap((m) => pestanasDelModulo(m));
    for (const m of agentes.modulos) {
      const reclamos = fuera.filter((p) => p.href === m.href || p.href.startsWith(`${m.href}/`));
      expect(reclamos.map((p) => p.href), m.key).toEqual([]);
    }
  });

  it('🔴 entrar a una sala —y a cualquier pestaña suya— se ve DENTRO de Agentes', () => {
    // Es la regla que sostiene no mover las URLs: el módulo dueño es el de
    // href más largo, y el de la sala es más largo que el del módulo que antes
    // la hospedaba. De ahí salen el riel (se calla), el breadcrumb (arranca en
    // «Agentes IA») y la fila marcada del sidebar.
    for (const m of agentes.modulos) {
      for (const ruta of [m.href, `${m.href}/cola`, `${m.href}/deudores/9?x=1`]) {
        const dueno = moduloDeLaRuta(ruta);
        expect(dueno?.key, ruta).toBe(m.key);
        expect(grupoDelModulo(dueno!)?.key, ruta).toBe('agentes');
      }
    }
    // Y lo que sigue siendo del módulo, sigue siendo del módulo.
    expect(moduloDeLaRuta(`${PANEL}/pagos/cartera/cobros`)?.key).toBe('pagos');
    expect(moduloDeLaRuta(`${PANEL}/postulaciones/soportes`)?.key).toBe('postulaciones');
    expect(moduloDeLaRuta(`${PANEL}/inmuebles/9`)?.key).toBe('inmuebles');
    expect(moduloDeLaRuta(`${PANEL}/reportes/rentabilidad`)?.key).toBe('reportes');
  });

  it('🔴 el sidebar marca UNA fila: la del agente, no la del módulo que lo hospedaba', () => {
    const todo: NavFilterContext = { canAccess: () => true, isAdmin: true, agencyRole: AGENCY_ROLES.ADMIN };
    const filas = filasDelSidebar(t, todo);
    const marcada = (ruta: string) => hrefDeLaFilaActiva(filas, `${PANEL}${ruta}`)?.replace(PANEL, '');
    expect(marcada('/pagos/cobranza/deudores/1')).toBe('/pagos/cobranza');
    expect(marcada('/pagos/agente')).toBe('/pagos/agente');
    expect(marcada('/pagos/cartera/cobros')).toBe('/pagos');
    expect(marcada('/postulaciones/matching/cola')).toBe('/postulaciones/matching');
    expect(marcada('/postulaciones/asegurabilidad')).toBe('/postulaciones/asegurabilidad');
    expect(marcada('/postulaciones/soportes')).toBe('/postulaciones');
    expect(marcada('/inmuebles/avaluos/cola')).toBe('/inmuebles/avaluos');
    expect(marcada('/inmuebles/9')).toBe('/inmuebles');
    expect(marcada('/reportes/ia')).toBe('/reportes/ia');
    expect(marcada('/reportes/rentabilidad')).toBe('/reportes');
  });

  it('🔴 PERMISOS: cada fila conserva el gate y el encuadre que tenía donde vivía', () => {
    const gate = (key: string) => {
      const m = fila(key);
      return { module: m.module, roles: m.roles, scope: m.scope };
    };
    // De Inmuebles y Postulaciones: heredaban `comercial`.
    expect(gate('avaluos')).toEqual({ module: 'avaluos', roles: undefined, scope: 'comercial' });
    expect(gate('matching')).toEqual({ module: 'matching', roles: undefined, scope: 'comercial' });
    expect(gate('asegurabilidad')).toEqual({ module: 'cotizador', roles: undefined, scope: 'comercial' });
    // De Pagos: heredaba `finanzas`, sin gate de rol.
    expect(gate('cobranza')).toEqual({ module: 'cobranza', roles: undefined, scope: 'finanzas' });
    // De Dinero, donde ya era fila: idéntica.
    expect(gate('conciliacion')).toEqual({ module: null, roles: ADMIN_Y_CONTADOR, scope: 'finanzas' });
    // De Reportes: heredaba `general`.
    expect(gate('desempeno-ia')).toEqual({ module: 'analytics', roles: undefined, scope: 'general' });
    // El equipo de pagos, con el gate de la Sala de la que viene.
    expect(gate('agente-de-pagos')).toEqual({ module: null, roles: ADMIN_Y_CONTADOR, scope: 'finanzas' });
  });

  it('🔴 PERMISOS: cada rol ve en Agentes exactamente las salas que ya abría', () => {
    const visibles = (ctx: NavFilterContext) =>
      filterAgencyNav(filasDelSidebar(t, ctx), ctx)
        .map((f) => f.href.replace(PANEL, ''))
        .filter((h) => agentes.modulos.some((m) => m.href === `${PANEL}${h}`));
    // El comercial no ve finanzas —no veía Cobranza dentro de Pagos—.
    expect(visibles({ canAccess: () => true, isAdmin: false, agencyRole: AGENCY_ROLES.AGENTE })).toEqual([
      '/inmuebles/avaluos',
      '/postulaciones/matching',
      '/postulaciones/asegurabilidad',
      '/reportes/ia',
    ]);
    // El contador no ve comercial —no veía Avalúos dentro de Inmuebles—.
    expect(visibles({ canAccess: () => true, isAdmin: false, agencyRole: AGENCY_ROLES.CONTADOR })).toEqual([
      '/pagos/cobranza',
      '/conciliacion',
      '/pagos/agente',
      '/reportes/ia',
    ]);
  });

  it('🔴 quien tenía la sala por la fila de su módulo la sigue teniendo, ahora por la suya', () => {
    // Antes, quien tenía `avaluos` pero no `portafolio` veía «Inmuebles» y la
    // fila lo llevaba a Avalúos (`resolverEntradaDeModulo`). Ahora ve «Avalúos»
    // y no ve «Inmuebles»: la misma puerta, con su nombre.
    const ctx: NavFilterContext = { canAccess: (m) => m === 'avaluos', isAdmin: false, agencyRole: AGENCY_ROLES.VIEWER };
    const hrefs = filterAgencyNav(filasDelSidebar(t, ctx), ctx).map((f) => f.href);
    expect(hrefs).toContain(`${PANEL}/inmuebles/avaluos`);
    expect(hrefs).not.toContain(`${PANEL}/inmuebles`);
  });

  it('🔴 la sección ENTERA se esconde si a alguien no le queda ninguna fila', () => {
    // Los agentes son del plan Flex: sin plan, el micro no concede sus
    // módulos y `canAccess` los niega. Sin ninguna fila, la cabecera no se
    // queda sola (`filterAgencyNav` borra la cabecera vacía).
    const sinAgentes: NavFilterContext = {
      canAccess: (m) => ['portafolio', 'pipeline', 'contratos'].includes(m),
      isAdmin: false,
      agencyRole: AGENCY_ROLES.AGENTE,
    };
    const filas = filterAgencyNav(filasDelSidebar(t, sinAgentes), sinAgentes);
    expect(filas.map((f) => f.label)).not.toContain('inmobiliaria.nav.secAgentes');
    expect(filas.map((f) => f.label)).toContain('inmobiliaria.nav.secCaptacion');

    // Con una sola fila visible, la sección aparece con esa fila.
    const soloAnalytics: NavFilterContext = { ...sinAgentes, canAccess: (m) => m === 'analytics' };
    const conUna = filterAgencyNav(filasDelSidebar(t, soloAnalytics), soloAnalytics);
    const i = conUna.findIndex((f) => f.label === 'inmobiliaria.nav.secAgentes');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(conUna[i + 1]?.href).toBe(`${PANEL}/reportes/ia`);
  });

  it('lo que está sin sacar NO entra: Retención, Mantenimiento (tickets), Evaluación de candidatos', () => {
    const hrefs = agentes.modulos.map((m) => m.href);
    for (const h of hrefs) {
      expect(h, h).not.toMatch(/\/contratos\/|\/mantenimientos|\/postulaciones\/estudio/);
    }
  });

  it('lo ASISTIDO por IA sin agente propio se queda en su módulo, con su píldora', () => {
    // Postulaciones, Soportes y Solicitudes no son agentes: una cola que la IA
    // llena y una persona decide. Si entraran, la sección dejaría de
    // significar algo.
    const deAgentes = new Set(agentes.modulos.map((m) => m.href));
    for (const seg of ['/postulaciones', '/postulaciones/soportes', '/solicitudes']) {
      const p = pantallas.find((x) => x.href === `${PANEL}${seg}`)!;
      expect(p.ia, seg).toBe(true);
      expect(p.agente, seg).toBeUndefined();
      expect(deAgentes.has(p.href), seg).toBe(false);
    }
  });

  it('🔴 «Agente de pagos» no se llama «Pagos», no es una Sala y no repite lo que se mudó', () => {
    const agenteDePagos = fila('agente-de-pagos');
    // Dos filas «Pagos» en el mismo menú no se distinguen.
    expect(leer(es, agenteDePagos.labelKey)).toBe('Agente de pagos');
    expect(modulos.filter((m) => leer(es, m.labelKey) === 'Pagos').map((m) => m.key)).toEqual(['pagos']);
    // No es la Sala retirada: sin workspace, sin pestañas.
    expect(agenteDePagos.agente).toBeUndefined();
    expect(findAgentWorkspace(agenteDePagos.href)).toBeNull();
    expect(existsSync(join(APP, 'pagos/agente/page.tsx'))).toBe(true);
    // Lo que tenía vivo se mudó el mismo día, y se queda donde se mudó.
    expect(moduloDeLaRuta(`${PANEL}/pagos/cobranza/fallidos`)?.key).toBe('cobranza');
    expect(moduloDeLaRuta(`${PANEL}/pagos/cobranza/recordatorios`)?.key).toBe('cobranza');
    expect(moduloDeLaRuta(`${PANEL}/pagos/liquidaciones/por-aprobar`)?.key).toBe('pagos');
  });

  it('los módulos que perdieron su agente siguen enteros', () => {
    const secciones = (key: string) => (modulos.find((m) => m.key === key)!.pantallas ?? []).map((p) => p.href.replace(PANEL, ''));
    // Inmuebles se queda sin secciones: el riel no se dibuja con una card sola.
    expect(secciones('inmuebles')).toEqual([]);
    // Requisitos entró el 18-09-2026 (F-05: «los requisitos por tipo de
    // inquilino los define cada inmobiliaria»). Postulaciones ya tenía
    // Soportes, así que el riel se dibujaba: no hace falta volverla fila.
    expect(secciones('postulaciones')).toEqual([
      '/postulaciones/requisitos',
      '/postulaciones/reclamos',
      '/postulaciones/soportes',
    ]);
    expect(secciones('pagos')).toEqual(['/pagos/recaudo', '/pagos/cartera', '/pagos/liquidaciones', '/pagos/dispersiones']);
    expect(secciones('reportes')).toEqual(['/reportes/resumen', '/reportes/rentabilidad']);
    // Dinero sin Conciliación sigue con más de una fila (R3). Nómina cierra el
    // grupo desde el 2026-09-17.
    expect(ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'dinero')!.modulos.map((m) => m.key)).toEqual([
      'pagos',
      'facturacion',
      'contabilidad',
      'nomina',
    ]);
  });
});
