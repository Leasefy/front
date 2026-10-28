'use client';

/**
 * «¿Cuánto vale el arriendo de tu inmueble?» en el perfil del agente o la inmobiliaria (28-10-2026; Nico: «gratis para
 * todos y queda como contacto»). Dos pasos: el inmueble y quién eres; después el rango con arriendos reales de Leasefy.
 */

import { useState } from 'react';
import { Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { valoracionApi, type RespuestaDeValoracion, type TipoParaValorar } from '@/lib/api/valoracion.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

const TIPOS: Array<[TipoParaValorar, string]> = [
  ['APARTMENT', 'Apartamento'],
  ['HOUSE', 'Casa'],
  ['STUDIO', 'Apartaestudio'],
  ['COMMERCIAL', 'Local'],
  ['OFFICE', 'Oficina'],
  ['WAREHOUSE', 'Bodega'],
];
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function ValoracionEnUnMinuto({ agencyId, nombre }: { agencyId: string; nombre: string }) {
  const [paso, setPaso] = useState<'inmueble' | 'contacto' | 'rango'>('inmueble');
  const [d, setD] = useState({ ciudad: '', barrio: '', tipo: 'APARTMENT' as TipoParaValorar, area: '', habitaciones: '', nombre: '', celular: '' });
  const [fallo, setFallo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [r, setR] = useState<RespuestaDeValoracion | null>(null);
  const cambiar = (c: Partial<typeof d>) => setD((x) => ({ ...x, ...c }));

  const seguir = () => {
    if (d.ciudad.trim().length < 2) return setFallo('Escribe la ciudad.');
    const area = Number(d.area);
    if (!Number.isInteger(area) || area < 15 || area > 2000) return setFallo('El área va de 15 a 2.000 m².');
    setFallo(null);
    setPaso('contacto');
  };
  const valorar = async () => {
    if (d.nombre.trim().length < 2) return setFallo('Escribe tu nombre.');
    if (!/^3\d{9}$/.test(d.celular.replace(/\D/g, ''))) return setFallo('El celular tiene 10 dígitos y empieza por 3.');
    setEnviando(true);
    setFallo(null);
    try {
      setR(
        await valoracionApi.valorar(agencyId, {
          ciudad: d.ciudad.trim(),
          ...(d.barrio.trim() ? { barrio: d.barrio.trim() } : {}),
          tipo: d.tipo,
          area: Number(d.area),
          ...(d.habitaciones ? { habitaciones: Number(d.habitaciones) } : {}),
          nombre: d.nombre.trim(),
          celular: d.celular.replace(/\D/g, ''),
        }),
      );
      setPaso('rango');
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { accion: 'calcular la valoración', porDefecto: 'No pudimos calcularla. Prueba en un momento.' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mx-auto mt-12 max-w-[1280px] px-4 md:px-6" aria-labelledby="valoracion-titulo" data-testid="valoracion-en-un-minuto">
      <div className="grid gap-6 rounded-[28px] border border-border bg-surface p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:p-8">
        <div>
          <Ilustracion nombre="calculadora" tamano={88} tono="auto" alt="" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-primary">Gratis · un minuto</p>
          <h2 id="valoracion-titulo" className="mt-2 text-h3 text-fg">
            ¿Cuánto vale el arriendo de tu inmueble?
          </h2>
          <p className="mt-2 text-body text-fg-muted">Te damos un rango con arriendos reales de Leasefy en tu zona. {nombre} te contacta si quieres arrendarlo.</p>
        </div>
        <div>
          {paso === 'inmueble' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label="Ciudad" placeholder="Ciudad · Medellín" value={d.ciudad} onChange={(e) => cambiar({ ciudad: e.target.value })} />
              <Input aria-label="Barrio" placeholder="Barrio (opcional) · Laureles" value={d.barrio} onChange={(e) => cambiar({ barrio: e.target.value })} />
              <select aria-label="Tipo" value={d.tipo} onChange={(e) => cambiar({ tipo: e.target.value as TipoParaValorar })} className="h-11 rounded-xl border border-border bg-surface px-3 text-body-sm text-fg">
                {TIPOS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
              <Input aria-label="Área en m²" inputMode="numeric" placeholder="Área · 80 m²" value={d.area} onChange={(e) => cambiar({ area: e.target.value.replace(/\D/g, '') })} />
              <Input aria-label="Habitaciones" inputMode="numeric" placeholder="Habitaciones (opcional)" value={d.habitaciones} onChange={(e) => cambiar({ habitaciones: e.target.value.replace(/\D/g, '') })} />
              <Button className="sm:col-span-2" hideArrow onClick={seguir} data-testid="valoracion-seguir">
                Seguir
              </Button>
            </div>
          ) : paso === 'contacto' ? (
            <div className="grid gap-3">
              <p className="text-body-sm text-fg-muted">¿A nombre de quién? Así {nombre} te puede escribir.</p>
              <Input aria-label="Tu nombre" placeholder="Tu nombre" value={d.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} />
              <Input aria-label="Tu celular" inputMode="tel" placeholder="Tu celular · 300 123 4567" value={d.celular} onChange={(e) => cambiar({ celular: e.target.value })} />
              <div className="flex gap-2">
                <Button variant="ghost" hideArrow onClick={() => setPaso('inmueble')}>
                  Atrás
                </Button>
                <Button className="flex-1" hideArrow isLoading={enviando} onClick={() => void valorar()} data-testid="valoracion-ver-rango">
                  Ver el rango
                </Button>
              </div>
            </div>
          ) : r ? (
            <div data-testid="valoracion-rango">
              {r.rango ? (
                <>
                  <p className="text-body-sm text-fg-muted">Tu inmueble se arrienda entre</p>
                  <p className="mt-1 text-[32px] font-[420] leading-tight tracking-[-0.03em] text-fg">
                    {pesos(r.rango.minimo)} y {pesos(r.rango.maximo)}
                  </p>
                  <p className="mt-1 text-caption text-fg-subtle">
                    al mes, con {r.rango.muestras} arriendos de {r.rango.alcance === 'barrio' ? 'tu barrio' : 'tu ciudad'}.
                  </p>
                </>
              ) : (
                <p className="text-body text-fg">Todavía no hay suficientes arriendos parecidos en tu zona para darte un rango. {r.inmobiliaria} te escribe con una estimación.</p>
              )}
              <p className="mt-4 rounded-xl bg-surface-muted px-3 py-2 text-caption text-fg-muted">{r.aviso}</p>
              <p className="mt-3 text-body-sm text-success-ink">Listo: {r.inmobiliaria} ya tiene tu contacto.</p>
            </div>
          ) : null}
          {fallo ? <p className="mt-2 text-caption text-danger">{fallo}</p> : null}
        </div>
      </div>
    </section>
  );
}
