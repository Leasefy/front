'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Warning, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AgencyRole } from '@/lib/types/inmobiliaria';
import { ROLES_PARA_INVITAR, cuentaParaElTope, queHaceElRol } from './roles-para-invitar';
import { useMovimiento } from './movimiento';

/**
 * «Invitar»: nombre, correo y rol (02-10-2026).
 *
 * El rol va en un selector y no en cuatro tarjetas grandes —lo que hacía
 * pesado al popover—, pero sigue explicando qué puede hacer cada uno: cada
 * opción trae su línea y la del elegido queda escrita debajo.
 *
 * Es un formulario controlado: el estado vive en el modal, para que cambiar de
 * pestaña o pasar de celular a escritorio no borre lo escrito.
 */

export interface FalloDelEnvio {
  mensaje: string;
  /** 402 del tope del plan: sólo lo dispara un asesor comercial. */
  tope: boolean;
}

export interface FormularioDeInvitacionProps {
  nombre: string;
  correo: string;
  rol: AgencyRole;
  errorDelCorreo: string | null;
  sugerencia: string | null;
  enviando: boolean;
  fallo: FalloDelEnvio | null;
  onNombre: (v: string) => void;
  onCorreo: (v: string) => void;
  onSalirDelCorreo: () => void;
  onUsarSugerencia: () => void;
  onRol: (rol: AgencyRole) => void;
  onEnviar: () => void;
  onVerPlanes: () => void;
}

export const FormularioDeInvitacion = forwardRef<HTMLInputElement, FormularioDeInvitacionProps>(
  function FormularioDeInvitacion(
    {
      nombre,
      correo,
      rol,
      errorDelCorreo,
      sugerencia,
      enviando,
      fallo,
      onNombre,
      onCorreo,
      onSalirDelCorreo,
      onUsarSugerencia,
      onRol,
      onEnviar,
      onVerPlanes,
    },
    correoRef,
  ) {
    const mov = useMovimiento();
    return (
      <form
        noValidate
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          onEnviar();
        }}
        className="space-y-5"
        aria-label="Invitar a una persona"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invitar-nombre" className="block font-medium text-fg">
              Nombre <span className="font-normal text-fg-subtle">(opcional)</span>
            </Label>
            <Input
              id="invitar-nombre"
              value={nombre}
              onChange={(e) => onNombre(e.target.value)}
              placeholder="Ana Gómez"
              autoComplete="off"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invitar-correo" className="block font-medium text-fg">
              Correo
            </Label>
            <Input
              ref={correoRef}
              id="invitar-correo"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={correo}
              onChange={(e) => onCorreo(e.target.value)}
              onBlur={onSalirDelCorreo}
              placeholder="ana@tuinmobiliaria.co"
              invalid={!!errorDelCorreo}
              aria-invalid={!!errorDelCorreo || undefined}
              aria-describedby={errorDelCorreo ? 'invitar-correo-error' : undefined}
              required
            />
            {errorDelCorreo && (
              <p id="invitar-correo-error" className="text-caption text-danger">
                {errorDelCorreo}
              </p>
            )}
            {!errorDelCorreo && sugerencia && (
              <p className="text-caption text-fg-muted">
                ¿Quisiste decir{' '}
                <button
                  type="button"
                  onClick={onUsarSugerencia}
                  className="font-medium text-fg underline decoration-border-strong underline-offset-2"
                >
                  {sugerencia}
                </button>
                ?
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invitar-rol" className="block font-medium text-fg">
            Rol
          </Label>
          <Select value={rol} onValueChange={(v) => onRol(v as AgencyRole)}>
            <SelectTrigger id="invitar-rol" className="w-full" aria-describedby="invitar-rol-ayuda">
              <SelectValue>{ROLES_PARA_INVITAR.find((r) => r.rol === rol)?.nombre}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLES_PARA_INVITAR.map((r) => (
                <SelectItem key={r.rol} value={r.rol} className="h-auto items-start py-2">
                  <span className="flex flex-col gap-0.5 pr-4 text-left">
                    <span className="text-sm font-medium text-fg">{r.nombre}</span>
                    <span className="text-caption text-fg-muted">{r.queHace}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Al cambiar de rol, la línea nueva llega en su lugar (sin salida:
              dos líneas a la vez se leerían encimadas). */}
          <p id="invitar-rol-ayuda" className="text-caption text-fg-muted">
            <motion.span
              key={rol}
              className="block"
              initial={mov.cambia.initial}
              animate={mov.cambia.animate}
            >
              {queHaceElRol(rol)}
              {cuentaParaElTope(rol) && ' Cuenta para el tope de asesores de tu plan.'}
            </motion.span>
          </p>
        </div>

        {/* `wait`: un motivo distinto reemplaza al anterior sin que los dos
            convivan un instante en el formulario. */}
        <AnimatePresence initial={false} mode="wait">
        {fallo && (
          <motion.div
            key={fallo.mensaje}
            initial={mov.llega.initial}
            animate={mov.llega.animate}
            exit={{ opacity: 0, transition: mov.llega.exit.transition }}
            role="alert"
            className={
              fallo.tope
                ? 'flex items-start gap-2.5 rounded-md border border-border bg-warning-soft p-3'
                : 'flex items-start gap-2.5 rounded-md border border-border bg-danger-soft p-3'
            }
          >
            {fallo.tope ? (
              <Warning className="mt-0.5 size-5 shrink-0 text-warning" weight="fill" aria-hidden="true" />
            ) : (
              <WarningCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" aria-hidden="true" />
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-fg">{fallo.mensaje}</p>
              {fallo.tope && (
                <>
                  <p className="text-caption text-fg-muted">
                    El tope cuenta sólo asesores comerciales: a esta persona la puedes invitar con otro rol.
                  </p>
                  <Link
                    href="/panel/inmobiliaria/upgrade"
                    onClick={onVerPlanes}
                    className="inline-block text-sm font-medium text-primary underline underline-offset-2"
                  >
                    Ver planes
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-fg-muted">
            Le llega un correo con su enlace personal. Vence en 7 días.
          </p>
          <Button type="submit" isLoading={enviando} className="w-full shrink-0 sm:w-auto">
            Enviar invitación
          </Button>
        </div>
      </form>
    );
  },
);
