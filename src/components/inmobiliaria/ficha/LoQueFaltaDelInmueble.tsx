'use client';

/**
 * «Para tener este inmueble en regla» — lo pendiente PRIMERO en el Resumen de la
 * ficha (revisión de diseño, 21-10-2026: «lo pendiente estaba a 1–3 pestañas de
 * distancia y sólo lo anunciaba un punto ámbar de 6 px»).
 *
 * Cada renglón sale de un dato real y trae el botón que lo resuelve:
 *  · el mandato con fecha de vencimiento (sin ella no hay aviso de 30 días);
 *  · el mandato firmado (las firmas del mandato);
 *  · los papeles del propietario (antes de publicar y antes del primer giro);
 *  · el inmueble en el mapa;
 *  · las fotos, sólo si no está arrendado (son para arrendarlo).
 * El inventario no entra: vive en sus actas y no se afirma lo que no se sabe.
 * Lo que no se pudo revisar (el back sin la migración, una caída) queda como
 * «desconocido», nunca como hecho. Con todo listo, la lista se pliega sola.
 */

import Link from 'next/link';
import { useState } from 'react';

import { ListaParaEmpezar, type Requisito } from '@/components/pantalla/ListaParaEmpezar';
import { Button } from '@/components/ui/button';
import { tieneCoordenadas } from '@/components/map/coordenadas';
import { UbicarEnElMapaDialog } from '@/components/inmobiliaria/inmueble/UbicarEnElMapaDialog';
import { captacionApi } from '@/lib/api/crm.service';
import { useCrm } from '@/lib/hooks/use-crm';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import type { Property } from '@/lib/types/property';

interface LoQueFaltaDelInmuebleProps {
  consignacion: Consignacion;
  property: Property | null | undefined;
  cargandoProperty?: boolean;
  /** Hay contrato vigente: las fotos no son lo que toca. */
  arrendado: boolean;
  /** Abre «Editar» (la fecha de vencimiento del mandato). */
  onEditar: () => void;
  /** Vuelve a pedir el inmueble después de ubicarlo en el mapa. */
  onActualizado: () => void;
  puedeEditar: boolean;
}

function irA(consignacionId: string, pestana: string, ancla?: string) {
  return `/panel/inmobiliaria/inmuebles/${consignacionId}?pestana=${pestana}${ancla ? `#${ancla}` : ''}`;
}

export function LoQueFaltaDelInmueble({
  consignacion,
  property,
  cargandoProperty = false,
  arrendado,
  onEditar,
  onActualizado,
  puedeEditar,
}: LoQueFaltaDelInmuebleProps) {
  const [ubicando, setUbicando] = useState(false);
  const documentos = useCrm(() => captacionApi.documentos(consignacion.id), [consignacion.id], ['portafolio']);
  const firmas = useCrm(() => captacionApi.firmas(consignacion.id), [consignacion.id], ['portafolio']);

  const requisitos: Requisito[] = [];

  // 1 · El vencimiento del mandato.
  requisitos.push({
    id: 'vencimiento',
    titulo: 'El mandato tiene fecha de vencimiento',
    detalle: consignacion.contractEndDate ? undefined : 'Con la fecha, Leasefy avisa al asesor y al gerente 30 días antes.',
    estado: consignacion.contractEndDate ? 'listo' : 'falta',
    accion: puedeEditar ? (
      <Button size="sm" variant="secondary" hideArrow onClick={onEditar}>
        Poner la fecha
      </Button>
    ) : undefined,
  });

  // 2 · La firma del mandato.
  const lasFirmas = firmas.datos?.firmas ?? [];
  const firmado = lasFirmas.some((f) => f.estado === 'FIRMADA');
  const pendiente = lasFirmas.find((f) => f.estado === 'PENDIENTE');
  requisitos.push({
    id: 'firma',
    titulo: 'El mandato está firmado',
    detalle: firmado ? undefined : pendiente ? `Se le mandó el enlace a ${pendiente.firmanteNombre}; falta que firme.` : 'Lo firma el propietario: es lo que te autoriza a administrar y arrendar.',
    estado: firmas.cargando && !firmas.datos ? 'cargando' : firmas.noHabilitado || firmas.errorCrudo || firmas.datos?.disponible === false ? 'desconocido' : firmado ? 'listo' : 'falta',
    accion: (
      <Button size="sm" variant="secondary" hideArrow asChild>
        <Link href={irA(consignacion.id, 'mandato')}>{pendiente ? 'Ver la firma' : 'Mandar a firmar'}</Link>
      </Button>
    ),
  });

  // 3 · Los papeles del propietario.
  const d = documentos.datos;
  const faltan = d ? d.paraPublicar.falta.length + d.paraElPrimerGiro.falta.length : 0;
  const papelesListos = !!d && d.paraPublicar.completo && d.paraElPrimerGiro.completo;
  requisitos.push({
    id: 'papeles',
    titulo: 'Los papeles del propietario están completos',
    detalle: papelesListos ? undefined : faltan > 0 ? `${faltan === 1 ? 'Falta 1 papel' : `Faltan ${faltan} papeles`} (cédula, certificados, RUT…).` : undefined,
    estado: documentos.cargando && !d ? 'cargando' : documentos.noHabilitado || documentos.errorCrudo || (!papelesListos && faltan === 0) ? 'desconocido' : papelesListos ? 'listo' : 'falta',
    accion: (
      <Button size="sm" variant="secondary" hideArrow asChild>
        <Link href={irA(consignacion.id, 'mandato')}>Ver los papeles</Link>
      </Button>
    ),
  });

  // 4 · En el mapa.
  if (consignacion.propertyId) {
    const enElMapa = !!property && tieneCoordenadas(property.latitude, property.longitude);
    requisitos.push({
      id: 'mapa',
      titulo: 'El inmueble está en el mapa',
      detalle: enElMapa ? undefined : 'Sin ubicación, el aviso público no muestra el mapa.',
      estado: cargandoProperty && !property ? 'cargando' : !property ? 'desconocido' : enElMapa ? 'listo' : 'falta',
      accion:
        property && puedeEditar ? (
          <Button size="sm" variant="secondary" hideArrow onClick={() => setUbicando(true)}>
            Ubicar en el mapa
          </Button>
        ) : undefined,
    });
  }

  // 5 · Las fotos (sólo si se va a arrendar).
  if (consignacion.propertyId && !arrendado) {
    const conFotos = (property?.images?.length ?? 0) > 0;
    requisitos.push({
      id: 'fotos',
      titulo: 'El inmueble tiene fotos',
      detalle: conFotos ? undefined : 'Sin fotos, el aviso sale con un espacio vacío.',
      estado: cargandoProperty && !property ? 'cargando' : !property ? 'desconocido' : conFotos ? 'listo' : 'falta',
      accion: (
        <Button size="sm" variant="secondary" hideArrow asChild>
          <Link href={irA(consignacion.id, 'arrendarlo', 'fotos')}>Agregar fotos</Link>
        </Button>
      ),
    });
  }

  return (
    <>
      <ListaParaEmpezar
        paraQue="tener este inmueble en regla"
        recordarComo="ficha-del-inmueble"
        requisitos={requisitos}
        data-testid="lo-que-falta-del-inmueble"
      />
      {property ? (
        <UbicarEnElMapaDialog
          abierto={ubicando}
          onCerrar={() => setUbicando(false)}
          propertyId={property.id}
          direccion={consignacion.propertyAddress}
          ciudad={consignacion.propertyCity}
          onGuardado={onActualizado}
        />
      ) : null}
    </>
  );
}
