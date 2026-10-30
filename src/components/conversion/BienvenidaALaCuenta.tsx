'use client';

import { useEffect, useState } from 'react';
import type { NombreIlustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BeneficiosEn3D, EscenaDeMarca, type BeneficioEn3D } from '@/components/conversion/EscenaDeMarca';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * La bienvenida al entrar por primera vez (Nico, 30-10-2026: «estas bienvenidas deben estar en todas las plataformas
 * cuando se cree la cuenta, porque en la de propietario no vi»). La misma escena que la de la inmobiliaria
 * (`CandadoDelModoComercial` › `BienvenidaComercial`): una sola vez por cuenta y perfil en este navegador.
 */
export function BienvenidaALaCuenta({
  perfil,
  rotulo,
  descripcion,
  items,
  acompanantes,
  activa = true,
}: {
  perfil: 'propietario' | 'propietario-de-inmobiliaria' | 'inquilino';
  rotulo: string;
  descripcion: string;
  items: readonly BeneficioEn3D[];
  acompanantes: NombreIlustracion[];
  /** Mientras no se sabe qué ve la persona (cargando), no se abre. */
  activa?: boolean;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const nombre = user?.firstName?.trim() || null;
  const clave = userId ? `leasefy-bienvenida-${perfil}:${userId}` : null;
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!clave || !activa) return;
    try {
      if (window.localStorage.getItem(clave) !== '1') setAbierta(true);
    } catch {
      // Sin almacenamiento: no se insiste.
    }
  }, [clave, activa]);

  const cerrar = () => {
    setAbierta(false);
    if (!clave) return;
    try {
      window.localStorage.setItem(clave, '1');
    } catch {
      // Sin almacenamiento: la próxima vez sale otra vez, y ya.
    }
  };

  return (
    <Dialog open={abierta} onOpenChange={(o) => (o ? setAbierta(true) : cerrar())}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid={`bienvenida-${perfil}`}>
        <DialogBody className="p-0 sm:p-0">
          <EscenaDeMarca principal="bienvenida" acompanantes={acompanantes} celebrar={abierta} />
          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">{rotulo}</p>
              <DialogTitle className="text-h2 text-fg">{nombre ? `¡Te damos la bienvenida, ${nombre}!` : '¡Te damos la bienvenida a Leasefy!'}</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">{descripcion}</DialogDescription>
            </div>
            <BeneficiosEn3D items={items} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={cerrar} data-testid={`bienvenida-${perfil}-seguir`}>
                Empezar
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/** El propietario: el independiente (publica y administra solo) o el que tiene inmobiliaria (ve su plata). */
export function BienvenidaDelPropietario({ deInmobiliaria, activa }: { deInmobiliaria: boolean; activa: boolean }) {
  return deInmobiliaria ? (
    <BienvenidaALaCuenta
      perfil="propietario-de-inmobiliaria"
      rotulo="Tu portal de propietario"
      descripcion="Aquí ves lo que tu inmobiliaria hace con tus inmuebles: lo que te giran, tus solicitudes y tus documentos, sin pedirlos por teléfono."
      items={[
        { ilustracion: 'banco', texto: 'Tus giros y tu estado de cuenta' },
        { ilustracion: 'portapapeles', texto: 'Las solicitudes de tus inmuebles' },
        { ilustracion: 'mensajes', texto: 'Mensajes con tu inmobiliaria' },
        { ilustracion: 'factura', texto: 'Tus certificados y documentos' },
      ]}
      acompanantes={['casa', 'banco', 'mensajes', 'llaves']}
      activa={activa}
    />
  ) : (
    <BienvenidaALaCuenta
      perfil="propietario"
      rotulo="Ya estás en Leasefy"
      descripcion="Publica tus inmuebles, encuentra a tu inquilino y administra tu arriendo desde aquí. Lo de abajo es tuyo, gratis."
      items={[
        { ilustracion: 'casa', texto: 'Tus inmuebles en el marketplace' },
        { ilustracion: 'mensajes', texto: 'Los interesados que te escriben' },
        { ilustracion: 'visita', texto: 'Tu agenda de visitas' },
        { ilustracion: 'portapapeles', texto: 'Las postulaciones de inquilinos' },
      ]}
      acompanantes={['casa', 'megafono', 'mensajes', 'llaves']}
      activa={activa}
    />
  );
}

/** El inquilino: buscar, su calificación gratis y su arriendo. */
export function BienvenidaDelInquilino({ activa = true }: { activa?: boolean }) {
  return (
    <BienvenidaALaCuenta
      perfil="inquilino"
      rotulo="Ya estás en Leasefy"
      descripcion="Busca tu próximo arriendo, postúlate sin papeleo y, cuando arriendes, paga y sigue tu contrato desde aquí."
      items={[
        { ilustracion: 'casa', texto: 'Busca arriendo en el marketplace' },
        { ilustracion: 'portapapeles', texto: 'Tu calificación: hasta cuánto te arriendan, gratis' },
        { ilustracion: 'calendario_pago', texto: 'Paga tu arriendo en línea y ve tus recibos' },
        { ilustracion: 'mensajes', texto: 'Mensajes con tu inmobiliaria o propietario' },
      ]}
      acompanantes={['casa', 'llaves', 'mensajes', 'portapapeles']}
      activa={activa}
    />
  );
}
