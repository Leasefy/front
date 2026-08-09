'use client'

/**
 * El formulario de PSE como funciona de verdad.
 *
 * Antes pedía banco, nombre y documento — y eso rebota en el banco, no acá.
 * ACH exige distinguir persona natural de jurídica (cambia el documento
 * válido) y manda el comprobante a un correo. Faltando eso, la persona
 * descubre el problema **después** de salir de nuestra pantalla, donde ya no
 * podemos explicarle nada.
 *
 * Todo con @leasefy/cadence: FormField/FormLabel/FormError para el par
 * etiqueta-error, RadioCard para la elección de arriba, Combobox para el banco
 * —buscable, porque son quince y van a ser treinta— y Callout para lo que pasa
 * después.
 */

import { useMemo } from 'react'
import {
  Fieldset,
  FormField,
  FormLabel,
  FormControl,
  FormHint,
  FormError,
  Input,
  RadioCardGroup,
  RadioCard,
  Combobox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Callout,
  Spinner,
} from '@leasefy/cadence'
import { Bank, ShieldCheck } from '@phosphor-icons/react'
import {
  documentosDe,
  ejemploDeDocumento,
  alCambiarTipoDePersona,
  type DatosDePagoPSE,
  type ErroresDePago,
  type TipoDePersona,
} from '@/lib/pago/pse'
import type { PSEBank } from '@/lib/api/subscriptions.types'

export interface FormularioPSEProps {
  valor: DatosDePagoPSE
  onCambio: (valor: DatosDePagoPSE) => void
  bancos: PSEBank[]
  /** true mientras se traen los bancos: el combobox lo dice en vez de verse vacío. */
  cargandoBancos?: boolean
  /** Se llenan al intentar enviar, no mientras se escribe. */
  errores?: ErroresDePago
  deshabilitado?: boolean
}

