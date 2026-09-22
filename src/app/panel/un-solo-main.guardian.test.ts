/**
 * 🔴 UN SOLO `<main>` POR PÁGINA.
 *
 * `src/app/panel/inmobiliaria/layout.tsx` ya envuelve todo en un `<main>` —el
 * que recibe el foco cuando alguien usa «Saltar al contenido principal»—, así
 * que una página que además abre el suyo deja DOS landmarks `main` en el mismo
 * documento.
 *
 * Qué cuesta, medido en `/pagos/cobranza/llamadas`: un lector de pantalla
 * anuncia dos «principal» y el enlace de salto lleva al de afuera, que empieza
 * en la barra de navegación — así que saltar al contenido no salta nada.
 *
 * Además, casi siempre el `<main>` de adentro venía con su PROPIO tope de
 * ancho (`max-w-7xl`, 1.280 px) encima del tope del panel (1.920): la misma
 * pantalla a medio usar que Nico vio en Generar dispersión el 22-09 («¿por qué
 * no utilizas todo el ancho? ¡para eso lo tienes!»). Los nueve que tenían las
 * dos cosas se arreglaron ese día.
 *
 * 🔴 Los que quedan están DECLARADOS abajo: son de Postulaciones y Estudio, que
 * todavía no pasaron por el molde. La lista no dice «está bien», dice «ya
 * estaba». Lo que esta prueba impide es que aparezca uno nuevo.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PANEL = 'src/app/panel';
const LAYOUT = 'src/app/panel/inmobiliaria/layout.tsx';

function conMain(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) conMain(p, out);
    else if (
      /\.tsx$/.test(p) &&
      !/\.test\.tsx$/.test(p) &&
      p !== LAYOUT &&
      readFileSync(p, 'utf8').includes('<main')
    ) {
      out.push(p);
    }
  }
  return out.sort();
}

/** Los que ya tenían su propio `<main>` el 22-09-2026. */
const DECLARADOS: readonly string[] = [
  'src/app/panel/(landlord)/layout.tsx',
  'src/app/panel/inmobiliaria/avaluos/nuevo/page.tsx',
  'src/app/panel/inmobiliaria/contratos/(retencion)/aprobar/RevisionesClient.tsx',
  'src/app/panel/inmobiliaria/contratos/(retencion)/retencion/page.tsx',
  'src/app/panel/inmobiliaria/contratos/(retencion)/riesgo/[caseId]/CasoDetailClient.tsx',
  'src/app/panel/inmobiliaria/contratos/(retencion)/riesgo/BandejaClient.tsx',
  'src/app/panel/inmobiliaria/mantenimientos/tickets/[ticketId]/page.tsx',
  'src/app/panel/inmobiliaria/mantenimientos/tickets/resumen/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/acuerdos/generales/[acuerdoId]/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/acuerdos/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/analitica/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/configuracion/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/deudores/DeudoresListClient.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/disputas/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/equipo/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/escalaciones/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/inbox/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/llamadas/[callId]/CallDetailClient.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/pagos/[paymentId]/PaymentDetailClient.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/pendientes/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/plantillas/[id]/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/plantillas/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/promesas/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/reporte/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/reportes-propietarios/page.tsx',
  'src/app/panel/inmobiliaria/pagos/cobranza/resultados/page.tsx',
  'src/app/panel/inmobiliaria/pagos/equipo/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/aseguradoras/[carrier]/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/aseguradoras/[carrier]/sla/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/aseguradoras/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/configuracion/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/costos/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/equipo/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/insights/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/estudio/equipo/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/estudio/nuevo/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/estudio/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/estudio/reglas/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/estudio/solicitud/page.tsx',
];

describe('🔴 el panel tiene un solo landmark principal', () => {
  it('ninguna página NUEVA abre su propio <main>', () => {
    const nuevos = conMain(PANEL).filter((p) => !DECLARADOS.includes(p));
    expect(
      nuevos,
      `El layout del panel ya pone el <main>. Estas páginas abren otro, así que\n` +
        `quedan dos landmarks «principal» y «Saltar al contenido» lleva al de\n` +
        `afuera. Usa un <div>.\n\n  ${nuevos.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('🔴 el que ya se arregló sale de la lista', () => {
    const hoy = new Set(conMain(PANEL));
    const yaArreglados = DECLARADOS.filter((p) => !hoy.has(p));
    expect(
      yaArreglados,
      `Estos ya no abren su propio <main>: sácalos de DECLARADOS.\n\n  ${yaArreglados.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('el layout SÍ pone el suyo, y uno solo', () => {
    const texto = readFileSync(LAYOUT, 'utf8');
    expect(texto.match(/<main/g) ?? []).toHaveLength(1);
  });
});
