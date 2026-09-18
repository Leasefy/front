'use client'

/**
 * PortalesClient — el estado de cada publicación, portal por portal.
 *
 * ── Qué pidió Nico (17-09-2026) ────────────────────────────────────────────
 *
 * «Se publica y despublica desde Leasefy con las CUENTAS QUE CADA INMOBILIARIA
 * YA PAGA en cada portal, mostrando el estado de cada publicación.»
 *
 * ── 🔴 Lo que esta pantalla dice sin rodeos ────────────────────────────────
 *
 * **Hoy ningún portal de afuera se publica solo.** Fincaraíz, Metrocuadrado y
 * Mercado Libre no dan credenciales de publicación sin convenio de integración,
 * y Leasefy no tiene ninguno. Así que el estado real de una publicación pedida
 * es «por subir al portal», y esta pantalla lo dice en la cara con el botón de
 * descargar el archivo al lado — en vez de un interruptor que promete algo que
 * no pasa. Cuando exista el convenio, la cuenta pasa a modo API y el mismo
 * tablero cambia de estado solo.
 */

import { useState } from 'react'
import { CloudArrowUp, DownloadSimple } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@/components/ui'
import {
  publicacionApi,
  type EstadoDePublicacion,
  type PortalConCuenta,
} from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { useCrm } from '@/lib/hooks/use-crm'

/** Cómo se lee cada estado, y con qué tono. */
const ROTULO: Record<
  EstadoDePublicacion,
  { texto: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  PENDIENTE: { texto: 'Pedida', variant: 'secondary' },
  POR_EXPORTAR: { texto: 'Por subir al portal', variant: 'outline' },
  PUBLICADA: { texto: 'Publicada', variant: 'default' },
  POR_DESPUBLICAR: { texto: 'Por bajar del portal', variant: 'outline' },
  DESPUBLICADA: { texto: 'Despublicada', variant: 'secondary' },
  ERROR: { texto: 'Con error', variant: 'destructive' },
}

function ModoDeLaCuenta({ portal }: { portal: PortalConCuenta }) {
  if (!portal.cuenta) {
    return (
      <span className="text-muted-foreground text-sm">
        Sin cuenta configurada
      </span>
    )
  }
  if (portal.cuenta.modoEfectivo === 'API') {
    return <Badge>Publica solo</Badge>
  }
  return (
    <span className="text-muted-foreground text-sm">
      {/* 🔴 El aviso honesto: si la cuenta dice API y el portal no tiene
          integración, el back la DEGRADA y acá se explica por qué. */}
      {portal.cuenta.modo === 'API'
        ? 'Marcada como API, pero no hay integración con este portal: va por archivo.'
        : 'Por archivo: se descarga y se sube al panel del portal.'}
    </span>
  )
}

export function PortalesClient() {
  const cuentas = useCrm(() => publicacionApi.cuentas(), [], ['portafolio'])
  const tablero = useCrm(() => publicacionApi.tablero(), [], ['portafolio'])
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const filas = tablero.datos?.filas ?? []
  const portales = cuentas.datos?.portales ?? []

  async function confirmar(propertyId: string, portal: string) {
    const clave = `${propertyId}:${portal}`
    setConfirmando(clave)
    try {
      await publicacionApi.confirmar(propertyId, portal)
      invalidar('portafolio')
    } finally {
      setConfirmando(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Publicación en portales
        </h1>
        <p className="text-muted-foreground text-sm">
          Qué inmueble está publicado dónde, con el enlace del aviso y el estado
          de cada publicación.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          {cuentas.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="cuentas-no-habilitadas"
            >
              Próximamente: {cuentas.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={cuentas.cargando}
              error={cuentas.errorCrudo}
              queEs="las cuentas de portal"
              onReintentar={cuentas.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={4} columnas={3} />}
            >
              <ul className="divide-y" data-testid="lista-de-portales">
                {portales.map((p) => (
                  <li
                    key={p.portal}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                    data-testid={`portal-${p.portal}`}
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">{p.nombre}</p>
                      <ModoDeLaCuenta portal={p} />
                    </div>
                    <div className="flex items-center gap-2">
                      {p.cuenta?.activa ? (
                        <Badge variant="secondary">Activa</Badge>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid={`exportar-${p.portal}`}
                      >
                        <a
                          href={publicacionApi.exportarUrl(p.portal)}
                          download={`${p.portal.toLowerCase()}.csv`}
                        >
                          <DownloadSimple className="mr-1.5 h-4 w-4" />
                          Descargar archivo
                        </a>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p
                className="text-muted-foreground mt-4 text-sm"
                data-testid="aviso-sin-api"
              >
                Hoy ningún portal de afuera publica solo: no hay convenio de
                integración con Fincaraíz, Metrocuadrado ni Mercado Libre. Lo que
                se pide queda «por subir al portal», se descarga el archivo y se
                carga en el panel del portal. Cuando exista el convenio, el mismo
                tablero cambia solo.
              </p>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las publicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {tablero.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="tablero-no-habilitado"
            >
              Próximamente: {tablero.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={tablero.cargando}
              error={tablero.errorCrudo}
              vacio={filas.length === 0}
              queEs="las publicaciones"
              onReintentar={tablero.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={6} columnas={4} />}
              cuandoVacio={
                <EmptyState
                  icon={CloudArrowUp}
                  title="Todavía no hay publicaciones"
                  description="Desde la ficha de un inmueble, escoge en qué portales publicarlo. Acá se ve el estado de cada uno."
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-publicaciones">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="py-2 pr-4 font-medium">Inmueble</th>
                      <th className="py-2 pr-4 font-medium">Portal</th>
                      <th className="py-2 pr-4 font-medium">Estado</th>
                      <th className="py-2 font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => {
                      const rotulo = ROTULO[f.estado]
                      const clave = `${f.propertyId}:${f.portal}`
                      return (
                        <tr
                          key={f.id}
                          className="border-b last:border-0"
                          data-testid={`publicacion-${f.id}`}
                        >
                          <td className="py-2 pr-4">
                            <span className="font-medium">
                              {f.inmueble?.title ?? 'Inmueble'}
                            </span>
                            {f.inmueble?.code ? (
                              <span className="text-muted-foreground ml-1.5">
                                #{f.inmueble.code}
                              </span>
                            ) : null}
                            <div className="text-muted-foreground">
                              {[f.inmueble?.neighborhood, f.inmueble?.city]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          </td>
                          <td className="py-2 pr-4">{f.nombreDelPortal}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={rotulo.variant}>{rotulo.texto}</Badge>
                            {f.ultimoError ? (
                              <div className="text-destructive mt-1 text-xs">
                                {f.ultimoError}
                              </div>
                            ) : null}
                            {f.exportadaEl && f.estado === 'POR_EXPORTAR' ? (
                              <div className="text-muted-foreground mt-1 text-xs">
                                Exportada el {f.exportadaEl.slice(0, 10)}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2">
                            {f.estado === 'POR_EXPORTAR' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={confirmando === clave}
                                onClick={() => confirmar(f.propertyId, f.portal)}
                                data-testid={`confirmar-${f.id}`}
                              >
                                {confirmando === clave
                                  ? 'Guardando…'
                                  : 'Ya la subí'}
                              </Button>
                            ) : f.urlExterna ? (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={f.urlExterna}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ver el aviso
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
