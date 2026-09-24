'use client'

/**
 * La cartera CASTIGADA: lo que la inmobiliaria decidió dejar de perseguir.
 *
 * ── El pedido, textual (Nico y Juan Camilo, 17-09-2026) ────────────────────
 *
 * «Cartera incobrable: **se castiga** con aprobación del administrador y el
 * contador (100 % provisionada y sin gestión posible); sale del informe de
 * cartera activa y queda en un listado de castigada; si alguna vez paga, entra
 * como recuperación.»
 *
 * ── Qué se ve y por qué ────────────────────────────────────────────────────
 *
 * · **Cuatro cifras arriba**: lo castigado, lo que de eso ya volvió a entrar,
 *   lo que sigue sin entrar y lo que está esperando firmas. Las tres primeras
 *   son una partición de lo castigado y se ven juntas para que no haya que
 *   creerlo.
 * · **Las dos firmas, con nombre**. Un castigo borra plata del activo: quién
 *   lo decidió no es un detalle de auditoría, es la pantalla.
 * · **Lo que falta, en palabras** («Falta la firma del administrador»), en vez
 *   de un estado en mayúsculas que hay que aprender.
 *
 * 🔴 Acá no se decide nada ni se suma nada: el back manda los veredictos, los
 * totales y la recuperación. Repetir la cuenta de «cuánto se recuperó» en el
 * navegador es exactamente cómo dos pantallas terminan dando dos números.
 */

import { useCallback, useContext, useEffect, useState } from 'react'
import {
  ArrowCounterClockwise,
  CheckCircle,
  Prohibit,
  Scales,
  XCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { ProponerCastigo } from '@/components/cartera/ProponerCastigo'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { AuthContext } from '@/lib/auth/auth-context'
import { notaDelCastigo } from '@/lib/doble-control/el-administrador'
import { castigoApi } from '@/lib/api/castigo.service'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type {
  CastigoDeCartera as Castigo,
  EstadoDelCastigo,
  FirmaDelCastigo,
  ListaDeCastigos,
} from '@/lib/types/castigo'

/**
 * 🔴 `timeZone: 'UTC'` no: `castigadaAt` es un INSTANTE (ISO con hora), no un
 * día suelto. Se formatea en la zona de quien mira, que es lo correcto para un
 * instante — al revés que `siniestroDesde`, que sí es un día.
 */
const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function fecha(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : FECHA.format(d)
}

const NOMBRE_DEL_ESTADO: Record<EstadoDelCastigo, string> = {
  PROPUESTO: 'Esperando firmas',
  CASTIGADA: 'Castigada',
  RECHAZADO: 'Rechazado',
  REVERSADO: 'Vuelta a cobrarse',
}

const TONO_DEL_ESTADO: Record<
  EstadoDelCastigo,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PROPUESTO: 'outline',
  CASTIGADA: 'destructive',
  RECHAZADO: 'secondary',
  REVERSADO: 'secondary',
}

/** Una firma, con quién y cuándo. Sin nombre se dice, no se inventa. */
function Firma({ firma, lado }: { firma: FirmaDelCastigo | null; lado: string }) {
  if (!firma) {
    return (
      <span className="text-xs text-fg-muted">
        {lado}: <span className="text-warning">sin firmar</span>
      </span>
    )
  }
  return (
    <span className="text-xs text-fg-muted">
      {lado}: <span className="text-fg">{firma.nombre ?? 'Alguien que ya no está'}</span>
      {fecha(firma.at) ? ` · ${fecha(firma.at)}` : ''}
    </span>
  )
}

