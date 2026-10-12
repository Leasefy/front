'use client';

import { useCallback, useState, type ComponentType, type MouseEvent } from 'react';
import { House, UserPlus } from '@phosphor-icons/react';

import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * La ventana de la cuenta encima de la pantalla (Nico, 09-10-2026, con
 * «Publicar inmueble»: «me llevó al inicio, qué raro… explícale que debe crear
 * cuenta si no la tiene, o que inicie sesión; ese modal encima, sin mandarlo
 * al login»). Lo mismo para todo lo del marketplace que pide cuenta: el clic
 * no navega, abre la ventana con el porqué, y al entrar o crearla `AuthForm`
 * sigue a `destino`.
 */
export function useVentanaDeCuenta({
  destino,
  rol,
  titulo,
  detalle,
  Icono,
  testId,
}: {
  destino: string;
  rol: 'tenant' | 'landlord';
  titulo: string;
  detalle: string;
  Icono: ComponentType<{ className?: string; weight?: 'duotone'; 'aria-hidden'?: boolean }>;
  testId: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const abrir = useCallback(() => setAbierta(true), []);

  const ventana = (
    <AuthModal
      isOpen={abierta}
      onOpenChange={setAbierta}
      defaultRole={rol}
      returnUrl={destino}
      titulo={titulo}
      descripcion={detalle}
      aviso={
        <div className="flex items-start gap-3 rounded-lg bg-primary-soft px-4 py-3" data-testid={testId}>
          <Icono className="mt-0.5 h-5 w-5 shrink-0 text-primary" weight="duotone" aria-hidden />
          <div>
            <p className="text-[14.5px] font-medium text-fg">{titulo}</p>
            <p className="mt-0.5 text-[13.5px] text-fg-muted">{detalle}</p>
          </div>
        </div>
      }
    />
  );

  return { abrir, ventana };
}

/**
 * «Publicar inmueble» sin sesión. Sólo una sesión CONFIRMADA navega. Mientras
 * se confirma (en la página pública puede tardar) también se abre la ventana:
 * si la sesión llega, `AuthForm` sigue sola a `destino`.
 */
export function useCuentaParaPublicar(destino: string) {
  const { isAuthenticated } = useAuth();
  const { abrir, ventana } = useVentanaDeCuenta({
    destino,
    rol: 'landlord',
    titulo: 'Para publicar tu inmueble necesitas una cuenta',
    detalle:
      'Créala gratis aquí mismo, o inicia sesión si ya tienes una. Tu inmueble queda a tu nombre y lo manejas desde tu panel.',
    Icono: House,
    testId: 'aviso-cuenta-para-publicar',
  });

  const alTocar = useCallback(
    (e: MouseEvent) => {
      if (isAuthenticated) return;
      e.preventDefault();
      abrir();
    },
    [abrir, isAuthenticated],
  );

  return { alTocar, ventana };
}

/** «Seguir» sin sesión: la misma ventana, y al entrar vuelve aquí (la sigue sola). */
export function useCuentaParaSeguir(destino: string, nombre?: string) {
  return useVentanaDeCuenta({
    destino,
    rol: 'tenant',
    titulo: nombre ? `Para seguir a ${nombre} necesitas una cuenta` : 'Para seguir inmobiliarias necesitas una cuenta',
    detalle:
      'Créala gratis aquí mismo, o inicia sesión si ya tienes una. Te avisamos aquí y por correo cuando publique algo nuevo.',
    Icono: UserPlus,
    testId: 'aviso-cuenta-para-seguir',
  });
}
