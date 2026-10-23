import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// T-0173 WU-6: standalone controls that the responsive suite measured under
// 44 px. Each one must opt into a touch-only target (`[@media(pointer:coarse)]`
// min size, or the `hit-area-44` ::after) so the desktop look does not change.
// jsdom has no layout, so this pins the contract at the source: every
// occurrence of the anchor has a coarse-pointer rule within its element.
const SITES: Array<[file: string, anchor: string]> = [
  ['src/components/estado/PaginaNoEncontrada.tsx', 'data-testid="no-encontrada-volver"'],
  ['src/components/ui/aspa-de-cierre.ts', "'inline-flex size-9 shrink-0"],
  ['src/components/auth/AuthInput.tsx', 'absolute right-3.5 top-1/2'],
  ['src/components/auth/AuthForm.tsx', "handleModeSwitch('forgot-password')}\n                      className"],
  ['src/components/brand/BrandHomeLink.tsx', '<Link href={getUserHomeRoute'],
  ['src/app/auth/page.tsx', 'href="/" className="relative hit-area-44 inline-flex items-center"'],
  ['src/components/estado-de-cuenta/PantallaDelEstadoDeCuenta.tsx', 'data-testid="estado-volver"'],
  ['src/app/inquilino/para-ti/page.tsx', 'href="/inquilino"'],
  ['src/components/tenant/CatalogoPorAprobacion.tsx', 'text-sm text-fg-muted hover:text-fg mb-6'],
  ['src/app/inquilino/page.tsx', 'href="/ayuda"'],
  ['src/components/tenant/TenantDashboardEmpty.tsx', 'href="/ayuda"'],
  ['src/app/inquilino/casos/page.tsx', 'href="/inquilino/notificaciones"'],
  ['src/components/agentes/BotonDelEquipo.tsx', 'data-testid="boton-del-equipo"'],
  ['src/components/beta/llegada/CajaDeLlegada.tsx', 'const boton = compacta'],
  ['src/components/messages/MessagesWidget.tsx', 'data-testid="abrir-nuevo-mensaje"'],
  ['src/components/messages/MessagesWidget.tsx', 'className="h-9 rounded-md bg-surface-muted pl-9'],
  ['src/components/property/AISearchInput.tsx', 'aria-label="Búsqueda inteligente de propiedades"'],
  ['src/components/notificaciones/FilaDelAviso.tsx', 'flex h-7 w-7 items-center justify-center rounded-sm text-fg-subtle'],
  ['src/app/inquilino/notificaciones/page.tsx', "'relative isolate flex items-center gap-2 px-4 py-2 rounded-full"],
  ['src/app/inquilino/notificaciones/page.tsx', "router.push('/inquilino/configuracion')"],
  ['src/app/panel/(landlord)/notificaciones/page.tsx', 'className="whitespace-nowrap '],
  ['src/app/panel/(landlord)/notificaciones/page.tsx', "router.push('/panel/configuracion/notificaciones')"],
  ['src/app/inquilino/perfil/page.tsx', 'absolute top-3 right-3 p-2 bg-surface/20'],
  ['src/app/panel/(landlord)/perfil/page.tsx', 'absolute top-3 right-3 bg-white/20'],
  ['src/app/panel/inmobiliaria/perfil/page.tsx', 'absolute top-3 right-3 bg-card/70'],
  ['src/components/property/PropertySearchView.tsx', 'className="whitespace-nowrap '],
  // WU-8: agency one-offs, links and back buttons
  ['src/app/panel/inmobiliaria/pagos/recaudo/page.tsx', "className=\"text-sm underline text-fg"],
  ['src/app/panel/inmobiliaria/pagos/recaudo/autopago/page.tsx', "href=\"/panel/inmobiliaria/pagos/recaudo\">"],
  ['src/app/panel/inmobiliaria/pagos/recaudo/aseguradoras/page.tsx', "href=\"/panel/inmobiliaria/pagos/recaudo\">"],
  ['src/app/panel/inmobiliaria/pagos/recaudo/estudios/page.tsx', "href=\"/panel/inmobiliaria/pagos/recaudo\">"],
  ['src/app/panel/inmobiliaria/pagos/cartera/juridico/page.tsx', "href=\"/panel/inmobiliaria/pagos/cartera\">"],
  ['src/app/panel/inmobiliaria/pagos/cobranza/configuracion/page.tsx', "Volver a Acuerdos de pago"],
  ['src/components/inmobiliaria/cobranza/AcuerdoGeneralForm.tsx', "Volver a Acuerdos de pago"],
  ['src/app/panel/inmobiliaria/pagos/cobranza/acuerdos/generales/[acuerdoId]/page.tsx', "Volver a Acuerdos de pago"],
  ['src/components/inmobiliaria/ai/VolverALaLista.tsx', "<BackButton"],
  ['src/app/panel/inmobiliaria/inmuebles/[id]/page.tsx', "<BackButton"],
  ['src/app/panel/inmobiliaria/inmuebles/importar/page.tsx', "<BackButton"],
  ['src/app/panel/inmobiliaria/inmuebles/nuevo/page.tsx', "<BackButton"],
  ['src/components/contratos/BandejaDeCartasDelIncremento.tsx', "data-testid=\"abrir-cola-de-cartas\""],
  ['src/components/contratos/BandejaDeCartasDelIncremento.tsx', "#{carta.externalId"],
  ['src/app/panel/inmobiliaria/reportes/resumen/page.tsx', "{t('inmobiliaria.common.viewAll"],
  ['src/app/panel/inmobiliaria/reportes/resumen/page.tsx', "viewFullReports"],
  // WU-8: filter pills, inputs and calendar controls
  ['src/components/inmobiliaria/mantenimiento/InboxFilters.tsx', "'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors"],
  ['src/components/cartera/CobroJuridico.tsx', "rounded-md border border-border bg-surface p-"],
  ['src/components/inmobiliaria/PipelineFilters.tsx', "className=\"w-40"],
  ['src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx', "aria-label=\"Mes anterior\""],
  ['src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx', "aria-label=\"Mes siguiente\""],
  ['src/app/panel/inmobiliaria/agenda/page.tsx', "aria-label=\"Semana anterior\""],
  ['src/app/panel/inmobiliaria/agenda/page.tsx', "aria-label=\"Semana siguiente\""],
  ['src/app/panel/inmobiliaria/agenda/page.tsx', "relative h-auto rounded-md px-3 py-1.5"],
  ['src/components/contabilidad/reportes/BalanceDePrueba.tsx', "htmlFor=\"balance-solo-con-movimiento\""],
  // WU-8: <summary> toggles
  ['src/components/inmobiliaria/piloto/mando/tendencias.tsx', "<summary className="],
  ['src/components/contratos/EscenarioTributario.tsx', "<summary className=\""],
  ['src/components/cobros/extracto-bancario/CierreDelMes.tsx', "<summary className=\""],
  ['src/components/cobros/extracto-bancario/LoQueProponeElAgente.tsx', "<summary className=\""],
  ['src/components/cobros/extracto-bancario/RelacionDeAseguradora.tsx', "<summary className=\""],
  ['src/components/inmobiliaria/cobranza/CobranzaImportCard.tsx', "<summary className=\""],
];

