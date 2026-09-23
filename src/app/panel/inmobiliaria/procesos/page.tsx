'use client'

/**
 * /panel/inmobiliaria/procesos — el CENTRO DE PROCESOS, historial completo.
 *
 * Nico (22-09-2026): «creemos un CENTRO DE PROCESOS para esas cargas y
 * descargas de todos los documentos que tenemos en la plataforma». El botón
 * de la barra de arriba muestra lo último; acá está todo, con filtros.
 *
 * Sin `module`: todo miembro ve LO SUYO (lo que lanzó ya pasó por el permiso
 * de su módulo) y el administrador, lo de todo el equipo. Esa regla la aplica
 * el back (`ProcesosService.listar`), no esta pantalla.
 *
 * ⚠️ No confundir con `/piloto/procesos`: ésos son los procesos del PILOTO
 * (depósitos, llamadas, WhatsApp). Éstos son los que lanza una persona.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { SectionLabel } from '@/components/ui/section-label'
import { HistorialDeProcesos } from '@/components/procesos/HistorialDeProcesos'

export default function CentroDeProcesosPage() {
  return (
    <PageGuard>
      <div className="space-y-6 p-6 lg:p-8" data-testid="centro-de-procesos-page">
        <header className="space-y-1.5">
          <SectionLabel>General</SectionLabel>
          <h1 className="text-h2 text-fg">Centro de procesos</h1>
        </header>
        <HistorialDeProcesos />
      </div>
    </PageGuard>
  )
}
