'use client'

/**
 * /panel/inmobiliaria/procesos — el CENTRO DE PROCESOS, historial completo.
 *
 * Nico (22-09-2026): «creemos un CENTRO DE PROCESOS para esas cargas y
 * descargas de todos los documentos que tenemos en la plataforma». El botón
 * de la barra de arriba muestra lo último; acá está todo, con filtros.
 *
 * Sin `module`: todo miembro ve LO SUYO (lo que lanzó ya pasó por el permiso
 * de su módulo); el administrador y el contador, lo de todo el equipo. Esa
 * regla la aplica el back (`quien-ve-los-procesos.ts`) y llega como `veTodos`;
 * esta pantalla no la repite.
 *
 * ⚠️ No confundir con `/piloto/procesos`: ésos son los procesos del PILOTO
 * (depósitos, llamadas, WhatsApp). Éstos son los que lanza una persona.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { HistorialDeProcesos } from '@/components/procesos/HistorialDeProcesos'

export default function CentroDeProcesosPage() {
  return (
    <PageGuard>
      <div className="space-y-6 p-6 lg:p-8" data-testid="centro-de-procesos-page">
        <EncabezadoDePantalla
          // Ronda 30 (revisora r27, R4): sin sobretítulo —«General» no es una sección del menú—; como
          // Notificaciones, se abre desde la barra de arriba (el botón de procesos queda marcado).
          titulo="Centro de procesos"
          descripcion="Las cargas y descargas de archivos de la plataforma, con su estado y su resultado."
        />
        <HistorialDeProcesos />
      </div>
    </PageGuard>
  )
}
