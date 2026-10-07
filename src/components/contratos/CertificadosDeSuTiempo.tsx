'use client';

/**
 * 🔴 QA-INQ-95 ronda 2 (decisión de Nico, 04-10-2026): en la ficha del contrato,
 * cada inquilino que salió por un cambio de inquilino con su «Certificado de
 * que no debe nada por el tiempo en que fue inquilino». Sale si todo lo de su
 * tiempo está pagado; si no, dice cuánto falta. Lo mismo que el saliente pide
 * en su portal (el back es uno). No se pinta nada si nadie salió del contrato.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Certificate } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { certificadoDeSuTiempoApi, type CertificadoDeSuTiempoEnLaFicha } from '@/lib/api/certificado-de-su-tiempo.service';
import { documentosLegalesApi } from '@/lib/api/documentos.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { fechaDeVigencia } from '@/lib/contratos/fecha-de-vigencia';

export const NOMBRE_DEL_CERTIFICADO_DE_SU_TIEMPO = 'Certificado de que no debe nada por el tiempo en que fue inquilino';

function dia(iso: string): string {
  const d = fechaDeVigencia(iso);
  return d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : iso;
}

async function bajar(documentoId: string) {
  const blob = await documentosLegalesApi.pdf(documentoId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'certificado-de-su-tiempo.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CertificadosDeSuTiempo({ contractId, puedeEmitir }: { contractId: string; puedeEmitir: boolean }) {
  const [partes, setPartes] = useState<CertificadoDeSuTiempoEnLaFicha[] | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setPartes(await certificadoDeSuTiempoApi.enLaFicha(contractId));
    } catch {
      // Sin la lista no se pinta nada: la ficha sigue (y el portal del saliente también).
      setPartes([]);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!partes || partes.length === 0) return null;

  const emitir = async (p: CertificadoDeSuTiempoEnLaFicha) => {
    setTrabajando(p.parte.id);
    try {
      const { documentoId } = await certificadoDeSuTiempoApi.emitir(contractId, p.parte.id);
      await bajar(documentoId);
      toast.success('Certificado emitido', { description: `Quedó guardado en los documentos de la inmobiliaria.` });
      await cargar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { accion: 'emitir el certificado', porDefecto: 'No pudimos emitir el certificado.' }));
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-3" data-testid="certificados-de-su-tiempo">
      <p className="text-caption font-medium text-muted-foreground">Inquilinos que salieron del contrato</p>
      <ul className="space-y-3">
        {partes.map((p) => (
          <li key={p.parte.id} className="space-y-1 text-sm" data-testid="certificado-de-su-tiempo">
            <p className="font-medium text-foreground">{p.parte.nombre}</p>
            <p className="text-caption text-muted-foreground">
              Fue el inquilino del {dia(p.parte.desde)} al {dia(p.parte.hasta)}.
            </p>
            <p className="flex items-start gap-1.5 text-caption text-foreground">
              <Certificate className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{NOMBRE_DEL_CERTIFICADO_DE_SU_TIEMPO}</span>
            </p>
            {p.ultimo ? (
              <p className="text-caption text-muted-foreground" data-testid="certificado-de-su-tiempo-emitido">
                Emitido el {new Date(p.ultimo.emitidoEl).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
                <Button
                  type="button"
                  variant="link"
                  hideArrow
                  className="h-auto p-0 text-caption"
                  onClick={() => void bajar(p.ultimo!.documentoId)}
                >
                  Descargarlo
                </Button>
              </p>
            ) : null}
            {p.revision.puedeEmitirse ? (
              puedeEmitir ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  hideArrow
                  isLoading={trabajando === p.parte.id}
                  disabled={trabajando !== null}
                  onClick={() => void emitir(p)}
                  data-testid="emitir-certificado-de-su-tiempo"
                >
                  {p.ultimo ? 'Emitir otro con la fecha de hoy' : 'Emitir el certificado'}
                </Button>
              ) : (
                <p className="text-caption text-muted-foreground">Emitirlo lo puede hacer quien tenga permiso de documentos.</p>
              )
            ) : (
              <p className="text-caption text-warning" data-testid="certificado-de-su-tiempo-falta">
                {p.revision.impedimentos.map((i) => i.mensaje).join(' ')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
