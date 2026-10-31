'use client';

import Link from 'next/link';
import { CheckCircle, Lightning, PhoneCall, Robot, ChatCircleDots, Wrench } from '@phosphor-icons/react';
import { Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { ConMonedaDeReferencia, SelectorDeMoneda, useMonedaDeReferencia } from '@/components/precios/MonedaDeReferencia';
import type { TarifasDeLeasefy } from '@/lib/api/tarifas.service';

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const pct = (bps: number) => `${(bps / 100).toLocaleString('es-CO')} %`;

/**
 * El plan de Leasefy por inmueble (MODELO-DE-NEGOCIO.md §0 y §3; Nico, 27-10-2026). Un solo plan: $2.100 por inmueble
 * gestionado al mes, mínimo $99.000, con 2 usuarios y 50 preguntas al chat; lo demás, a la medida de cada inmobiliaria.
 * Los números salen de `GET /config/tarifas` (la misma fuente del cobro): nada escrito a mano aquí.
 *
 * Se cobra en COP; se pueden VER en USD, EUR, MXN y CLP como referencia con la tasa del día (Nico, 31-10-2026). El
 * HTML del servidor sale en pesos: la otra moneda la pinta el navegador cuando la persona la elige.
 */
export function PlanPorInmueble({ datos }: { datos: TarifasDeLeasefy }) {
  return (
    <ConMonedaDeReferencia>
      <ElPlan datos={datos} />
    </ConMonedaDeReferencia>
  );
}

function ElPlan({ datos }: { datos: TarifasDeLeasefy }) {
  const t = datos.tarifas;
  const { moneda, formato } = useMonedaDeReferencia();
  // En pesos, el formato de siempre de esta página («$2.100»); en otra moneda, la referencia («≈ 0,53 USD»).
  const plata = moneda === 'COP' ? pesos : formato;
  const adicionales = [
    { icono: Robot, titulo: 'Piloto automático', texto: `${plata(t.pilotoAutomatico.porInmueble)} más por inmueble al mes. Los agentes trabajan solos y el director planea el día. Prueba de ${t.pilotoAutomatico.pruebaDias} días.` },
    { icono: PhoneCall, titulo: 'Mori, cobranza por voz y WhatsApp', texto: `Sólo éxito: el ${pct(t.laura.exitoBps)} de lo que recupera por su link. Si no recupera, no pagas.` },
    { icono: ChatCircleDots, titulo: 'Más preguntas al chat', texto: `Recargas de ${t.recargas.map((r) => `${r.preguntas} por ${plata(r.precio)}`).join(', ')}. Duran ${t.recargaDuraMeses} meses.` },
    { icono: Lightning, titulo: 'Recaudo en línea', texto: `${plata(t.recaudo.porPago)} + IVA por cada arriendo que se paga por Leasefy, descontado del mismo pago.` },
    { icono: Wrench, titulo: 'Implementación', texto: `Gratis si la haces tú con las herramientas de Leasefy; ${plata(t.implementacion.conLeasefy)} una vez si migramos tus datos y capacitamos a tu equipo.` },
  ];
  return (
    <div data-testid="plan-por-inmueble">
      <SelectorDeMoneda className="mb-5" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-primary/30 bg-surface p-7 ring-1 ring-primary/15 sm:p-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary">Un solo plan, todo Leasefy</p>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-[52px] font-[420] leading-none tracking-[-0.03em] text-fg tabular-nums" data-testid="precio-por-inmueble">
              {pesos(t.plan.porInmueble)}
            </span>
            <span className="text-[15px] text-fg-muted">por inmueble al mes</span>
          </p>
          <Presence show={moneda !== 'COP'}>
            <p className="mt-1 font-mono text-body-sm tabular-nums text-fg-muted" data-testid="precio-por-inmueble-en-otra-moneda">
              {formato(t.plan.porInmueble)} por inmueble al mes
            </p>
          </Presence>
          <p className="mt-2 text-sm text-fg-muted">
            Mínimo {plata(t.plan.minimoMensual)} al mes, más IVA. Pagas por los inmuebles activos que administras (los
            borradores no), no por módulos.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'Contratos, recaudo, cartera, facturación electrónica y contabilidad',
              'Todos los agentes en modo copiloto',
              `${t.plan.usuariosIncluidos} usuarios incluidos (${plata(t.plan.usuarioAdicional)} al mes cada uno de más)`,
              `${t.plan.preguntasIncluidas} preguntas al chat al mes para todo tu equipo`,
              'Marketplace y Arrendamientos, gratis siempre',
            ].map((x) => (
              <li key={x} className="flex items-start gap-2.5 text-sm text-fg">
                <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-7 h-12 rounded-full px-7 text-[15px]">
            <Link href="/publica?perfil=agency">Empieza gratis</Link>
          </Button>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-7 sm:p-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">Cuánto pagarías</p>
          <ul className="mt-5 divide-y divide-border">
            {datos.ejemplos.map((e) => (
              <li key={e.inmuebles} className="flex items-baseline justify-between gap-4 py-3.5">
                <span className="text-sm text-fg">{e.inmuebles.toLocaleString('es-CO')} inmuebles</span>
                <span className="text-[17px] font-medium text-fg tabular-nums">{plata(e.total)} <span className="text-sm font-normal text-fg-muted">al mes</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-caption text-fg-subtle">Con 2 usuarios, más IVA. El software en la nube puede estar excluido de IVA.</p>
        </section>
      </div>
      <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {adicionales.map(({ icono: Icono, titulo, texto }) => (
          <StaggerItem key={titulo} className="rounded-xl border border-border bg-surface p-5">
            <Icono size={22} weight="duotone" className="text-primary" aria-hidden="true" />
            <p className="mt-3 text-[15px] font-medium text-fg">{titulo}</p>
            <p className="mt-1.5 text-sm text-fg-muted">{texto}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
