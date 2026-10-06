'use client'

/**
 * La pantalla ELEGIDA del piloto automático (Nico, 05-10-2026 17:05), tal cual:
 * la base es B · Cabina, con dos piezas de las otras direcciones.
 *
 *   1. Arriba, el núcleo de A tal como está: orbe al centro, los cuatro
 *      medidores, la voz del director con su frase, «Recuperado este mes» y la
 *      franja de telemetría con lo que pasa ahora. Reemplaza la franja de
 *      estado de la Cabina.
 *   2. Justo debajo, a todo el ancho: «Hoy, hora por hora» de C, con «Hoy, sin
 *      hora fija».
 *   3. De la Cabina se quedan Plan del día (con «Lo que viene» y Metas),
 *      Alertas, Lo urgente, En vivo y La tripulación. Se fueron las tarjetas que
 *      el núcleo ya dice: Recuperado, Decisiones que esperan, Agentes en
 *      servicio y «Hoy».
 *
 * Cada número una vez: en el núcleo no van las píldoras de severidad (las dice
 * «Alertas») y Plan del día no repite el avance (lo dice su medidor).
 *
 * ⚠️ Todo entra al montarse, SIN `inView` (ni el `Stagger` ni los `Appear`): con `inView` las tarjetas
 * esperan en `opacity: 0` hasta que el 10 % de la grilla (que mide ~1.500 px)
 * entra en pantalla, y una captura de página entera, una impresión o quien
 * salta con el teclado las veía vacías (medido el 05-10 en el navegador).
 *
 * La grilla va en dos columnas que apilan solas (7 + 5): sin huecos aunque una
 * tarjeta crezca. En el teléfono: núcleo, línea del día (vertical), plan, lo
 * urgente, alertas, en vivo y la tripulación.
 */

import { useMemo } from 'react'
import { Appear, Stagger, StaggerItem } from '@leasefy/cadence'

import { cn } from '@/lib/utils'

import { eventosDeHoy } from './calculos'
import { EnVivo, LoUrgente, PlanDelDirector, TARJETA, TarjetaDeAlertas, Tripulacion } from './DireccionCabina'
import { HoyHoraPorHora } from './DireccionMision'
import { DireccionNucleo } from './DireccionNucleo'
import { indicadoresDelMando } from './indicadores'
import { useAhora } from './piezas'
import { RitmoDeLosAgentes, TarjetaDelNegocio } from './tendencias'
import type { PropsDeDireccion } from './tipos'

export function DireccionElegida({ datos, acciones, activacion }: PropsDeDireccion) {
  const ahora = useAhora(30_000)
  const ind = indicadoresDelMando(datos, ahora)
  const eventos = useMemo(
    () => eventosDeHoy({ actividad: ind.actividad, pulso: datos.pulso.data, hoy: ind.director, ahora }),
    [ind.actividad, datos.pulso.data, ind.director, ahora],
  )
  const apagado = ind.estado === 'apagado'

  return (
    <div className="space-y-4" data-testid="mando-elegida">
      {/* 1. El núcleo (A), sin sus paneles ni la activación: los pone esta pantalla. */}
      <DireccionNucleo datos={datos} acciones={acciones} {...(activacion ? { activacion } : {})} variante="cabecera" />

      {/* 2. Hoy, hora por hora (C), a todo el ancho. */}
      <Appear distance="sm" className={cn(TARJETA, 'p-5 sm:p-6')}>
        <section aria-label="Hoy, hora por hora">
          <HoyHoraPorHora eventos={eventos} pieza={datos.actividad} ahora={ahora} onAbrir={(id) => acciones.abrirItem(id)} />
        </section>
      </Appear>

      {/* 3. La Cabina (B), sin lo que el núcleo ya dice. */}
      <Stagger className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <StaggerItem key="izquierda" className="min-w-0 space-y-4 lg:col-span-7">
          <section className={cn(TARJETA, 'p-5')} aria-label="Plan del día">
            <PlanDelDirector
              ind={ind}
              datos={datos}
              apagado={apagado}
              conActivacion={Boolean(activacion)}
              conAvance={false}
              {...(acciones.abrirDirector ? { onAbrir: acciones.abrirDirector } : {})}
            />
          </section>
          <section className={cn(TARJETA, 'p-5')} aria-label="Lo urgente">
            <LoUrgente ind={ind} datos={datos} acciones={acciones} ahora={ahora} {...(acciones.abrirBandeja ? { onAbrirBandeja: acciones.abrirBandeja } : {})} />
          </section>
          {/* MANDO-DATOS: lo que hicieron solos, por día y por agente (14 días). */}
          <RitmoDeLosAgentes ind={ind} datos={datos} />
        </StaggerItem>
        <StaggerItem key="derecha" className="min-w-0 space-y-4 lg:col-span-5">
          {/* MANDO-DATOS: el recaudo del mes, la mora de más de 30 días y las horas ahorradas. */}
          <TarjetaDelNegocio ind={ind} datos={datos} />
          <TarjetaDeAlertas ind={ind} />
          <section className={cn(TARJETA, 'p-5')} aria-label="En vivo">
            <EnVivo ind={ind} datos={datos} acciones={acciones} {...(acciones.abrirActividad ? { onAbrirActividad: acciones.abrirActividad } : {})} />
          </section>
        </StaggerItem>
      </Stagger>

      <Appear distance="sm" className={cn(TARJETA, 'p-5')}>
        <section aria-label="La tripulación">
          <Tripulacion ind={ind} datos={datos} acciones={acciones} />
        </section>
      </Appear>

      {activacion}
    </div>
  )
}
