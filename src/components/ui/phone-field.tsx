'use client'

/**
 * Campo de celular.
 *
 * Antes el "+57" era texto suelto al lado de un input sin límite: se podía
 * escribir "31178899000000" y pasaba. Ahora el país define el largo máximo, el
 * ejemplo del placeholder y la validación.
 *
 * **Sin selector**: Leasefy solo opera en Colombia, así que la bandera y el
 * indicativo son fijos. Si algún día se habilita otro país, basta con agregar
 * una fila a `PAISES` — el selector aparece solo.
 */

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PAISES, PAIS_POR_DEFECTO, paisPorIso, recortarAlPais } from '@/lib/phone/countries'

export interface PhoneFieldProps {
  /** Número nacional, solo dígitos (sin indicativo). */
  value: string
  onChange: (nacional: string) => void
  /** ISO del país. Colombia por defecto; solo importa si hay más de uno. */
  iso?: string
  onIsoChange?: (iso: string) => void
  id?: string
  disabled?: boolean
  className?: string
  /** Marca el campo como inválido para lectores de pantalla. */
  invalid?: boolean
}

export function PhoneField({
  value,
  onChange,
  iso = PAIS_POR_DEFECTO,
  onIsoChange,
  id = 'phone',
  disabled,
  className,
  invalid,
}: PhoneFieldProps) {
  const pais = paisPorIso(iso)
  const multiPais = PAISES.length > 1

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {multiPais ? (
        <Select
          value={iso}
          onValueChange={(next) => {
            onIsoChange?.(next)
            // Cambiar de país re-recorta: pasar de 10 a 8 dígitos no puede
            // dejar un número más largo del que ese país admite.
            onChange(recortarAlPais(value, next))
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-[108px] shrink-0" aria-label={`País: ${pais.nombre}`}>
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">{pais.bandera}</span>
                <span className="font-mono tabular-nums text-sm">+{pais.indicativo}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAISES.map((p) => (
              <SelectItem key={p.iso} value={p.iso}>
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">{p.bandera}</span>
                  <span>{p.nombre}</span>
                  <span className="font-mono tabular-nums text-xs text-fg-muted">
                    +{p.indicativo}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        /* Un solo país: adorno fijo, no un menú de una sola opción. */
        <span className="flex items-center gap-1.5 shrink-0 px-1" aria-hidden="true">
          <span>{pais.bandera}</span>
          <span className="font-mono tabular-nums text-sm text-fg-muted">+{pais.indicativo}</span>
        </span>
      )}

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-pais`}
        // El largo lo pone el país; el recorte igual se hace en onChange porque
        // maxLength no frena un pegado desde el portapapeles.
        maxLength={pais.longitud}
        // Con "Ej:" delante para que no se lea como un valor ya escrito.
        placeholder={`Ej: ${pais.ejemplo}`}
        value={value}
        onChange={(e) => onChange(recortarAlPais(e.target.value, iso))}
      />
      {/* Para lectores de pantalla: el indicativo es parte del número. */}
      <span id={`${id}-pais`} className="sr-only">
        {`Celular en ${pais.nombre}, indicativo +${pais.indicativo}, ${pais.longitud} dígitos`}
      </span>
    </div>
  )
}
