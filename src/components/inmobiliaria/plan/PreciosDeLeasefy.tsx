'use client';

import { Stagger, StaggerItem } from '@leasefy/cadence';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { precioDelMes } from '@/lib/conversion/acceso';
import type { TarifasDeLeasefy } from '@/lib/api/tarifas.service';
import { cn } from '@/lib/utils';

const numero = (n: number) => n.toLocaleString('es-CO');
/** Puntos básicos a porcentaje en frase: 50 → «0,5 %», 800 → «8 %», 265 → «2,65 %». */
const porcentaje = (bps: number) => `${(bps / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;

export interface PrecioDeLeasefy {
  id: string;
  que: string;
  detalle: string;
  precio: string;
}

export interface GrupoDePrecios {
  id: string;
  rotulo: string;
  precios: PrecioDeLeasefy[];
}

/**
 * Lo que se cobra aparte del plan, sólo si se usa (MODELO-DE-NEGOCIO.md §0 y §3; Nico, 30-10-2026: «NECESITO QUE
 * REVISES MUY BIEN ESTO DEL MODELO DE NEGOCIO PORQUE ES LO QUE VAMOS A COBRAR»). Todo sale de `GET /config/tarifas`:
 * el front no escribe un precio a mano. Puro: se prueba solo.
 */
export function preciosDeLeasefy(t: TarifasDeLeasefy): GrupoDePrecios[] {
  const { tarifas } = t;
  const grupos: GrupoDePrecios[] = [];

  const recargas = [...tarifas.recargas].sort((a, b) => a.precio - b.precio);
  grupos.push({
    id: 'equipo',
    rotulo: 'Tu equipo',
    precios: [
      {
        id: 'usuario-adicional',
        que: 'Usuario adicional',
        detalle: `Una persona más con acceso, aparte de los ${numero(tarifas.plan.usuariosIncluidos)} que trae el plan. No trae preguntas al chat.`,
        precio: `${precioDelMes(tarifas.plan.usuarioAdicional)} al mes`,
      },
      ...(recargas.length > 0
        ? [
            {
              id: 'recargas',
              que: 'Recargas de preguntas al chat',
              detalle: `${recargas.map((r) => `${numero(r.preguntas)} por ${precioDelMes(r.precio)}`).join(' · ')}. Se suman a las del plan y duran ${numero(tarifas.recargaDuraMeses)} meses.`,
              precio: `Desde ${precioDelMes(recargas[0]!.precio)}`,
            },
          ]
        : []),
      {
        id: 'piloto',
        que: 'Piloto automático',
        detalle: `Los agentes hacen solos su trabajo, con el director que arma el plan del día. Pruébalo ${numero(tarifas.pilotoAutomatico.pruebaDias)} días gratis; al terminar vuelve a Copiloto y no se apaga nada.`,
        precio: `+ ${precioDelMes(tarifas.pilotoAutomatico.porInmueble)} por inmueble al mes`,
      },
    ],
  });

  const recaudoWompi = tarifas.recaudo.wompi;
  const giroWompi = tarifas.dispersion.wompi;
  grupos.push({
    id: 'plata',
    rotulo: 'Cobrar y pagar',
    precios: [
      {
        id: 'mori',
        que: 'Mori, la cobranza por llamada y WhatsApp',
        detalle: 'Sólo si recupera: si Mori no recupera, no pagas nada.',
        precio: `${porcentaje(tarifas.laura.exitoBps)} de lo recuperado`,
      },
      {
        id: 'recaudo',
        que: 'Recaudo en línea',
        detalle: `Cada arriendo que tus inquilinos pagan por Leasefy (PSE, tarjeta o Nequi)${recaudoWompi ? `, más lo que cobra Wompi: ${porcentaje(recaudoWompi.porcentajeBps)} + ${precioDelMes(recaudoWompi.fijo)} + IVA` : ''}.`,
        precio: `${porcentaje(tarifas.recaudo.spreadBps)} por pago`,
      },
      {
        id: 'giro',
        que: 'Giro al propietario',
        detalle: `Cada pago que Leasefy le hace al propietario${giroWompi ? `, más lo que cobra Wompi: ${precioDelMes(giroWompi.fijo)} + ${porcentaje(giroWompi.porcentajeBps)} + IVA` : ''}.`,
        precio: `${precioDelMes(tarifas.dispersion.porPago)} por giro`,
      },
    ],
  });

  const documentos: PrecioDeLeasefy[] = [];
  if (tarifas.firmas) {
    const f = tarifas.firmas;
    documentos.push({
      id: 'firmas',
      que: 'Firmas electrónicas',
      detalle: `Cualquier documento, hasta ${numero(f.firmantesPorDocumento)} firmantes. En paquetes: ${f.paquetes.map((p) => `${numero(p.firmas)} por ${precioDelMes(p.precio)}`).join(' · ')}. Tu cuenta trae ${numero(f.gratisAlCrearLaCuenta)} gratis.`,
      precio: `${precioDelMes(f.porDocumento)} por documento`,
    });
  }
  if (tarifas.facturacionElectronica) {
    const fe = tarifas.facturacionElectronica;
    const paquetes = [...fe.paquetes].sort((a, b) => a.precio - b.precio);
    documentos.push({
      id: 'facturacion',
      que: 'Facturación electrónica',
      detalle: `Cada factura, nota o documento soporte que va a la DIAN. Paquetes: ${paquetes.map((p) => `${numero(p.documentos)} por ${precioDelMes(p.precio)}`).join(' · ')}; duran ${numero(fe.duranMeses)} meses.`,
      precio: paquetes[0] ? `Desde ${precioDelMes(paquetes[0].precio)}` : '',
    });
  }
  if (documentos.length > 0) grupos.push({ id: 'documentos', rotulo: 'Documentos', precios: documentos });

  const captar: PrecioDeLeasefy[] = [
    {
      id: 'avaluo',
      que: 'Avalúo',
      detalle: 'La estimación comercial de valor de un inmueble, con su informe, para fijar el canon al captarlo.',
      precio: `${precioDelMes(tarifas.avaluo.precioConIva)} con IVA`,
    },
  ];
  if (tarifas.estudioDelInquilino) {
    captar.push({
      id: 'estudio',
      que: 'Estudio del inquilino',
      detalle: 'Lee sus documentos y dice hasta qué canon le arriendan.',
      precio: t.estudioDelInquilinoGratis === false ? `${precioDelMes(tarifas.estudioDelInquilino.precio)} cada uno` : 'Gratis por ahora',
    });
  }
  grupos.push({ id: 'captar', rotulo: 'Captar y arrendar', precios: captar });

  grupos.push({
    id: 'una-vez',
    rotulo: 'Una sola vez',
    precios: [
      {
        id: 'implementacion',
        que: 'Implementación con Leasefy',
        detalle: 'Migramos tus datos y capacitamos a tu equipo. Si la haces tú con las herramientas del panel, es gratis.',
        precio: precioDelMes(tarifas.implementacion.conLeasefy),
      },
    ],
  });
  return grupos;
}

/** «Lo que se cobra aparte»: cada cosa con su precio, por grupos, sólo si se usa. */
export function PreciosDeLeasefy({
  tarifas,
  error,
  onReintentar,
  className,
}: {
  tarifas: TarifasDeLeasefy | null;
  error: unknown;
  onReintentar: () => void;
  className?: string;
}) {
  const grupos = tarifas ? preciosDeLeasefy(tarifas) : [];
  // Dos columnas en escritorio, con los grupos repartidos por cuántas filas tienen (sin huecos).
  const mitad = Math.ceil(grupos.reduce((s, g) => s + g.precios.length, 0) / 2);
  const columnas: GrupoDePrecios[][] = [[], []];
  let enLaPrimera = 0;
  for (const g of grupos) {
    if (enLaPrimera < mitad) {
      columnas[0]!.push(g);
      enLaPrimera += g.precios.length;
    } else columnas[1]!.push(g);
  }

  return (
    <section id="precios" className={cn('scroll-mt-6 rounded-lg border border-border bg-surface p-6 sm:p-8', className)} data-testid="precios-de-leasefy">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">Aparte del plan</p>
      <h2 className="mt-3 text-h3 text-fg">Lo que se cobra sólo si lo usas</h2>
      <p className="mt-1 max-w-2xl text-sm text-fg-muted">Los precios son más IVA, salvo el avalúo, que ya lo incluye.</p>

      {error ? (
        <div className="mt-5">
          <FalloDeCarga error={error} queEs="los precios de Leasefy" onReintentar={onReintentar} />
        </div>
      ) : !tarifas ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2" aria-busy="true">
          <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ) : (
        <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-2">
          {columnas.map((col, i) => (
            <div key={i} className="space-y-6">
              {col.map((g) => (
                <div key={g.id} data-testid={`precios-${g.id}`}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{g.rotulo}</p>
                  <Stagger className="mt-2 divide-y divide-border-faint">
                    {g.precios.map((p) => (
                      <StaggerItem key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6" data-testid={`precio-${p.id}`}>
                        <div className="min-w-0">
                          <p className="text-body-sm text-fg">{p.que}</p>
                          <p className="mt-0.5 text-caption text-fg-muted">{p.detalle}</p>
                        </div>
                        <p className="shrink-0 font-mono text-body-sm tabular-nums text-fg sm:max-w-[13rem] sm:text-right">{p.precio}</p>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
