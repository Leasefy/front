'use client';

/**
 * «¿Te invitó un colega?» en el registro (Nico, 28-10-2026: «un código al crear la cuenta»). Para cuando el enlace no
 * llega y se lo dicen de palabra. No toca el formulario: deja el código pendiente (como el enlace `/r/<codigo>`) y se
 * usa al entrar al panel (`MesGratisPendiente`). Si ya hay uno pendiente, lo muestra con quién invita.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle, Gift } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Input } from '@/components/ui/input';
import { refiereYGanaApi } from '@/lib/api/refiere-y-gana.service';
import {
  guardarReferidoPendiente,
  normalizarCodigo,
  olvidarReferidoPendiente,
  referidoPendiente,
} from '@/lib/refiere-y-gana/refiere-y-gana';

type Revision = { estado: 'nada' } | { estado: 'buscando' } | { estado: 'listo'; deQuien: string } | { estado: 'no-sirve'; frase: string };

export function CodigoDelColega() {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState('');
  const [revision, setRevision] = useState<Revision>({ estado: 'nada' });
  const turno = useRef(0);

  const revisar = (crudo: string) => {
    const codigo = normalizarCodigo(crudo);
    const mio = ++turno.current;
    if (codigo.length < 4) {
      setRevision({ estado: 'nada' });
      return;
    }
    setRevision({ estado: 'buscando' });
    refiereYGanaApi
      .codigo(codigo)
      .then((c) => {
        if (mio !== turno.current) return;
        if (!c.vigente) {
          setRevision({ estado: 'no-sirve', frase: `El código de ${c.deQuien} ya no está activo.` });
          return;
        }
        guardarReferidoPendiente(c.codigo);
        setRevision({ estado: 'listo', deQuien: c.deQuien });
      })
      .catch(() => {
        if (mio !== turno.current) return;
        setRevision({ estado: 'no-sirve', frase: 'Ese código no existe. Revisa que esté bien escrito.' });
      });
  };

  // Ya abrió el enlace de un colega en este navegador: llega puesto.
  useEffect(() => {
    const pendiente = referidoPendiente();
    if (!pendiente) return;
    setAbierto(true);
    setValor(pendiente);
    revisar(pendiente);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo al montar
  }, []);

  // Escribir: se revisa cuando deja de teclear (400 ms).
  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => revisar(valor), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revisar es estable en la práctica
  }, [valor, abierto]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1A40FF] underline-offset-2 hover:underline"
        data-testid="abrir-codigo-del-colega"
      >
        <Gift size={15} weight="duotone" aria-hidden="true" />
        ¿Te invitó un colega? Escribe su código
      </button>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="codigo-del-colega">
      <label htmlFor={id} className="text-[13px] font-medium text-fg">
        Código de tu colega <span className="font-normal text-fg-subtle">(opcional)</span>
      </label>
      <Input
        id={id}
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          if (!e.target.value.trim()) olvidarReferidoPendiente();
        }}
        placeholder="valle-k7m2"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-describedby={`${id}-estado`}
        aria-invalid={revision.estado === 'no-sirve' || undefined}
      />
      <div id={`${id}-estado`} aria-live="polite" className="min-h-[18px]">
        <Presence show={revision.estado !== 'nada'}>
          {revision.estado === 'listo' ? (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-success-ink" data-testid="colega-encontrado">
              <CheckCircle size={15} weight="fill" aria-hidden="true" />
              Te invitó {revision.deQuien}: entras con tu primer mes gratis.
            </p>
          ) : revision.estado === 'no-sirve' ? (
            <p className="text-[12.5px] text-danger" data-testid="codigo-no-sirve">
              {revision.frase}
            </p>
          ) : revision.estado === 'buscando' ? (
            <p className="text-[12.5px] text-fg-subtle">Buscando el código…</p>
          ) : null}
        </Presence>
      </div>
    </div>
  );
}
