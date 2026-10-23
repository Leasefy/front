'use client';

/**
 * SO-27 (PQRS-FIX, 04-10-2026): las solicitudes del PROPIETARIO en su portal.
 *
 * Hasta hoy la página existía pero leía una ruta vieja del micro y decía
 * «Próximamente», y el menú no la mostraba: el propietario no tenía dónde
 * radicar una PQRS ni reportar un daño. Ahora usa las MISMAS rutas que el
 * inquilino (`GET /pqrs/mine`, `POST /pqrs`) con SUS inmuebles, y el MISMO modal.
 */
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { EmptyState } from '@/components/ui/empty-state';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChatCircleText, Plus } from '@phosphor-icons/react';
import { StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { NuevaSolicitudModal } from '@/components/tenant/NuevaSolicitudModal';
import { pqrsApi, type ContratoParaRadicar } from '@/lib/api/pqrs.service';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service';

// GLOW UP (22-10): el estado con su punto y su palabra (StatusBadge); lo abierto en azul suave, lo resuelto en verde.
const ESTADO: Record<string, { label: string; tono: 'info' | 'success' | 'neutral' }> = {
  recibida: { label: 'Recibida', tono: 'info' },
  asignada: { label: 'Asignada', tono: 'info' },
  en_proceso: { label: 'En proceso', tono: 'info' },
  en_cotizacion: { label: 'En cotización', tono: 'info' },
  resuelta: { label: 'Resuelta', tono: 'success' },
  cerrada: { label: 'Cerrada', tono: 'neutral' },
};
const yaCerrada = (s: SolicitudPqrs) => s.estado === 'resuelta' || s.estado === 'cerrada';
const TIPO: Record<string, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  solicitud: 'Solicitud',
  reparacion: 'Reparación',
  sugerencia: 'Sugerencia',
};

export function SolicitudesDelPropietario({ abrirNueva = false }: { abrirNueva?: boolean }) {
  const [items, setItems] = useState<SolicitudPqrs[]>([]);
  const [contratos, setContratos] = useState<ContratoParaRadicar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nueva, setNueva] = useState(abrirNueva);
  const router = useRouter();
  const pathname = usePathname();
  // Cerrado el modal, la dirección vuelve a la lista: si se quedaba en
  // «/solicitudes/nueva», recargar volvía a abrir el formulario (QA 11-10).
  const cerrarNueva = useCallback(() => {
    setNueva(false);
    if (pathname?.endsWith('/solicitudes/nueva')) router.replace('/panel/solicitudes');
  }, [pathname, router]);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    pqrsApi
      .listMineConDisponibilidad({ comoPropietario: true })
      .then((r) => {
        setItems(r.items);
        setContratos(r.contratos);
      })
      .catch(setError)
      .finally(() => setCargando(false));
  }, []);
  useEffect(() => cargar(), [cargar]);

  if (cargando) return <EsqueletoDePagina variante="list" className="p-6 lg:p-8" />;

  // Lo que espera respuesta primero; dentro de cada grupo, el orden del back.
  const abiertas = items.filter((x) => !yaCerrada(x)).length;
  const ordenadas = [...items].sort((a, b) => Number(yaCerrada(a)) - Number(yaCerrada(b)));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Solicitudes"
        // Revisora r25: el título es el de la pestaña (antes «Solicitudes · Solicitudes»).
        titulo="Mis solicitudes"
        descripcion={
          abiertas === 1
            ? 'Tienes 1 solicitud abierta: va primero. Tu inmobiliaria te responde aquí.'
            : abiertas > 1
              ? `Tienes ${abiertas} solicitudes abiertas: van primero. Tu inmobiliaria te responde aquí.`
              : 'Peticiones, quejas, reclamos y daños de tus inmuebles. Tu inmobiliaria te responde aquí.'
        }
        accionPrincipal={
          <Button
            hideArrow
            size="sm"
            onClick={() => setNueva(true)}
            disabled={contratos.length === 0}
            data-testid="propietario-nueva-solicitud"
          >
            <Plus className="h-4 w-4" weight="bold" />
            Nueva solicitud
          </Button>
        }
      />
      {contratos.length === 0 && !error && (
        <p className="text-sm text-fg-muted">
          Para radicar una solicitud necesitas un inmueble consignado con una inmobiliaria.
        </p>
      )}
      {error ? (
        <FalloDeCarga error={error} queEs="tus solicitudes" onReintentar={cargar} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ChatCircleText}
          title="Todavía no has radicado ninguna solicitud"
          description="Cuando algo de tu inmueble necesite a tu inmobiliaria —una petición, una queja o un daño— la radicas aquí y aquí mismo te responden."
          action={contratos.length > 0 ? { label: 'Nueva solicitud', onClick: () => setNueva(true) } : undefined}
        />
      ) : (
        <ul className="space-y-2" data-testid="propietario-solicitudes">
          {ordenadas.map((s) => {
            const estado = ESTADO[s.estado] ?? { label: s.estado, tono: 'neutral' as const };
            return (
              <li key={s.id}>
                <Link
                  href={`/panel/solicitudes/${s.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-fg">{s.asunto}</span>
                      <StatusBadge tone={estado.tono}>{estado.label}</StatusBadge>
                    </div>
                    <p className="mt-1 text-caption text-fg-muted">
                      <span className="font-mono">{s.radicado}</span> · {TIPO[s.tipo] ?? s.tipo}
                      {s.propiedadDireccion ? ` · ${s.propiedadDireccion}` : ''} · {fechaLegible(s.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <NuevaSolicitudModal
        open={nueva}
        onClose={cerrarNueva}
        onCreated={cargar}
        contratos={contratos}
        comoPropietario
      />
    </div>
  );
}
