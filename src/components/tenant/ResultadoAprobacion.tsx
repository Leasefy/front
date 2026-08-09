'use client'

/**
 * ResultadoAprobacion — lo que pasa DESPUÉS de consultar.
 *
 * Antes había una sola tarjeta para las tres respuestas posibles, con el
 * veredicto en una línea y un botón. Servía para informar, no para continuar:
 * la persona leía "aprobado" y quedaba parada en una pantalla sin recorrido.
 *
 * Las tres respuestas son momentos distintos y merecen pantallas distintas:
 *
 * - **Aprobado** → el premio. El número al frente y una puerta al catálogo que
 *   ya le sirve.
 * - **Con condiciones** → sigue siendo un sí. Se dice cuál es la condición en
 *   palabras normales, y se sigue de largo; frenarlo acá sería inventar un muro
 *   donde la aseguradora no lo puso.
 * - **No aprobado** → *no es un callejón*. Fue explícito en la reunión: hay
 *   salidas reales, y la más común es que otra persona sea el titular.
 *
 * Vocabulario: al inquilino se le habla de **aprobación** y **tope**, nunca de
 * "asegurabilidad" ni "estudio" (`docs/VOCABULARIO.md`).
 */

import Link from 'next/link'
import {
  ArrowRight,
  Checks,
  SealCheck,
  UsersThree,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useTf, type Tf } from '@/lib/i18n/use-tf'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { aseguradoraDisplayName, type PreApprovalResult } from '@/lib/api/funnel.service'

export interface ResultadoAprobacionProps {
  result: PreApprovalResult
  /** El canon que la persona consultó, si consultó alguno. */
  canonConsultadoCop: number | null
  /** Hay sesión iniciada: cambia a dónde lleva el catálogo y si se ofrece cuenta. */
  conSesion: boolean
  /** Es alguien de la inmobiliaria probando el link, no un candidato. */
  esAgencia: boolean
  onNuevaConsulta: () => void
  /**
   * Entrar a la plataforma. Solo se usa cuando NO hay sesión: en vez de sacar a
   * la persona al catálogo público —el mismo que ve cualquiera— la lleva a
   * crear su cuenta y aterrizar en su panel.
   */
  onEntrar: () => void
}

const NS = 'inquilino.resultado'

