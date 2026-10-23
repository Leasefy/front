'use client';

import { useEffect, useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  avisoDelError,
  camposDeLaDecision,
  type AvisoDelCorreo as Aviso,
  type DecisionDelCorreo,
} from '@/lib/equipo/aviso-del-correo';
import type { AgencyInviteResult, AgencyUser } from '@/lib/types/inmobiliaria';
import { AvisoDelCorreo } from './AvisoDelCorreo';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cambiar el correo de una invitación que la persona todavía no aceptó
 * (Portofino, 21-10-2026: «que los correos, cuando no se ha aceptado la
 * invitación, los puedas cambiar»). El back cierra la invitación vieja (su
 * enlace deja de servir) e invita al correo nuevo con el mismo nombre, rol y
 * permisos. Si el correo nuevo ya es la cuenta de otra persona, sale el MISMO
 * aviso de invitar, con las mismas salidas.
 */
export function CambiarCorreoDeLaInvitacion({
  persona,
  onCerrar,
  onCambiado,
}: {
  persona: AgencyUser | null;
  onCerrar: () => void;
  /** El resultado del back (con `emailDelivered`) y el correo nuevo. */
  onCambiado: (resultado: AgencyInviteResult, correo: string) => void | Promise<void>;
}) {
  const id = useId();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setCorreo(persona?.email ?? '');
    setError(null);
    setAviso(null);
    setEnviando(false);
  }, [persona]);

  const limpio = correo.trim().toLowerCase();
  const igual = limpio === (persona?.email ?? '').trim().toLowerCase();

  async function enviar(decision?: DecisionDelCorreo) {
    if (!persona) return;
    if (!CORREO_VALIDO.test(limpio)) {
      setError('Escribe un correo válido.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const resultado = await agencyApi.cambiarCorreoDeLaInvitacion(persona.id, {
        email: limpio,
        ...camposDeLaDecision(decision),
      });
      await onCambiado(resultado, limpio);
      onCerrar();
    } catch (e) {
      const elAviso = avisoDelError(e);
      if (elAviso) {
        setAviso(elAviso);
      } else {
        setError(
          mensajeParaLaPersona(e, {
            porDefecto: 'No pudimos cambiar el correo. Prueba de nuevo en un momento.',
            accion: 'cambiar el correo de la invitación',
          }),
        );
      }
    } finally {
      setEnviando(false);
    }
  }

  const nombre = persona?.name?.trim() || persona?.email || 'esta persona';

  return (
    <Dialog open={!!persona} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent size="sm" data-testid="cambiar-correo-de-la-invitacion">
        <DialogHeader>
          <DialogTitle>Cambiar el correo de la invitación</DialogTitle>
          <DialogDescription>
            {nombre} todavía no ha entrado. Le mandamos la invitación al correo nuevo y el enlace
            anterior deja de servir.
          </DialogDescription>
        </DialogHeader>

        <form
          id={`${id}-form`}
          noValidate
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <Label htmlFor={`${id}-correo`}>Correo nuevo</Label>
          <Input
            id={`${id}-correo`}
            type="email"
            autoComplete="off"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              setError(null);
              setAviso(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-correo-error` : undefined}
            data-testid="correo-nuevo-de-la-invitacion"
          />
          <ErrorDelCampo id={`${id}-correo-error`} mensaje={error} />
          <AvisoDelCorreo
            aviso={aviso}
            enviando={enviando}
            nombreEscrito={persona?.name ?? undefined}
            onInvitarIgual={() => void enviar('misma-persona')}
            onDarElCorreo={() => void enviar('es-del-invitado')}
          />
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={`${id}-form`}
            isLoading={enviando && !aviso}
            disabled={enviando || !limpio || !!aviso}
            data-testid="enviar-al-correo-nuevo"
          >
            {igual ? 'Reenviar la invitación' : 'Enviar al correo nuevo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
