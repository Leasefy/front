'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BeneficiosEn3D, EscenaDeMarca, SelloDelAliado } from '@/components/conversion/EscenaDeMarca';
import { useAuth } from '@/lib/auth/use-auth';
import { conversionApi } from '@/lib/api/conversion.service';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { aliadoPendiente, olvidarAliadoPendiente, type AccesoDeLaCuenta } from '@/lib/conversion/acceso';

/** Los rechazos que no se arreglan reintentando: se dicen una vez y se olvida el enlace. */
const RECHAZOS_DEFINITIVOS = new Set(['YA_TUVO_PRUEBA', 'YA_TIENES_TODO', 'ALIANZA_NO_EXISTE', 'ALIANZA_VENCIDA', 'ALIANZA_SIN_CUPOS', 'SOLO_EL_ADMINISTRADOR']);

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
        void refreshAgency({ despuesDeUnCambio: true });
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
  const cerrar = () => setActivado(null);
  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid="mes-gratis-activado">
        <DialogBody className="p-0 sm:p-0">
          {/* Nico, 28-10: «sumar el logo de ellos… que se vea súper top». El sello de los dos, con la chispa al abrir. */}
          <EscenaDeMarca principal="novedad_regalo" acompanantes={['novedad_regalo', 'contrato', 'llaves', 'banco']} celebrar>
            {aliado ? <SelloDelAliado aliado={aliado} /> : undefined}
          </EscenaDeMarca>
          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
                {aliado ? `Un regalo de ${aliado}` : 'Tu mes gratis'} · {dias} días
              </p>
              <DialogTitle className="text-h2 text-fg">
                {aliado ? `${aliado} te regaló un mes de Leasefy completo` : 'Tu mes gratis de Leasefy empezó'}
              </DialogTitle>
              <DialogDescription className="text-body text-fg-muted">
                {user?.firstName ? `${user.firstName}, tienes` : 'Tienes'} todo Leasefy por {dias} días. Publica tus inmuebles, monta tus
                contratos y deja que el cobro se haga solo.
              </DialogDescription>
            </div>
            <BeneficiosEn3D />
            <div className="flex justify-end">
              <Button asChild onClick={cerrar}>
                <Link href={inicio} data-testid="mes-gratis-empezar">
                  Empezar
                </Link>
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
