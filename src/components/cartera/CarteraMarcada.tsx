'use client'

/**
 * Las acciones masivas de Cartera (Nico, 10-10-2026; eligió Cobro).
 *
 *  - «Estado de cuenta por correo / WhatsApp» — a los INQUILINOS de las cuotas
 *    marcadas, uno por persona (por su documento), como «Compartir» en la ficha.
 *  - «Recordatorio» — a las cuotas que ya tienen su cobro emitido (el
 *    recordatorio sale del cobro; una cuota sin cobro no tiene qué recordar).
 *  - «Exportar» — una fila por cuota, con lo que muestra la tabla.
 *
 * Los envíos van en UNA petición al back, que los recorre en el centro de
 * procesos: el back topa los envíos por persona.
 */

import { useState } from 'react'
import { BellRinging, EnvelopeSimple, FileXls, WhatsappLogo } from '@phosphor-icons/react'

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirmar'
import { toast } from '@/components/ui/toast'
import { cobrosApi } from '@/lib/api/inmobiliaria.service'
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service'
import { enBloqueEnElServidor } from '@/lib/masivas/en-bloque'
import { descargar } from '@/lib/propietarios/exportar-datos'
import type { CarteraItem } from '@/lib/types/inmobiliaria'

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`)

/** Los inquilinos (uno por persona) y los cobros de lo marcado. Pura, para probarla. */
export function deLaCarteraMarcada(marcadas: readonly CarteraItem[]) {
  const personas = new Map<string, string>()
  let sinDocumento = 0
  for (const i of marcadas) {
    const doc = i.tenantDocument?.trim()
    if (!doc) {
      sinDocumento += 1
      continue
    }
    if (!personas.has(doc)) personas.set(doc, i.tenantName ?? 'Inquilino sin nombre')
  }
  return {
    clientes: [...personas].map(([id, nombre]) => ({ id, nombre, documento: id })),
    sinDocumento,
    cobroIds: [...new Set(marcadas.flatMap((i) => (i.cobroId ? [i.cobroId] : [])))],
  }
}

export function hojaDeLaCartera(marcadas: readonly CarteraItem[]): (string | number)[][] {
  return [
    ['Inquilino', 'Documento', 'Teléfono', 'Inmueble', 'Propietario', 'Mes', 'Vence', 'Días de mora', 'Debe', 'Total con intereses'],
    ...marcadas.map((i) => [
      i.tenantName ?? '',
      i.tenantDocument ?? '',
      i.tenantPhone ?? '',
      i.propertyAddress ?? i.propertyTitle,
      i.propietarioName ?? '',
      i.month,
      i.vence?.slice(0, 10) ?? '',
      i.diasDeMora,
      i.pendingAmount,
      i.totalConInteresCop ?? i.pendingAmount,
    ]),
  ]
}

export function CarteraMarcada({
  marcadas,
  onQuitar,
  puedeCompartir,
  puedeRecordar,
}: {
  marcadas: readonly CarteraItem[]
  onQuitar: () => void
  puedeCompartir: boolean
  puedeRecordar: boolean
}) {
  const [ocupado, setOcupado] = useState(false)
  const { clientes, sinDocumento, cobroIds } = deLaCarteraMarcada(marcadas)

  const mandarEstado = async (canal: 'CORREO' | 'WHATSAPP') => {
    const porDonde = canal === 'CORREO' ? 'por correo' : 'por WhatsApp'
    const ok = await confirmar({
      titulo: `¿Les mandamos el estado de cuenta ${porDonde} a ${plural(clientes.length, 'inquilino', 'inquilinos')}?`,
      descripcion: `Uno por persona, con todo lo que debe. Le llega a quien tiene cuenta en el portal; a los demás se les deja el enlace para mandárselo a mano.${
        sinDocumento > 0 ? ` ${plural(sinDocumento, 'cuota no tiene', 'cuotas no tienen')} el documento del inquilino y se ${sinDocumento === 1 ? 'salta' : 'saltan'}.` : ''
      }`,
      accion: `Mandar ${porDonde}`,
      icono: canal === 'CORREO' ? <EnvelopeSimple weight="bold" /> : <WhatsappLogo weight="bold" />,
    })
    if (!ok) return
    setOcupado(true)
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Estado de cuenta ${porDonde} a ${plural(clientes.length, 'inquilino', 'inquilinos')}`,
        pedir: () => estadoDeCuentaApi.enviarEnBloque('inquilino', canal, clientes),
        accion: 'mandar los estados de cuenta',
      })
      if (arranco) onQuitar()
    } finally {
      setOcupado(false)
    }
  }

  const recordar = async () => {
    const ok = await confirmar({
      titulo: `¿Mandamos el recordatorio de ${plural(cobroIds.length, 'cobro', 'cobros')}?`,
      descripcion: `Sale por la secuencia de cobranza.${
        marcadas.length - cobroIds.length > 0
          ? ` ${plural(marcadas.length - cobroIds.length, 'cuota todavía no tiene', 'cuotas todavía no tienen')} su cobro emitido y se ${marcadas.length - cobroIds.length === 1 ? 'salta' : 'saltan'}.`
          : ''
      }`,
      accion: 'Mandar los recordatorios',
      icono: <BellRinging weight="bold" />,
    })
    if (!ok) return
    setOcupado(true)
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Recordatorio de ${plural(cobroIds.length, 'cobro', 'cobros')}`,
        pedir: () => cobrosApi.recordatoriosEnElCentro(cobroIds),
        accion: 'mandar los recordatorios',
      })
      if (arranco) onQuitar()
    } finally {
      setOcupado(false)
    }
  }

  const exportar = async () => {
    setOcupado(true)
    try {
      const XLSX = await import('xlsx')
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(hojaDeLaCartera(marcadas)), 'Cartera')
      const bytes = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
      const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
      const nombre = `cartera-${dia}.xlsx`
      descargar(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre)
      toast.success('Exportamos lo marcado', { description: `${nombre}: ${plural(marcadas.length, 'cuota', 'cuotas')}.` })
    } catch {
      toast.error('No pudimos armar el Excel', { description: 'Prueba de nuevo en un momento.' })
    } finally {
      setOcupado(false)
    }
  }

  const nada = marcadas.length === 0
  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="cartera-marcada"
      className="max-md:hidden"
      marcadas={marcadas.length}
      queSon={['cuota', 'cuotas']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca cuotas para mandarles el estado de cuenta o el recordatorio a sus inquilinos, o exportarlas."
    >
      <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void exportar()} data-testid="exportar-marcados">
        <FileXls className="h-4 w-4" />
        Exportar
      </Button>
      {puedeRecordar && (
        <Button variant="ghost" size="sm" hideArrow disabled={ocupado || cobroIds.length === 0} onClick={() => void recordar()} data-testid="recordar-marcados">
          <BellRinging className="h-4 w-4" />
          Recordatorio
        </Button>
      )}
      {puedeCompartir && (
        <>
          <Button variant="secondary" size="sm" hideArrow disabled={ocupado || clientes.length === 0} onClick={() => void mandarEstado('WHATSAPP')} data-testid="estado-por-whatsapp-marcados">
            <WhatsappLogo className="h-4 w-4" />
            Por WhatsApp
          </Button>
          <Button size="sm" hideArrow disabled={ocupado || clientes.length === 0} onClick={() => void mandarEstado('CORREO')} data-testid="estado-por-correo-marcados">
            <EnvelopeSimple className="h-4 w-4" />
            Estado de cuenta por correo
          </Button>
        </>
      )}
    </BarraDeAccionesMasivas>
  )
}
