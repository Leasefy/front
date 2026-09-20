'use client';

/**
 * 🔴 D11 (17-09-2026): las aseguradoras que le pagan siniestros a la
 * inmobiliaria.
 *
 * Cada inmobiliaria registra las suyas (nombre y NIT); son las que se pueden
 * elegir como PAGADOR de un recibo de caja. Una inactiva no se ofrece para
 * recibos nuevos, pero los recibos que ya pagó la siguen nombrando: por eso se
 * desactiva, no se borra.
 *
 * Permiso: `cobros`/view para verlas, `cobros`/edit para registrarlas.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { aseguradorasApi, type Aseguradora } from '@/lib/api/aseguradoras.service';

function Contenido() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('cobros', 'edit');
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setAseguradoras(await aseguradorasApi.listar());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const registrar = async () => {
    if (!nombre.trim() || !nit.trim() || guardando) return;
    setGuardando(true);
    try {
      const creada = await aseguradorasApi.crear({ nombre: nombre.trim(), nit: nit.trim() });
      toast.success(`${creada.nombre} quedó registrada (NIT ${creada.nit})`);
      setNombre('');
      setNit('');
      await cargar();
    } catch (e) {
      toast.error('No se pudo registrar la aseguradora', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (a: Aseguradora) => {
    try {
      await aseguradorasApi.actualizar(a.id, { activa: !a.activa });
      await cargar();
    } catch (e) {
      toast.error('No se pudo actualizar', {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1.5">
        <SectionLabel>Pagos · recaudo</SectionLabel>
        <h1 className="text-h2 text-fg">Aseguradoras</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Las que pagan siniestros. Cuando una paga, el recibo lleva a la aseguradora como pagador: las cuotas
          quedan pagadas para la inmobiliaria y el propietario, y en el estado de cuenta del inquilino esa deuda
          sale «subrogada a la aseguradora».{' '}
          <Link className="underline" href="/panel/inmobiliaria/pagos/recaudo">
            Volver a Recaudo
          </Link>
        </p>
      </header>

      {puedeEditar && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4" data-testid="nueva-aseguradora">
          <label className="text-sm">
            <span className="block text-xs text-fg-muted">Nombre</span>
            <input
              className="mt-1 rounded-md border border-border bg-surface p-2 text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Seguros Bolívar S.A."
              data-testid="aseguradora-nombre"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-fg-muted">NIT</span>
            <input
              className="mt-1 rounded-md border border-border bg-surface p-2 text-sm"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="860.002.503-2"
              data-testid="aseguradora-nit"
            />
          </label>
          <Button hideArrow disabled={guardando} onClick={() => void registrar()} data-testid="registrar-aseguradora">
            Registrar
          </Button>
        </div>
      )}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="las aseguradoras"
        onReintentar={cargar}
        vacio={!aseguradoras || aseguradoras.length === 0}
        cuandoVacio={<p className="text-sm text-fg-muted">Todavía no hay aseguradoras registradas.</p>}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="aseguradoras">
            <thead className="bg-surface-muted text-left text-xs text-fg-muted">
              <tr>
                <th className="p-3">Aseguradora</th>
                <th className="p-3">NIT</th>
                <th className="p-3">Estado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(aseguradoras ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border" data-testid={`aseguradora-${a.id}`}>
                  <td className="p-3">{a.nombre}</td>
                  <td className="p-3 font-mono tabular-nums">{a.nit}</td>
                  <td className="p-3">{a.activa ? 'Activa' : 'Inactiva'}</td>
                  <td className="p-3 text-right">
                    {puedeEditar && (
                      <Button size="sm" variant="outline" hideArrow onClick={() => void alternar(a)}>
                        {a.activa ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoDeDatos>
    </div>
  );
}

export default function AseguradorasPage() {
  return (
    <PageGuard module="cobros" action="view">
      <Contenido />
    </PageGuard>
  );
}