export function FormularioPSE({
  valor,
  onCambio,
  bancos,
  cargandoBancos = false,
  errores = {},
  deshabilitado = false,
}: FormularioPSEProps) {
  const documentos = useMemo(() => documentosDe(valor.tipoDePersona), [valor.tipoDePersona])
  const docActual = documentos.find((d) => d.valor === valor.tipoDeDocumento) ?? documentos[0]

  const opcionesDeBanco = useMemo(
    () => bancos.map((b) => ({ value: b.code, label: b.name })),
    [bancos],
  )

  const set = <K extends keyof DatosDePagoPSE>(campo: K, v: DatosDePagoPSE[K]) =>
    onCambio({ ...valor, [campo]: v })

  const esEmpresa = valor.tipoDePersona === 'juridica'

  return (
    <div className="space-y-6" data-testid="formulario-pse">
      <Fieldset
        as="fieldset"
        title="Con qué cuenta pagas"
        description="Tiene que ser una cuenta a tu nombre: el banco valida que el documento coincida."
        eyebrow="PSE"
      >
        <div className="space-y-5 pt-4">
          {/* Persona o empresa — arriba, porque define qué documento se puede usar */}
          <FormField id="pse-tipo-persona">
            <FormLabel>¿Quién paga?</FormLabel>
            <RadioCardGroup
              value={valor.tipoDePersona}
              onValueChange={(v) => onCambio(alCambiarTipoDePersona(valor, v as TipoDePersona))}
              disabled={deshabilitado}
              aria-label="Tipo de persona"
            >
              <RadioCard
                value="natural"
                label="Una persona"
                description="Cédula, extranjería o pasaporte"
                data-testid="persona-natural"
              />
              <RadioCard
                value="juridica"
                label="Una empresa"
                description="Con NIT"
                data-testid="persona-juridica"
              />
            </RadioCardGroup>
          </FormField>

          {/* Banco — buscable: hoy son 15 y con la integración real serán ~30 */}
          <FormField id="pse-banco" invalid={Boolean(errores.banco)} required>
            <FormLabel>Banco</FormLabel>
            <FormControl>
              <Combobox
                value={valor.banco || undefined}
                onChange={(v) => set('banco', v ?? '')}
                options={opcionesDeBanco}
                placeholder={
                  cargandoBancos
                    ? 'Trayendo los bancos…'
                    : opcionesDeBanco.length === 0
                      ? 'No pudimos traer los bancos'
                      : 'Busca o elige tu banco'
                }
                searchPlaceholder="Escribe el nombre — Bancolombia, Nequi…"
                disabled={deshabilitado || cargandoBancos || opcionesDeBanco.length === 0}
                invalid={Boolean(errores.banco)}
              />
            </FormControl>
            {errores.banco ? (
              <FormError>{errores.banco}</FormError>
            ) : (
              cargandoBancos && (
                <FormHint>
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner size="sm" /> Cargando la lista del banco…
                  </span>
                </FormHint>
              )
            )}
          </FormField>

          {/* Documento: tipo + número, en la misma línea porque son un solo dato */}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
            <FormField id="pse-tipo-documento" required>
              <FormLabel>Documento</FormLabel>
              <FormControl>
                <Select
                  value={valor.tipoDeDocumento}
                  onValueChange={(v) => set('tipoDeDocumento', v as DatosDePagoPSE['tipoDeDocumento'])}
                  disabled={deshabilitado || documentos.length === 1}
                >
                  <SelectTrigger id="pse-tipo-documento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentos.map((d) => (
                      <SelectItem key={d.valor} value={d.valor}>
                        {d.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormField>

            <FormField
              id="pse-numero-documento"
              invalid={Boolean(errores.numeroDeDocumento)}
              required
            >
              <FormLabel>Número</FormLabel>
              <FormControl>
                <Input
                  id="pse-numero-documento"
                  value={valor.numeroDeDocumento}
                  onChange={(e) => set('numeroDeDocumento', e.target.value)}
                  placeholder={ejemploDeDocumento(valor.tipoDeDocumento)}
                  inputMode={valor.tipoDeDocumento === 'PP' ? 'text' : 'numeric'}
                  autoComplete="off"
                  disabled={deshabilitado}
                  className="font-mono tabular-nums"
                />
              </FormControl>
              {errores.numeroDeDocumento ? (
                <FormError>{errores.numeroDeDocumento}</FormError>
              ) : docActual?.ayuda ? (
                <FormHint>{docActual.ayuda}</FormHint>
              ) : null}
            </FormField>
          </div>

          {/* Titular */}
          <FormField id="pse-titular" invalid={Boolean(errores.titular)} required>
            <FormLabel>{esEmpresa ? 'Razón social' : 'Nombre del titular'}</FormLabel>
            <FormControl>
              <Input
                id="pse-titular"
                value={valor.titular}
                onChange={(e) => set('titular', e.target.value)}
                placeholder={esEmpresa ? 'Inversiones Chapinero S.A.S.' : 'María Restrepo Gómez'}
                autoComplete={esEmpresa ? 'organization' : 'name'}
                disabled={deshabilitado}
              />
            </FormControl>
            {errores.titular ? (
              <FormError>{errores.titular}</FormError>
            ) : (
              <FormHint>Como figura en el banco.</FormHint>
            )}
          </FormField>

          {/* Correo — el comprobante */}
          <FormField id="pse-correo" invalid={Boolean(errores.correo)} required>
            <FormLabel>Correo</FormLabel>
            <FormControl>
              <Input
                id="pse-correo"
                type="email"
                value={valor.correo}
                onChange={(e) => set('correo', e.target.value)}
                placeholder="maria@correo.com"
                autoComplete="email"
                disabled={deshabilitado}
              />
            </FormControl>
            {errores.correo ? (
              <FormError>{errores.correo}</FormError>
            ) : (
              <FormHint>Ahí te llega el comprobante del pago.</FormHint>
            )}
          </FormField>
        </div>
      </Fieldset>

      <Callout icon={<Bank weight="duotone" />} title="Qué pasa cuando le des a pagar">
        Te llevamos al portal de tu banco para que autorices el débito. Cuando
        termines vuelves aquí y la consulta a las aseguradoras arranca sola — no
        tienes que avisarnos.
      </Callout>

      <p className="flex items-start gap-2 text-caption text-fg-subtle">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" weight="duotone" aria-hidden="true" />
        Los datos de tu cuenta los pides y los ves sólo en tu banco. Nosotros no
        los recibimos ni los guardamos.
      </p>
    </div>
  )
}
