/**
 * El editor de plantillas propias.
 *
 * 🔴 Lo que fija este archivo no es el formulario: es el candado. Una plantilla
 * es HTML legal con `{{variables}}`, y una variable mal escrita NO falla — sale
 * impresa con sus llaves en un documento que alguien firma. Así que:
 *
 *   · una variable que el sistema no sabe llenar apaga el guardar y se DICE,
 *     con la más parecida al lado y un clic para corregirla;
 *   · el aviso va puesto en la pantalla, no detrás de un botón: es un requisito
 *     que falta, no una explicación (ver `para-entender-mas.tsx`);
 *   · y con el catálogo caído NO se marca nada: sin la lista no se sabe, y
 *     pintar de rojo una plantilla que estaba bien sería inventar un problema.
 *     El back revisa igual al guardar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  api: {
    variablesDePlantilla: vi.fn(),
    crearPlantilla: vi.fn(),
    editarPlantilla: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/documentos.service', () => ({ documentosLegalesApi: h.api }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));

// El cajón real es Radix con portal; acá sólo estorba.
vi.mock('@/components/ui/cajon', () => ({
  Cajon: ({ abierto, children }: { abierto: boolean; children: React.ReactNode }) =>
    abierto ? <div data-testid="cajon">{children}</div> : null,
  CajonCabecera: ({ titulo }: { titulo: string }) => <h2>{titulo}</h2>,
  CajonCuerpo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { EditorDePlantilla } from './EditorDePlantilla';

const CATALOGO = [
  { nombre: 'arrendatarioNombre', etiqueta: 'Nombre del inquilino', grupo: 'partes' as const },
  { nombre: 'canonValor', etiqueta: 'Canon, en números', grupo: 'contrato' as const },
  { nombre: 'inmuebleDireccion', etiqueta: 'Dirección del inmueble', grupo: 'inmueble' as const },
];

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  h.api.variablesDePlantilla.mockReset().mockResolvedValue(CATALOGO);
  h.api.crearPlantilla.mockReset().mockResolvedValue({ id: 'nueva' });
  h.api.editarPlantilla.mockReset().mockResolvedValue({ id: 'p-1' });
  h.toast.success.mockReset();
  h.toast.error.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const guardado = vi.fn();
const cerrado = vi.fn();

async function montar(plantilla: Parameters<typeof EditorDePlantilla>[0]['plantilla'] = null) {
  await act(async () => {
    raiz.render(
      <EditorDePlantilla
        abierto
        plantilla={plantilla}
        onCerrar={cerrado}
        onGuardado={guardado}
      />,
    );
  });
}

function porTestId(id: string) {
  return contenedor.querySelector<HTMLElement>(`[data-testid="${id}"]`);
}

async function escribir(id: string, valor: string) {
  const campo = porTestId(id) as HTMLInputElement | HTMLTextAreaElement;
  await act(async () => {
    // Setter del prototipo + evento: React no ve una asignación directa.
    const proto =
      campo instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('el candado de las variables', () => {
  it('🔴 una variable que el sistema no sabe llenar apaga el guardar y dice cuál', async () => {
    await montar();
    await escribir('plantilla-nombre', 'Carta de multa');
    await escribir('plantilla-contenido', '<p>Debe {{valorDeLaMulta}}</p>');

    const aviso = porTestId('variables-desconocidas');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('{{valorDeLaMulta}}');
    expect((porTestId('plantilla-guardar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('un error de tipeo trae la parecida, y un clic la corrige en el texto', async () => {
    await montar();
    await escribir('plantilla-nombre', 'Bienvenida');
    await escribir('plantilla-contenido', '<p>Hola {{arrendatarioNombe}}</p>');

    const corregir = porTestId('corregir-arrendatarioNombe');
    expect(corregir).not.toBeNull();
    await act(async () => {
      (corregir as HTMLButtonElement).click();
    });

    const area = porTestId('plantilla-contenido') as HTMLTextAreaElement;
    expect(area.value).toBe('<p>Hola {{arrendatarioNombre}}</p>');
    expect(porTestId('variables-desconocidas')).toBeNull();
    expect((porTestId('plantilla-guardar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('con las variables buenas dice cuántos datos usa, y deja guardar', async () => {
    await montar();
    await escribir('plantilla-nombre', 'Bienvenida');
    await escribir('plantilla-contenido', '<p>{{arrendatarioNombre}} en {{inmuebleDireccion}}</p>');

    expect(porTestId('variables-ok')!.textContent).toContain('2 datos');
    await act(async () => {
      (porTestId('plantilla-guardar') as HTMLButtonElement).click();
    });
    expect(h.api.crearPlantilla).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bienvenida',
        content: '<p>{{arrendatarioNombre}} en {{inmuebleDireccion}}</p>',
      }),
    );
    expect(guardado).toHaveBeenCalled();
  });

  it('🔴 con el catálogo caído NO marca nada y deja trabajar', async () => {
    h.api.variablesDePlantilla.mockRejectedValue(new Error('500'));
    await montar();
    await escribir('plantilla-nombre', 'Carta');
    await escribir('plantilla-contenido', '<p>{{loQueSea}}</p>');

    expect(porTestId('catalogo-caido')).not.toBeNull();
    expect(porTestId('variables-desconocidas')).toBeNull();
    expect((porTestId('plantilla-guardar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('sin nombre o sin texto no se puede guardar', async () => {
    await montar();
    expect((porTestId('plantilla-guardar') as HTMLButtonElement).disabled).toBe(true);
    await escribir('plantilla-nombre', 'Carta');
    expect((porTestId('plantilla-guardar') as HTMLButtonElement).disabled).toBe(true);
    await escribir('plantilla-contenido', '<p>Hola</p>');
    expect((porTestId('plantilla-guardar') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('las fichas de datos', () => {
  it('un clic inserta la variable en el texto', async () => {
    await montar();
    await act(async () => {
      (porTestId('insertar-canonValor') as HTMLButtonElement).click();
    });
    const area = porTestId('plantilla-contenido') as HTMLTextAreaElement;
    expect(area.value).toContain('{{canonValor}}');
  });

  it('la ficha muestra la etiqueta en español, no el nombre técnico', async () => {
    await montar();
    expect(porTestId('insertar-canonValor')!.textContent).toBe('Canon, en números');
  });
});

describe('editar una plantilla que ya existe', () => {
  const PROPIA = {
    id: 'p-1',
    name: 'Carta de bienvenida',
    category: 'CARTA' as const,
    version: '2.0',
    variables: ['arrendatarioNombre'],
    codigo: null,
    isActive: true,
    updatedAt: '2026-09-01T00:00:00Z',
    content: '<p>Hola {{arrendatarioNombre}}</p>',
  };

  it('llega con sus datos puestos y guarda por PUT', async () => {
    await montar(PROPIA);
    expect((porTestId('plantilla-nombre') as HTMLInputElement).value).toBe('Carta de bienvenida');
    expect((porTestId('plantilla-contenido') as HTMLTextAreaElement).value).toContain(
      '{{arrendatarioNombre}}',
    );

    await act(async () => {
      (porTestId('plantilla-guardar') as HTMLButtonElement).click();
    });
    expect(h.api.editarPlantilla).toHaveBeenCalledWith('p-1', expect.objectContaining({
      name: 'Carta de bienvenida',
    }));
    expect(h.api.crearPlantilla).not.toHaveBeenCalled();
  });

  it('el error del back se muestra tal cual: nombra la variable', async () => {
    h.api.editarPlantilla.mockRejectedValue(
      new Error('El sistema no sabe con qué llenar {{valorDeLaMulta}}.'),
    );
    await montar(PROPIA);
    await act(async () => {
      (porTestId('plantilla-guardar') as HTMLButtonElement).click();
    });
    expect(h.toast.error).toHaveBeenCalledWith(
      'No se pudo guardar la plantilla',
      expect.objectContaining({
        description: 'El sistema no sabe con qué llenar {{valorDeLaMulta}}.',
      }),
    );
  });
});
