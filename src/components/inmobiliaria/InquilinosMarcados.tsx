'use client';

/**
 * Las acciones masivas de Inquilinos (Nico, 10-10-2026: «hay muchas tablas
 * que les hace falta acciones masivas»; eligió Directorio).
 *
 * Las mismas de la ficha, sobre lo marcado:
 *  - «Estado de cuenta por correo» y «por WhatsApp» — `cobros:view`, como
 *    «Compartir» en la ficha. Cada envío lo decide el back igual que el de
 *    uno (correo, cuenta, teléfono, consentimiento): lo que no sale queda en
 *    el CSV del centro de procesos con su porqué.
 *  - «Reenviar la invitación» — `clientes:edit`; sólo a quien tiene cuenta y
 *    SIGUE sin entrar (`soloPendientes`): a quien ya entró no le llega un
 *    enlace para crear contraseña. Nico: a quien no tiene cuenta se le invita
 *    desde su contrato, no desde acá.
 *  - «Exportar» — una fila por arriendo.
 *
 * Los envíos van en UNA petición al back, que los recorre en el centro de
 * procesos (`enBloqueEnElServidor`): el back topa los envíos por persona.
 */

import { useState } from 'react';
import { EnvelopeSimple, FileXls, PaperPlaneTilt, WhatsappLogo } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { cuentaDelPortal, referenciaDelEstadoDeCuenta, type Inquilino } from '@/lib/api/inquilinos.service';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { invitacionesApi } from '@/lib/api/invitaciones.service';
import { enBloqueEnElServidor } from '@/lib/masivas/en-bloque';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { descargarInquilinos } from '@/lib/inquilinos/exportar-inquilinos';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

/** A quiénes les llega cada acción, de lo marcado. Pura, para probarla. */
export function aQuienesLesLlegaAlInquilino(marcados: readonly Inquilino[]) {
  const conCuenta = marcados.flatMap((p) => {
    const cuenta = cuentaDelPortal(p);
    return cuenta ? [{ cuenta, persona: p }] : [];
  });
  const conEstado = marcados.flatMap((p) => {
    const id = referenciaDelEstadoDeCuenta(p);
    return id ? [{ id, nombre: p.nombre, documento: p.documento, conCuenta: !!cuentaDelPortal(p) }] : [];
  });
  return {
    conCorreo: marcados.filter((p) => !!p.email?.trim()).length,
    conCuenta,
    sinCuenta: marcados.length - conCuenta.length,
    /** A quién se le puede pedir el estado de cuenta (cuenta o documento). */
    conEstado,
    sinReferencia: marcados.length - conEstado.length,
  };
}

/** De a cuántos acepta el back la lista de cuentas (`EnviarInvitacionesDto`). */
const CUENTAS_POR_TANDA = 100;

