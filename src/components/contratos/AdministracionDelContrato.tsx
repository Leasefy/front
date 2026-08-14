'use client'

/**
 * Uso, periodicidad y comisión: lo que la inmobiliaria necesita del contrato
 * para poder cobrarlo y liquidarlo.
 *
 * Los tres se guardaban desde la migración y no se veían en ninguna pantalla.
 * Un campo que se guarda y no se ve es medio campo: nadie puede notar que el
 * uso quedó mal puesto, y el uso decide si el canon lleva IVA.
 *
 * Editar acá NO invalida firmas ni devuelve el contrato a revisión: ninguno de
 * los tres aparece en el documento que firmó el inquilino. Va por
 * PATCH /contracts/:id/administracion, no por el PATCH que edita el canon.
 */

import { useState } from 'react'
import { Receipt, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { contractsApi } from '@/lib/api/contracts.service'
import type { Contract } from '@/lib/types/contract'

const USOS = { VIVIENDA: 'Vivienda', COMERCIAL: 'Comercial' } as const

const PERIODICIDADES = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
} as const

type Uso = keyof typeof USOS
type Periodicidad = keyof typeof PERIODICIDADES

interface Props {
  contract: Contract
  puedeEditar: boolean
  onActualizado: (c: Contract) => void
}

