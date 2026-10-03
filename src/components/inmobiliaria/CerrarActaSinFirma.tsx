'use client';

/**
 * 🔴 CERRAR UN ACTA SIN LA FIRMA DEL INQUILINO (I-03, Nico 18-09-2026).
 *
 * «Si el inquilino no firma, el asesor la cierra con fotos y un testigo, y se
 * le manda copia con 5 días para objetar».
 *
 * El back quedó construido el 18-09 con sus cuatro guardas y sin pantalla: no
 * había forma de cerrar un acta que el inquilino se negara a firmar, y esas
 * actas quedaban abiertas para siempre.
 *
 * 🔴 LAS CONDICIONES SE MUESTRAN ANTES DE INTENTAR, no como un error después.
 * El back responde 400 con su código si falta alguna, pero descubrir que
 * faltan las fotos DESPUÉS de haber conseguido un testigo y tomarle la cédula
 * es hacerle perder el viaje a una persona. Acá se leen de una.
 *
 * 🔴 EL TESTIGO VA CON CÉDULA. Sin documento «un testigo» es un nombre
 * cualquiera y no le sirve a nadie el día que haya que sostener el acta ante un
 * juez. Es la misma razón por la que el back lo exige.
 */

import { useRef, useState } from 'react';
import { WarningCircle, CheckCircle } from '@phosphor-icons/react';

import { Button, Input } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  MAX_LARGO_DOCUMENTO_DEL_TESTIGO,
  MAX_LARGO_NOMBRE_DEL_TESTIGO,
  MIN_LARGO_DOCUMENTO_DEL_TESTIGO,
  MIN_LARGO_NOMBRE_DEL_TESTIGO,
} from '@/lib/actas/limites-del-acta';
import { actasApi } from '@/lib/api/inmobiliaria.service';
import { cargoAparteDelCierre, elCargoEntro } from '@/lib/actas/acta-del-back';
import type { ActaEntrega } from '@/lib/types/inmobiliaria';

/** Una condición del back, leída acá antes de que alguien intente. */
export interface CondicionDelCierre {
  cumple: boolean;
  texto: string;
}

/**
 * Las tres que la pantalla puede juzgar sola. La cuarta —el testigo— es lo que
 * se escribe en el formulario.
 *
 * Exportada para poder probarla sin montar el diálogo: es la parte que decide
 * si el botón se ofrece, y es donde un error se paga caro.
 */
export function condicionesDelCierre(acta: ActaEntrega): CondicionDelCierre[] {
  const firmas = acta.signatures ?? [];
  const inquilinoFirmo = firmas.some((f) => f.party === 'tenant' && f.signedAt);
  const asesorFirmo = firmas.some((f) => f.party === 'agent' && f.signedAt);
  // `fotosPorEspacio` lo agregó la migración del 18-09 y puede no viajar en
  // actas viejas: `undefined` NO es «no hay fotos», es «no lo sé». Se deja pasar
  // y que el back —que sí sabe— responda con su motivo.
  const fotos = (acta as { fotosPorEspacio?: unknown }).fotosPorEspacio;
  const hayFotos = fotos === undefined || fotos === null
    ? true
    : Object.keys(fotos as Record<string, unknown>).length > 0;

  return [
    {
      cumple: !inquilinoFirmo,
      texto: inquilinoFirmo
        ? 'El inquilino SÍ firmó: esta acta se cierra por el camino normal, no con testigo.'
        : 'El inquilino no firmó.',
    },
    {
      cumple: asesorFirmo,
      texto: asesorFirmo
        ? 'El asesor firmó.'
        : 'Falta la firma del asesor: alguien de la inmobiliaria tiene que responder por este cierre.',
    },
    {
      cumple: hayFotos,
      texto: hayFotos
        ? 'Hay fotos por espacio.'
        : 'Faltan las fotos por espacio: son la prueba de en qué estado se entregó.',
    },
  ];
}

export function sePuedeCerrarSinFirma(acta: ActaEntrega): boolean {
  return condicionesDelCierre(acta).every((c) => c.cumple);
}

