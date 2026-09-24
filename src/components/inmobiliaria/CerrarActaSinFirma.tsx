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

import { useEffect, useState } from 'react';
import { WarningCircle, CheckCircle, X } from '@phosphor-icons/react';

import { Button, Input } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { useLenis } from '@/components/providers/SmoothScroll';
import { actasApi } from '@/lib/api/inmobiliaria.service';
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
  const lenis = useLenis();
  useEffect(() => {
    lenis.stop();
    return () => lenis.start();
  }, [lenis]);

  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  const condiciones = condicionesDelCierre(acta);
  const listo = condiciones.every((c) => c.cumple);
  const testigoCompleto = nombre.trim().length >= 3 && documento.trim().length >= 5;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo || !testigoCompleto || guardando) return;
    setGuardando(true);
    setFalla(null);
    try {
      const actualizada = await actasApi.cerrarSinFirma(acta.id, {
        testigoNombre: nombre.trim(),
        testigoDocumento: documento.trim(),
      });
      toast.success(
        'Acta cerrada. Se le manda copia al inquilino: tiene 5 días para objetar.',
      );
      onCerrada(actualizada);
    } catch (err) {
      setFalla(mensajeDeError(err, 'No se pudo cerrar el acta'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={guardando ? undefined : onCerrar}
      />
      <div
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <h2 className="text-base font-semibold text-fg">
            Cerrar sin la firma del inquilino
          </h2>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={enviar} className="space-y-4 p-6">
          <p className="text-sm text-fg-muted">
            El acta queda cerrada con la firma del asesor y un testigo. Al
            inquilino se le manda copia y tiene{' '}
            <strong className="text-fg">5 días para objetar</strong>. Objetar no
            reabre el acta: deja escrito que no está de acuerdo.
          </p>

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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">
                Nombre del testigo<span className="ml-0.5 text-danger">*</span>
              </span>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={200}
                placeholder="Quién presenció la entrega"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">
                Cédula del testigo<span className="ml-0.5 text-danger">*</span>
              </span>
              <Input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                maxLength={20}
                placeholder="Sin cédula, «un testigo» es un nombre cualquiera"
              />
            </label>
          </fieldset>

          {falla && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
            >
              {falla}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={onCerrar}
              disabled={guardando}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              hideArrow
              isLoading={guardando}
              disabled={!listo || !testigoCompleto || guardando}
              className="flex-1"
            >
              Cerrar el acta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return porDefecto;
}
