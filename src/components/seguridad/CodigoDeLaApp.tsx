'use client';

/**
 * Las seis cifras de la aplicación de autenticación, pedidas AHORA, para lo
 * que suelta plata (Nico, 31-10-2026: el giro a los propietarios «sí o sí lo
 * autoriza un administrador» con su código). Dos formas de usarlo:
 *
 *   · `<CampoDelCodigoDeLaApp>` dentro de un diálogo propio (el de «Girar»
 *     pide el código junto al resumen: una sola ventana, un solo clic);
 *   · `useConElCodigoDeLaApp()` para una acción que ya existe: la corre y, si el
 *     back responde 403 `SEGUNDO_FACTOR_RECIENTE`, abre el diálogo, verifica y
 *     la repite una vez. Lo monta `<HostDelCodigoDeLaApp>` en el panel.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldCheck } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { AuthContext } from '@/lib/auth/auth-context';
import { factorDeLaApp, pideElCodigoDeLaApp, verificarElCodigoDeLaApp } from '@/lib/auth/codigo-de-la-app';
import { useTr } from '@/lib/i18n/use-tr';

/** El factor de la cuenta, buscado al montar: `undefined` mientras se busca, `null` si no tiene. */
export function useFactorDeLaApp(activo = true): string | null | undefined {
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    void factorDeLaApp().then((id) => {
      if (vigente) setFactorId(id);
    });
    return () => {
      vigente = false;
    };
  }, [activo]);
  return factorId;
}

/**
 * El campo de las seis cifras con su verificación. `onVerificado` corre con la
 * sesión ya renovada (el `amr` reciente): quien lo usa sigue con la acción.
 */
export function CampoDelCodigoDeLaApp({
  onVerificado,
  deshabilitado = false,
  ayuda,
}: {
  onVerificado: () => void | Promise<void>;
  deshabilitado?: boolean;
  ayuda?: ReactNode;
}) {
  const tr = useTr();
  const auth = useContext(AuthContext);
  const factorId = useFactorDeLaApp();
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificar = async (c: string) => {
    if (!factorId || c.length !== 6 || verificando) return;
    setVerificando(true);
    setError(null);
    try {
      await verificarElCodigoDeLaApp(factorId, c);
      auth?.setMfaVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('No pudimos verificar el código. Intenta de nuevo en un momento.'));
      setCodigo('');
      setVerificando(false);
      return;
    }
    try {
      await onVerificado();
    } finally {
      setVerificando(false);
      setCodigo('');
    }
  };

  if (factorId === null) {
    return (
      <p className="text-body-sm text-fg" data-testid="codigo-de-la-app-sin-factor">
        {tr('Tu cuenta no tiene una aplicación de autenticación activa. Actívala en tu perfil (Seguridad) y vuelve a intentarlo.')}
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="codigo-de-la-app">
      <p className="text-body-sm font-medium text-fg">{tr('El código de seis cifras de tu aplicación de autenticación')}</p>
      <CasillasDeCodigo
        value={codigo}
        onChange={(v) => {
          setCodigo(v);
          if (error) setError(null);
        }}
        onCompleto={(c) => void verificar(c)}
        disabled={deshabilitado || verificando || factorId === undefined}
        hayError={error !== null}
        aria-label={tr('Código de tu aplicación de autenticación')}
        autoFocus
      />
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-caption text-fg-muted">{ayuda}</p>
      ) : null}
      {verificando ? <p className="text-caption text-fg-muted">{tr('Verificando el código…')}</p> : null}
    </div>
  );
}

interface Pedido {
  titulo: string;
  descripcion: string;
  resolver: (verificado: boolean) => void;
}

const ContextoDelCodigo = createContext<((p: Omit<Pedido, 'resolver'>) => Promise<boolean>) | null>(null);

/** Se monta una vez (layout del panel): pinta el diálogo cuando una acción lo pide. */
export function HostDelCodigoDeLaApp({ children }: { children: ReactNode }) {
  const tr = useTr();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const actual = useRef<Pedido | null>(null);
  const pedir = useCallback(
    (p: Omit<Pedido, 'resolver'>) =>
      new Promise<boolean>((resolver) => {
        actual.current?.resolver(false);
        const nuevo = { ...p, resolver };
        actual.current = nuevo;
        setPedido(nuevo);
      }),
    [],
  );
  const cerrar = (verificado: boolean) => {
    actual.current?.resolver(verificado);
    actual.current = null;
    setPedido(null);
  };
  return (
    <ContextoDelCodigo.Provider value={pedir}>
      {children}
      <AlertDialog open={pedido !== null} onOpenChange={(o) => !o && cerrar(false)}>
        <AlertDialogContent icon={<ShieldCheck weight="bold" />} data-testid="dialogo-codigo-de-la-app">
          <AlertDialogHeader>
            <AlertDialogTitle>{pedido?.titulo ?? tr('Confirma con tu código')}</AlertDialogTitle>
            <AlertDialogDescription>{pedido?.descripcion}</AlertDialogDescription>
          </AlertDialogHeader>
          {pedido ? <CampoDelCodigoDeLaApp onVerificado={() => cerrar(true)} /> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{tr('Cancelar')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContextoDelCodigo.Provider>
  );
}

/** El error que sale cuando la persona cerró el diálogo sin escribir el código. */
export class CodigoNoEscrito extends Error {
  constructor() {
    super('No se escribió el código de la aplicación.');
    this.name = 'CodigoNoEscrito';
  }
}

/**
 * Corre la acción; si el back pide el código de la aplicación, lo pide y la
 * repite UNA vez. Sin el host montado, el error del back sube tal cual.
 */
export function useConElCodigoDeLaApp() {
  const tr = useTr();
  const pedir = useContext(ContextoDelCodigo);
  return useCallback(
    async <T,>(
      accion: () => Promise<T>,
      textos: { titulo?: string; descripcion?: string } = {},
    ): Promise<T> => {
      try {
        return await accion();
      } catch (error) {
        if (!pideElCodigoDeLaApp(error) || !pedir) throw error;
        const verificado = await pedir({
          titulo: textos.titulo ?? tr('Autoriza el giro'),
          descripcion:
            textos.descripcion ??
            tr('Los giros a los propietarios los autoriza un administrador con el código de su aplicación de autenticación.'),
        });
        if (!verificado) throw new CodigoNoEscrito();
        return accion();
      }
    },
    [pedir, tr],
  );
}
