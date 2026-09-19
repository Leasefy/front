/**
 * La tarjeta del mandato en la ficha del inmueble (C-05 y la firma).
 *
 * Lo que fija este test:
 *   · 🔴 las DOS puertas se muestran por separado. Una sola lista de
 *     «pendientes» hace que el funcionario crea que no puede publicar porque le
 *     falta el RUT — que es de la otra puerta;
 *   · el certificado de tradición muestra los DÍAS que le quedan, no «está»;
 *   · 🔴 el token del enlace de firma se muestra UNA vez, con el aviso de
 *     copiarlo: no vuelve en ninguna lectura.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { api } = vi.hoisted(() => ({
  api: {
    documentos: (() => Promise.resolve(null)) as () => Promise<unknown>,
    firmas: (() => Promise.resolve(null)) as () => Promise<unknown>,
    pedirFirma: vi.fn(async () => ({
      id: 'f-1',
      venceEl: '2026-09-25T15:00:00.000Z',
      token: 'tok-secreto',
    })),
  },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    captacionApi: {
      documentos: () => api.documentos(),
      firmas: () => api.firmas(),
      pedirFirmaElectronica: api.pedirFirma,
    },
  }
})

import { MandatoDelInmueble } from './MandatoDelInmueble'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const DOCUMENTOS = {
  disponible: true,
  motivo: null,
  tipos: [],
  documentos: [
    {
      id: 'd-1',
      tipo: 'CERTIFICADO_TRADICION',
      nombreDelTipo: 'Certificado de tradición y libertad',
      archivoNombre: 'cert.pdf',
      expedidoEl: '2026-09-10',
      propietarioId: null,
      diasQueLeQuedan: 3,
      reemplazadoEl: null,
      createdAt: '2026-09-18T10:00:00.000Z',
    },
  ],
  paraPublicar: {
    completo: false,
    falta: [
      {
        tipo: 'MANDATO_FIRMADO',
        nombre: 'Mandato firmado',
        porQue: 'FALTA',
        detalle: 'Sube mandato firmado.',
      },
    ],
  },
  paraElPrimerGiro: {
    completo: false,
    falta: [
      {
        tipo: 'RUT',
        nombre: 'RUT',
        porQue: 'FALTA',
        detalle: 'Sube rut.',
      },
    ],
  },
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar(puedeEditar = true) {
  await act(async () => {
    root!.render(
      <MandatoDelInmueble
        consignacionId="cons-1"
        propietarioNombre="Juan Pérez"
        puedeEditar={puedeEditar}
      />,
    )
  })
}
const $ = (sel: string) => contenedor.querySelector(sel)

beforeEach(() => {
  api.documentos = vi.fn(() => Promise.resolve(DOCUMENTOS))
  api.firmas = vi.fn(() =>
    Promise.resolve({ disponible: true, motivo: null, firmas: [] }),
  )
  api.pedirFirma.mockClear()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => {
    root!.unmount()
  })
  root = null
  contenedor.remove()
})

describe('MandatoDelInmueble', () => {
  it('🔴 las dos puertas van separadas, cada una con lo suyo', async () => {
    await pintar()
    const publicar = $('[data-testid="puerta-publicar"]')?.textContent ?? ''
    const giro = $('[data-testid="puerta-giro"]')?.textContent ?? ''
    expect(publicar).toContain('Antes de publicar')
    expect(publicar).toContain('Mandato firmado')
    // 🔴 El RUT es de la OTRA puerta: no puede aparecer en la de publicar.
    expect(publicar).not.toContain('RUT')
    expect(giro).toContain('Antes del primer giro')
    expect(giro).toContain('RUT')
  })

  it('el certificado muestra los días que le quedan, no «está»', async () => {
    await pintar()
    expect(
      $('[data-testid="documento-CERTIFICADO_TRADICION"]')?.textContent,
    ).toContain('3 días')
  })

  it('🔴 el token del enlace sale UNA vez, con el aviso de copiarlo', async () => {
    await pintar()
    await act(async () => {
      contenedor
        .querySelector<HTMLElement>('[data-testid="pedir-firma"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const enlace = $('[data-testid="enlace-de-firma"]')?.textContent ?? ''
    expect(enlace).toContain('no se vuelve a mostrar')
    expect(enlace).toContain('tok-secreto')
  })

  it('con el mandato ya firmado no ofrece crear otro enlace', async () => {
    api.firmas = vi.fn(() =>
      Promise.resolve({
        disponible: true,
        motivo: null,
        firmas: [
          {
            id: 'f-9',
            forma: 'PDF_CARGADO' as const,
            estado: 'FIRMADA' as const,
            firmanteNombre: 'Juan Pérez',
            firmanteCorreo: null,
            venceEl: null,
            firmadaEl: '2026-09-15T00:00:00.000Z',
            pdfNombre: 'mandato.pdf',
            createdAt: '2026-09-15T00:00:00.000Z',
          },
        ],
      }),
    )
    await pintar()
    expect(contenedor.textContent).toContain('Firmado por Juan Pérez')
    expect($('[data-testid="pedir-firma"]')).toBeNull()
  })

  it('sin permiso no ofrece crear el enlace', async () => {
    await pintar(false)
    expect($('[data-testid="pedir-firma"]')).toBeNull()
  })

  it('un 503 se avisa como «todavía no está disponible», no como un error', async () => {
    const { ApiError } = await import('@/lib/api/client')
    api.documentos = vi.fn(() =>
      Promise.reject(
        new ApiError(503, [
          'falta aplicar la migración 20260918163000_captacion_listas_y_firma_del_mandato',
        ]),
      ),
    )
    await pintar()
    const aviso = $('[data-testid="mandato-no-habilitado"]')?.textContent ?? ''
    // 🔴 El identificador de la migración es para quien despliega, no para la
    // inmobiliaria (Nico, 18-09-2026). Lo que queda es el aviso, y NO un error.
    expect(aviso).not.toContain('20260918163000')
    expect(aviso).toContain('todavía no está disponible')
    expect($('[data-testid="fallo-de-carga"]')).toBeNull()
  })
})
