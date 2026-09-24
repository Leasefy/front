/**
 * @vitest-environment happy-dom
 */
/**
 * Cada respuesta con el componente de Cadence que corresponde a su forma
 * (Nico, 23-09): lista de registros → tabla con columnas; cifra → tarjeta de
 * métrica; advertencia → callout; persona → tarjeta de entidad con la cadena
 * persona → contrato → inmueble → propietario → cartera.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto } = vi.hoisted(() => ({
  contexto: {
    sendMessage: vi.fn(),
    regenerateResponse: vi.fn(),
    rateMessage: vi.fn(async () => true),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
  },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({ useBetaChatContext: () => contexto }));
vi.mock('./ChatOrb', () => ({ ChatOrb: () => null }));
vi.mock('./MessageActions', () => ({ MessageActions: () => null }));
vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) =>
    React.createElement('div', { 'data-testid': 'texto' }, content),
}));

import { RespuestaConForma, FILAS_A_LA_VISTA } from './RespuestaConForma';
import { AssistantBubble } from './AssistantBubble';
import type { BloqueDeRespuesta, EntidadDelChat } from '@/lib/chat/bloques';
import type { ChatMessage } from '@/lib/types/beta-chat';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contexto.sendMessage.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(el: React.ReactElement) {
  act(() => root.render(el));
}

const TABLA: Extract<BloqueDeRespuesta, { tipo: 'tabla' }> = {
  tipo: 'tabla',
  titulo: 'contratos',
  columnas: [
    { clave: 'codigo', titulo: 'Código', formato: 'numero' },
    { clave: 'inquilino', titulo: 'Inquilino', formato: 'texto' },
    { clave: 'canon', titulo: 'Canon', formato: 'moneda' },
    { clave: 'fecha_de_fin', titulo: 'Fecha de fin', formato: 'fecha' },
    { clave: 'estado', titulo: 'Estado', formato: 'estado' },
  ],
  filas: Array.from({ length: 12 }, (_, i) => ({
    codigo: 100 + i,
    inquilino: i === 0 ? 'Juan Camilo López' : `Inquilino ${i}`,
    canon: 2_500_000,
    fecha_de_fin: '2026-10-31',
    estado: i === 1 ? 'EN_REVISION_JURIDICA' : i === 2 ? 'RENOV_PENDING' : 'ACTIVE',
  })),
  total: 29,
  truncada: true,
};

describe('RespuestaConForma', () => {
  it('una lista de registros es la TABLA de Cadence, con cada columna en su formato', () => {
    pintar(<RespuestaConForma bloques={[TABLA]} />);
    const tabla = container.querySelector('table')!;
    expect([...tabla.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Código',
      'Inquilino',
      'Canon',
      'Fecha de fin',
      'Estado',
    ]);
    const primera = [...tabla.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map((td) => td.textContent);
    expect(primera[1]).toBe('Juan Camilo López');
    expect(primera[2]).toMatch(/^\$\s?2[.,]500[.,]000$/);
    expect(primera[3]).toMatch(/31/);
    expect(primera[4]).toBe('Activo');
    // Un estado que no conocemos se muestra legible, sin inventarle significado.
    expect(tabla.querySelectorAll('tbody tr')[1].textContent).toContain('en revision juridica');
    // Los del ERP, en español: el estado de una renovación no sale en inglés.
    expect(tabla.querySelectorAll('tbody tr')[2].textContent).toContain('Por renovar');
    // Dice de qué son y cuántas hay: viajaron 12 de 29.
    expect(container.textContent).toContain('12 de 29 filas');
  });

  it('muestra las primeras filas y el resto a un clic, sin empujar la conversación', () => {
    pintar(<RespuestaConForma bloques={[TABLA]} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(FILAS_A_LA_VISTA);
    const ver = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Ver las 12 filas')!;
    act(() => ver.click());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(ver.getAttribute('aria-expanded')).toBe('true');
  });

  it('una cifra es una tarjeta de métrica; un aviso, un callout', () => {
    pintar(
      <RespuestaConForma
        bloques={[
          { tipo: 'metrica', titulo: 'Cartera', valor: 12_500_000, formato: 'moneda' },
          { tipo: 'aviso', tono: 'advertencia', texto: 'Tres contratos no tienen cuotas generadas.' },
        ]}
      />
    );
    expect(container.textContent).toMatch(/Cartera\$\s?12[.,]500[.,]000/);
    expect(container.querySelector('[role="alert"]')!.textContent).toBe('Tres contratos no tienen cuotas generadas.');
    expect(container.querySelector('table')).toBeNull();
  });

  it('una persona es una tarjeta de entidad: contrato, inmueble, propietario y cartera, con la acción que toca', () => {
    const juan: EntidadDelChat = {
      tipo: 'inquilino',
      id: 'p-1',
      titulo: 'Juan Camilo López',
      motivo: 'nombre',
      documento: '1020304050',
      telefono: '3001234567',
      correo: null,
      totalContratos: 2,
      otrosRoles: [],
      contratos: [
        {
          id: 'c-1',
          codigo: 101,
          estado: 'ACTIVE',
          vigente: true,
          inquilino: 'Juan Camilo López',
          inicio: '2025-11-01',
          fin: '2026-10-31',
          canonCop: 2_500_000,
          diasParaVencer: 38,
          inmueble: { id: 'i-1', codigo: 7, titulo: 'Apto 301', direccion: 'Cra 7 # 45-10', ciudad: 'Bogotá' },
          propietarios: [{ id: 'o-1', nombre: 'Marta Gómez' }],
          renovacion: null,
          cartera: { estado: 'ok', deudaTotalCop: 0, carteraCop: 0, porVencerCop: 0, diasDeMoraMaximo: 0 },
        },
      ],
    };
    pintar(<RespuestaConForma entidades={[juan]} />);
    const texto = container.textContent!;
    expect(texto).toContain('Inquilino');
    expect(texto).toContain('Juan Camilo López');
    expect(texto).toContain('1020304050 · 3001234567');
    expect(texto).toContain('#101 · Cra 7 # 45-10');
    expect(texto).toContain('Marta Gómez');
    expect(texto).toContain('Vence en 38 días');
    expect(texto).toContain('Y 1 contrato más en su historial.');
    // P-7: a menos de 3 meses del fin, la renovación se ofrece EN el chat.
    const renovar = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Preparar renovación')!;
    act(() => renovar.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Prepara la renovación del contrato #101');
  });

  it('una cifra que es el conteo de la tabla de al lado no se repite (el molde: una frase, una vez)', () => {
    pintar(
      <RespuestaConForma
        bloques={[{ tipo: 'metrica', titulo: 'Cantidad de contratos', valor: 29, formato: 'numero' }, TABLA]}
      />
    );
    expect(container.textContent).not.toContain('Cantidad de contratos');
    expect(container.textContent).toContain('12 de 29 filas');
  });

  it('sin nada con forma no pinta nada', () => {
    pintar(<RespuestaConForma bloques={[]} entidades={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('AssistantBubble con una tabla que viaja como datos', () => {
  const mensaje = (status: ChatMessage['status']): ChatMessage => ({
    id: 'a-1',
    role: 'assistant',
    content: [
      'Tienes 29 contratos que vencen en octubre:',
      '',
      '| Código | Inquilino |',
      '|---|---|',
      '| 100 | Juan Camilo López |',
      '',
      'Te muestro los primeros.',
    ].join('\n'),
    timestamp: new Date(),
    status,
    bloques: [TABLA],
  });

  it('el texto no repite la tabla (la dice Cadence), y la tabla aparece cuando el texto terminó', () => {
    pintar(<AssistantBubble message={mensaje('complete')} />);
    const texto = container.querySelector('[data-testid="texto"]')!.textContent!;
    expect(texto).not.toContain('|');
    expect(texto).toContain('Te muestro los primeros.');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('mientras se escribe no hay tabla todavía, ni una a medio teclear', () => {
    pintar(
      <AssistantBubble
        message={mensaje('streaming')}
        streamingContent={'Tienes 29 contratos que vencen en octubre:\n\n| Código | Inq'}
      />
    );
    expect(container.querySelector('[data-testid="texto"]')!.textContent).toBe(
      'Tienes 29 contratos que vencen en octubre:'
    );
    expect(container.querySelector('table')).toBeNull();
  });
});
