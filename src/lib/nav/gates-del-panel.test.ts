/**
 * Guardián de los GATES del panel: que lo que el sidebar promete se pueda abrir.
 *
 * Hay tres declaraciones del mismo permiso y ninguna se entera cuando otra
 * cambia: la fila del sidebar (`arquitectura-del-panel.ts`), el `PageGuard` de
 * la pantalla, y el `@RequirePermission` del back. Cuando se separan, el rol ve
 * la fila, hace clic y lo devuelven a la portada sin decirle nada — que es la
 * peor forma de enterarse de que no tenía permiso.
 *
 * Lo que se cuida acá (los dos primeros son front, el tercero no se puede ver
 * desde este repo y va anotado en cada arreglo):
 *
 *   1. Todo `module` que se nombre —en el sidebar o en un `PageGuard`— EXISTE.
 *      `module="propiedades"` no era un permiso más estricto: era una llave
 *      inexistente, y `canAccess` devuelve `false` para lo que no está en la
 *      matriz, así que expulsaba a todo el que no fuera admin (S1-32).
 *   2. La pantalla raíz de un módulo se gatea con el MISMO `module` que declara
 *      su fila del sidebar. `/contratos` decía `contratos` en el sidebar y
 *      `portafolio` en el `PageGuard`: el CONTADOR veía la fila y era expulsado
 *      (S1-20).
 *   3. Una fila que se muestra a TODOS los roles no puede estar detrás de un
 *      `AgencyRoleGuard allowed="managers"` (MSJ-6).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { isAgentModule } from '@/lib/auth/agent-module-access';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import {
  ARQUITECTURA_DEL_PANEL,
  PANEL,
  modulosDelPanel,
  pestanasDelModulo,
} from './arquitectura-del-panel';

const APP = join(process.cwd(), 'src/app/panel/inmobiliaria');

/**
 * La matriz de permisos del back, espejada: `AGENCY_MODULES` de
 * `back-erp/src/inmobiliaria/agency/permissions/agency-permissions.ts`. Es la
 * lista que `effectivePermissions` puede traer; cualquier otra clave la
 * resuelve `PermissionsContext.canAccess` como `false` para todo no-admin.
 *
 * Si el back agrega un módulo, esta lista se actualiza acá. No hay codegen para
 * este borde (los permisos viajan como un mapa abierto en el JSON), así que la
 * única defensa es este test.
 */
const MODULOS_DEL_BACK = [
  'dashboard',
  'propietarios',
  'portafolio',
  'pipeline',
  'agentes',
  'cobros',
  'dispersiones',
  'operaciones',
  'reportes',
  'configuracion',
  'documentos',
  'analytics',
  'contratos',
  'subscription',
  'avaluos',
  'clientes',
] as const;

/**
 * Módulos que se nombran en un `PageGuard` y NO existen en ninguna matriz.
 * Cada uno es un defecto abierto, anotado con su dueño — no una excepción
 * legítima. La lista está acá para que el test muerda con el SIGUIENTE, en vez
 * de quedar rojo de entrada y que alguien lo apague entero.
 *
 *   · `ap`        — `/pagos/cxp/*`. Cuentas por pagar; la carpeta `pagos` es de
 *                   otro paquete de arreglos. Hoy expulsa a todo no-admin.
 *   · `retencion` — `/contratos/(retencion)/*`. Fuera del catálogo a propósito
 *                   (no va a producción, Nico 2026-09-03) y sólo alcanzable
 *                   escribiendo la URL, así que ningún rol ve una fila que no
 *                   se le abra. Se resuelve cuando Retención salga del limbo.
 */
const MODULOS_ROTOS_CONOCIDOS = ['ap', 'retencion'];

function moduloConocido(m: string): boolean {
  return (MODULOS_DEL_BACK as readonly string[]).includes(m) || isAgentModule(m);
}

/**
 * El `page.tsx` de una ruta del panel, bajando segmento a segmento y probando
 * también los route groups `(…)`, que no aparecen en la URL. Null si no hay.
 */
function paginaDe(href: string): string | null {
  const segmentos = href.replace(PANEL, '').split('/').filter(Boolean);
  const buscar = (dir: string, i: number): string | null => {
    if (i === segmentos.length) {
      const page = join(dir, 'page.tsx');
      return existsSync(page) ? page : null;
    }
    if (!existsSync(dir)) return null;
    const candidatos = [join(dir, segmentos[i]!)];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')')) {
        candidatos.push(join(dir, e.name, segmentos[i]!));
      }
    }
    for (const c of candidatos) {
      const hallado = buscar(c, i + 1);
      if (hallado) return hallado;
    }
    return null;
  };
  return buscar(APP, 0);
}