export function AdministracionDelContrato({
  contract,
  puedeEditar,
  onActualizado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uso, setUso] = useState<Uso | ''>((contract.usoInmueble as Uso) ?? '')
  const [periodicidad, setPeriodicidad] = useState<Periodicidad | ''>(
    (contract.periodicidad as Periodicidad) ?? '',
  )
  const [comision, setComision] = useState(
    contract.comisionPorcentaje != null ? String(contract.comisionPorcentaje) : '',
  )

  /*
   * El perfil tributario del inquilino. Es el ÚNICO de los tres que vive en el
   * contrato: la misma persona puede arrendar a título propio y por su empresa.
   * El del propietario está en su ficha y el de la inmobiliaria en su config.
   *
   * Tres estados, no dos: 'si' | 'no' | '' (= no lo sabemos). Un checkbox
   * colapsaría los dos últimos y convertiría un vacío en la afirmación «no
   * retiene», que nadie hizo.
   */
  const perfilGuardado = contract.perfilesTributarios?.inquilino ?? null
  const [tipoPersona, setTipoPersona] = useState<TipoPersona | ''>(
    contract.inquilinoTipoPersona ?? '',
  )
  const [retieneRenta, setRetieneRenta] = useState<Ternario>(
    aTernario(contract.inquilinoRetenedorRenta),
  )

  /*
   * Hay DOS comisiones: la del contrato (la que trajo el archivo migrado) y la
   * de la consignación, que es la que la dispersión y el extracto usan para
   * pagarle al propietario. Cuando no coinciden, mostrar una sola sería elegir
   * cuál de las dos verdades contar.
   */
  const delContrato = contract.comisionPorcentaje ?? null
  const deConsignacion = contract.comisionDeConsignacion ?? null
  const discrepan =
    delContrato != null && deConsignacion != null && delContrato !== deConsignacion

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const n = comision.trim() === '' ? undefined : Number(comision)
      if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > 100)) {
        setError('La comisión va entre 0 y 100.')
        return
      }
      const actualizado = await contractsApi.actualizarAdministracion(contract.id, {
        usoInmueble: uso === '' ? undefined : uso,
        periodicidad: periodicidad === '' ? undefined : periodicidad,
        comisionPorcentaje: n,
        // `null` es una acción: «volvé a no saberlo». Distinto de no mandar el
        // campo, que lo deja como estaba.
        inquilinoTipoPersona: tipoPersona === '' ? null : tipoPersona,
        inquilinoRetenedorRenta: deTernario(retieneRenta),
      })
      onActualizado(actualizado)
      setEditando(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Administración</h3>
        </div>
        {puedeEditar && !editando ? (
          <Button variant="ghost" size="sm" hideArrow onClick={() => setEditando(true)}>
            Corregir
          </Button>
        ) : null}
      </div>

      {editando ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Uso del inmueble</label>
            <Select value={uso} onValueChange={(v) => setUso(v as Uso)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USOS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Vivienda está excluida de IVA; comercial no.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Periodicidad de cobro</label>
            <Select
              value={periodicidad}
              onValueChange={(v) => setPeriodicidad(v as Periodicidad)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIODICIDADES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Comisión de administración (%)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se guarda también en la consignación: es de donde sale lo que se le
              descuenta al propietario.
            </p>
          </div>

          <div className="space-y-1 border-t border-border pt-3">
            <label className="text-xs text-muted-foreground">
              El inquilino es
            </label>
            <Select
              value={tipoPersona}
              onValueChange={(v) => setTipoPersona(v as TipoPersona)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No se sabe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NATURAL">Persona natural</SelectItem>
                <SelectItem value="JURIDICA">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              ¿Practica retención en la fuente?
            </label>
            <Select
              value={retieneRenta}
              onValueChange={(v) => setRetieneRenta(v as Ternario)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No se sabe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí, es agente retenedor</SelectItem>
                <SelectItem value="no">No retiene</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              La retención la practica quien paga. Sin este dato se asume el
              comportamiento típico de su tipo de persona y se avisa.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button size="sm" hideArrow disabled={guardando} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              disabled={guardando}
              onClick={() => {
                setEditando(false)
                setError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Fila
            etiqueta="Uso del inmueble"
            valor={contract.usoInmueble ? USOS[contract.usoInmueble as Uso] : null}
            ausente="Sin definir — no se sabe si el canon lleva IVA"
          />
          <Fila
            etiqueta="Periodicidad"
            valor={
              contract.periodicidad
                ? PERIODICIDADES[contract.periodicidad as Periodicidad]
                : null
            }
            ausente="Sin definir"
          />
          <Fila
            etiqueta="Comisión"
            valor={deConsignacion != null ? `${deConsignacion}%` : null}
            ausente="Sin consignación: este inmueble no genera cobros"
          />

          <Fila
            etiqueta="Retención del inquilino"
            valor={
              perfilGuardado && !perfilGuardado.esPorDefecto
                ? perfilGuardado.agenteRetenedorRenta
                  ? 'Es agente retenedor'
                  : 'No retiene'
                : null
            }
            ausente="Sin configurar — se asume por su tipo de persona"
          />

          {discrepan ? (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2.5">
              <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <p className="text-xs text-foreground">
                El contrato dice <strong>{delContrato}%</strong> y la consignación{' '}
                <strong>{deConsignacion}%</strong>. Al propietario se le descuenta la
                de la consignación. Corregí acá para dejar las dos iguales.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

type TipoPersona = 'NATURAL' | 'JURIDICA'

/**
 * Tres estados, no dos.
 *
 * Un checkbox sólo sabe decir sí o no. Acá «todavía no se sabe» tiene que
 * poder decirse: con un booleano, cada contrato sin configurar afirmaría que
 * el inquilino NO retiene — una afirmación que nadie hizo, sobre plata.
 */
type Ternario = 'si' | 'no' | ''

function aTernario(v: boolean | null | undefined): Ternario {
  if (v === true) return 'si'
  if (v === false) return 'no'
  return ''
}

function deTernario(v: Ternario): boolean | null {
  if (v === 'si') return true
  if (v === 'no') return false
  return null
}

function Fila({
  etiqueta,
  valor,
  ausente,
}: {
  etiqueta: string
  valor: string | null
  ausente: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      {valor ? (
        <span className="text-right font-medium text-foreground">{valor}</span>
      ) : (
        /* Un guión diría "no aplica". Lo que pasa es que no se sabe, y la
           consecuencia de no saberlo es distinta en cada campo. */
        <span className="max-w-[60%] text-right text-xs text-muted-foreground">
          {ausente}
        </span>
      )}
    </div>
  )
}
