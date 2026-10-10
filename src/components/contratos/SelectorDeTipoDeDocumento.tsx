'use client'

/**
 * SelectorDeTipoDeDocumento — el tipo de documento de un inquilino (T-0163).
 *
 * La factura electrónica de cada inquilino lo exige (CC, CE, TI, NIT, Pasaporte,
 * PPT) y el back no lo adivina: si falta, esa factura no se emite.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TipoDeDocumentoDelInquilino } from '@/lib/types/contract'

export const TIPOS_DE_DOCUMENTO_DEL_INQUILINO: ReadonlyArray<{
  valor: TipoDeDocumentoDelInquilino
  etiqueta: string
}> = [
  { valor: 'CC', etiqueta: 'CC' },
  { valor: 'CE', etiqueta: 'CE' },
  { valor: 'TI', etiqueta: 'TI' },
  { valor: 'NIT', etiqueta: 'NIT' },
  { valor: 'PASSPORT', etiqueta: 'Pasaporte' },
  { valor: 'PPT', etiqueta: 'PPT' },
]

export function etiquetaDelTipoDeDocumento(tipo: TipoDeDocumentoDelInquilino): string {
  return TIPOS_DE_DOCUMENTO_DEL_INQUILINO.find((t) => t.valor === tipo)?.etiqueta ?? tipo
}

interface Props {
  value: TipoDeDocumentoDelInquilino | ''
  onChange: (tipo: TipoDeDocumentoDelInquilino) => void
  disabled?: boolean
  id?: string
  testId?: string
  ariaLabel?: string
}

export function SelectorDeTipoDeDocumento({ value, onChange, disabled, id, testId, ariaLabel }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TipoDeDocumentoDelInquilino)} disabled={disabled}>
      <SelectTrigger id={id} data-testid={testId} aria-label={ariaLabel}>
        <SelectValue placeholder="Elige el tipo" />
      </SelectTrigger>
      <SelectContent className="z-[400]">
        {TIPOS_DE_DOCUMENTO_DEL_INQUILINO.map((t) => (
          <SelectItem key={t.valor} value={t.valor}>
            {t.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
