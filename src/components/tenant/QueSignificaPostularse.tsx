'use client'

/**
 * QueSignificaPostularse — la expectativa, dicha antes y no después.
 *
 * Dos cosas que hay que dejar claras en el catálogo propio, y que hasta ahora
 * no estaban dichas en ninguna parte:
 *
 * 1. **Por qué este catálogo es suyo.** No es la vitrina pública filtrada por
 *    gusto: son las propiedades que su aprobación alcanza. Si no se explica, el
 *    número de arriba parece un adorno.
 * 2. **Postularse NO es que le entreguen la propiedad.** Es el miedo que Víctor
 *    puso en la reunión —*"el man cree que ya quedó postulado"*— y su gemelo,
 *    peor: creer que postularse es cerrar el negocio. Entra a un proceso donde
 *    lo comparan con otros candidatos y puede quedar por fuera.
 *
 * Se dice acá, en el catálogo, **antes** de que se postule. Decirlo después
 * —cuando ya se ilusionó— es una disculpa, no una explicación. Y no se pone
 * como aviso de peligro: es información normal de cómo funciona arrendar.
 *
 * ⚠️ **Sin tiempos inventados.** No hay SLA definido en el producto todavía, y
 * escribir "te responden en 48 horas" sería prometer en nombre de una
 * inmobiliaria que no lo prometió.
 */

import { Buildings, FileText, PaperPlaneTilt, UsersThree } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

const PASOS = [
  {
    icono: PaperPlaneTilt,
    titulo: 'Te postulas',
    texto:
      'Puedes postularte a varias propiedades al tiempo con la misma aprobación, sin volver a consultar ni a pagar.',
  },
  {
    icono: UsersThree,
    titulo: 'Te comparan con otros candidatos',
    texto:
      'Postularte no reserva la propiedad ni te la entrega. La inmobiliaria revisa tu postulación junto con las demás.',
  },
  {
    icono: Buildings,
    titulo: 'Te dan una respuesta',
    texto:
      'Te avisamos acá y por correo si te eligieron. Si no te eligieron también te lo decimos, no te quedas esperando.',
  },
  {
    icono: FileText,
    titulo: 'Firmas en línea',
    texto: 'Si te eligen, el contrato se firma desde acá. No tienes que ir a ninguna oficina.',
  },
]

export function QueSignificaPostularse({ className }: { className?: string }) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-surface p-5', className)}
      aria-labelledby="que-significa-postularse"
    >
      <h2 id="que-significa-postularse" className="text-sm font-medium text-fg">
        Qué pasa cuando te postulas
      </h2>
      <p className="text-sm text-fg-muted mt-1 leading-relaxed">
        Estas propiedades están dentro de lo que las aseguradoras te aprobaron, así que puedes
        tomarlas. Postularte es el primer paso de un proceso, no el final.
      </p>

      <ol className="mt-4 grid gap-4 sm:grid-cols-2">
        {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center shrink-0">
              <Icono className="w-5 h-5 text-fg" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">
                <span className="font-mono tabular-nums text-fg-muted mr-1.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {titulo}
              </p>
              <p className="text-sm text-fg-muted mt-0.5 leading-relaxed">{texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
