import { describe, expect, it } from 'vitest';
import { paraLaBarraDelCelular } from './MobileNavBar';

describe('AG-14: la barra de abajo del asesor trae Pipeline y Agenda', () => {
  const asesor = [
    { href: '/panel/inmobiliaria' },
    { href: '/panel/inmobiliaria/chat' },
    { href: '/panel/inmobiliaria/avaluos' },
    { href: '/panel/inmobiliaria/matching' },
    { href: '/panel/inmobiliaria/asegurabilidad' },
    { href: '/panel/inmobiliaria/pipeline' },
    { href: '/panel/inmobiliaria/agenda' },
  ];
  it('para el asesor quedan entre las cinco primeras', () => {
    const cinco = paraLaBarraDelCelular(asesor).slice(0, 5).map((i) => i.href);
    expect(cinco).toEqual([
      '/panel/inmobiliaria',
      '/panel/inmobiliaria/pipeline',
      '/panel/inmobiliaria/agenda',
      '/panel/inmobiliaria/chat',
      '/panel/inmobiliaria/avaluos',
    ]);
  });
  it('quien ve la operación conserva su orden', () => {
    const admin = [...asesor, { href: '/panel/inmobiliaria/contratos' }];
    expect(paraLaBarraDelCelular(admin)).toBe(admin);
  });
});
