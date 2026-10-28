'use client';

/** Las reseñas de tus clientes (28-10-2026): las lees y las respondes; no se borran (Nico: «sólo clientes de Leasefy»). */

import { useCallback, useEffect, useState } from 'react';
import { Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Estrellas, TarjetaDeResena } from '@/components/resenas/ResenasDelPerfil';
import { resenasApi, type ResenaPublica, type ResenasDeLaInmobiliaria } from '@/lib/api/resenas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export function ResenasDelPanel() {
  const [datos, setDatos] = useState<(ResenasDeLaInmobiliaria & { disponible: boolean }) | null>(null);
  const [error, setError] = useState<unknown>(null);
  const leer = useCallback(async () => {
    setError(null);
    try {
      setDatos(await resenasApi.delPanel());
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void leer();
  }, [leer]);

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="resenas-del-panel">
      <EncabezadoDePantalla
        seccion="Arrendamientos"
        titulo="Reseñas"
        descripcion="Lo que dicen de ti quienes arrendaron, visitaron o se postularon contigo por Leasefy. Se ven en tu perfil."
      />
      {error ? <FalloDeCarga error={error} onReintentar={leer} queEs="tus reseñas" /> : null}
      {datos && datos.promedio !== null ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
          <span className="text-[34px] font-[420] leading-none text-fg">{datos.promedio.toLocaleString('es-CO')}</span>
          <div>
            <Estrellas valor={datos.promedio} tamano={18} />
            <p className="text-caption text-fg-subtle">{datos.total === 1 ? '1 reseña' : `${datos.total} reseñas`}</p>
          </div>
        </div>
      ) : null}
      {datos && datos.resenas.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <Ilustracion nombre="mensajes" tamano={104} tono="auto" alt="" />
          <p className="mt-4 text-body font-medium text-fg">Todavía no tienes reseñas</p>
          <p className="mt-1 max-w-sm text-body-sm text-fg-muted">Tus clientes las dejan en tu perfil del marketplace después de visitar, postularse o arrendar contigo.</p>
        </div>
      ) : null}
      {datos && datos.resenas.length > 0 ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {datos.resenas.map((r) => (
            <TarjetaDeResena key={r.id} r={r}>
              <Responder r={r} alGuardar={leer} />
            </TarjetaDeResena>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Responder({ r, alGuardar }: { r: ResenaPublica; alGuardar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(r.respuesta ?? '');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const guardar = async () => {
    setGuardando(true);
    setFallo(null);
    try {
      await resenasApi.responder(r.id, texto.trim() || null);
      setAbierto(false);
      alGuardar();
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { accion: 'responder la reseña', porDefecto: 'No pudimos guardar tu respuesta.' }));
    } finally {
      setGuardando(false);
    }
  };
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="mt-3 text-body-sm font-medium text-primary hover:underline" data-testid={`responder-${r.id}`}>
        {r.respuesta ? 'Editar mi respuesta' : 'Responder'}
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder="Gracias por tu reseña…"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Tu respuesta"
      />
      {fallo ? <p className="text-caption text-danger">{fallo}</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" hideArrow onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
        <Button size="sm" hideArrow isLoading={guardando} onClick={() => void guardar()}>
          Publicar respuesta
        </Button>
      </div>
    </div>
  );
}
