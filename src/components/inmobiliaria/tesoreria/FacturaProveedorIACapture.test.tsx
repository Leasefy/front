/**
 * Captura de facturas de proveedor por IA (2026-09-02).
 *
 * Lo que se protege: subir la foto → la IA lee → el formulario sale
 * prellenado con el proveedor emparejado → «Registrar factura» manda el body
 * correcto a POST /ap/bills; cuando el proveedor no existe se puede crear con
 * un clic y queda seleccionado; cuando no hay match pero hay parecidos se
 * eligen; y un error de la extracción se muestra y se puede reintentar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k}(${Object.values(vars).join(',')})` : k,
  }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

const api = {
  listVendors: vi.fn(),
  listCostCenters: vi.fn(),
  extractBill: vi.fn(),
  createVendor: vi.fn(),
  createBill: vi.fn(),
};
vi.mock('@/lib/api/ap.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/ap.service')>('@/lib/api/ap.service');
  return {
    ...actual,
    // La validación de archivos y el tipo real son los reales; sólo la red se reemplaza.
    apApi: {
      listVendors: (...a: unknown[]) => api.listVendors(...a),
      listCostCenters: (...a: unknown[]) => api.listCostCenters(...a),
      extractBill: (...a: unknown[]) => api.extractBill(...a),
      createVendor: (...a: unknown[]) => api.createVendor(...a),
      createBill: (...a: unknown[]) => api.createBill(...a),
    },
  };
});

// Los controles flotantes de cadence (Popover/Radix) no aportan acá: se
// reemplazan por <select> nativos para poder leer y cambiar el valor.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    value,
    onChange,
    options,
  }: {
    value?: string;
    onChange?: (v: string | undefined) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select data-testid="combobox" value={value ?? ''} onChange={(e) => onChange?.(e.target.value || undefined)}>
      <option value="" />
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select data-testid="select" value={value ?? ''} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { FacturaProveedorIACapture } from './FacturaProveedorIACapture';
import { ApiError } from '@/lib/api/client';
import type { ApBill, ApVendor, FacturaExtractResponse } from '@/lib/api/ap.types';

const AGENCY = '00000000-0000-0000-0000-000000000001';
const VENDOR_A = '00000000-0000-0000-0000-00000000000a';
const VENDOR_B = '00000000-0000-0000-0000-00000000000b';

const vendor = (id: string, name: string, documentNumber: string): ApVendor => ({
  id,
  tenantId: AGENCY,
  name,
  documentNumber,
  bankName: null,
  bankAccountNumber: null,
  bankAccountType: null,
  bankAccountHolder: null,
  email: null,
  phone: null,
  createdAt: '2026-09-01T00:00:00.000Z',
});

const respuesta = (over: Partial<FacturaExtractResponse> = {}): FacturaExtractResponse => ({
  success: true,
  factura: {
    proveedorNombre: 'Plomería El Tornillo S.A.S.',
    proveedorNit: '900123456',
    proveedorDv: '7',
    proveedorCorreo: 'facturas@eltornillo.co',
    proveedorTelefono: '6044445566',
    numeroFactura: 'FE-1042',
    cufe: null,
    fechaEmision: '2026-09-01',
    fechaVencimiento: null,
    moneda: 'COP',
    subtotalCop: 1000000,
    ivaCop: 190000,
    retencionesCop: null,
    totalCop: 1190000,
    concepto: 'Reparación de fuga en el apto 302',
    inmuebleReferencia: 'Apto 302',
    formaDePago: null,
    fieldConfidence: { totalCop: 0.9 },
  },
  items: [{ descripcion: 'Mano de obra', cantidad: 1, valorUnitarioCop: 1000000, valorCop: 1000000 }],
  conflictos: [],
  documentos: [{ nombre: 'factura.jpg', tipo: 'factura_electronica' }],
  confidence: 0.92,
  proveedor: {
    match: { vendorId: VENDOR_A, name: 'PLOMERIA EL TORNILLO SAS', documentNumber: '900123456-7' },
    candidatos: [],
  },
  sugerencia: {
    vendorId: VENDOR_A,
    invoiceNumber: 'FE-1042',
    amountCop: 1190000,
    baseGravableCop: 1000000,
    ivaCop: 190000,
    issuedAt: '2026-09-01T00:00:00.000Z',
    dueDate: null,
    costCenterCode: '511500',
  },
  adjuntoUrl: 'https://storage.example.co/sign/ap/factura.jpg?token=abc',
  tokensUsed: 1000,
  estimatedCostUsd: 0.004,
  ...over,
});

const billCreada: ApBill = {
  id: '00000000-0000-0000-0000-0000000000b1',
  tenantId: AGENCY,
  vendorId: VENDOR_A,
  invoiceNumber: 'FE-1042',
  amountCop: '1190000',
  baseGravableCop: '1000000',
  ivaCop: '190000',
  costCenterCode: '511500',
  issuedAt: '2026-09-01T12:00:00.000Z',
  dueDate: '2026-10-01T12:00:00.000Z',
  status: 'pending_approval',
  createdBy: 'u',
  approvedBy: null,
  approvedAt: null,
  adjuntoUrl: 'https://storage.example.co/sign/ap/factura.jpg?token=abc',
  concepto: 'Reparación de fuga en el apto 302',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  for (const fn of Object.values(api)) fn.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  api.listVendors.mockResolvedValue([
    vendor(VENDOR_A, 'PLOMERIA EL TORNILLO SAS', '900123456-7'),
    vendor(VENDOR_B, 'Ferretería La Tuerca Ltda', '800999111'),
  ]);
  api.listCostCenters.mockResolvedValue([
    { code: '519500', name: 'Gastos Generales' },
    { code: '511500', name: 'Mantenimiento' },
  ]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function archivo(nombre: string, tipo: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector(sel) as T | null;

async function montar() {
  const onRegistrada = vi.fn();
  const onCancel = vi.fn();
  await act(async () => {
    root.render(<FacturaProveedorIACapture agencyId={AGENCY} onRegistrada={onRegistrada} onCancel={onCancel} />);
  });
  return { onRegistrada, onCancel };
}

async function elegir(files: File[]) {
  const input = $('[data-testid="factura-ia-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function click(sel: string) {
  const el = $(sel);
  if (!el) throw new Error(`no existe ${sel}`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Los handlers encadenan varios `await` (mock → servicio → finally):
    // una macrotarea deja que terminen antes de leer el DOM.
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function escribir(sel: string, valor: string) {
  const el = $<HTMLInputElement>(sel);
  if (!el) throw new Error(`no existe ${sel}`);
  const setter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    setter?.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function subirYLeer(res: FacturaExtractResponse) {
  api.extractBill.mockResolvedValue(res);
  await elegir([archivo('factura.jpg', 'image/jpeg')]);
  await click('[data-testid="factura-ia-extraer"]');
}

describe('FacturaProveedorIACapture', () => {
  it('subir → leer → formulario prellenado con el proveedor emparejado → registrar manda el body correcto', async () => {
    const { onRegistrada } = await montar();
    expect($('[data-testid="factura-ia-dropzone"]')).not.toBeNull();

    await subirYLeer(respuesta());

    expect(api.extractBill).toHaveBeenCalledWith(AGENCY, [expect.any(File)]);
    expect($('[data-testid="factura-form"]')).not.toBeNull();
    expect($<HTMLInputElement>('[data-testid="factura-numero"]')?.value).toBe('FE-1042');
    expect($<HTMLInputElement>('[data-testid="factura-emision"]')?.value).toBe('2026-09-01');
    expect($<HTMLInputElement>('[data-testid="factura-vencimiento"]')?.value).toBe('');
    expect($<HTMLInputElement>('[data-testid="factura-total"]')?.value).toBe('1.190.000');
    expect($<HTMLInputElement>('[data-testid="factura-subtotal"]')?.value).toBe('1.000.000');
    expect($<HTMLTextAreaElement>('[data-testid="factura-concepto"]')?.value).toBe('Reparación de fuga en el apto 302');
    expect($<HTMLSelectElement>('[data-testid="combobox"]')?.value).toBe(VENDOR_A);
    expect($<HTMLSelectElement>('[data-testid="select"]')?.value).toBe('511500');
    expect($('[data-testid="proveedor-nuevo"]')).toBeNull();
    expect($('[data-testid="documentos-detectados"]')?.textContent).toContain('factura_electronica');
    expect($<HTMLAnchorElement>('[data-testid="factura-adjunto-ver"]')?.href).toContain('storage.example.co');
    expect($('[data-testid="factura-items"]')?.textContent).toContain('Mano de obra');

    // Sin vencimiento no se registra: la factura no lo traía y no se inventa.
    await click('[data-testid="factura-registrar"]');
    expect(api.createBill).not.toHaveBeenCalled();
    expect(container.textContent).toContain('errorVencimiento');

    await escribir('[data-testid="factura-vencimiento"]', '2026-10-01');
    api.createBill.mockResolvedValue(billCreada);
    await click('[data-testid="factura-registrar"]');

    expect(api.createBill).toHaveBeenCalledWith(AGENCY, {
      vendorId: VENDOR_A,
      invoiceNumber: 'FE-1042',
      amountCop: 1190000,
      baseGravableCop: 1000000,
      ivaCop: 190000,
      costCenterCode: '511500',
      issuedAt: '2026-09-01T12:00:00.000Z',
      dueDate: '2026-10-01T12:00:00.000Z',
      adjuntoUrl: 'https://storage.example.co/sign/ap/factura.jpg?token=abc',
      concepto: 'Reparación de fuga en el apto 302',
    });
    expect(toastSuccess).toHaveBeenCalled();
    expect(onRegistrada).toHaveBeenCalledWith(billCreada);
  });

  it('proveedor nuevo: chip con nombre y NIT, «Crearlo» lo crea con los datos leídos y lo selecciona', async () => {
    await montar();
    await subirYLeer(
      respuesta({
        proveedor: { match: null, candidatos: [] },
        sugerencia: { ...respuesta().sugerencia, vendorId: null },
      }),
    );

    const chip = $('[data-testid="proveedor-nuevo"]');
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toContain('Plomería El Tornillo S.A.S.,900123456-7');
    expect($<HTMLInputElement>('[data-testid="proveedor-nuevo-nit"]')?.value).toBe('900123456');
    expect($<HTMLSelectElement>('[data-testid="combobox"]')?.value).toBe('');

    const nuevo = vendor('00000000-0000-0000-0000-00000000000c', 'Plomería El Tornillo S.A.S.', '900123456-7');
    api.createVendor.mockResolvedValue(nuevo);
    await click('[data-testid="proveedor-crear"]');
    // Los catálogos se cargan UNA vez por agencia: un re-render no pisa el proveedor recién creado.
    expect(api.listVendors).toHaveBeenCalledTimes(1);

    expect(api.createVendor).toHaveBeenCalledWith(AGENCY, {
      name: 'Plomería El Tornillo S.A.S.',
      documentNumber: '900123456-7',
      email: 'facturas@eltornillo.co',
      phone: '6044445566',
    });
    expect($<HTMLSelectElement>('[data-testid="combobox"]')?.value).toBe(nuevo.id);
    expect($('[data-testid="proveedor-nuevo"]')).toBeNull();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('sin match pero con parecidos: se ofrecen y elegir uno selecciona el proveedor', async () => {
    await montar();
    await subirYLeer(
      respuesta({
        factura: { ...respuesta().factura, proveedorNit: null, proveedorDv: null, proveedorNombre: 'Ferretería La Tuerca' },
        proveedor: {
          match: null,
          candidatos: [{ vendorId: VENDOR_B, name: 'Ferretería La Tuerca Ltda', documentNumber: '800999111' }],
        },
        sugerencia: { ...respuesta().sugerencia, vendorId: null },
      }),
    );

    expect($('[data-testid="proveedor-candidatos"]')).not.toBeNull();
    // Sin NIT leído, «Crearlo» espera a que se escriba uno.
    expect($<HTMLButtonElement>('[data-testid="proveedor-crear"]')?.disabled).toBe(true);

    await click(`[data-testid="candidato-${VENDOR_B}"]`);
    expect($<HTMLSelectElement>('[data-testid="combobox"]')?.value).toBe(VENDOR_B);
    expect($('[data-testid="proveedor-nuevo"]')).toBeNull();
  });

  it('un conflicto entre páginas se muestra y «usar este valor» pisa el campo del formulario', async () => {
    await montar();
    await subirYLeer(
      respuesta({
        conflictos: [
          {
            campo: 'totalCop',
            valores: [
              { valor: '1.190.000', documento: 'p1.jpg' },
              { valor: '1.290.000', documento: 'p2.jpg' },
            ],
          },
        ],
      }),
    );
    expect($('[data-testid="conflicto-totalCop"]')).not.toBeNull();
    const botones = container.querySelectorAll('[data-testid="usar-totalCop"]');
    await act(async () => {
      botones[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect($<HTMLInputElement>('[data-testid="factura-total"]')?.value).toBe('1.290.000');
  });

  it('error de la extracción: se muestra el mensaje del agente y se puede reintentar', async () => {
    await montar();
    api.extractBill.mockRejectedValue(
      new ApiError(400, '«factura.heic»: formato no soportado (image/heic). Subí una foto (JPG, PNG, WebP) o un PDF.'),
    );
    await elegir([archivo('factura.jpg', 'image/jpeg')]);
    await click('[data-testid="factura-ia-extraer"]');

    expect($('[data-testid="factura-error"]')?.textContent).toContain('«factura.heic»');
    await click('[data-testid="factura-reintentar"]');
    expect($('[data-testid="factura-ia-dropzone"]')).not.toBeNull();
    // Los archivos ya elegidos se conservan para reintentar.
    expect($('[data-testid="factura-ia-archivos"]')?.textContent).toContain('factura.jpg');
  });

  it('un formato que el agente no lee se rechaza antes de subir, y «Cargar a mano» abre el formulario vacío', async () => {
    await montar();
    await elegir([archivo('factura.heic', 'image/heic')]);
    expect(toastError).toHaveBeenCalledWith('inmobiliaria.tesoreria.facturas.errorUnsupported(10)');
    expect($('[data-testid="factura-ia-archivos"]')).toBeNull();

    await click('[data-testid="factura-ia-manual"]');
    expect($('[data-testid="factura-form"]')).not.toBeNull();
    expect($<HTMLInputElement>('[data-testid="factura-numero"]')?.value).toBe('');
    expect(api.extractBill).not.toHaveBeenCalled();
  });

  it('si la API rechaza el alta, el error se muestra en un toast y no se redirige', async () => {
    const { onRegistrada } = await montar();
    await subirYLeer(respuesta({ sugerencia: { ...respuesta().sugerencia, dueDate: '2026-10-01T00:00:00.000Z' } }));
    api.createBill.mockRejectedValue(new ApiError(409, 'Ya hay una factura con ese número para este proveedor.'));
    await click('[data-testid="factura-registrar"]');
    expect(toastError).toHaveBeenCalledWith('Ya hay una factura con ese número para este proveedor.');
    expect(onRegistrada).not.toHaveBeenCalled();
  });

  it('Storage en stub-mode (adjuntoUrl null): se avisa y el alta va sin adjunto', async () => {
    await montar();
    await subirYLeer(
      respuesta({ adjuntoUrl: null, sugerencia: { ...respuesta().sugerencia, dueDate: '2026-10-01T00:00:00.000Z' } }),
    );
    expect($('[data-testid="factura-adjunto-no-guardado"]')).not.toBeNull();
    api.createBill.mockResolvedValue(billCreada);
    await click('[data-testid="factura-registrar"]');
    const body = api.createBill.mock.calls[0][1] as Record<string, unknown>;
    expect(body.adjuntoUrl).toBeUndefined();
  });

});
