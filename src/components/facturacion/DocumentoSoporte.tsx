'use client'

/**
 * «Documento soporte» — lo que se emite al pagarle a quien no factura.
 *
 * Nico y Juan Camilo (2026-09-17): «cuando se le paga a un proveedor no
 * obligado a facturar (técnicos), Leasefy genera el documento soporte
 * electrónico con su propia numeración y sus retenciones, y lo transmite».
 *
 * ── 🔴 Lo que la pantalla NO puede callar ──────────────────────────────────
 *
 * Que una retención no se pudo liquidar. Nadie dio las tarifas de retención
 * por servicios, así que el documento sale con ese impuesto en CERO y marcado,
 * y acá se dice con todas las letras qué falta configurar. «Este proveedor no
 * tiene retención» y «no sabemos cuál es su retención» no pueden verse iguales:
 * la primera es una decisión y la segunda es un error que alguien tiene que
 * arreglar antes de que lo encuentre el contador.
 *
 * La vista previa es obligatoria por lo mismo: el documento se ve ANTES de
 * emitirse, con sus retenciones y sus avisos, porque después lleva un número
 * que no se borra.
 *
 * 🔴 FA-R12 (QA-FACT, 03-10-2026): no había dónde registrar al proveedor que no
 * factura (`crearProveedor` existía sin llamador y el selector sólo listaba), así
 * que una inmobiliaria nueva no podía emitir ni uno. Ahora se registra desde el
 * mismo cajón y queda elegido. Y el proveedor y la fecha usan el `Select` y el
 * selector de fecha del DS (FA-R29 / FA-R30); la plata, `formatCurrency`.
 */