/** Todos los `page.tsx` bajo el panel. */
function todasLasPaginas(dir: string = APP): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) salida.push(...todasLasPaginas(ruta));
    else if (e.name === 'page.tsx') salida.push(ruta);
  }
  return salida;
}

/** Los `module="…"` de los `PageGuard` de un archivo, en orden. */
function modulosDelGuard(archivo: string): string[] {
  const fuente = readFileSync(archivo, 'utf8');
  const modulos: string[] = [];
  for (const [, atributos] of fuente.matchAll(/<PageGuard\b([^>]*)>/g)) {
    const m = /\bmodule="([^"]+)"/.exec(atributos);
    if (m) modulos.push(m[1]!);
  }
  return modulos;
}

const modulos = modulosDelPanel();
const pantallas = modulos.flatMap((m) => pestanasDelModulo(m));

describe('gates del panel — el módulo existe', () => {
  it.each(
    pantallas
      .filter((p) => p.module !== null)
      .map((p) => [p.href, p.module!] as const),
  )('la fila %s declara un módulo real (%s)', (_href, module) => {
    expect(moduloConocido(module)).toBe(true);
  });

  it.each(
    todasLasPaginas().flatMap((archivo) =>
      modulosDelGuard(archivo).map((m) => [archivo.replace(APP, ''), m] as const),
    ),
  )('el PageGuard de %s usa un módulo real (%s)', (_archivo, module) => {
    if (MODULOS_ROTOS_CONOCIDOS.includes(module)) return;
    expect(moduloConocido(module)).toBe(true);
  });

  it('la lista de módulos rotos no crece sola', () => {
    const rotosEnUso = new Set(
      todasLasPaginas()
        .flatMap(modulosDelGuard)
        .filter((m) => !moduloConocido(m)),
    );
    expect([...rotosEnUso].sort()).toEqual([...MODULOS_ROTOS_CONOCIDOS].sort());
  });
});

describe('gates del panel — el sidebar y la pantalla dicen lo mismo', () => {
  const conGuard = pantallas
    .map((p) => ({ p, archivo: paginaDe(p.href) }))
    .filter(
      (x): x is { p: (typeof pantallas)[number]; archivo: string } =>
        x.archivo !== null && modulosDelGuard(x.archivo).length > 0,
    );

  it('hay pantallas con PageGuard para comparar', () => {
    expect(conGuard.length).toBeGreaterThan(5);
  });

  it.each(conGuard.map((x) => [x.p.href, x.p.module, x.archivo] as const))(
    '%s: el PageGuard coincide con el módulo del sidebar (%s)',
    (_href, module, archivo) => {
      // El primero es el que envuelve la página; los de adentro gatean pedazos.
      const [enLaPagina] = modulosDelGuard(archivo);
      if (module !== null) {
        expect(enLaPagina).toBe(module);
        return;
      }
      // Sin `module` la fila se filtra sólo por `roles`. Una pantalla que igual
      // pide un módulo tiene que venir con esa lista de roles acotada: si no,
      // la fila se le muestra a los cuatro y el módulo abre para algunos
      // (`/contabilidad` la tiene: sólo ADMIN y CONTADOR, que sí tienen
      // `reportes`). Cuál rol tiene qué módulo lo sabe el back, no este repo.
      const fila = pantallas.find((p) => p.href === _href);
      expect(
        (fila?.roles ?? []).length,
        `${_href} no declara módulo NI roles en el sidebar, pero su PageGuard ` +
          `pide "${enLaPagina}": el rol que no lo tenga ve la fila y es expulsado`,
      ).toBeGreaterThan(0);
    },
  );
});

describe('gates del panel — lo que se muestra a todos se abre para todos', () => {
  /** Filas sin `module` y sin `roles`: el sidebar se las muestra a los 4 roles. */
  const paraTodos = ARQUITECTURA_DEL_PANEL.flatMap((g) => g.modulos)
    .flatMap((m) => pestanasDelModulo(m))
    .filter((p) => p.module === null && (p.roles ?? []).length === 0);

  it.each(paraTodos.map((p) => [p.href] as const))(
    '%s no está detrás de un AgencyRoleGuard de managers',
    (href) => {
      const archivo = paginaDe(href);
      if (!archivo) return;
      const fuente = readFileSync(archivo, 'utf8');
      expect(
        /<AgencyRoleGuard[^>]*allowed="managers"/.test(fuente),
        `${href} se muestra a los 4 roles pero sólo abre para managers: declará ` +
          `roles: [ADMIN, AGENTE] en arquitectura-del-panel.ts o aflojá el guard`,
      ).toBe(false);
    },
  );

  it('Mensajes declara los roles que efectivamente lo abren', () => {
    const mensajes = pantallas.find((p) => p.href === `${PANEL}/mensajes`);
    expect(mensajes?.roles).toEqual([AGENCY_ROLES.ADMIN, AGENCY_ROLES.AGENTE]);
  });
});
