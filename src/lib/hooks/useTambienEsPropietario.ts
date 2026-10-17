'use client';

import { useEffect, useState } from 'react';
import { informesDelPropietarioApi } from '@/lib/api/informes-del-propietario.service';

/**
 * AVALI-3 (QA de agentes 17-10; Nico: «una cuenta, dos portales»): ¿quien
 * entró con su cuenta de INQUILINO es además propietario de un inmueble que
 * administra una inmobiliaria? En Portofino son 57 de 1.733: su cuenta nació
 * con su contrato de arriendo, y la invitación al portal del propietario la
 * reusa (una persona, una cuenta). Con esto el portal del inquilino le ofrece
 * el del propietario, donde aprueba reparaciones, ve sus giros y certificados.
 *
 * La regla es la del back: tiene ficha de propietario por su correo
 * (`GET /portal/propietario/informes`, que acepta la cuenta de inquilino).
 * Mientras se pregunta, o si falla, `false`: no se ofrece lo que no se sabe.
 */
export function useTambienEsPropietario(activo = true): boolean {
  const [es, setEs] = useState(false);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    informesDelPropietarioApi
      .disponibles()
      .then((d) => {
        if (vivo) setEs(Array.isArray(d?.fichas) && d.fichas.length > 0);
      })
      .catch(() => {
        if (vivo) setEs(false);
      });
    return () => {
      vivo = false;
    };
  }, [activo]);
  return es;
}
