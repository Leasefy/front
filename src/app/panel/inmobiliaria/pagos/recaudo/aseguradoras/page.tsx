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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { aseguradorasApi, type Aseguradora } from '@/lib/api/aseguradoras.service';
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';

/** Los dos campos de «registrar», con el id de su input. */
type CampoDeLaAseguradora = 'nombre' | 'nit';
const ID_DEL_CAMPO: Record<CampoDeLaAseguradora, string> = {
  nombre: 'aseguradora-nombre',
  nit: 'aseguradora-nit',
};
/** 🔁 El tope del nombre en el back (`CrearAseguradoraDto`, `@MaxLength(200)`). */
const MAX_LARGO_DEL_NOMBRE = 200;

function enfocar(campo: CampoDeLaAseguradora | undefined) {
  if (campo) document.getElementById(ID_DEL_CAMPO[campo])?.focus();
}

function Contenido() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('cobros', 'edit');
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaAseguradora, string>>>({});

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
    setErrores({});
    try {
      const creada = await aseguradorasApi.crear({ nombre: nombre.trim(), nit: nit.trim() });
      toast.success(`${creada.nombre} quedó registrada (NIT ${creada.nit})`);
      setNombre('');
      setNit('');
      await cargar();
    } catch (e) {
      // 🔴 El NIT repetido es un problema DEL NIT: va debajo del NIT.
      if (leerFallo(e).code === 'ASEGURADORA_YA_EXISTE') {
        setErrores({
          nit: mensajeParaLaPersona(e, { porDefecto: 'Ya tienes registrada una aseguradora con ese NIT.' }),
        });
        enfocar('nit');
        return;
      }
      // Un 400 por campo va debajo de su campo; lo demás, al aviso.
      const reparto = repartirErroresDelServidor<CampoDeLaAseguradora>(e, {
        campos: ['nombre', 'nit'],
        porDefecto: 'Prueba de nuevo en un momento.',
        accion: 'registrar la aseguradora',
      });
      setErrores(reparto.porCampo);
      enfocar(reparto.orden[0]);
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo registrar la aseguradora', { description: reparto.sueltos.join(' · ') });
      }
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
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: a.activa ? 'desactivar la aseguradora' : 'activar la aseguradora',
        }),
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
        <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-4" data-testid="nueva-aseguradora">
          <div>
            <label className="text-sm" htmlFor="aseguradora-nombre">
              <span className="block text-xs text-fg-muted">Nombre</span>
              <input
                id="aseguradora-nombre"
                className="mt-1 rounded-md border border-border bg-surface p-2 text-sm"
                value={nombre}
                maxLength={MAX_LARGO_DEL_NOMBRE}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrores((previos) => ({ ...previos, nombre: undefined }));
                }}
                placeholder="Seguros Bolívar S.A."
                aria-invalid={errores.nombre ? true : undefined}
                aria-describedby={errores.nombre ? 'aseguradora-nombre-error' : undefined}
                data-testid="aseguradora-nombre"
              />
            </label>
            <ErrorDelCampo id="aseguradora-nombre-error" mensaje={errores.nombre} />
          </div>
          <div>
            <label className="text-sm" htmlFor="aseguradora-nit">
              <span className="block text-xs text-fg-muted">NIT</span>
              <input
                id="aseguradora-nit"
                className="mt-1 rounded-md border border-border bg-surface p-2 text-sm"
                value={nit}
                onChange={(e) => {
                  setNit(e.target.value);
                  setErrores((previos) => ({ ...previos, nit: undefined }));
                }}
                placeholder="860.002.503-2"
                aria-invalid={errores.nit ? true : undefined}
                aria-describedby={errores.nit ? 'aseguradora-nit-error' : undefined}
                data-testid="aseguradora-nit"
              />
            </label>
            <ErrorDelCampo id="aseguradora-nit-error" mensaje={errores.nit} />
          </div>
          <Button
            hideArrow
            className="mt-5"
            disabled={guardando}
            onClick={() => void registrar()}
            data-testid="registrar-aseguradora"
          >
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
