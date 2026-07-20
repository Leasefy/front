'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CaretLeft, ChatCircleText } from '@phosphor-icons/react';
import { Button, Card, Spinner } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { useOwnerFinanzas } from '@/lib/hooks/useOwnerPortal';
import { ownerSolicitudesApi } from '@/lib/api/owner-solicitudes.service';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { REQUEST_TYPE_OPTIONS, type SolicitudTipo } from '@/lib/api/owner-solicitudes.types';

const MAX_DESC = 4000;

/**
 * Nueva solicitud (F4). Reusa los inmuebles del propietario (F3) para el selector. Submit → POST;
 * resultado gobernado por el back (éxito → detalle; unavailable → "Próximamente"; error → aviso).
 * Ruta estática `nueva` — gana sobre `[requestId]`, sin conflicto.
 */
export default function NuevaSolicitudPage() {
  const router = useRouter();
  const { inmuebles, isLoading, unavailable, agencyId } = useOwnerFinanzas();

  const [propertyRef, setPropertyRef] = useState('');
  const [tipo, setTipo] = useState<SolicitudTipo>('ruido');
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = propertyRef !== '' && descripcion.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await ownerSolicitudesApi.crear(agencyId, {
        propertyRef,
        tipo,
        descripcion: descripcion.trim(),
      });
      if (res.ok && res.data) {
        toast('Solicitud enviada', { description: 'Tu inmobiliaria la va a gestionar.' });
        router.push(`/panel/solicitudes/${res.data.id}`);
        return;
      }
      if (res.status === 0) {
        toast('Próximamente', {
          description: 'Las solicitudes se habilitan cuando tu inmobiliaria active el Portal del Propietario.',
        });
        return;
      }
      toast('No pudimos enviar la solicitud', { description: res.error ?? 'Intentá de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <PortalPlaceholder
        title="Nueva solicitud"
        subtitle="Pedile a tu inmobiliaria lo que necesites, con debido proceso."
        icon={ChatCircleText}
        emptyDescription="Vas a poder abrir solicitudes operativas para tus inmuebles. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  const selectClass =
    'w-full rounded-lg border border-faint bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/panel/solicitudes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <CaretLeft className="w-4 h-4" /> Solicitudes
        </Link>

        <h1 className="text-2xl font-semibold">Nueva solicitud</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu inmobiliaria la gestiona e intermedia con el inquilino. Con debido proceso.
        </p>

        <Card className="p-4 sm:p-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="inmueble" className="block text-sm font-medium mb-1">Inmueble</label>
              {inmuebles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay inmuebles disponibles para crear una solicitud.
                </p>
              ) : (
                <select
                  id="inmueble"
                  value={propertyRef}
                  onChange={(e) => setPropertyRef(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled>Elegí un inmueble…</option>
                  {inmuebles.map((inm) => (
                    <option key={inm.propertyRef} value={inm.propertyRef}>{inm.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium mb-1">Tipo</label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as SolicitudTipo)}
                className={selectClass}
              >
                {REQUEST_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value.slice(0, MAX_DESC))}
                rows={5}
                placeholder="Contanos qué necesitás…"
                className={`${selectClass} resize-y`}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {descripcion.length}/{MAX_DESC}
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={!canSubmit} hideArrow>
                {submitting ? <Spinner size="sm" /> : 'Enviar solicitud'}
              </Button>
              <Button asChild variant="secondary" hideArrow>
                <Link href="/panel/solicitudes">Cancelar</Link>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
