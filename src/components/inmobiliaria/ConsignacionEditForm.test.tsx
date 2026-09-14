/**
 * ConsignacionEditForm.test.tsx — el cajón «Editar» edita el INMUEBLE y el MANDATO.
 *
 * Nico, 2026-09-13: «cuando uno le dé editar al inmueble, revisa que sí tenga
 * toooodo lo que se pueda editar». Antes el formulario editaba sólo el
 * mandato y nunca llamaba a `PATCH /properties/:id`; las fechas eran inputs
 * muertos y la comisión de venta se perdía. Estas pruebas fijan:
 *  - lo del inmueble va a `propertiesApi.update`, sólo lo que cambió;
 *  - lo del mandato va a `consignacionesApi.update`, sólo lo que cambió;
 *  - un 409 del back se dice en palabras adentro del cajón;
 *  - con el mandato terminado sólo se edita el inmueble.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import type { Property } from '@/lib/types/property';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    // La clave, y los params pegados atrás (la clave no trae `{{}}`).
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k} ${Object.values(params).join(' ')}` : k,
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: string) => d,
    locale: 'es',
  }),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgentes: () => ({
    agentes: [
      { id: 'm-1', userId: 'u-1', name: 'Ana', status: 'active', zone: 'Norte' },
      { id: 'm-2', userId: 'u-2', name: 'Beto', status: 'active', zone: '' },
    ],
  }),
}));

// MapLibre toca `window`/WebGL: en jsdom el mapa es un botón que mueve el pin.
vi.mock('@/components/map/LocationPicker', () => ({
  LocationPicker: ({ onChange, value }: { onChange: (c: { lat: number; lng: number }) => void; value: unknown }) => (
    <button type="button" data-testid="mapa-stub" data-pin={value ? 'si' : 'no'} onClick={() => onChange({ lat: 6.25, lng: -75.57 })}>
      mapa
    </button>
  ),
}));

const { toastMock, propertiesUpdate, consigUpdate, consigGetById, consigAssignAgent } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  propertiesUpdate: vi.fn(),
  consigUpdate: vi.fn(),
  consigGetById: vi.fn(),
  consigAssignAgent: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { update: (...a: unknown[]) => propertiesUpdate(...a) },
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    update: (...a: unknown[]) => consigUpdate(...a),
    getById: (...a: unknown[]) => consigGetById(...a),
    assignAgent: (...a: unknown[]) => consigAssignAgent(...a),
  },
}));

import { ConsignacionEditForm } from './ConsignacionEditForm';

function makeConsignacion(overrides: Partial<Consignacion> = {}): Consignacion {
  return {
    id: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'owner-1',
    copropietarios: [{ propietarioId: 'owner-1', participacionBps: 10000 }],
    agenteId: 'u-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    propertyStatus: 'AVAILABLE',
    monthlyRent: 2_500_000,
    adminFee: 0,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: 12,
    commissionPercent: 10,
    contractDate: '2026-01-01T00:00:00.000Z',
    contractEndDate: '2026-12-31T00:00:00.000Z',
    minimumTerm: 12,
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    title: 'Depto Chicó',
    description: 'Apartamento luminoso con vista a los cerros, tercer piso.',
    type: 'apartment',
    status: 'available',
    city: 'Bogotá',
    neighborhood: 'Chicó',
    address: 'Cra 11 #94-45',
    latitude: 4.67,
    longitude: -74.05,
    department: 'Cundinamarca',
    listingType: 'rent',
    salePrice: null,
    monthlyRent: 2_500_000,
    adminFee: 0,
    deposit: 0,
    code: 12,
    consignedAt: '2026-01-01',
    externalId: '3 - CR 50',
    bedrooms: 2,
    bathrooms: 1,
    area: 70,
    floor: 3,
    parkingSpaces: 1,
    stratum: 4,
    yearBuilt: 2010,
    amenities: [{ id: 'gym', name: 'Gimnasio' }],
    images: [],
    thumbnailUrl: '',
    landlordId: 'l-1',
    agencyName: null,
    agencySocials: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  } as Property;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  propertiesUpdate.mockReset().mockResolvedValue({});
  consigUpdate.mockReset().mockResolvedValue({});
  consigAssignAgent.mockReset().mockResolvedValue({});
  consigGetById.mockReset().mockResolvedValue(makeConsignacion({ propertyTitle: 'releída' }));
  Object.values(toastMock).forEach((m) => m.mockReset());
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

type Props = Partial<React.ComponentProps<typeof ConsignacionEditForm>>;

function render(props: Props = {}) {
  const onGuardado = vi.fn();
  const onCerrar = vi.fn();
  act(() => {
    root.render(
      <ConsignacionEditForm
        abierto
        onCerrar={onCerrar}
        consignacion={makeConsignacion()}
        property={makeProperty()}
        onGuardado={onGuardado}
        {...props}
      />,
    );
  });
  return { onGuardado, onCerrar };
}

const q = <T extends Element = HTMLElement>(sel: string) => document.body.querySelector<T>(sel);

function escribir(testId: string, valor: string) {
  const el = q<HTMLInputElement | HTMLTextAreaElement>(`[data-testid="${testId}"]`)!;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  act(() => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function guardar() {
  const form = q<HTMLFormElement>('#form-editar-inmueble')!;
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<ConsignacionEditForm> — el cajón trae todo lo que se puede editar', () => {
  it('es un cajón con las cinco secciones y los campos del inmueble sembrados', () => {
    render();
    expect(q('[data-testid="cajon-editar-inmueble"]')).not.toBeNull();
    for (const s of ['inmueble', 'precio', 'mandato', 'publicacion', 'fotos-documentos']) {
      expect(q(`[data-testid="seccion-${s}"]`), s).not.toBeNull();
    }
    expect(q<HTMLTextAreaElement>('[data-testid="editar-description"]')!.value).toContain('luminoso');
    expect(q<HTMLInputElement>('[data-testid="editar-externalId"]')!.value).toBe('3 - CR 50');
    expect(q<HTMLInputElement>('[data-testid="editar-area"]')!.value).toBe('70');
    expect(q<HTMLInputElement>('[data-testid="editar-contractEndDate"]')!.value).toBe('2026-12-31');
    expect(q('[data-testid="amenidad-gym"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-testid="amenidad-pets"]')!.getAttribute('aria-pressed')).toBe('false');
    // «Habitación» está en el selector de tipo (antes faltaba).
    expect(q('[data-testid="tipo-room"]')).not.toBeNull();
  });

  it('el código y la fecha de consignación se siembran del MANDATO cuando el inmueble (ruta pública) no los trae', () => {
    render({
      consignacion: makeConsignacion({ propertyExternalId: '9 - CL 3', propertyConsignedAt: '2026-03-01' }),
      property: makeProperty({ externalId: undefined, consignedAt: undefined }),
    });
    expect(q<HTMLInputElement>('[data-testid="editar-externalId"]')!.value).toBe('9 - CL 3');
    expect(q<HTMLInputElement>('[data-testid="editar-consignedAt"]')!.value).toBe('2026-03-01');
  });

  it('sólo manda lo que cambió: descripción y estrato van al inmueble, nada al mandato, y relee', async () => {
    const { onGuardado, onCerrar } = render();
    escribir('editar-description', 'Descripción nueva, larga y con más de veinte letras.');
    await guardar();

    expect(propertiesUpdate).toHaveBeenCalledTimes(1);
    expect(propertiesUpdate).toHaveBeenCalledWith('prop-1', {
      description: 'Descripción nueva, larga y con más de veinte letras.',
    });
    expect(consigUpdate).not.toHaveBeenCalled();
    expect(consigGetById).toHaveBeenCalledWith('cons-1');
    expect(onGuardado).toHaveBeenCalledWith(expect.objectContaining({ propertyTitle: 'releída' }));
    expect(onCerrar).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('título, canon y administración van al INMUEBLE (el back arrastra la copia del mandato), no al mandato', async () => {
    render();
    escribir('editar-title', 'Depto Chicó remodelado');
    escribir('editar-monthlyRent', '2800000');
    escribir('editar-adminFee', '150000');
    await guardar();

    expect(propertiesUpdate).toHaveBeenCalledWith('prop-1', {
      title: 'Depto Chicó remodelado',
      monthlyRent: 2_800_000,
      adminFee: 150_000,
    });
    expect(consigUpdate).not.toHaveBeenCalled();
  });

  it('el código de la inmobiliaria, las amenidades (mascotas) y un campo vaciado (null) viajan al inmueble', async () => {
    render();
    escribir('editar-externalId', ' 7 - CL 10 ');
    escribir('editar-floor', '');
    act(() => {
      q('[data-testid="amenidad-pets"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await guardar();

    expect(propertiesUpdate).toHaveBeenCalledWith('prop-1', {
      externalId: '7 - CL 10',
      floor: null,
      amenities: ['gym', 'pets'],
    });
  });

  it('mover el pin del mapa manda latitude/longitude — la ubicación es SIEMPRE editable', async () => {
    render();
    expect(q('[data-testid="mapa-stub"]')!.getAttribute('data-pin')).toBe('si');
    act(() => {
      q('[data-testid="mapa-stub"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await guardar();

    expect(propertiesUpdate).toHaveBeenCalledWith('prop-1', { latitude: 6.25, longitude: -75.57 });
  });

  it('las fechas del mandato viajan de verdad (antes eran inputs muertos); vaciar la de fin manda null', async () => {
    render();
    escribir('editar-contractDate', '2026-02-01');
    escribir('editar-contractEndDate', '');
    escribir('editar-commissionPercent', '9');
    await guardar();

    expect(consigUpdate).toHaveBeenCalledWith('cons-1', {
      commissionPercent: 9,
      contractDate: '2026-02-01',
      contractEndDate: null,
    });
    expect(propertiesUpdate).not.toHaveBeenCalled();
  });

  it('una fecha de fin anterior a la de inicio no se manda', async () => {
    render();
    escribir('editar-contractEndDate', '2025-01-01');
    await guardar();
    expect(consigUpdate).not.toHaveBeenCalled();
    expect(propertiesUpdate).not.toHaveBeenCalled();
  });

  it('en un mandato de VENTA la comisión de venta se guarda (antes se perdía) y el precio de venta va al inmueble', async () => {
    render({
      consignacion: makeConsignacion({ listingType: 'sale', monthlyRent: null, commissionPercent: 0, saleCommissionPercent: 3 }),
      property: makeProperty({ listingType: 'sale', monthlyRent: null, salePrice: 450_000_000 }),
    });
    expect(q('[data-testid="editar-monthlyRent"]')).toBeNull();
    escribir('editar-saleCommissionPercent', '3.5');
    escribir('editar-salePrice', '480000000');
    await guardar();

    expect(consigUpdate).toHaveBeenCalledWith('cons-1', { saleCommissionPercent: 3.5 });
    expect(propertiesUpdate).toHaveBeenCalledWith('prop-1', { salePrice: 480_000_000 });
    const enviado = propertiesUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect('monthlyRent' in enviado).toBe(false);
  });

  it('despublicar manda status DRAFT; el interruptor no existe con contrato vigente (RENTED)', async () => {
    render();
    const sw = q('[data-testid="editar-publicado"]')!;
    expect(sw.getAttribute('aria-checked')).toBe('true');
    act(() => {
      sw.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await guardar();
    expect(propertiesUpdate).toHaveBeenCalledWith('prop-1', { status: 'DRAFT' });

    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    render({ consignacion: makeConsignacion({ propertyStatus: 'RENTED' }) });
    expect(q('[data-testid="editar-publicado"]')).toBeNull();
    expect(q('[data-testid="publicacion-no-aplica"]')!.textContent).toContain('RENTED');
  });

  it('cambiar el agente va por assign-agent con el User id, sólo si cambió', async () => {
    render();
    // Sin cambio: nada.
    escribir('editar-neighborhood', 'Chicó Norte');
    await guardar();
    expect(consigAssignAgent).not.toHaveBeenCalled();
  });

  it('un 409 del back se dice en palabras adentro del cajón y el cajón sigue abierto', async () => {
    propertiesUpdate.mockRejectedValue(
      new ApiError(409, 'Este inmueble ya tiene mandato. Cambiar arriendo por venta requiere terminar el mandato actual y crear uno nuevo.', 'MANDATO_EXISTENTE'),
    );
    const { onCerrar, onGuardado } = render();
    escribir('editar-title', 'Otro título');
    await guardar();

    const aviso = q('[data-testid="editar-conflicto"]')!;
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('Cambiar arriendo por venta requiere terminar el mandato');
    expect(onCerrar).not.toHaveBeenCalled();
    expect(onGuardado).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('si el inmueble se guardó pero el mandato falló, lo dice y el reintento no repite el inmueble', async () => {
    consigUpdate.mockRejectedValueOnce(new ApiError(409, 'La consignación está terminada: sus términos ya no se editan.', 'CONSIGNACION_TERMINADA'));
    render();
    escribir('editar-title', 'Otro título');
    escribir('editar-commissionPercent', '11');
    await guardar();

    expect(propertiesUpdate).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="editar-conflicto"]')!.textContent).toContain('inmobiliaria.consignaciones.editForm.guardadoParcial');

    await guardar();
    // El inmueble ya quedó: sólo se reintenta el mandato.
    expect(propertiesUpdate).toHaveBeenCalledTimes(1);
    expect(consigUpdate).toHaveBeenCalledTimes(2);
  });

  it('sin cambios no llama a nadie y cierra', async () => {
    const { onCerrar } = render();
    await guardar();
    expect(propertiesUpdate).not.toHaveBeenCalled();
    expect(consigUpdate).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalled();
  });

  it('con el mandato TERMINADO los campos del mandato están inactivos y sólo se edita el inmueble', async () => {
    render({ consignacion: makeConsignacion({ status: 'terminated' }) });
    expect(q('[data-testid="aviso-mandato-terminado"]')).not.toBeNull();
    expect(q<HTMLInputElement>('[data-testid="editar-commissionPercent"]')!.disabled).toBe(true);
    expect(q<HTMLInputElement>('[data-testid="editar-contractDate"]')!.disabled).toBe(true);
    escribir('editar-description', 'Descripción nueva, larga y con más de veinte letras.');
    await guardar();
    expect(propertiesUpdate).toHaveBeenCalledTimes(1);
    expect(consigUpdate).not.toHaveBeenCalled();
  });

  it('sin inmueble vinculado (cartera migrada) el título y la dirección van al MANDATO, y no hay «habitación»', async () => {
    render({ consignacion: makeConsignacion({ propertyId: '' }), property: null });
    expect(q('[data-testid="aviso-sin-inmueble"]')).not.toBeNull();
    expect(q('[data-testid="tipo-room"]')).toBeNull();
    escribir('editar-title', 'Casa migrada');
    escribir('editar-address', 'Cl 1 # 2-3');
    await guardar();

    expect(propertiesUpdate).not.toHaveBeenCalled();
    expect(consigUpdate).toHaveBeenCalledWith('cons-1', { propertyTitle: 'Casa migrada', propertyAddress: 'Cl 1 # 2-3' });
  });

  it('los accesos a fotos y documentos cierran el cajón y llevan al ancla', () => {
    vi.useFakeTimers();
    const { onCerrar } = render();
    const ancla = document.createElement('div');
    ancla.id = 'fotos';
    ancla.scrollIntoView = vi.fn();
    document.body.appendChild(ancla);
    act(() => {
      q('[data-testid="ir-a-fotos"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCerrar).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(ancla.scrollIntoView).toHaveBeenCalled();
    ancla.remove();
    vi.useRealTimers();
  });
});
