'use client';

/**
 * Las acciones masivas de Propietarios (Nico, 10-10-2026: «hay muchas tablas
 * que les hace falta acciones masivas»; eligió Directorio).
 *
 * Son las mismas de la ficha, sobre lo marcado:
 *  - «Mandar el extracto de <mes pasado>» — `dispersiones:edit`, como en la
 *    ficha. Los que no tienen correo se saltan y se dice cuántos.
 *  - «Invitar al portal» — `propietarios:edit`; sólo a quien no tiene cuenta y
 *    tiene correo. Una invitación que crea la cuenta pero no sale cuenta como
 *    «no se pudo», con su porqué.
 *  - «Exportar lo marcado» — el mismo Excel de «Exportar», con lo marcado.
 *
 * Los dos envíos le llegan a personas reales: se confirman diciendo a cuántos
 * y de qué mes, y van en UNA petición que el back recorre en el centro de
 * procesos (`enBloqueEnElServidor`): el back topa los envíos por persona, y
 * repetir el de la ficha cortaba en el 31.
 */

import { useState } from 'react';
import { EnvelopeSimple, FileXls, UserPlus } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { enBloqueEnElServidor } from '@/lib/masivas/en-bloque';
import { descargarListaDePropietarios } from '@/lib/propietarios/exportar-datos';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';

/** El mes pasado, `YYYY-MM`: el extracto que se manda es el del mes que cerró. */
export function mesPasado(hoy: Date = new Date()): string {
  const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** A quiénes les llega cada acción, de lo marcado. Pura, para probarla. */
export function aQuienesLesLlega(marcados: readonly Propietario[]) {
  const conCorreo = marcados.filter((p) => !!p.email?.trim());
  return {
    extracto: conCorreo,
    sinCorreo: marcados.length - conCorreo.length,
    invitacion: conCorreo.filter((p) => !p.cuentaDePortalId),
    yaTienenCuenta: marcados.filter((p) => !!p.cuentaDePortalId).length,
  };
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export function PropietariosMarcados({
  marcados,
  onQuitar,
  puedeMandarExtracto,
  puedeInvitar,
}: {
  marcados: readonly Propietario[];
  onQuitar: () => void;
  puedeMandarExtracto: boolean;
  puedeInvitar: boolean;
}) {
  const [ocupado, setOcupado] = useState(false);
  const mes = mesPasado();
  const elMes = nombreDelMes(mes) ?? mes;
  const { extracto, sinCorreo, invitacion, yaTienenCuenta } = aQuienesLesLlega(marcados);

  const mandarExtractos = async () => {
    const ok = await confirmar({
      titulo: `¿Les mandamos el extracto de ${elMes} a ${plural(extracto.length, 'propietario', 'propietarios')}?`,
      descripcion: `A cada uno le llega el PDF a su correo registrado.${
        sinCorreo > 0 ? ` ${plural(sinCorreo, 'no tiene correo y se salta', 'no tienen correo y se saltan')}.` : ''
      }`,
      accion: 'Mandar los extractos',
      icono: <EnvelopeSimple weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Extractos de ${elMes} a ${plural(extracto.length, 'propietario', 'propietarios')}`,
        pedir: () =>
          propietariosApi.enviarExtractosDelMesEnElCentro(
            mes,
            false,
            extracto.map((p) => p.id),
          ),
        accion: 'mandar los extractos',
      });
      if (arranco) onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const invitarAlPortal = async () => {
    const ok = await confirmar({
      titulo: `¿Invitamos al portal a ${plural(invitacion.length, 'propietario', 'propietarios')}?`,
      descripcion: `A cada uno le llega un enlace para elegir su contraseña y ver sus extractos y giros.${
        yaTienenCuenta > 0 ? ` ${plural(yaTienenCuenta, 'ya tiene cuenta y se salta', 'ya tienen cuenta y se saltan')}.` : ''
      }${sinCorreo > 0 ? ` ${plural(sinCorreo, 'no tiene correo', 'no tienen correo')}: también se ${sinCorreo === 1 ? 'salta' : 'saltan'}.` : ''}`,
      accion: 'Mandar las invitaciones',
      icono: <UserPlus weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Invitar al portal a ${plural(invitacion.length, 'propietario', 'propietarios')}`,
        pedir: () => propietariosApi.invitarAlPortalEnElCentro(invitacion.map((p) => p.id)),
        accion: 'mandar las invitaciones',
        recursos: ['propietarios'],
      });
      if (arranco) onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const exportar = async () => {
    setOcupado(true);
    try {
      const archivo = await descargarListaDePropietarios(marcados);
      toast.success('Exportamos lo marcado', {
        description: `${archivo}: ${plural(marcados.length, 'propietario', 'propietarios')}.`,
      });
    } catch {
      toast.error('No pudimos armar el Excel', { description: 'Prueba de nuevo en un momento.' });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="propietarios-marcados"
      className="max-md:hidden"
      marcadas={marcados.length}
      queSon={['propietario', 'propietarios']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca propietarios para mandarles el extracto, invitarlos al portal o exportarlos."
    >
      <Button variant="ghost" size="sm" hideArrow disabled={ocupado || marcados.length === 0} onClick={() => void exportar()} data-testid="exportar-marcados">
        <FileXls className="h-4 w-4" />
        Exportar
      </Button>
      {puedeInvitar && (
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          disabled={ocupado || invitacion.length === 0}
          onClick={() => void invitarAlPortal()}
          title={marcados.length > 0 && invitacion.length === 0 ? 'Los marcados ya tienen cuenta o no tienen correo.' : undefined}
          data-testid="invitar-marcados"
        >
          <UserPlus className="h-4 w-4" />
          {invitacion.length > 0 ? `Invitar ${invitacion.length} al portal` : 'Invitar al portal'}
        </Button>
      )}
      {puedeMandarExtracto && (
        <Button
          size="sm"
          hideArrow
          disabled={ocupado || extracto.length === 0}
          onClick={() => void mandarExtractos()}
          title={marcados.length > 0 && extracto.length === 0 ? 'Ninguno de los marcados tiene correo.' : undefined}
          data-testid="mandar-extractos-marcados"
        >
          <EnvelopeSimple className="h-4 w-4" />
          {`Mandar el extracto de ${elMes}`}
        </Button>
      )}
    </BarraDeAccionesMasivas>
  );
}