function Cifra({
  rotulo,
  valor,
  tono,
  explicacion,
  testid,
  seSabe,
}: {
  rotulo: string
  valor: number
  tono?: string
  explicacion: string
  testid: string
  /** `false` = la base todavía no puede responder. Ver abajo. */
  seSabe: boolean
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-fg-muted">{rotulo}</p>
      <p
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
          seSabe ? (tono ?? 'text-fg') : 'text-fg-subtle'
        }`}
        data-testid={testid}
      >
        {/*
          🔴 Sin la migración esto NO es cero, es «no sé»: la tabla donde se
          guardan los castigos todavía no existe. Un $0 se lee como «no hay
          cartera castigada», que es una afirmación que nadie puede hacer.
        */}
        {seSabe ? formatCurrency(valor) : '—'}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        {seSabe ? explicacion : 'Todavía no se puede saber.'}
      </p>
    </Card>
  )
}

export function CastigoDeCartera() {
  const { agencyRole, isAdmin, canAccess } = usePermissions()
  const puedeMover = canAccess('cobros', 'edit')
  /*
   * Firmar es de ADMIN o CONTADOR, y eso NO lo decide el permiso: una
   * inmobiliaria puede darle `cobros:edit` a su auxiliar de cartera para que
   * haga recibos, y ese auxiliar no castiga cartera. El back lo verifica igual
   * —acá sólo se evita ofrecer un botón que va a responder 403.
   */
  const puedeFirmar =
    puedeMover && (isAdmin || agencyRole === 'ADMIN' || agencyRole === 'CONTADOR')
  /*
   * Quién mira, para decirle «castigado por ti» (P-4). El contexto, no
   * `useAuth()`: esta pantalla se monta suelta en pruebas y sin sesión la nota
   * se dice igual, sin el «ti».
   */
  const yo = useContext(AuthContext)?.user?.id ?? null

  const [lista, setLista] = useState<ListaDeCastigos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  /** El castigo al que se le está escribiendo un motivo, y para qué. */
  const [conMotivo, setConMotivo] = useState<{
    id: string
    accion: 'rechazar' | 'reversar'
  } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setLista(await castigoApi.listar())
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const firmar = async (castigo: Castigo) => {
    setTrabajando(castigo.id)
    try {
      const tras = await castigoApi.firmar(castigo.id)
      toast.success(
        tras.estado === 'CASTIGADA'
          ? // P-4: el castigo que él propuso se cierra con su firma por los dos lados.
            notaDelCastigo(tras, yo)
            ? `${notaDelCastigo(tras, yo)!.titulo}. Sale de la cartera activa y de la cobranza.`
            : 'Castigada. Sale de la cartera activa y de la cobranza.'
          : 'Firmaste. Todavía falta la otra firma.',
      )
      await cargar()
    } catch (e) {
      toast.error('No se pudo firmar', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setTrabajando(null)
    }
  }

  const confirmarMotivo = async () => {
    if (!conMotivo) return
    const texto = motivo.trim()
    if (texto.length === 0) return
    setTrabajando(conMotivo.id)
    try {
      if (conMotivo.accion === 'rechazar') {
        await castigoApi.rechazar(conMotivo.id, texto)
        toast.success('Rechazado. Las cuotas quedan libres.')
      } else {
        await castigoApi.reversar(conMotivo.id, texto)
        toast.success('La cartera vuelve a cobrarse.')
      }
      setConMotivo(null)
      setMotivo('')
      await cargar()
    } catch (e) {
      toast.error('No se pudo guardar', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setTrabajando(null)
    }
  }

  return (
    <div className="space-y-6" data-testid="cartera-castigada">
      <EstadoDeDatos
        cargando={cargando && !lista}
        error={error}
        queEs="la cartera castigada"
        onReintentar={cargar}
      >
        {lista && (
          <>
            {!lista.disponible && lista.motivo && (
              <Card className="border-warning/40 bg-warning-soft p-4" data-testid="castigo-sin-migrar">
                <p className="text-sm text-fg">{lista.motivo}</p>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Cifra
                rotulo="Castigada"
                valor={lista.castigadoCop}
                tono="text-danger"
                explicacion="El capital que se dio por perdido."
                testid="total-castigado"
                seSabe={lista.disponible}
              />
              <Cifra
                rotulo="Recuperada"
                valor={lista.recuperadoCop}
                tono="text-success"
                explicacion="De lo castigado, lo que después sí entró."
                testid="total-recuperado"
                seSabe={lista.disponible}
              />
              <Cifra
                rotulo="Sin recuperar"
                valor={lista.sinRecuperarCop}
                explicacion="Lo que sigue sin entrar."
                testid="total-sin-recuperar"
                seSabe={lista.disponible}
              />
              <Cifra
                rotulo="Esperando firmas"
                valor={lista.propuestoCop}
                tono="text-warning"
                explicacion="Propuesto, todavía sin castigar."
                testid="total-propuesto"
                seSabe={lista.disponible}
              />
            </div>

            {puedeMover && lista.disponible && (
              <ProponerCastigo onListo={() => void cargar()} />
            )}

            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Recuperado</TableHead>
                    <TableHead>Firmas</TableHead>
                    <TableHead className="w-44" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.castigos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <SinDatos
                          queSon="castigos de cartera"
                          icono={Scales}
                          titulo="No hay cartera castigada"
                          descripcion="Castigar es dejar de perseguir una deuda incobrable. Lo aprueban dos personas: el administrador y el contador."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    lista.castigos.map((c) => (
                      <TableRow key={c.id} data-testid="castigo-fila" data-castigo-id={c.id}>
                        <TableCell>
                          <Badge variant={TONO_DEL_ESTADO[c.estado]}>
                            {NOMBRE_DEL_ESTADO[c.estado]}
                          </Badge>
                          {c.queFalta && (
                            <p className="mt-1 text-xs text-warning" data-testid="que-falta">
                              {c.queFalta}
                            </p>
                          )}
                          {c.castigadaAt && (
                            <p className="mt-1 text-xs text-fg-muted">
                              Desde el {fecha(c.castigadaAt)}
                            </p>
                          )}
                          {/* P-4 aclarado (24-09): lo castigó el administrador solo, en un paso. */}
                          {c.estado === 'CASTIGADA' && notaDelCastigo(c, yo) && (
                            <p className="mt-1 text-caption text-fg-muted" data-testid="castigo-p4">
                              {notaDelCastigo(c, yo)!.titulo}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <p className="text-sm text-fg">{c.motivo}</p>
                          <p className="mt-0.5 text-xs text-fg-muted">
                            {c.cuotas === 1 ? '1 cuota' : `${c.cuotas} cuotas`} ·{' '}
                            {c.propuestoPor.nombre ?? 'Alguien que ya no está'} lo propuso
                          </p>
                          {c.rechazo && (
                            <p className="mt-1 text-xs text-fg-muted">
                              Rechazado: {c.rechazo.motivo}
                            </p>
                          )}
                          {c.reversa && (
                            <p className="mt-1 text-xs text-fg-muted">
                              Vuelta a cobrarse: {c.reversa.motivo}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg">
                          {formatCurrency(c.capitalCop)}
                          {c.interesCop > 0 && (
                            <div className="text-xs font-normal text-fg-muted">
                              + {formatCurrency(c.interesCop)} de intereses
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                          {c.estado === 'CASTIGADA' ? (
                            <>
                              <span className="text-success">
                                {formatCurrency(c.recuperadoCop)}
                              </span>
                              {c.anuladoCop > 0 && (
                                <div className="text-xs font-normal text-fg-muted">
                                  {formatCurrency(c.anuladoCop)} se anularon, no entraron
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </TableCell>
                        <TableCell className="space-y-0.5">
                          <Firma firma={c.admin} lado="Administrador" />
                          <br />
                          <Firma firma={c.contador} lado="Contador" />
                        </TableCell>
                        <TableCell className="text-right">
                          {c.estado === 'PROPUESTO' && puedeFirmar && (
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                hideArrow
                                size="sm"
                                isLoading={trabajando === c.id}
                                onClick={() => void firmar(c)}
                                data-testid="firmar-castigo"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Firmar
                              </Button>
                              <Button
                                hideArrow
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setConMotivo({ id: c.id, accion: 'rechazar' })
                                  setMotivo('')
                                }}
                                data-testid="rechazar-castigo"
                              >
                                <XCircle className="h-4 w-4" />
                                Rechazar
                              </Button>
                            </div>
                          )}
                          {c.estado === 'CASTIGADA' && puedeFirmar && (
                            <Button
                              hideArrow
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setConMotivo({ id: c.id, accion: 'reversar' })
                                setMotivo('')
                              }}
                              data-testid="reversar-castigo"
                            >
                              <ArrowCounterClockwise className="h-4 w-4" />
                              Volver a cobrarla
                            </Button>
                          )}
                          {c.estado === 'PROPUESTO' && !puedeFirmar && (
                            <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                              <Prohibit className="h-3.5 w-3.5" />
                              Lo firman el administrador y el contador
                            </span>
                          )}

                          {conMotivo?.id === c.id && (
                            <div className="mt-2 space-y-2 text-left" data-testid="motivo-del-castigo">
                              <Textarea
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={2}
                                maxLength={500}
                                placeholder={
                                  conMotivo.accion === 'rechazar'
                                    ? 'Por qué no se castiga. Lo lee quien lo propuso.'
                                    : 'Por qué vuelve a cobrarse.'
                                }
                                aria-label="Motivo"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  hideArrow
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setConMotivo(null)
                                    setMotivo('')
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  hideArrow
                                  size="sm"
                                  disabled={motivo.trim().length === 0}
                                  isLoading={trabajando === c.id}
                                  onClick={() => void confirmarMotivo()}
                                  data-testid="confirmar-motivo"
                                >
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </EstadoDeDatos>
    </div>
  )
}
