'use client'

/**
 * El inquilino que tocó un proceso (un estado de cuenta que se le mandó), en
 * el MISMO cajón de la lista de Inquilinos. El proceso guarda la referencia
 * con la que se mandó: la cuenta, la identidad de la lista o —desde la
 * cartera— el documento; si con ella no aparece, se prueba como documento.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { InquilinoDrawer } from '@/components/inmobiliaria/InquilinoDrawer'
import { inquilinosApi } from '@/lib/api/inquilinos.service'
import type { Inquilino } from '@/lib/api/inquilinos.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

async function buscarInquilino(ref: string): Promise<Inquilino> {
  try {
    return await inquilinosApi.obtener(ref)
  } catch (err) {
    if (ref.startsWith('doc:') || (err as { status?: number })?.status !== 404) throw err
    return inquilinosApi.obtener(`doc:${ref}`)
  }
}

export function CajonDelInquilinoDelProceso({ id, onCerrar }: { id: string | null; onCerrar: () => void }) {
  const [persona, setPersona] = useState<Inquilino | null>(null)

  useEffect(() => {
    if (!id) {
      setPersona(null)
      return
    }
    let vivo = true
    buscarInquilino(id)
      .then((p) => vivo && setPersona(p))
      .catch((e) => {
        if (!vivo) return
        toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo abrir al inquilino.', accion: 'abrir al inquilino' }))
        onCerrar()
      })
    return () => {
      vivo = false
    }
  }, [id, onCerrar])

  return <InquilinoDrawer persona={persona} onCerrar={onCerrar} />
}
