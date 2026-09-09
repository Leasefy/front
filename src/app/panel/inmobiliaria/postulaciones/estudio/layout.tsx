'use client';

/**
 * Evaluación de candidatos está OCULTA por ahora (Nico, 2026-09-08: «esta
 * sección de evaluación de candidatos ocúltala por ahora»).
 *
 * Es un escondite, no una borrada: las páginas de abajo (`estudio/*`: Sala,
 * casos, nuevo, solicitud, cola, analítica, reglas, configuración) se quedan
 * vivas a propósito, con su i18n, para volver a abrirlas descomentando la
 * pantalla en `arquitectura-del-panel.ts`, el workspace en
 * `agentWorkspaceNav.ts` y la fila del buscador (`navigation-source.ts`), y
 * borrando este archivo. Mientras tanto ninguna card, fila ni pestaña la
 * ofrece, y a quien entre por la URL —un enlace guardado, el paso «Evaluación»
 * del recorrido, el cruce desde un caso de Matching— este layout lo devuelve a
 * Postulaciones sin 404. Misma idea que la puerta de Retención
 * (`contratos/(retencion)/layout.tsx`), que también esconde una sección viva.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';

const POSTULACIONES = '/panel/inmobiliaria/postulaciones';

// Recibe `children` porque Next se lo exige a todo layout, pero no lo pinta:
// sería mostrar la sección durante el instante que tarda el reemplazo.
export default function EstudioOcultoLayout(_props: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(POSTULACIONES);
  }, [router]);

  return (
    <div className="flex items-center justify-center py-24">
      {/* El <Spinner> del repo, igual que las demás puertas del panel. */}
      <Spinner size="md" variant="muted" />
    </div>
  );
}
