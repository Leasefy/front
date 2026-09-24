/**
 * Editar el perfil de un asesor (21-09-2026).
 *
 * Lo que fija, y por qué cada cosa:
 * - el mapeo a los NOMBRES del back (`agent` → `AGENT`, `on_leave` → `ON_LEAVE`):
 *   mandar el del front no falla, guarda mal;
 * - se manda el id de MIEMBRO, que es lo que pide la ruta, no el de usuario;
 * - la zona vacía viaja como `null`, no como `''`: una cadena vacía se pinta
 *   después como una zona que se llama «»;
 * - una comisión fuera de 0–100 no llega al back;
 * - NO se ofrece «invitado» como estado ni el campo de especialización, las dos
 *   por la misma razón: el back no los tiene con ese significado.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Agente } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/*
 * El Select de Radix no se puede manejar en happy-dom —y su `<select>` nativo
 * tampoco: el setter de `value` de happy-dom revienta sobre un elemento que no
 * es de su ventana. Así que el doble es un BOTÓN por opción, que es lo único que
 * esta prueba necesita: que al elegir salga el valor correcto.
 */
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const Ctx = React.createContext<(v: string) => void>(() => undefined);
  return {
    Select: ({
      onValueChange,
      children,
    }: {
      onValueChange: (v: string) => void;
      children: React.ReactNode;
    }) => <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>,
    SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => (
      <div id={id}>{children}</div>
    ),
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const onValueChange = React.useContext(Ctx);
      return (
        <button type="button" data-opcion={value} onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast }));

const api = vi.hoisted(() => ({ updateMemberProfile: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ agencyApi: api }));

import { EditarPerfilDelAsesor } from './EditarPerfilDelAsesor';

const ASESOR = {
  id: 'miembro-1',
  userId: 'usuario-1',
  name: 'Ana Pérez',
  email: 'ana@inmo.co',
  phone: '3001234567',
  role: 'agent',
  status: 'active',
  commissionSplit: 40,
  assignedPropertyIds: [],
  hireDate: '2025-01-15',
  zone: 'Antioquia',
  metrics: {},
  createdAt: '',
  updatedAt: '',
} as unknown as Agente;

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  api.updateMemberProfile.mockReset();
  api.updateMemberProfile.mockResolvedValue({});
  toast.success.mockReset();
  toast.error.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function montar(agente: Agente = ASESOR) {
  const onGuardado = vi.fn();
  await act(async () => {
    raiz.render(
      <EditarPerfilDelAsesor
        abierto
        onCerrar={() => undefined}
        agente={agente}
        onGuardado={onGuardado}
      />,
    );
  });
  return onGuardado;
}

function campo(id: string) {
  return contenedor.querySelector<HTMLInputElement>(`#${id}`)!;
}

async function escribir(id: string, valor: string) {
  const el = campo(id);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * Elegir = pulsar la opción. El disparador y las opciones quedan hermanos
 * dentro del mismo campo, así que se busca desde el padre del disparador.
 */
async function elegir(id: string, valor: string) {
  const disparador = contenedor.querySelector(`#${id}`)!;
  const opcion = disparador.parentElement!.querySelector<HTMLButtonElement>(
    `[data-opcion="${valor}"]`,
  )!;
  await act(async () => {
    opcion.click();
  });
}

async function guardar() {
  const boton = [...contenedor.querySelectorAll('button')].find(
    (b) => b.textContent === 'Guardar',
  )!;
  await act(async () => {
    boton.click();
  });
}

describe('<EditarPerfilDelAsesor>', () => {
  it('manda el id de MIEMBRO y traduce rol y estado a los nombres del back', async () => {
    const onGuardado = await montar();
    await elegir('asesor-rol', 'coordinator');
    await elegir('asesor-estado', 'on_leave');
    await guardar();

    expect(api.updateMemberProfile).toHaveBeenCalledWith('miembro-1', {
      agentRole: 'COORDINATOR',
      agentStatus: 'ON_LEAVE',
      commissionSplit: 40,
      zone: 'Antioquia',
    });
    expect(onGuardado).toHaveBeenCalledTimes(1);
  });

  it('la zona vacía va como null, no como cadena vacía', async () => {
    await montar();
    await escribir('asesor-zona', '   ');
    await guardar();
    expect(api.updateMemberProfile.mock.calls[0][1].zone).toBeNull();
  });

  it('una comisión fuera de 0–100 no llega al back', async () => {
    await montar();
    await escribir('asesor-comision', '140');
    await guardar();
    expect(api.updateMemberProfile).not.toHaveBeenCalled();
  });

  it('no ofrece «invitado» como estado: la ruta no tiene ese valor', async () => {
    await montar();
    const valores = [...contenedor.querySelectorAll('[data-opcion]')].map((o) =>
      o.getAttribute('data-opcion'),
    );
    expect(valores).toContain('active');
    expect(valores).not.toContain('invited');
  });

  it('no ofrece especialización: el front y el back no le dicen lo mismo', async () => {
    await montar();
    // `apartment|house|studio|room|all` contra `RESIDENTIAL|COMMERCIAL|BOTH`.
    // Traducirlos sería inventar; el campo no se ofrece hasta que alguien decida.
    expect(contenedor.textContent).not.toMatch(/specializaci|especializaci/i);
  });

  it('si el back falla, no dice que guardó', async () => {
    api.updateMemberProfile.mockRejectedValue(new Error('403'));
    const onGuardado = await montar();
    await guardar();
    expect(onGuardado).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
