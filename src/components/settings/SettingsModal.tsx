'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { useLenis } from '@/components/providers/SmoothScroll';

export function SettingsModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape cierra. No lo hacía: este modal es un div a mano, no un primitivo
  // de Radix, así que no traía nada de eso puesto — y quedaba atrapando el
  // teclado hasta que alguien encontrara la X.
  useEffect(() => {
    if (!open) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [open, onClose]);

  // Stop Lenis smooth scroll when modal opens to allow native scroll inside
  useEffect(() => {
    if (open) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [open, lenis]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal panel */}
      <div
        className="relative bg-surface w-full max-w-md rounded-[20px]"
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-[#2a2a2c]">
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          <IconButton
            variant="ghost"
            aria-label="Cerrar"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#1f1f21] text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600"
          />
        </div>
        {/* Scrollable content */}
        <div
          className="p-6 overflow-y-auto overscroll-contain"
          style={{ maxHeight: 'calc(80vh - 73px)' }}
          data-lenis-prevent
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
