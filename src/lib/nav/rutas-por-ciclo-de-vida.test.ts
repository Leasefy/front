/**
 * La tabla de redirecciones de la arquitectura por ciclo de vida.
 *
 * Cada URL de la arquitectura anterior (38 entradas, 7 grupos, `/ai/*`) tiene
 * que llegar a su pantalla nueva sin 404 y sin cadenas: un enlace guardado, un
 * correo viejo, el histórico de analítica y los enlaces que manda el micro
 * siguen abriendo lo mismo.
 */

import { describe, it, expect } from 'vitest';

import { RUTAS_POR_CICLO_DE_VIDA } from './rutas-por-ciclo-de-vida';
import { RUTAS_UNIFICADAS_DEL_PANEL } from './rutas-unificadas-del-panel';
import { CONCILIACION_EN_UN_SOLO_LUGAR } from './conciliacion-en-un-solo-lugar';
import { modulosDelPanel, pestanasDelModulo, PANEL } from './arquitectura-del-panel';

const P = PANEL;

/** Resuelve una URL contra la tabla como lo haría Next: primera regla que calce. */
function resolver(url: string, tabla = RUTAS_POR_CICLO_DE_VIDA): string | null {
  for (const r of tabla) {
    const comodin = r.source.endsWith('/:path*');
    const base = comodin ? r.source.slice(0, -'/:path*'.length) : r.source;
    if (url === base) return comodin ? r.destination.replace('/:path*', '') : r.destination;
    if (comodin && url.startsWith(`${base}/`)) {
      return r.destination.replace('/:path*', url.slice(base.length));
    }
  }
  return null;
}

describe('rutas por ciclo de vida — la tabla', () => {
  it('todas son temporales (307, reversibles) y absolutas al panel', () => {
    // Mismo criterio que `rutas-unificadas-del-panel`: un 301 lo cachea el
    // navegador para siempre y nadie podría volver a probar la ruta vieja si
    // se revierte. Se sube a permanente cuando la arquitectura quede validada.
    for (const r of RUTAS_POR_CICLO_DE_VIDA) {
      expect(r.permanent).toBe(false);
      expect(r.source.startsWith(`${P}/`)).toBe(true);
      expect(r.destination.startsWith(`${P}/`)).toBe(true);
    }
  });

  it('ninguna fuente se repite', () => {
    const fuentes = RUTAS_POR_CICLO_DE_VIDA.map((r) => r.source);
    expect(new Set(fuentes).size).toBe(fuentes.length);
  });

  it('ningún destino es a su vez una fuente (sin cadenas de dos saltos)', () => {
    for (const r of RUTAS_POR_CICLO_DE_VIDA) {
      const d = r.destination.replace('/:path*', '');
      expect(resolver(d), `${d} volvería a redirigir`).toBeNull();
    }
  });

  it('ningún destino de las tablas viejas cae en una fuente nueva (sin cadenas)', () => {
    for (const r of [...RUTAS_UNIFICADAS_DEL_PANEL, ...CONCILIACION_EN_UN_SOLO_LUGAR]) {
      const d = r.destination.replace('/:path*', '');
      expect(resolver(d), `${r.source} → ${d} volvería a redirigir`).toBeNull();
    }
  });

  it('todo destino es una pantalla declarada en la arquitectura o cuelga de una', () => {
    const declaradas = modulosDelPanel().flatMap((m) => pestanasDelModulo(m)).map((p) => p.href);
    for (const r of RUTAS_POR_CICLO_DE_VIDA) {
      const d = r.destination.replace('/:path*', '');
      const ok = declaradas.some((h) => d === h || d.startsWith(`${h}/`));
      expect(ok, `${d} no es (ni cuelga de) una pantalla declarada`).toBe(true);
    }
  });

  it('la exacta de Tesorería va DESPUÉS de sus hijas (Next aplica la primera que calza)', () => {
    const idx = (s: string) => RUTAS_POR_CICLO_DE_VIDA.findIndex((r) => r.source === s);
    expect(idx(`${P}/tesoreria/ap/:path*`)).toBeLessThan(idx(`${P}/tesoreria`));
    expect(idx(`${P}/tesoreria/facturas/nueva`)).toBeLessThan(idx(`${P}/tesoreria`));
    expect(idx(`${P}/ai/mantenimiento/tickets/:path*`)).toBeLessThan(idx(`${P}/ai/mantenimiento`));
    expect(idx(`${P}/ai/retencion/bandeja/:path*`)).toBeLessThan(idx(`${P}/ai/retencion`));
  });
});

