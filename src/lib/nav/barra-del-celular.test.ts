import { describe, expect, it } from 'vitest';

import { armarLaBarraDelCelular, casillaActiva } from './barra-del-celular';

type Fila = { href: string; label: string; kind?: 'section'; suelta?: boolean; badge?: number; disabled?: boolean };

const sec = (clave: string, label: string): Fila => ({ kind: 'section', href: `#sec-${clave}`, label });
const fila = (ruta: string, label: string, extra: Partial<Fila> = {}): Fila => ({
  href: `/panel/inmobiliaria${ruta}`,
  label,
  ...extra,
});

/** El menú del administrador, en el orden del escritorio (agentes arriba de todo). */
const MENU: Fila[] = [
  fila('/piloto', 'Inicio', { badge: 3 }),
  fila('', 'Chat'),
  sec('agentes', 'Agentes IA'),
  fila('/avaluos', 'Avalúos'),
  fila('/calidad', 'Calidad'),
  fila('/matching', 'Matching'),
  sec('captacion', 'Captación y arriendo'),
  fila('/pipeline', 'Pipeline'),
  fila('/agenda', 'Agenda'),
  fila('/inmuebles', 'Inmuebles'),
  sec('operacion', 'Operación'),
  fila('/contratos', 'Contratos', { badge: 16 }),
  fila('/mantenimientos', 'Mantenimientos', { badge: 2 }),
  sec('dinero', 'Dinero'),
  fila('/pagos', 'Pagos'),
  fila('/facturacion', 'Facturación'),
  sec('directorio', 'Directorio'),
  fila('/propietarios', 'Propietarios'),
  fila('/inquilinos', 'Inquilinos'),
  fila('/reportes', 'Reportes', { suelta: true }),
];

const etiquetas = (b: ReturnType<typeof armarLaBarraDelCelular<Fila>>) =>
  b!.casillas.map((c) => (c.tipo === 'fila' ? c.fila.label : c.clave));

describe('La barra del celular por secciones (Nico, 21-10-2026)', () => {
  it('Inicio y las cuatro secciones del trabajo diario; los agentes NO están en la barra', () => {
    const barra = armarLaBarraDelCelular(MENU);
    expect(etiquetas(barra)).toEqual(['Inicio', 'sec-captacion', 'sec-operacion', 'sec-dinero', 'sec-directorio']);
    const enLaBarra = barra!.casillas.flatMap((c) => (c.tipo === 'fila' ? [c.fila] : c.filas)).map((f) => f.label);
    expect(enLaBarra).not.toContain('Avalúos');
    expect(enLaBarra).not.toContain('Matching');
  });

  it('«Más» junta el Chat, los agentes con su cabecera y Reportes', () => {
    const barra = armarLaBarraDelCelular(MENU)!;
    expect(barra.mas.map((g) => [g.titulo, g.filas.map((f) => f.label)])).toEqual([
      [null, ['Chat']],
      ['Agentes IA', ['Avalúos', 'Calidad', 'Matching']],
      [null, ['Reportes']],
    ]);
  });

  it('cada sección trae su nombre completo, sus pantallas y la suma de sus pendientes', () => {
    const operacion = armarLaBarraDelCelular(MENU)!.casillas.find(
      (c) => c.tipo === 'seccion' && c.clave === 'sec-operacion',
    );
    expect(operacion).toMatchObject({ tipo: 'seccion', titulo: 'Operación', pendientes: 18 });
    expect(operacion?.tipo === 'seccion' && operacion.filas.map((f) => f.label)).toEqual(['Contratos', 'Mantenimientos']);
  });

  it('nada se pierde: cada fila del menú queda en una casilla o en «Más», una sola vez', () => {
    const barra = armarLaBarraDelCelular(MENU)!;
    const todas = [
      ...barra.casillas.flatMap((c) => (c.tipo === 'fila' ? [c.fila] : c.filas)),
      ...barra.mas.flatMap((g) => g.filas),
    ].map((f) => f.href);
    const esperadas = MENU.filter((f) => f.kind !== 'section').map((f) => f.href);
    expect([...todas].sort()).toEqual([...esperadas].sort());
  });

  it('una sección con una sola pantalla va directo, sin hoja', () => {
    const menu = MENU.filter((f) => f.label !== 'Inquilinos');
    const directorio = armarLaBarraDelCelular(menu)!.casillas.find(
      (c) => c.tipo === 'fila' && c.seccion === 'sec-directorio',
    );
    expect(directorio).toMatchObject({ tipo: 'fila', fila: { label: 'Propietarios' } });
  });

  it('el asesor (sin Operación ni Dinero) ve Inicio, Captación y Directorio', () => {
    const asesor = MENU.filter(
      (f) =>
        !['#sec-operacion', '#sec-dinero'].includes(f.href) &&
        !['Contratos', 'Mantenimientos', 'Pagos', 'Facturación'].includes(f.label),
    );
    expect(etiquetas(armarLaBarraDelCelular(asesor))).toEqual(['Inicio', 'sec-captacion', 'sec-directorio']);
  });

  it('las filas apagadas no cuentan', () => {
    const menu = MENU.map((f) => (f.label === 'Facturación' ? { ...f, disabled: true } : f));
    const dinero = armarLaBarraDelCelular(menu)!.casillas.find((c) => c.tipo === 'fila' && c.seccion === 'sec-dinero');
    expect(dinero).toMatchObject({ fila: { label: 'Pagos' } });
  });

  it('un menú sin al menos dos de esas secciones usa la barra de siempre', () => {
    expect(armarLaBarraDelCelular([fila('/piloto', 'Inicio'), fila('', 'Chat')])).toBeNull();
    expect(armarLaBarraDelCelular([fila('/piloto', 'Inicio'), sec('dinero', 'Dinero'), fila('/pagos', 'Pagos')])).toBeNull();
  });

  it('la casilla marcada es la que contiene la fila activa', () => {
    const barra = armarLaBarraDelCelular(MENU)!;
    const activa = (href: string) =>
      barra.casillas.filter((c) => casillaActiva(c, href)).map((c) => (c.tipo === 'fila' ? c.fila.label : c.clave));
    expect(activa('/panel/inmobiliaria/facturacion')).toEqual(['sec-dinero']);
    expect(activa('/panel/inmobiliaria/piloto')).toEqual(['Inicio']);
    expect(activa('/panel/inmobiliaria/avaluos')).toEqual([]);
  });
});