export function InquilinosMarcados({
  marcados,
  onQuitar,
  puedeCompartir,
  puedeInvitar,
}: {
  marcados: readonly Inquilino[];
  onQuitar: () => void;
  puedeCompartir: boolean;
  puedeInvitar: boolean;
}) {
  const [ocupado, setOcupado] = useState(false);
  const { conCorreo, conCuenta, sinCuenta, conEstado, sinReferencia } = aQuienesLesLlegaAlInquilino(marcados);

  const mandarEstado = async (canal: 'CORREO' | 'WHATSAPP') => {
    const porDonde = canal === 'CORREO' ? 'por correo' : 'por WhatsApp';
    const ok = await confirmar({
      titulo: `¿Les mandamos el estado de cuenta ${porDonde} a ${plural(conEstado.length, 'inquilino', 'inquilinos')}?`,
      descripcion: `${
        canal === 'CORREO'
          ? `Le llega un enlace a su estado de cuenta, siempre al día, a quien tiene cuenta en el portal${
              conEstado.filter((c) => c.conCuenta).length < conEstado.length
                ? ` (${conEstado.filter((c) => c.conCuenta).length} de ${conEstado.length}). A los demás se les deja el enlace creado para mandárselo a mano: el centro de procesos dice a quiénes.`
                : '.'
            }${
              marcados.length - conCorreo > 0
                ? ` ${plural(marcados.length - conCorreo, 'no tiene correo', 'no tienen correo')}.`
                : ''
            }`
          : 'Sale por el chat de su cuenta, sólo a quien aceptó WhatsApp. A quien no, el centro de procesos dice por qué.'
      }${
        sinReferencia > 0
          ? ` ${plural(sinReferencia, 'no tiene ni cuenta ni documento', 'no tienen ni cuenta ni documento')} y se ${sinReferencia === 1 ? 'salta' : 'saltan'}.`
          : ''
      }`,
      accion: `Mandar ${porDonde}`,
      icono: canal === 'CORREO' ? <EnvelopeSimple weight="bold" /> : <WhatsappLogo weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Estado de cuenta ${porDonde} a ${plural(conEstado.length, 'inquilino', 'inquilinos')}`,
        pedir: () => estadoDeCuentaApi.enviarEnBloque('inquilino', canal, conEstado),
        accion: 'mandar los estados de cuenta',
      });
      if (arranco) onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const reenviarInvitaciones = async () => {
    const ok = await confirmar({
      titulo: `¿Les reenviamos la invitación al portal a ${plural(conCuenta.length, 'inquilino', 'inquilinos')}?`,
      descripcion: `Sólo le llega a quien todavía no ha entrado: a quien ya entró no se le manda nada.${
        sinCuenta > 0
          ? ` ${plural(sinCuenta, 'no tiene cuenta', 'no tienen cuenta')}: a ${sinCuenta === 1 ? 'esa persona' : 'esas personas'} se le invita desde su contrato.`
          : ''
      }`,
      accion: 'Reenviar',
      icono: <PaperPlaneTilt weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      let enviadas = 0;
      let noSalieron = 0;
      let pedidas = 0;
      for (let i = 0; i < conCuenta.length; i += CUENTAS_POR_TANDA) {
        const tanda = conCuenta.slice(i, i + CUENTAS_POR_TANDA).map((c) => c.cuenta);
        const r = await invitacionesApi.enviar({ userIds: tanda, soloPendientes: true });
        enviadas += r.enviadas;
        noSalieron += r.resultados.filter((x) => !x.enviada).length;
        pedidas += r.resultados.length;
      }
      const yaEntraron = conCuenta.length - pedidas;
      const partes = [
        yaEntraron > 0 ? `${plural(yaEntraron, 'ya había entrado', 'ya habían entrado')}: no se le mandó nada.` : null,
        noSalieron > 0 ? `${plural(noSalieron, 'no salió', 'no salieron')}: míralas en Invitaciones pendientes.` : null,
      ].filter(Boolean);
      if (enviadas > 0) {
        toast[noSalieron > 0 ? 'warning' : 'success'](`Reenviamos ${plural(enviadas, 'invitación', 'invitaciones')}`, {
          description: partes.join(' ') || undefined,
        });
        onQuitar();
      } else {
        toast.warning('No se reenvió ninguna invitación', { description: partes.join(' ') || undefined });
      }
    } catch (e) {
      toast.error('No se pudieron reenviar', {
        description: mensajeParaLaPersona(e, { accion: 'reenviar las invitaciones' }),
      });
    } finally {
      setOcupado(false);
    }
  };

  const exportar = async () => {
    setOcupado(true);
    try {
      const archivo = await descargarInquilinos(marcados);
      toast.success('Exportamos lo marcado', { description: `${archivo}: ${plural(marcados.length, 'inquilino', 'inquilinos')}.` });
    } catch {
      toast.error('No pudimos armar el Excel', { description: 'Prueba de nuevo en un momento.' });
    } finally {
      setOcupado(false);
    }
  };

  const nada = marcados.length === 0;
  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="inquilinos-marcados"
      className="max-md:hidden"
      marcadas={marcados.length}
      queSon={['inquilino', 'inquilinos']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca inquilinos para mandarles el estado de cuenta, reenviarles la invitación o exportarlos."
    >
      <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void exportar()} data-testid="exportar-marcados">
        <FileXls className="h-4 w-4" />
        Exportar
      </Button>
      {puedeInvitar && (
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          disabled={ocupado || conCuenta.length === 0}
          title={!nada && conCuenta.length === 0 ? 'Ninguno de los marcados tiene cuenta: se le invita desde su contrato.' : undefined}
          onClick={() => void reenviarInvitaciones()}
          data-testid="reenviar-invitaciones-marcados"
        >
          <PaperPlaneTilt className="h-4 w-4" />
          Reenviar invitación
        </Button>
      )}
      {puedeCompartir && (
        <>
          <Button variant="secondary" size="sm" hideArrow disabled={ocupado || conEstado.length === 0} onClick={() => void mandarEstado('WHATSAPP')} data-testid="estado-por-whatsapp-marcados">
            <WhatsappLogo className="h-4 w-4" />
            Por WhatsApp
          </Button>
          <Button size="sm" hideArrow disabled={ocupado || conEstado.length === 0} onClick={() => void mandarEstado('CORREO')} data-testid="estado-por-correo-marcados">
            <EnvelopeSimple className="h-4 w-4" />
            Estado de cuenta por correo
          </Button>
        </>
      )}
    </BarraDeAccionesMasivas>
  );
}
