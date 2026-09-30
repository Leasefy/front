'use client'

/**
 * Riesgo · Vinci — los casos: inquilinos (¿se van al fin del contrato?) y
 * propietarios (¿sacan sus inmuebles?), cada uno con su puntaje y QUÉ señal
 * del ERP sumó cuánto. Antes era la bandeja de un portafolio de EJEMPLO que
 * sólo cuidaba al propietario.
 *
 * 29-09-2026 · glow-up: la cabecera del panel, y filtros + tabla en UNA
 * tarjeta con el patrón de tablas de Contratos (`TablaDeCasos`). La frase
 * larga del encabezado se fue: repetía las cuentas que ya dicen los filtros
 * («Inquilinos (8)»); lo único que no decían —cuándo midió— quedó en la
 * cabecera de la tarjeta.
 */
import { useMemo, useState } from 'react'
import { SegmentedControl } from '@leasefy/cadence'
import { HeartStraight, UsersThree } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { SinDatos } from '@/components/estado/SinDatos'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { useRiesgoDeVinci } from '@/lib/hooks/retencion/use-vinci'
import { fechaYHora } from '@/components/retencion/vinci'
import { CabeceraDeVinci, TarjetaDeVinci } from '@/components/retencion/piezas'
import { TablaDeCasos } from '@/components/retencion/TablaDeCasos'
import type { Poblacion } from '@/lib/types/retencion'

type Filtro = Poblacion | 'todos'

export default function BandejaClient() {
  const { data, isLoading, error, refetch } = useRiesgoDeVinci()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [soloEnRiesgo, setSoloEnRiesgo] = useState(true)

  const casos = useMemo(
    () =>
      (data?.casos ?? [])
        .filter((c) => (filtro === 'todos' ? true : c.poblacion === filtro))
        .filter((c) => (soloEnRiesgo ? c.enRiesgo : true))
        .sort((a, b) => b.puntaje - a.puntaje),
    [data, filtro, soloEnRiesgo],
  )
  const cuenta = (p: Filtro) =>
    (data?.casos ?? []).filter((c) => (p === 'todos' || c.poblacion === p) && (soloEnRiesgo ? c.enRiesgo : true)).length
  // Los que el filtro «Sólo los que pasan el umbral» esconde: por debajo del umbral o en cobranza.
  const escondidos = (data?.casos ?? []).filter((c) => (filtro === 'todos' || c.poblacion === filtro) && !c.enRiesgo).length

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <CabeceraDeVinci
        titulo="Casos en riesgo"
        descripcion="Propietarios que pueden sacar su inmueble e inquilinos que pueden no renovar, con qué señal del ERP sumó cuánto."
      />

      <EstadoDeDatos
        cargando={isLoading && !data}
        error={error}
        vacio={Boolean(data) && !data!.disponible}
        queEs="los casos de retención"
        onReintentar={() => refetch()}
        principal
        cuandoVacio={
          <div className="rounded-lg border border-border bg-card">
            <SinDatos
              queSon="casos"
              icono={HeartStraight}
              titulo="Vinci no puede medir todavía"
              descripcion={`Faltan datos del ERP (${data?.faltan.join(', ') ?? ''}). No se muestran casos inventados.`}
            />
          </div>
        }
      >
        {data ? (
          <TarjetaDeVinci
            id="vinci-casos"
            icono={UsersThree}
            titulo="Casos"
            descripcion={`${data.deLoGuardado ? `Medido ${fechaYHora(data.leidoEn)} (el último barrido)` : `Medido ahora (${fechaYHora(data.leidoEn)})`}. En riesgo desde ${data.umbral}/100. Toca un caso para ver por qué, qué ofrecerle y el plan.`}
            cuerpo={false}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="max-w-full overflow-x-auto">
                <SegmentedControl<Filtro>
                  aria-label="Inquilinos o propietarios"
                  value={filtro}
                  onChange={setFiltro}
                  options={[
                    { value: 'todos', label: `Todos (${cuenta('todos')})` },
                    { value: 'inquilino', label: `Inquilinos (${cuenta('inquilino')})` },
                    { value: 'propietario', label: `Propietarios (${cuenta('propietario')})` },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vinci-solo-en-riesgo"
                  checked={soloEnRiesgo}
                  onCheckedChange={(v) => setSoloEnRiesgo(v === true)}
                  data-testid="vinci-solo-en-riesgo"
                />
                <label htmlFor="vinci-solo-en-riesgo" className="cursor-pointer text-sm text-fg">
                  Sólo los que pasan el umbral
                </label>
              </div>
            </div>
            <TablaDeCasos
              casos={casos}
              conPlan
              vacio={
                <SinDatos
                  queSon="casos"
                  icono={HeartStraight}
                  titulo={soloEnRiesgo ? 'Nadie pasa el umbral' : 'Nadie con señales de irse'}
                  descripcion={
                    soloEnRiesgo && escondidos > 0
                      ? `Con las señales del ERP de hoy nadie llega a ${data.umbral}/100. ${escondidos === 1 ? 'Otro está' : `Otros ${escondidos} están`} por debajo o los lleva cobranza: quita «Sólo los que pasan el umbral» para ${escondidos === 1 ? 'verlo' : 'verlos'}.`
                      : 'Con las señales del ERP de hoy no hay casos para mostrar con este filtro.'
                  }
                />
              }
            />
          </TarjetaDeVinci>
        ) : null}
      </EstadoDeDatos>
    </div>
  )
}