export function CerrarActaSinFirma({
  acta,
  onCerrar,
  onCerrada,
}: {
  acta: ActaEntrega;
  onCerrar: () => void;
  onCerrada: (acta: ActaEntrega) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);
  /** Lo que el back rechazó del testigo, por campo (`testigoNombre`, `testigoDocumento`). */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDelTestigo, string>>>({});
  const formulario = useRef<HTMLFormElement>(null);

  const condiciones = condicionesDelCierre(acta);
  const listo = condiciones.every((c) => c.cumple);
  const testigoCompleto =
    nombre.trim().length >= MIN_LARGO_NOMBRE_DEL_TESTIGO &&
    documento.trim().length >= MIN_LARGO_DOCUMENTO_DEL_TESTIGO;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo || !testigoCompleto || guardando) return;
    setGuardando(true);
    setFalla(null);
    setDelServidor({});
    try {
      const actualizada = await actasApi.cerrarSinFirma(acta.id, {
        testigoNombre: nombre.trim(),
        testigoDocumento: documento.trim(),
      });
      const cerrada =
        'Acta cerrada. Se le manda copia al inquilino: tiene 5 días para objetar.';
      // 02-10-2026: lo que los descuentos pasan del depósito. Un solo aviso: el
      // del cierre, con lo que pasó con el cargo abajo. En verde si entró a su
      // estado de cuenta —en una cuota sin pagar o, si el contrato ya no tenía,
      // en la CUOTA DE CIERRE, y el back dice cuándo vence—; en advertencia si
      // NO entró: hay que cargarlo a mano.
      const cargo = cargoAparteDelCierre(actualizada);
      if (!cargo) toast.success(cerrada);
      else if (elCargoEntro(cargo)) toast.success(cerrada, { description: cargo.mensaje });
      else toast.warning(cerrada, { description: cargo.mensaje });
      onCerrada(actualizada);
    } catch (err) {
      // 02-10-2026: lo del testigo va bajo su campo (con el foco); el aviso de
      // abajo queda para el resto —los 409 del cierre (`EL_INQUILINO_SI_FIRMO`,
      // `ACTA_SIN_FOTOS_POR_ESPACIO`…), un 5xx con su referencia, la red—, por
      // el traductor y no con el mensaje crudo.
      const reparto = repartirErroresDelServidor<CampoDelTestigo>(err, {
        campos: ['testigoNombre', 'testigoDocumento'],
        porDefecto: 'No se pudo cerrar el acta.',
        accion: 'cerrar el acta',
      });
      setDelServidor(reparto.porCampo);
      setFalla(reparto.sueltos.length ? reparto.sueltos.join(' · ') : null);
      const primero = reparto.orden[0];
      if (primero) formulario.current?.querySelector<HTMLElement>(`#acta-${primero}`)?.focus();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        // Mientras se guarda no se sale (ni con Esc, ni con el velo, ni con la ✕).
        if (!abierto && !guardando) onCerrar();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Cerrar sin la firma del inquilino</DialogTitle>
          <DialogDescription>
            El acta queda cerrada con la firma del asesor y un testigo. Al
            inquilino se le manda copia y tiene{' '}
            <strong className="text-fg">5 días para objetar</strong>. Objetar no
            reabre el acta: deja escrito que no está de acuerdo.
          </DialogDescription>
        </DialogHeader>

        {/* El pie vive FUERA del <form> (el DialogContent lo saca al pie fijo):
            el botón de enviar lo apunta con `form=`. */}
        <form id={ID_DEL_FORMULARIO} onSubmit={enviar} className="space-y-4" ref={formulario}>
          <ul className="space-y-2" data-testid="condiciones-del-cierre">
            {condiciones.map((c) => (
              <li key={c.texto} className="flex items-start gap-2 text-xs">
                {c.cumple ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" />
                ) : (
                  <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" weight="fill" />
                )}
                <span className={c.cumple ? 'text-fg-muted' : 'text-danger'}>
                  {c.texto}
                </span>
              </li>
            ))}
          </ul>

          <fieldset disabled={!listo} className="space-y-3">
            <div>
              <label htmlFor="acta-testigoNombre" className="mb-1 block text-xs font-medium text-foreground">
                Nombre del testigo<span className="ml-0.5 text-danger">*</span>
              </label>
              <Input
                id="acta-testigoNombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setDelServidor((d) => ({ ...d, testigoNombre: undefined }));
                }}
                maxLength={MAX_LARGO_NOMBRE_DEL_TESTIGO}
                placeholder="Quién presenció la entrega"
                aria-invalid={delServidor.testigoNombre ? true : undefined}
                aria-describedby={delServidor.testigoNombre ? 'acta-testigoNombre-error' : undefined}
              />
              <ErrorDelCampo id="acta-testigoNombre-error" mensaje={delServidor.testigoNombre} />
            </div>
            <div>
              <label htmlFor="acta-testigoDocumento" className="mb-1 block text-xs font-medium text-foreground">
                Cédula del testigo<span className="ml-0.5 text-danger">*</span>
              </label>
              <Input
                id="acta-testigoDocumento"
                value={documento}
                onChange={(e) => {
                  setDocumento(e.target.value);
                  setDelServidor((d) => ({ ...d, testigoDocumento: undefined }));
                }}
                maxLength={MAX_LARGO_DOCUMENTO_DEL_TESTIGO}
                placeholder="Sin cédula, «un testigo» es un nombre cualquiera"
                aria-invalid={delServidor.testigoDocumento ? true : undefined}
                aria-describedby={delServidor.testigoDocumento ? 'acta-testigoDocumento-error' : undefined}
              />
              <ErrorDelCampo id="acta-testigoDocumento-error" mensaje={delServidor.testigoDocumento} />
            </div>
          </fieldset>

          {falla && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-caption text-danger"
            >
              {falla}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_DEL_FORMULARIO}
            hideArrow
            isLoading={guardando}
            disabled={!listo || !testigoCompleto || guardando}
          >
            Cerrar el acta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ID_DEL_FORMULARIO = 'form-cerrar-acta-sin-firma';

type CampoDelTestigo = 'testigoNombre' | 'testigoDocumento';