export function ResultadoAprobacion({
  result,
  canonConsultadoCop,
  conSesion,
  esAgencia,
  onNuevaConsulta,
  onEntrar,
}: ResultadoAprobacionProps) {
  const tf = useTf()
  // Con sesión el catálogo propio ya existe. Sin ella, el camino pasa por crear
  // la cuenta — nunca por el catálogo público, que no sabe nada de su aprobación.
  const rutaCatalogo = conSesion ? '/inquilino/para-ti' : null

  return (
    <div className="space-y-4">
      {result.asegurabilidad === 'yes' && (
        <Aprobado
          tf={tf}
          result={result}
          canonConsultadoCop={canonConsultadoCop}
          rutaCatalogo={rutaCatalogo}
          onEntrar={onEntrar}
          conSesion={conSesion}
        />
      )}
      {result.asegurabilidad === 'partial' && (
        <ConCondiciones
          tf={tf}
          result={result}
          canonConsultadoCop={canonConsultadoCop}
          rutaCatalogo={rutaCatalogo}
          onEntrar={onEntrar}
          conSesion={conSesion}
        />
      )}
      {result.asegurabilidad === 'no' && <NoAprobado tf={tf} rutaCatalogo={rutaCatalogo} />}

      {/* `stubMode` viene del contrato del agente y significa "esto no es real".
          Va abajo y visible: un resultado de demostración que se lea como una
          aprobación de verdad es peor que no mostrar nada. */}
      {result.stubMode && <AvisoDemo tf={tf} />}

      {esAgencia && <NotaAgencia tf={tf} />}

      {/* Para la inmobiliaria esto es "el siguiente candidato"; para quien se
          acaba de consultar a sí mismo, es corregir un dato. */}
      <div className="flex justify-center">
        <Button variant="link" onClick={onNuevaConsulta} hideArrow>
          {esAgencia
            ? tf(`${NS}.otraPersona`, 'Consultar otra persona')
            : tf(`${NS}.otraConsulta`, 'Hacer otra consulta')}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Aprobado                                                            */
/* ------------------------------------------------------------------ */

function Aprobado({
  tf,
  result,
  canonConsultadoCop,
  rutaCatalogo,
  onEntrar,
  conSesion,
}: {
  tf: Tf
  result: PreApprovalResult
  canonConsultadoCop: number | null
  rutaCatalogo: string | null
  onEntrar: () => void
  conSesion: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <Encabezado
          icono={<SealCheck className="w-6 h-6 text-success" weight="fill" aria-hidden="true" />}
          fondo="bg-success-soft"
          titulo={tf(`${NS}.aprobado.titulo`, 'Estás aprobado')}
          bajada={tf(`${NS}.aprobado.bajada`, 'Las aseguradoras respaldan tu arriendo.')}
        />

        <Cifra
          tf={tf}
          maxAfianzableCop={result.maxAfianzableCop}
          canonConsultadoCop={canonConsultadoCop}
        />

        <Aseguradoras tf={tf} result={result} />

        <QueSigue
          tf={tf}
          items={[
            tf(`${NS}.aprobado.sigue1`, 'Ya te puedes postular a las propiedades que te gusten.'),
            tf(`${NS}.aprobado.sigue2`, 'Tu aprobación sirve para varias: no vuelves a consultar ni a pagar.'),
            conSesion
              ? tf(`${NS}.aprobado.sigue3ConSesion`, 'En el catálogo te marcamos lo que va contigo.')
              : tf(`${NS}.aprobado.sigue3SinSesion`, 'Crea tu cuenta para guardarla y postularte.'),
          ]}
        />

        <EntrarAMiCatalogo
          tf={tf}
          rutaCatalogo={rutaCatalogo}
          onEntrar={onEntrar}
          conSesion={conSesion}
        />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Con condiciones                                                     */
/* ------------------------------------------------------------------ */

function ConCondiciones({
  tf,
  result,
  canonConsultadoCop,
  rutaCatalogo,
  onEntrar,
  conSesion,
}: {
  tf: Tf
  result: PreApprovalResult
  canonConsultadoCop: number | null
  rutaCatalogo: string | null
  onEntrar: () => void
  conSesion: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <Encabezado
          icono={<SealCheck className="w-6 h-6 text-warning" weight="fill" aria-hidden="true" />}
          fondo="bg-warning-soft"
          titulo={tf(`${NS}.condiciones.titulo`, 'Te aprueban, con condiciones')}
          bajada={tf(`${NS}.condiciones.bajada`, 'Es un sí. Solo falta resolver un detalle con la aseguradora.')}
        />

        <Cifra
          tf={tf}
          maxAfianzableCop={result.maxAfianzableCop}
          canonConsultadoCop={canonConsultadoCop}
        />

        {/* La palabra "condicional" no le dice nada a nadie. Acá se explica en
            los términos en los que la persona lo va a vivir. */}
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-fg">
            {tf(`${NS}.condiciones.queSignifica`, 'Qué suele significar')}
          </p>
          <p className="text-sm text-fg-muted mt-1 leading-relaxed">
            {tf(
              `${NS}.condiciones.queSignificaTexto`,
              'Normalmente piden un codeudor o un depósito adicional. Cambia según la aseguradora, y un asesor te dice cuál te conviene más.',
            )}
          </p>
        </div>

        <Aseguradoras tf={tf} result={result} />

        <QueSigue
          tf={tf}
          items={[
            tf(`${NS}.condiciones.sigue1`, 'Puedes seguir viendo propiedades y postularte.'),
            tf(`${NS}.condiciones.sigue2`, 'Un asesor te contacta para cerrar la condición.'),
            conSesion
              ? tf(`${NS}.condiciones.sigue3ConSesion`, 'Tu aprobación queda guardada en tu cuenta.')
              : tf(`${NS}.condiciones.sigue3SinSesion`, 'Crea tu cuenta para no perder esta aprobación.'),
          ]}
        />

        <EntrarAMiCatalogo
          tf={tf}
          rutaCatalogo={rutaCatalogo}
          onEntrar={onEntrar}
          conSesion={conSesion}
        />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* No aprobado                                                         */
/* ------------------------------------------------------------------ */

/**
 * El rechazo es una pantalla, no un callejón.
 *
 * Nada de rojo ni de alarma: no hizo nada malo. Lo que necesita son salidas
 * reales, y la primera es la que más se usa en Colombia — que el titular sea
 * otra persona y ella viva ahí igual.
 */
function NoAprobado({ tf, rutaCatalogo }: { tf: Tf; rutaCatalogo: string | null }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <Encabezado
          icono={<WarningCircle className="w-6 h-6 text-fg-muted" aria-hidden="true" />}
          fondo="bg-surface-muted"
          titulo={tf(`${NS}.rechazo.titulo`, 'Por ahora no podemos afianzarte')}
          bajada={tf(`${NS}.rechazo.bajada`, 'Las aseguradoras que consultamos no te respaldan en este momento. No es definitivo.')}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium text-fg">
            {tf(`${NS}.rechazo.salidas`, 'Lo que sí puedes hacer')}
          </p>

          <Salida
            icono={<UsersThree className="w-5 h-5 text-fg" aria-hidden="true" />}
            titulo={tf(`${NS}.rechazo.otro.titulo`, 'Que alguien se postule por ti')}
            texto={tf(`${NS}.rechazo.otro.texto`, 'Es más común de lo que parece: muchos arriendos los firma un familiar. Si alguien cercano queda aprobado, esa persona es la titular y tú vives ahí.')}
          />
          <Salida
            icono={<Checks className="w-5 h-5 text-fg" aria-hidden="true" />}
            titulo={tf(`${NS}.rechazo.codeudor.titulo`, 'Presentarte con un codeudor')}
            texto={tf(`${NS}.rechazo.codeudor.texto`, 'Con un codeudor cambia el análisis. Un asesor puede revisar tu caso.')}
          />
          <Salida
            icono={<ArrowRight className="w-5 h-5 text-fg" aria-hidden="true" />}
            titulo={tf(`${NS}.rechazo.seguir.titulo`, 'Seguir viendo propiedades')}
            texto={tf(`${NS}.rechazo.seguir.texto`, 'Puedes explorar el catálogo completo mientras resuelves lo anterior.')}
          />
        </div>

        {/* Un rechazado no necesita cuenta para seguir mirando: el catálogo
            público le sirve igual, y obligarlo a registrarse después de un no
            sería cobrarle un peaje por una mala noticia. */}
        <Button asChild variant="secondary" className="w-full" hideArrow>
          <Link href={rutaCatalogo ?? '/propiedades'}>{tf(`${NS}.rechazo.cta`, 'Ver propiedades disponibles')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Piezas compartidas                                                  */
/* ------------------------------------------------------------------ */

/**
 * El paso al catálogo propio.
 *
 * Con sesión es un link directo. Sin sesión **no** manda al catálogo público:
 * ahí la persona vería el mismo listado que cualquier visitante, con un navbar
 * de "Registrarme", y su aprobación no pintaría nada. El camino correcto es
 * crear la cuenta y aterrizar adentro.
 */
function EntrarAMiCatalogo({
  tf,
  rutaCatalogo,
  onEntrar,
  conSesion,
}: {
  tf: Tf
  rutaCatalogo: string | null
  onEntrar: () => void
  conSesion: boolean
}) {
  if (conSesion && rutaCatalogo) {
    return (
      <Button asChild className="w-full">
        <Link href={rutaCatalogo}>{tf(`${NS}.verCatalogo`, 'Ver mi catálogo')}</Link>
      </Button>
    )
  }

  // Sin nota debajo: la pantalla siguiente ya explica qué falta y qué ya
  // tenemos. Anunciarlo antes es decirlo dos veces.
  return (
    <Button className="w-full" onClick={onEntrar}>
      {tf(`${NS}.verCatalogo`, 'Ver mi catálogo')}
    </Button>
  )
}

function Encabezado({
  icono,
  fondo,
  titulo,
  bajada,
}: {
  icono: React.ReactNode
  fondo: string
  titulo: string
  bajada: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn('w-11 h-11 rounded-md flex items-center justify-center shrink-0', fondo)}>
        {icono}
      </div>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-fg leading-tight">{titulo}</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">{bajada}</p>
      </div>
    </div>
  )
}

/**
 * El número. Hay dos, y **no significan lo mismo**.
 *
 * - **Máximo afianzable** (`maxAfianzableCop`): lo devuelve la aseguradora
 *   cuando se consulta **sin propiedad**. Es un techo de verdad — se dice
 *   "hasta", y es el que sirve para filtrar el catálogo.
 * - **Canon consultado**: la persona preguntó por una cifra concreta y se la
 *   aprobaron. Es un punto confirmado, no un techo — se dice "para", y por
 *   encima no se descarta nada, se ofrece revisarlo.
 *
 * Confundirlos le pondría a alguien un límite que ninguna aseguradora calculó.
 */
function Cifra({
  tf,
  maxAfianzableCop,
  canonConsultadoCop,
}: {
  tf: Tf
  maxAfianzableCop: number | null
  canonConsultadoCop: number | null
}) {
  if (maxAfianzableCop !== null) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="text-sm text-fg-muted">{tf(`${NS}.cifra.hasta`, 'Te afianzamos hasta')}</p>
        <p className="font-mono tabular-nums text-3xl font-semibold text-fg leading-tight mt-1">
          {formatCurrency(maxAfianzableCop)}
          <span className="text-base font-sans font-normal text-fg-muted"> {tf(`${NS}.porMes`, '/mes')}</span>
        </p>
        <p className="text-xs text-fg-muted mt-2">
          {tf(`${NS}.cifra.hastaNota`, 'Con este tope te mostramos las propiedades que van contigo.')}
        </p>
      </div>
    )
  }

  if (canonConsultadoCop !== null) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="text-sm text-fg-muted">{tf(`${NS}.cifra.para`, 'Aprobado para un canon de')}</p>
        <p className="font-mono tabular-nums text-3xl font-semibold text-fg leading-tight mt-1">
          {formatCurrency(canonConsultadoCop)}
          <span className="text-base font-sans font-normal text-fg-muted"> {tf(`${NS}.porMes`, '/mes')}</span>
        </p>
        <p className="text-xs text-fg-muted mt-2">
          {tf(`${NS}.cifra.paraNota`, 'Es el canon que consultaste. Si te interesa algo más caro, un asesor lo revisa.')}
        </p>
      </div>
    )
  }

  /*
   * Ni tope ni canon. Es un hueco del backend, no una condición de la persona:
   * decirle "todavía no tienes un monto" sonaba a que le faltaba algo a ella.
   */
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <p className="text-sm text-fg-muted">
        {tf(`${NS}.cifra.calculando`, 'Estamos calculando hasta cuánto te afianzamos. Te lo confirmamos en un momento.')}
      </p>
    </div>
  )
}

function Aseguradoras({ tf, result }: { tf: Tf; result: PreApprovalResult }) {
  if (result.aseguradoras.length === 0) return null
  const n = result.aseguradoras.length

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">
        {n === 1
          ? tf(`${NS}.aseguradoras.una`, 'Una aseguradora te respalda')
          : `${n} ${tf(`${NS}.aseguradoras.varias`, 'aseguradoras te respaldan')}`}
      </p>
      <div className="flex flex-wrap gap-2">
        {result.aseguradoras.map((a) => (
          <span
            key={a.aseguradora}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-fg"
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                a.status === 'conditional' ? 'bg-warning' : 'bg-success',
              )}
              aria-hidden
            />
            {aseguradoraDisplayName(a.aseguradora)}
            {a.status === 'conditional' && (
              <span className="text-xs text-fg-muted">
                {tf(`${NS}.aseguradoras.condicional`, 'con condiciones')}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function QueSigue({ tf, items }: { tf: Tf; items: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">{tf(`${NS}.queSigue`, 'Qué sigue')}</p>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm text-fg-muted">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-surface-muted shrink-0" aria-hidden />
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Salida({
  icono,
  titulo,
  texto,
}: {
  icono: React.ReactNode
  titulo: string
  texto: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
      <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center shrink-0">
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{titulo}</p>
        <p className="text-sm text-fg-muted mt-0.5 leading-relaxed">{texto}</p>
      </div>
    </div>
  )
}

function AvisoDemo({ tf }: { tf: Tf }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
      <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-sm text-fg">
        <strong className="font-medium">{tf(`${NS}.demo.titulo`, 'Resultado de ejemplo.')}</strong>{' '}
        {tf(`${NS}.demo.texto`, 'El servicio de aprobación todavía no está publicado, así que estos datos no son reales y no se guardan.')}
      </p>
    </div>
  )
}

function NotaAgencia({ tf }: { tf: Tf }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <p className="text-sm text-fg-muted">
        {tf(`${NS}.notaAgencia`, 'Estás viendo el resultado como lo ve el candidato. Puedes enviarle este mismo link a cualquier otra persona.')}
      </p>
    </div>
  )
}
