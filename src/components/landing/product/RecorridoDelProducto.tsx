'use client'

import { useEffect, useRef, useState } from 'react'
import type { PasoDelRecorrido } from '@/lib/landing/capturas'
import { MarcoDeCaptura } from './MarcoDeCaptura'

interface Historia {
  kicker: string
  h3: string
  body: string
}

/**
 * Las tres historias de cada interna, contadas SOBRE el producto: a la
 * izquierda el texto; a la derecha la pantalla real, fija, que cambia y se
 * acerca a la parte que cuenta la historia que se está leyendo. En el celular
 * cada historia lleva su pantalla debajo.
 */
export function RecorridoDelProducto({ historias, pasos }: { historias: Historia[]; pasos: PasoDelRecorrido[] }) {
  const [activa, setActiva] = useState(0)
  const refs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const vistos = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setActiva(Number((e.target as HTMLElement).dataset.indice))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.forEach((el) => el && vistos.observe(el))
    return () => vistos.disconnect()
  }, [])

  const paso = pasos[activa] ?? pasos[0]

  return (
    <div className="landing-pr-recorrido">
      <div className="landing-pr-recorrido-textos">
        {historias.map((h, i) => (
          <article
            key={h.h3}
            ref={(el) => {
              refs.current[i] = el
            }}
            data-indice={i}
            data-activa={i === activa ? 'true' : 'false'}
            className="landing-pr-historia"
            data-testid="product-story"
          >
            <p className="landing-pr-historia-kicker">
              <span className="landing-pr-historia-n">{`0${i + 1}`}</span>
              {h.kicker}
            </p>
            <h3>{h.h3}</h3>
            <p className="landing-pr-historia-cuerpo">{h.body}</p>
            {pasos[i] && (
              <div className="landing-pr-historia-marco">
                <MarcoDeCaptura captura={pasos[i].captura} foco={pasos[i].foco} etiqueta={pasos[i].etiqueta} />
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="landing-pr-recorrido-fijo" aria-hidden="true">
        <div className="landing-pr-recorrido-pegado">
          <MarcoDeCaptura captura={paso.captura} foco={paso.foco} etiqueta={paso.etiqueta} />
          <ol className="landing-pr-recorrido-puntos">
            {historias.map((h, i) => (
              <li key={h.h3} data-activo={i === activa ? 'true' : 'false'} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