describe('standalone controls opt into a 44 px touch target', () => {
  for (const [file, anchor] of SITES) {
    it(`${file} :: ${anchor.slice(0, 48).replace(/\n\s*/g, ' ')}`, () => {
      const src = readFileSync(join(process.cwd(), file), 'utf8').replace(/\r\n/g, '\n');
      let from = 0;
      let found = 0;
      for (;;) {
        const i = src.indexOf(anchor, from);
        if (i === -1) break;
        found++;
        const around = src.slice(Math.max(0, i - 350), i + anchor.length + 350);
        expect(around, `occurrence ${found}`).toMatch(/pointer:coarse|hit-area-44/);
        from = i + anchor.length;
      }
      expect(found, 'anchor not found').toBeGreaterThan(0);
    });
  }
});

// T-0173 WU-8: cadence segmented controls are 26-32 px and cadence is not
// editable from front, so globals.css gives them a coarse-pointer 44 px floor.
describe('cadence segmented controls get a coarse-pointer 44 px floor', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8').replace(/\r\n/g, '\n');
  const block = (selector: string) => {
    const at = css.indexOf(selector);
    expect(at, `${selector} missing in globals.css`).toBeGreaterThan(-1);
    const open = css.lastIndexOf('@media (pointer: coarse)', at);
    expect(open, `${selector} is not inside a coarse-pointer block`).toBeGreaterThan(-1);
    // no closing of the media block between the at-rule and the selector
    expect(css.slice(open, at)).not.toMatch(/\n  \}\n/);
    expect(css.slice(at, css.indexOf('}', at))).toMatch(/min-height:\s*44px/);
  };
  it('SegmentedControl radio buttons (no Radix data-state)', () => {
    block('button[role="radio"][aria-checked]:not([data-state])');
  });
  it('TabsList variant=segmented triggers', () => {
    block('[role="tab"][data-variant="segmented"]');
  });
});
