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

import { SinDatos } from '@/components/estado/SinDatos';
import { ShieldCheck } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  // Ronda 26 (revisora r25, Aseguradoras #1): registrar va en un cajón; la lista, arriba.
  const [registrando, setRegistrando] = useState(false);

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
      setRegistrando(false);
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

  const abrirElRegistro = () => {
    setErrores({});
    setRegistrando(true);
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* La vuelta va arriba, sin flecha y con el nombre de a dónde vuelve (como las demás sub-pantallas). */}
      <div className="space-y-3">
        <Link
          href="/panel/inmobiliaria/pagos/recaudo"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          data-testid="volver-a-recaudo"
        >
          Volver a Recaudo
        </Link>
        <EncabezadoDePantalla
          seccion="Cobrar a inquilinos"
          titulo="Aseguradoras"
          descripcion="Las aseguradoras que pagan siniestros."
          ayuda={
            <ParaEntenderMas etiqueta="Cómo funciona" titulo="Cuando paga la aseguradora" variante="secundario">
              <p className="text-body-sm text-fg-muted">
                Cuando una aseguradora paga un siniestro, el recibo la lleva como pagador: las cuotas quedan
                pagadas para la inmobiliaria y el propietario, y en el estado de cuenta del inquilino esa deuda
                sale «subrogada a la aseguradora».
              </p>
            </ParaEntenderMas>
          }
          accionPrincipal={
            puedeEditar ? (
              <Button size="sm" hideArrow onClick={abrirElRegistro} data-testid="abrir-registro-de-aseguradora">
                Registrar una aseguradora
              </Button>
            ) : undefined
          }
        />
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="las aseguradoras"
        onReintentar={cargar}
        vacio={!aseguradoras || aseguradoras.length === 0}
        // Revisora r25 (C5): el vacío dice qué hacer y lleva su salida (antes una línea gris).
        cuandoVacio={
          <SinDatos
            queSon="aseguradoras"
            icono={ShieldCheck}
            titulo="Todavía no hay aseguradoras registradas"
            descripcion={
              puedeEditar
                ? 'Regístrala con su nombre y su NIT para ponerla como pagador en los recibos.'
                : 'Pídele a un administrador que la registre.'
            }
            accion={
              puedeEditar ? (
                <Button size="sm" variant="secondary" hideArrow onClick={abrirElRegistro}>
                  Registrar la primera
                </Button>
              ) : undefined
            }
          />
        }
      >
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Table data-testid="aseguradoras">
            <TableHeader>
              <TableRow>
                <TableHead>Aseguradora</TableHead>
                <TableHead>NIT</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aseguradoras ?? []).map((a) => (
                <TableRow key={a.id} data-testid={`aseguradora-${a.id}`}>
                  <TableCell className="font-medium text-fg">{a.nombre}</TableCell>
                  <TableCell className="font-mono tabular-nums">{a.nit}</TableCell>
                  <TableCell>
                    <Badge variant={a.activa ? 'success' : 'outline'}>{a.activa ? 'Activa' : 'Inactiva'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar && (
                      <Button size="sm" variant="ghost" hideArrow onClick={() => void alternar(a)}>
                        {a.activa ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </EstadoDeDatos>

      {puedeEditar && (
        <Cajon abierto={registrando} onOpenChange={(abierto) => !guardando && setRegistrando(abierto)} tamano="sm">
          <CajonCabecera
            titulo="Registrar una aseguradora"
            descripcion="Con su nombre y su NIT queda para elegirla como pagador en un recibo."
          />
          <CajonCuerpo>
            <form
              className="space-y-4"
              data-testid="nueva-aseguradora"
              onSubmit={(e) => {
                e.preventDefault();
                void registrar();
              }}
            >
              <div className="space-y-1.5">
                <label className="text-body-sm font-medium text-fg" htmlFor="aseguradora-nombre">
                  Nombre
                </label>
                <Input
                  id="aseguradora-nombre"
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
                <ErrorDelCampo id="aseguradora-nombre-error" mensaje={errores.nombre} />
              </div>
              <div className="space-y-1.5">
                <label className="text-body-sm font-medium text-fg" htmlFor="aseguradora-nit">
                  NIT
                </label>
                <Input
                  id="aseguradora-nit"
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
                <ErrorDelCampo id="aseguradora-nit-error" mensaje={errores.nit} />
              </div>
            </form>
          </CajonCuerpo>
          <CajonPie>
            <Button variant="ghost" hideArrow onClick={() => setRegistrando(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={guardando || !nombre.trim() || !nit.trim()}
              onClick={() => void registrar()}
              data-testid="registrar-aseguradora"
            >
              {guardando ? 'Registrando…' : 'Registrar'}
            </Button>
          </CajonPie>
        </Cajon>
      )}
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
