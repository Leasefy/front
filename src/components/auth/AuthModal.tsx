'use client';

import type { ReactNode } from 'react';
import { AuthForm, type TextosDeLaCuenta } from './AuthForm';
import { TextoDeLaObra, VentanaDeCuenta } from './ventana/VentanaDeCuenta';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: 'tenant' | 'landlord' | 'agency';
  returnUrl?: string;
  onAuthSuccess?: () => void;
  /**
   * Para qué se pide la cuenta, con su ícono. En escritorio el porqué ya va
   * grande en la obra de la izquierda (`titulo` + `descripcion`); este aviso
   * queda para el celular, donde la obra no cabe.
   */
  aviso?: ReactNode;
  /** Para qué se pide la cuenta: el título grande de la obra (y el del lector de pantalla). */
  titulo?: string;
  /** El porqué, debajo del título de la obra. */
  descripcion?: string;
  /** El correo que la persona ya escribió (p. ej. en su estudio): llega puesto en el formulario. */
  correoInicial?: string;
  /** Títulos y botones del formulario, si quien abre la ventana los quiere propios. */
  textos?: TextosDeLaCuenta;
}

/**
 * La cuenta encima de otra pantalla, con el diseño de la ventana de cuenta
 * (`ventana/VentanaDeCuenta.tsx`, Nico 19-10-2026). El formulario va en su
 * variante de ventana: una sola contraseña, con el ojo y el medidor.
 */
export function AuthModal({
  isOpen,
  onOpenChange,
  defaultRole,
  returnUrl,
  onAuthSuccess,
  aviso,
  titulo = 'Crea tu cuenta para continuar',
  descripcion = 'Guardamos tu publicación. Crea una cuenta para gestionar tu propiedad.',
  correoInicial,
  textos,
}: AuthModalProps) {
  return (
    <VentanaDeCuenta
      abierta={isOpen}
      alCambiar={onOpenChange}
      titulo={titulo}
      descripcion={descripcion}
      obra={<TextoDeLaObra titulo={titulo} detalle={descripcion} />}
    >
      {aviso && <div className="mb-6 md:hidden">{aviso}</div>}
      <AuthForm
        variante="ventana"
        defaultMode="register"
        defaultRole={defaultRole}
        returnUrl={returnUrl}
        correoInicial={correoInicial}
        textos={textos}
        onSuccess={() => {
          onOpenChange(false);
          onAuthSuccess?.();
        }}
      />
    </VentanaDeCuenta>
  );
}
