'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Gift } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/use-auth';
import { conversionApi } from '@/lib/api/conversion.service';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { aliadoPendiente, olvidarAliadoPendiente, type AccesoDeLaCuenta } from '@/lib/conversion/acceso';

/** Los rechazos que no se arreglan reintentando: se dicen una vez y se olvida el enlace. */
const RECHAZOS_DEFINITIVOS = new Set(['YA_TUVO_PRUEBA', 'YA_TIENES_TODO', 'ALIANZA_NO_EXISTE', 'ALIANZA_VENCIDA', 'ALIANZA_SIN_CUPOS', 'SOLO_EL_ADMINISTRADOR']);

const LO_QUE_INCLUYE = [
  'Contratos con firma electrónica',
  'Recaudo en línea y giros a propietarios',
  'Mori cobra por ti a quien se atrasa',
  'Facturación electrónica y contabilidad',
] as const;

/**
 * El enlace del aliado que quedó pendiente (Nico, 27-10-2026): quien abrió `leasefy.co/aliados/<codigo>` sin sesión
 * se registra y, al entrar por primera vez, aquí se le activa el mes gratis y se le celebra. Sin la migración del back
 * (503) se reintenta en silencio la próxima vez; un rechazo definitivo se dice una vez y se olvida.
 */
export function MesGratisPendiente({ inicio = '/panel/inmobiliaria/inmuebles' }: { inicio?: string }) {
  const { user, refreshAgency } = useAuth();
  const intentado = useRef(false);
  const [activado, setActivado] = useState<AccesoDeLaCuenta | null>(null);

  useEffect(() => {
    if (!user || intentado.current) return;
    const codigo = aliadoPendiente();
    if (!codigo) return;
    intentado.current = true;
    conversionApi
      .usarAlianza(codigo)
      .then((acceso) => {
        olvidarAliadoPendiente();
        setActivado(acceso);
        void refreshAgency();
      })
      .catch((error: unknown) => {
        const code = error instanceof ApiError ? (error.code ?? null) : null;
        if (code && RECHAZOS_DEFINITIVOS.has(code)) {
          olvidarAliadoPendiente();
          if (code !== 'YA_TIENES_TODO') toast.info(mensajeParaLaPersona(error, { accion: 'activar tu mes gratis' }));
        }
        // Otro fallo (sin la migración, red): se reintenta la próxima vez que entre.
      });
  }, [user, refreshAgency]);

  if (!activado) return null;
  const aliado = activado.prueba?.aliado ?? null;
  const dias = activado.prueba?.diasQueQuedan ?? 30;
  return (
    <Dialog open onOpenChange={(o) => !o && setActivado(null)}>
      <DialogContent size="md" icon={<Gift weight="duotone" />} data-testid="mes-gratis-activado">
        <DialogHeader>
          <DialogTitle>{aliado ? `${aliado} te regaló un mes de Leasefy` : 'Tu mes gratis empezó'}</DialogTitle>
          <DialogDescription>
            Tienes Leasefy completo por {dias} días{user?.firstName ? `, ${user.firstName}` : ''}. Publica tus inmuebles, monta tus contratos y
            deja que el cobro se haga solo.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {LO_QUE_INCLUYE.map((x) => (
            <li key={x} className="flex items-center gap-2 text-sm text-fg">
              <CheckCircle size={16} weight="fill" className="shrink-0 text-primary" aria-hidden="true" />
              {x}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button asChild className="rounded-full" onClick={() => setActivado(null)}>
            <Link href={inicio}>Empezar</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