import { useCallback, useEffect, useState } from 'react'
import { Plus, Receipt, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { formatCurrency } from '@/lib/format'
import {
  facturacionElectronicaService,
  type DocumentosSoporte as Documentos,
  type LiquidacionDelDocumentoSoporte,
  type ProveedoresNoObligados,
} from '@/lib/api/facturacion-electronica.service'
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service'
import { faltaEnLaBase } from '@/lib/facturacion/por-facturar'
import { CampoDeFecha } from './CampoDeFecha'

/** El proveedor nuevo, como lo escribe la persona. */
interface ProveedorNuevo {
  nombre: string
  tipoDocumento: string
  documento: string
  email: string
  telefono: string
  /** `SI` / `NO` / `NO_SE`: «no sé» no es «no» (el back lo guarda como `null`). */
  responsableIva: 'SI' | 'NO' | 'NO_SE'
  retefuentePct: string
}

const PROVEEDOR_VACIO: ProveedorNuevo = {
  nombre: '',
  tipoDocumento: 'CC',
  documento: '',
  email: '',
  telefono: '',
  responsableIva: 'NO_SE',
  retefuentePct: '',
}

type CampoDelProveedor = 'nombre' | 'tipoDocumento' | 'documento' | 'email' | 'telefono' | 'retefuentePct'

/** Los topes del back (`CrearProveedorNoObligadoDto`), para decirlo antes. */
export function erroresDelProveedor(p: ProveedorNuevo): Partial<Record<CampoDelProveedor, string>> {
  const errores: Partial<Record<CampoDelProveedor, string>> = {}
  if (p.nombre.trim().length > 300) errores.nombre = 'El nombre no puede pasar de 300 caracteres.'
  if (p.documento.trim().length > 40) errores.documento = 'El documento no puede pasar de 40 caracteres.'
  if (p.email.trim().length > 300) errores.email = 'El correo no puede pasar de 300 caracteres.'
  if (p.telefono.trim().length > 60) errores.telefono = 'El teléfono no puede pasar de 60 caracteres.'
  if (p.retefuentePct.trim() !== '') {
    const n = Number(p.retefuentePct.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > 100)
      errores.retefuentePct = 'Escribe un porcentaje entre 0 y 100.'
  }
  return errores
}

interface Formulario {
  proveedorId: string
  fecha: string
  concepto: string
  valorCop: string
}

const VACIO: Formulario = {
  proveedorId: '',
  fecha: '',
  concepto: '',
  valorCop: '',
}

export function DocumentoSoporte() {
  const [documentos, setDocumentos] = useState<Documentos | null>(null)
  const [proveedores, setProveedores] = useState<ProveedoresNoObligados | null>(
    null,
  )
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [form, setForm] = useState<Formulario>(VACIO)
  const [previa, setPrevia] = useState<LiquidacionDelDocumentoSoporte | null>(
    null,
  )
  const [trabajando, setTrabajando] = useState(false)
  /** El cajón de emitir: es un evento, no un filtro de la tabla. */
  const [emitiendo, setEmitiendo] = useState(false)
  /** Registrar un proveedor desde el mismo cajón (FA-R12). */
  const [registrando, setRegistrando] = useState(false)
  const [nuevo, setNuevo] = useState<ProveedorNuevo>(PROVEEDOR_VACIO)
  const [guardandoProveedor, setGuardandoProveedor] = useState(false)
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<CampoDelProveedor, string>>
  >({})

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [d, p] = await Promise.all([
        facturacionElectronicaService.documentosSoporte(),
        facturacionElectronicaService.proveedores(),
      ])
      setDocumentos(d)
      setProveedores(p)
    } catch (e) {
      setError(e)
      setDocumentos(null)
      setProveedores(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const campo = (clave: keyof Formulario) => (valor: string) => {
    setForm((previo) => ({ ...previo, [clave]: valor }))
    // Cualquier cambio invalida la vista previa: nunca se emite contra una
    // liquidación que ya no corresponde a lo que dice el formulario.
    setPrevia(null)
  }

  const completo =
    form.proveedorId !== '' &&
    form.fecha !== '' &&
    form.concepto.trim() !== '' &&
    Number(form.valorCop) > 0

  const lineas = [
    { concepto: form.concepto.trim(), valorCop: Number(form.valorCop) },
  ]

  async function previsualizar() {
    if (!completo || trabajando) return
    setTrabajando(true)
    try {
      setPrevia(
        await facturacionElectronicaService.previsualizarDocumentoSoporte({
          proveedorId: form.proveedorId,
          lineas,
        }),
      )
    } catch (e) {
      // Con la regla de oro (02-10-2026).
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo calcular el documento.',
          accion: 'calcular el documento soporte',
        }),
      )
    } finally {
      setTrabajando(false)
    }
  }

  async function emitir() {
    if (!completo || !previa || trabajando) return
    setTrabajando(true)
    try {
      const r = await facturacionElectronicaService.emitirDocumentoSoporte({
        proveedorId: form.proveedorId,
        origenTipo: 'MANUAL',
        fecha: form.fecha,
        concepto: form.concepto.trim(),
        lineas,
      })
      toast.success(`Documento soporte ${r.numeroInterno} emitido`)
      setForm(VACIO)
      setPrevia(null)
      setEmitiendo(false)
      await cargar()
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo emitir el documento.',
          accion: 'emitir el documento soporte',
        }),
      )
    } finally {
      setTrabajando(false)
    }
  }

  const proveedoresActivos = (proveedores?.proveedores ?? []).filter((p) => p.activo)
  const erroresDelNuevo = erroresDelProveedor(nuevo)
  const errorDelNuevo = (c: CampoDelProveedor) => erroresDelNuevo[c] ?? erroresDelServidor[c]
  const nuevoListo = nuevo.nombre.trim() !== '' && Object.keys(erroresDelNuevo).length === 0

  function campoDelNuevo<K extends keyof ProveedorNuevo>(clave: K, valor: ProveedorNuevo[K]) {
    setNuevo((p) => ({ ...p, [clave]: valor }))
    setErroresDelServidor((e) => ({ ...e, [clave]: undefined }))
  }

  async function registrarProveedor() {
    if (!nuevoListo || guardandoProveedor) return
    setGuardandoProveedor(true)
    try {
      const pct = nuevo.retefuentePct.trim()
      const creado = await facturacionElectronicaService.crearProveedor({
        nombre: nuevo.nombre.trim(),
        tipoDocumento: nuevo.documento.trim() ? nuevo.tipoDocumento : undefined,
        documento: nuevo.documento.trim() || undefined,
        email: nuevo.email.trim() || undefined,
        telefono: nuevo.telefono.trim() || undefined,
        responsableIva: nuevo.responsableIva === 'NO_SE' ? undefined : nuevo.responsableIva === 'SI',
        retefuentePct: pct === '' ? undefined : Number(pct.replace(',', '.')),
      })
      toast.success(`Proveedor ${creado.nombre} registrado`)
      try {
        setProveedores(await facturacionElectronicaService.proveedores())
      } catch {
        // La lista vieja sigue; el proveedor ya quedó guardado.
      }
      campo('proveedorId')(creado.id)
      setNuevo(PROVEEDOR_VACIO)
      setRegistrando(false)
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor<CampoDelProveedor>(e, {
        campos: ['nombre', 'tipoDocumento', 'documento', 'email', 'telefono', 'retefuentePct'],
        porDefecto: 'No se pudo registrar el proveedor.',
        accion: 'registrar el proveedor',
      })
      setErroresDelServidor(porCampo)
      if (sueltos.length > 0) toast.error(sueltos.join(' · '))
    } finally {
      setGuardandoProveedor(false)
    }
  }

  const sinMigracion = documentos && !documentos.disponible

  return (
    <div className="space-y-4" data-testid="documento-soporte">
      {sinMigracion && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="documento-soporte-sin-migracion"
        >
          <Warning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">{faltaEnLaBase('El documento soporte')}</p>
        </div>
      )}

      {/* 🔴 EL CTA, NO EL FORMULARIO PUESTO (Nico, 22-09: «así hay muchas
          cosas no sólo en estas tablas dentro de facturación que deberían ser
          mejor un CTA que saque toda la información y ya funcione desde ahí»).
          Emitir un documento soporte se hace cuando le pagas a un técnico que
          no factura: es un evento, no un filtro. Cuatro campos debajo de la
          tabla se leen como los filtros de la tabla — pasó con la resolución,
          y acá tenía la misma forma. */}
      <section
        className="overflow-x-clip rounded-lg border border-border bg-surface"
        data-testid="documento-soporte-tarjeta"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-body font-semibold text-fg">
              Documentos soporte emitidos
            </h3>
            <p className="text-caption text-fg-muted">
              Lo que le pagas a un proveedor que NO factura. Lleva un número
              que no se borra y sustenta el gasto ante la DIAN.
            </p>
          </div>
          {proveedores?.disponible && (
            <Button
              hideArrow
              className="shrink-0"
              onClick={() => {
                // Sin ningún proveedor, el cajón abre en el registro: es el primer paso.
                setRegistrando(proveedoresActivos.length === 0)
                setEmitiendo(true)
              }}
              data-testid="ds-abrir"
            >
              <Receipt className="h-4 w-4" weight="bold" />
              Emitir un documento soporte
            </Button>
          )}
        </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="los documentos soporte"
        onReintentar={cargar}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">N°</TableHead>
                <TableHead className="whitespace-nowrap">N° DIAN</TableHead>
                <TableHead className="whitespace-nowrap">Proveedor</TableHead>
                <TableHead className="whitespace-nowrap">Concepto</TableHead>
                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                <TableHead className="whitespace-nowrap text-right">Base</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Retenciones
                </TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Se le paga
                </TableHead>
                <TableHead className="whitespace-nowrap">DIAN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!documentos || documentos.documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <SinDatos
                      queSon="documentos soporte"
                      icono={Receipt}
                      titulo={
                        sinMigracion
                          ? 'El documento soporte todavía no está disponible'
                          : 'Todavía no has emitido ningún documento soporte'
                      }
                      descripcion={
                        sinMigracion
                          ? faltaEnLaBase('El documento soporte')
                          : 'Cuando le pagas a un técnico que no factura, el documento soporte es lo que soporta ese gasto ante la DIAN.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                documentos.documentos.map((d) => (
                  <TableRow key={d.id} data-testid={`documento-soporte-${d.id}`}>
                    <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg">
                      {d.numeroInterno}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg-muted">
                      {d.numeroDian ?? '—'}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {d.proveedorNombre}
                    </TableCell>
                    <TableCell className="max-w-[18rem] truncate text-fg-muted">
                      {d.concepto}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {fechaLegible(d.fecha)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                      {formatCurrency(d.baseCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                      {formatCurrency(d.retefuenteCop + d.reteivaCop + d.reteicaCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg">
                      {formatCurrency(d.netoCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {d.transmision?.estadoNombre ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </EstadoDeDatos>
      </section>

      {proveedores?.disponible && (
        <Cajon
          abierto={emitiendo}
          onOpenChange={(v) => {
            // Mientras la orden viaja no se cierra: cerrar a mitad dejaría sin
            // saber si el documento quedó emitido, y lleva número.
            if (!v && (trabajando || guardandoProveedor)) return
            setEmitiendo(v)
          }}
          ancho="sm:max-w-xl"
          data-testid="cajon-del-documento-soporte"
        >
          <CajonCabecera
            titulo="Emitir un documento soporte"
            descripcion="Se ve primero con sus retenciones y después se emite: lleva un número que no se borra."
          />
          <CajonCuerpo className="space-y-4">
          {registrando ? (
            /* 🔴 FA-R12: registrar al proveedor que no factura, aquí mismo. */
            <section
              className="space-y-4 rounded-lg border border-border p-4"
              data-testid="ds-registrar-proveedor"
            >
              <div>
                <h3 className="text-body font-semibold text-fg">Registrar un proveedor</h3>
                <p className="text-caption text-fg-muted">
                  El técnico o el contratista que no factura. Con el nombre basta; su
                  documento y su retención hacen que el documento salga bien liquidado.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ds-prov-nombre">Nombre</Label>
                  <Input
                    id="ds-prov-nombre"
                    value={nuevo.nombre}
                    onChange={(e) => campoDelNuevo('nombre', e.target.value)}
                    placeholder="Plomería Martínez"
                    maxLength={300}
                    aria-required="true"
                    aria-invalid={errorDelNuevo('nombre') ? true : undefined}
                    aria-describedby={errorDelNuevo('nombre') ? 'ds-prov-nombre-error' : undefined}
                    data-testid="ds-prov-nombre"
                  />
                  <ErrorDelCampo id="ds-prov-nombre-error" mensaje={errorDelNuevo('nombre')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-prov-tipo">Tipo de documento</Label>
                  <Select
                    value={nuevo.tipoDocumento}
                    onValueChange={(v) => campoDelNuevo('tipoDocumento', v)}
                  >
                    <SelectTrigger id="ds-prov-tipo" className="w-full" data-testid="ds-prov-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                      <SelectItem value="CE">Cédula de extranjería</SelectItem>
                      <SelectItem value="PP">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-prov-documento">Número de documento</Label>
                  <Input
                    id="ds-prov-documento"
                    value={nuevo.documento}
                    onChange={(e) => campoDelNuevo('documento', e.target.value)}
                    placeholder="71234567"
                    maxLength={40}
                    aria-invalid={errorDelNuevo('documento') ? true : undefined}
                    aria-describedby={errorDelNuevo('documento') ? 'ds-prov-documento-error' : undefined}
                    data-testid="ds-prov-documento"
                  />
                  <ErrorDelCampo id="ds-prov-documento-error" mensaje={errorDelNuevo('documento')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-prov-correo">Correo</Label>
                  <Input
                    id="ds-prov-correo"
                    type="email"
                    value={nuevo.email}
                    onChange={(e) => campoDelNuevo('email', e.target.value)}
                    placeholder="plomeria@correo.com"
                    maxLength={300}
                    aria-invalid={errorDelNuevo('email') ? true : undefined}
                    aria-describedby={errorDelNuevo('email') ? 'ds-prov-correo-error' : undefined}
                    data-testid="ds-prov-correo"
                  />
                  <ErrorDelCampo id="ds-prov-correo-error" mensaje={errorDelNuevo('email')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-prov-telefono">Teléfono</Label>
                  <Input
                    id="ds-prov-telefono"
                    value={nuevo.telefono}
                    onChange={(e) => campoDelNuevo('telefono', e.target.value)}
                    placeholder="3103640479"
                    maxLength={60}
                    aria-invalid={errorDelNuevo('telefono') ? true : undefined}
                    aria-describedby={errorDelNuevo('telefono') ? 'ds-prov-telefono-error' : undefined}
                    data-testid="ds-prov-telefono"
                  />
                  <ErrorDelCampo id="ds-prov-telefono-error" mensaje={errorDelNuevo('telefono')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-prov-iva">¿Es responsable de IVA?</Label>
                  <Select
                    value={nuevo.responsableIva}
                    onValueChange={(v) => campoDelNuevo('responsableIva', v as ProveedorNuevo['responsableIva'])}
                  >
                    <SelectTrigger id="ds-prov-iva" className="w-full" data-testid="ds-prov-iva">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_SE">No lo sé todavía</SelectItem>
                      <SelectItem value="SI">Sí</SelectItem>
                      <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-prov-retencion">Retención en la fuente (%)</Label>
                  <Input
                    id="ds-prov-retencion"
                    inputMode="decimal"
                    value={nuevo.retefuentePct}
                    onChange={(e) => campoDelNuevo('retefuentePct', e.target.value)}
                    placeholder="4"
                    aria-invalid={errorDelNuevo('retefuentePct') ? true : undefined}
                    aria-describedby={errorDelNuevo('retefuentePct') ? 'ds-prov-retencion-error' : undefined}
                    data-testid="ds-prov-retencion"
                  />
                  <ErrorDelCampo
                    id="ds-prov-retencion-error"
                    mensaje={errorDelNuevo('retefuentePct')}
                    pista="Sin ella el documento sale sin retención y marcado para revisar."
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {proveedoresActivos.length > 0 && (
                  <Button
                    variant="outline"
                    hideArrow
                    disabled={guardandoProveedor}
                    onClick={() => setRegistrando(false)}
                    data-testid="ds-prov-cancelar"
                  >
                    Volver a elegir uno
                  </Button>
                )}
                <Button
                  hideArrow
                  disabled={!nuevoListo || guardandoProveedor}
                  isLoading={guardandoProveedor}
                  onClick={() => void registrarProveedor()}
                  data-testid="ds-prov-guardar"
                >
                  Registrar el proveedor
                </Button>
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ds-proveedor">Proveedor</Label>
              {/* FA-R30: el `Select` del DS, no el del navegador. */}
              <Select
                value={form.proveedorId || undefined}
                onValueChange={(v) => campo('proveedorId')(v)}
                disabled={proveedoresActivos.length === 0}
              >
                <SelectTrigger id="ds-proveedor" className="w-full" data-testid="ds-proveedor">
                  <SelectValue
                    placeholder={
                      proveedoresActivos.length === 0
                        ? 'Todavía no hay proveedores registrados'
                        : 'Elige el proveedor'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {proveedoresActivos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                      {p.faltaPerfilTributario ? ' · falta su perfil' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!registrando && (
                <button
                  type="button"
                  onClick={() => setRegistrando(true)}
                  className="inline-flex items-center gap-1 text-caption font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="ds-abrir-registro"
                >
                  <Plus className="h-3 w-3" weight="bold" aria-hidden="true" />
                  Registrar un proveedor nuevo
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-fecha">Fecha</Label>
              <CampoDeFecha
                id="ds-fecha"
                value={form.fecha}
                onChange={campo('fecha')}
                testid="ds-fecha"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-concepto">Qué se le pagó</Label>
              <Input
                id="ds-concepto"
                value={form.concepto}
                onChange={(e) => campo('concepto')(e.target.value)}
                placeholder="Cambio de la llave del baño del apto 302"
                data-testid="ds-concepto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-valor">Valor</Label>
              {/* El campo de plata de la casa (agrupa los miles), no `type="number"`. */}
              <MoneyInput
                id="ds-valor"
                value={form.valorCop}
                onChange={campo('valorCop')}
                placeholder="200.000"
                data-testid="ds-valor"
              />
            </div>
          </div>

          {previa && (
            <div
              className="rounded-lg border border-border bg-surface-muted p-3 space-y-2"
              data-testid="ds-previa"
            >
              <p className="text-caption text-fg">
                Base <span className="font-mono tabular-nums">{formatCurrency(previa.baseCop)}</span> · IVA{' '}
                <span className="font-mono tabular-nums">{formatCurrency(previa.ivaCop)}</span> ·
                retenciones{' '}
                <span className="font-mono tabular-nums">
                  {formatCurrency(previa.retefuenteCop + previa.reteivaCop + previa.reteicaCop)}
                </span>{' '}
                ·{' '}
                <strong>
                  se le paga <span className="font-mono tabular-nums">{formatCurrency(previa.netoCop)}</span>
                </strong>
              </p>
              {previa.sinConfirmar && (
                <p
                  className="text-caption text-warning"
                  data-testid="ds-sin-confirmar"
                >
                  Faltan datos para liquidar bien este documento. Sale igual —al
                  técnico hay que pagarle— pero queda marcado.
                </p>
              )}
              {previa.notas.length > 0 && (
                <ul className="space-y-0.5">
                  {previa.notas.map((n) => (
                    <li key={n} className="text-caption text-fg-muted">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          </CajonCuerpo>
          <CajonPie
            ayuda={
              !completo
                ? 'Faltan el proveedor, la fecha, el concepto y el valor.'
                : !previa
                  ? 'Primero mira las retenciones: es lo que de verdad se le paga.'
                  : 'Al emitirlo queda con número y no se borra.'
            }
          >
            <Button
              variant="outline"
              hideArrow
              onClick={() => void previsualizar()}
              disabled={!completo || trabajando}
              data-testid="ds-previsualizar"
            >
              Ver las retenciones
            </Button>
            <Button
              hideArrow
              onClick={() => void emitir()}
              disabled={!completo || !previa || trabajando}
              data-testid="ds-emitir"
            >
              Emitir el documento soporte
            </Button>
          </CajonPie>
        </Cajon>
      )}
    </div>
  )
}