describe('rutas por ciclo de vida — las 38 entradas de ayer', () => {
  const casos: Array<[string, string]> = [
    // Comercial
    [`${P}/ai/avaluos`, `${P}/inmuebles/avaluos`],
    [`${P}/ai/avaluos/cola`, `${P}/inmuebles/avaluos/cola`],
    [`${P}/ai/estudio`, `${P}/postulaciones/estudio`],
    [`${P}/ai/estudio/abc`, `${P}/postulaciones/estudio/abc`],
    [`${P}/ai/asegurabilidad/aseguradoras/x/sla`, `${P}/postulaciones/asegurabilidad/aseguradoras/x/sla`],
    [`${P}/ai/cotizador/cola`, `${P}/postulaciones/asegurabilidad/cola`],
    [`${P}/ai/matching/cola`, `${P}/postulaciones/matching/cola`],
    // Administración
    [`${P}/renovaciones`, `${P}/contratos/renovaciones`],
    [`${P}/operaciones`, `${P}/mantenimientos`],
    [`${P}/pqrs`, `${P}/solicitudes`],
    [`${P}/documentos/revision`, `${P}/postulaciones/soportes`],
    // Finanzas
    [`${P}/ai/cobranza`, `${P}/cobros/cobranza`],
    [`${P}/ai/cobranza/deudores/9`, `${P}/cobros/cobranza/deudores/9`],
    [`${P}/cartera`, `${P}/cobros/cartera`],
    [`${P}/recaudo`, `${P}/cobros/recaudo`],
    [`${P}/ai/conciliacion/movimientos`, `${P}/conciliacion/movimientos`],
    [`${P}/ai/pagos`, `${P}/pagos`],
    [`${P}/ai/pagos/cola`, `${P}/pagos/cola`],
    [`${P}/dispersiones/lotes/5`, `${P}/pagos/dispersiones/lotes/5`],
    [`${P}/tesoreria`, `${P}/pagos/liquidaciones`],
    [`${P}/tesoreria/ap/7`, `${P}/pagos/cxp/7`],
    [`${P}/tesoreria/facturas/nueva`, `${P}/pagos/cxp/nueva`],
    // General
    [`${P}/dashboard`, `${P}/reportes/resumen`],
    [`${P}/analytics`, `${P}/reportes/ia`],
    [`${P}/agentes`, `${P}/configuracion/equipo`],
    [`${P}/agentes/3`, `${P}/configuracion/equipo/3`],
    [`${P}/ai/aprendizaje`, `${P}/configuracion/ia`],
    [`${P}/ai`, `${P}/configuracion/agentes`],
    // Mantenimiento · Retención
    [`${P}/ai/mantenimiento`, `${P}/mantenimientos/tickets/resumen`],
    [`${P}/ai/mantenimiento/tickets`, `${P}/mantenimientos/tickets`],
    [`${P}/ai/mantenimiento/tickets/t1`, `${P}/mantenimientos/tickets/t1`],
    [`${P}/ai/retencion`, `${P}/contratos/retencion`],
    [`${P}/ai/retencion/bandeja`, `${P}/contratos/riesgo`],
    [`${P}/ai/retencion/bandeja/c1`, `${P}/contratos/riesgo/c1`],
    [`${P}/ai/retencion/revisiones`, `${P}/contratos/aprobar`],
  ];

  it.each(casos)('%s → %s', (de, a) => {
    expect(resolver(de)).toBe(a);
  });

  it('lo que no cambió no se toca', () => {
    for (const quieta of ['/piloto', '', '/pipeline', '/inmuebles', '/postulaciones', '/contratos', '/mensajes', '/agenda', '/cobros', '/facturacion', '/contabilidad', '/propietarios', '/inquilinos', '/documentos', '/reportes', '/configuracion', '/cobros/reglas-de-mora', '/contratos/nuevo', '/contratos/riesgo', '/contratos/aprobar', '/contratos/retencion']) {
      expect(resolver(`${P}${quieta}`), quieta).toBeNull();
    }
  });
});
