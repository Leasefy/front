'use client';

/**
 * El formulario controlado para cambiar la cuenta donde le giran al
 * propietario (Nico, 11-10-2026): banco, tipo, número y la certificación
 * bancaria → `POST /portal/propietario/cuenta-de-giro/:propietarioId/cambio`,
 * que manda el correo de confirmación y espera la aprobación de un
 * administrador. Es el MISMO en «Mis giros» (dentro de su diálogo) y en el chat
 * de Ori del portal (dentro del cajón): por eso vive aparte (29-10-2026).
 *
 * `Pie` deja que cada lugar ponga los botones en su sitio (el diálogo los
 * lleva en su `DialogFooter`); el aviso de éxito lo da quien lo usa.
 */
import { useId, useState, type ComponentType, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SelectorDeArchivo } from '@/components/ui/selector-de-archivo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';
import { portalDelPropietarioApi } from '@/lib/api/portal-del-propietario.service';

function PieSencillo({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 pt-1">{children}</div>;
}

export function FormularioCambioDeCuenta({
  propietarioId,
  onListo,
  onCancelar,
  onEnviando,
  Pie = PieSencillo,
}: {
  propietarioId: string;
  onListo: () => void;
  onCancelar: () => void;
  /** Para que quien lo contiene no se cierre mientras se envía. */
  onEnviando?: (enviando: boolean) => void;
  Pie?: ComponentType<{ children: ReactNode }>;
}) {
  const id = useId();
  const [banco, setBanco] = useState('');
  const [tipo, setTipo] = useState('');
  const [numero, setNumero] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviandoLocal] = useState(false);
  const setEnviando = (v: boolean) => {
    setEnviandoLocal(v);
    onEnviando?.(v);
  };

  const enviar = async () => {
    if (!banco || !tipo || numero.replace(/\D/g, '').length < 4 || !archivo) {
      setError('Elige el banco y el tipo, escribe el número de la cuenta y sube la certificación bancaria.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const f = new FormData();
      f.append('bankName', banco);
      f.append('bankAccountType', tipo);
      f.append('bankAccountNumber', numero.replace(/\s+/g, ''));
      f.append('certificacion', archivo);
      await portalDelPropietarioApi.pedirCambioDeCuenta(propietarioId, f);
      onListo();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos pedir el cambio.', accion: 'pedir el cambio de cuenta' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-banco`}>Banco</Label>
          <Select value={banco || undefined} onValueChange={setBanco} disabled={enviando}>
            <SelectTrigger id={`${id}-banco`}>
              <SelectValue placeholder="Elige el banco" />
            </SelectTrigger>
            <SelectContent>
              {COLOMBIAN_BANKS.map((b) => (
                <SelectItem key={b.code} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-tipo`}>Tipo de cuenta</Label>
            <Select value={tipo || undefined} onValueChange={setTipo} disabled={enviando}>
              <SelectTrigger id={`${id}-tipo`}>
                <SelectValue placeholder="Ahorros o corriente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AHORROS">Ahorros</SelectItem>
                <SelectItem value="CORRIENTE">Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-numero`}>Número</Label>
            <Input id={`${id}-numero`} inputMode="numeric" autoComplete="off" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={enviando} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-certificacion`}>Certificación bancaria</Label>
          <SelectorDeArchivo
            id={`${id}-certificacion`}
            archivo={archivo}
            onElegir={setArchivo}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            deshabilitado={enviando}
            testid="certificacion-bancaria"
          />
          <p className="text-caption text-fg-muted">PDF o foto, de no más de un mes, a tu nombre.</p>
        </div>
        <ErrorDelCampo id={`${id}-error`} mensaje={error} />
      </div>
      <Pie>
        <Button variant="outline" hideArrow onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button hideArrow isLoading={enviando} onClick={() => void enviar()} data-testid="enviar-cambio-de-cuenta">
          Pedir el cambio
        </Button>
      </Pie>
    </>
  );
}
