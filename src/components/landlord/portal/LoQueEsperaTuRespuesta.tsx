'use client';

/**
 * «Lo que espera tu respuesta» — el primer bloque del Inicio del propietario de
 * inmobiliaria (GLOW UP, 21-10-2026).
 *
 * El trabajo del propietario en su portal es corto: saber cuánto y cuándo le
 * giran, y decidir lo que la inmobiliaria le pregunta. Antes cada pregunta vivía
 * en su pantalla del menú y el Inicio sólo avisaba las reparaciones (SO-10): la
 * elección del inquilino, la revisión del canon, el sobrecosto de una reparación
 * y el giro que devolvió el banco había que ir a buscarlos. Ahora es UNA tarjeta
 * con una fila por cosa que espera, con su cifra y el botón que lleva a decidir;
 * sin nada pendiente no se pinta.
 *
 * Cada fuente se pide aparte: si una no responde, las demás igual se muestran
 * (nunca se afirma «no tienes nada» por una falla: esa fila simplemente no sale,
 * y su pantalla sigue en el menú).
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bank, Tag, UsersThree, Wrench } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import { eleccionesDeInquilinoApi } from '@/lib/api/elecciones-de-inquilino.service';
import { revisionesDelCanonApi } from '@/lib/api/revisiones-del-canon.service';
import { portalDelPropietarioApi } from '@/lib/api/portal-del-propietario.service';
import { formatCurrency } from '@/lib/format';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';

export interface Pendiente {
  id: string;
  href: string;
  icono: ReactNode;
  titulo: string;
  detalle: string;
  accion: string;
  testid: string;
}

const ICONO = 'mt-0.5 h-5 w-5 shrink-0 text-warning';

/** Lo que espera al propietario, en el orden en que más le cuesta no hacerlo. */
export function usePendientesDelPropietario(): Pendiente[] {
  const [giro, setGiro] = useState<Pendiente[]>([]);
  const [reparaciones, setReparaciones] = useState<Pendiente[]>([]);
  const [sobrecostos, setSobrecostos] = useState<Pendiente[]>([]);
  const [elecciones, setElecciones] = useState<Pendiente[]>([]);
  const [canon, setCanon] = useState<Pendiente[]>([]);

  useEffect(() => {
    let vivo = true;
    const si = (f: (p: Pendiente[]) => void) => (p: Pendiente[]) => {
      if (vivo) f(p);
    };

    portalDelPropietarioApi
      .cuentaDeGiro()
      .then((r) =>
        (Array.isArray(r?.fichas) ? r.fichas : [])
          .filter((f) => f.giroDevuelto)
          .map<Pendiente>((f) => ({
            id: `giro-${f.propietarioId}`,
            href: '/panel/giros',
            icono: <Bank className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />,
            titulo: `El banco devolvió tu giro de ${formatCurrency(f.giroDevuelto!.valorCop)}`,
            detalle: `${f.giroDevuelto!.motivo}${f.giroDevuelto!.fecha ? ` (${fechaLarga(f.giroDevuelto!.fecha)})` : ''}. La plata está guardada: te la giramos apenas cambies la cuenta.`,
            accion: f.cambioEnCurso ? 'Ver el cambio' : 'Cambiar mi cuenta',
            testid: 'pendiente-giro-devuelto',
          })),
      )
      .then(si(setGiro))
      .catch(() => undefined);

    aprobacionesDeReparacionApi
      .delPortal()
      .then((r) => {
        const pendientes = Array.isArray(r?.pendientes) ? r.pendientes : [];
        if (pendientes.length === 0) return [];
        const total = pendientes.reduce((suma, a) => suma + (a.valorCop ?? 0), 0);
        const n = pendientes.length;
        return [
          {
            id: 'reparaciones',
            href: '/panel/aprobaciones',
            icono: <Wrench className={ICONO} aria-hidden="true" />,
            titulo:
              n === 1
                ? `Tienes una reparación por aprobar (${formatCurrency(total)})`
                : `Tienes ${n} reparaciones por aprobar (${formatCurrency(total)})`,
            detalle: `${n === 1 && pendientes[0]?.reparacion?.titulo ? `«${pendientes[0].reparacion.titulo}». ` : ''}Si la apruebas, se descuenta de tu próximo giro.`,
            accion: n === 1 ? 'Revisarla' : 'Revisarlas',
            testid: 'reparaciones-por-aprobar',
          },
        ];
      })
      .then(si(setReparaciones))
      .catch(() => undefined);

    portalDelPropietarioApi
      .sobrecostos()
      .then((r) => {
        const pendientes = r?.disponible && Array.isArray(r.pendientes) ? r.pendientes : [];
        if (pendientes.length === 0) return [];
        const total = pendientes.reduce((suma, s) => suma + (s.diferenciaCop ?? 0), 0);
        const n = pendientes.length;
        return [
          {
            id: 'sobrecostos',
            href: '/panel/aprobaciones',
            icono: <Wrench className={ICONO} aria-hidden="true" />,
            titulo:
              n === 1
                ? `Una reparación costó más de lo aprobado (${formatCurrency(total)} de más)`
                : `${n} reparaciones costaron más de lo aprobado (${formatCurrency(total)} de más)`,
            detalle: 'La diferencia no se descuenta hasta que la apruebes.',
            accion: 'Decidir',
            testid: 'pendiente-sobrecostos',
          },
        ];
      })
      .then(si(setSobrecostos))
      .catch(() => undefined);

    eleccionesDeInquilinoApi
      .delPortal()
      .then((r) => {
        const pendientes = Array.isArray(r?.pendientes) ? r.pendientes : [];
        if (pendientes.length === 0) return [];
        const n = pendientes.length;
        const candidatos = pendientes.reduce((suma, e) => suma + (e.candidatos?.length ?? 0), 0);
        return [
          {
            id: 'elecciones',
            href: '/panel/escoger-inquilino',
            icono: <UsersThree className={ICONO} aria-hidden="true" />,
            titulo: n === 1 ? `Escoge el inquilino de ${pendientes[0].inmueble}` : `Escoge el inquilino de ${n} inmuebles`,
            detalle:
              candidatos === 1
                ? 'Hay un candidato esperando tu decisión.'
                : `Hay ${candidatos} candidatos esperando tu decisión.`,
            accion: 'Ver candidatos',
            testid: 'pendiente-escoger-inquilino',
          },
        ];
      })
      .then(si(setElecciones))
      .catch(() => undefined);

    revisionesDelCanonApi
      .delPortal()
      .then((r) => {
        const pendientes = Array.isArray(r?.pendientes) ? r.pendientes : [];
        if (pendientes.length === 0) return [];
        const n = pendientes.length;
        const primero = pendientes[0];
        return [
          {
            id: 'canon',
            href: '/panel/revisar-canon',
            icono: <Tag className={ICONO} aria-hidden="true" />,
            titulo: n === 1 ? `Revisa el canon de ${primero.inmueble}` : `Revisa el canon de ${n} inmuebles`,
            detalle:
              n === 1
                ? `Lleva ${primero.diasVacante} días desocupado: van ${formatCurrency(primero.costoDeLaVacanciaCop)} que no recibes.`
                : 'Están desocupados: tu inmobiliaria te pregunta si mantener o bajar el canon.',
            accion: n === 1 ? 'Revisarlo' : 'Revisarlos',
            testid: 'pendiente-revisar-canon',
          },
        ];
      })
      .then(si(setCanon))
      .catch(() => undefined);

    return () => {
      vivo = false;
    };
  }, []);

  return [...giro, ...reparaciones, ...sobrecostos, ...elecciones, ...canon];
}

export function LoQueEsperaTuRespuesta({ pendientes }: { pendientes: Pendiente[] }) {
  const n = pendientes.length;
  return (
    <Presence show={n > 0}>
      <section
        className="overflow-hidden rounded-lg border border-border bg-surface"
        aria-labelledby="lo-que-espera-titulo"
        data-testid="lo-que-espera-tu-respuesta"
      >
        <div className="flex items-baseline gap-2 border-b border-border-faint px-5 py-3.5">
          <h2 id="lo-que-espera-titulo" className="text-body font-medium text-fg">
            Lo que espera tu respuesta
          </h2>
          <span className="font-mono text-caption tabular-nums text-fg-muted">{n}</span>
        </div>
        <ul className="divide-y divide-border-faint">
          {pendientes.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                data-testid={p.testid}
                className="group flex flex-wrap items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
              >
                {p.icono}
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="block text-body-sm font-medium text-fg">{p.titulo}</span>
                  <span className="block text-body-sm text-fg-muted">{p.detalle}</span>
                </span>
                <Button asChild variant="outline" size="sm" hideArrow className="max-sm:w-full">
                  <span>{p.accion}</span>
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Presence>
  );
}
