'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeSlash, SpinnerGap, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/use-auth';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: '', new: '', confirm: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setForm({ current: '', new: '', confirm: '' });
    setShow({ current: false, new: false, confirm: false });
    onClose();
  };

  const handleSubmit = async () => {
    if (form.new !== form.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (form.new.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsLoading(true);
    try {
      await changePassword(form.current || undefined, form.new);
      toast.success('Contraseña actualizada correctamente');
      handleClose();
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : '') || '';
      if (msg.toLowerCase().includes('incorrecta') || msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        toast.error('La contraseña actual es incorrecta');
      } else if (msg.includes('session')) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.');
      } else {
        toast.error('Error al actualizar la contraseña. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-[#141416] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-[#2a2a2c]">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Cambiar contraseña</h3>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#1f1f21] flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Contraseña actual */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Contraseña actual
                </label>
                <p className="text-xs text-red-500 dark:text-red-400 mb-2 font-medium">
                  Opcional si iniciaste sesión con Google o es la primera vez que asignas contraseña
                </p>
                <div className="relative">
                  <input
                    type={show.current ? 'text' : 'password'}
                    value={form.current}
                    onChange={(e) => setForm(prev => ({ ...prev, current: e.target.value }))}
                    className="w-full h-12 px-4 pr-12 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
                    placeholder="Tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    {show.current ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={show.new ? 'text' : 'password'}
                    value={form.new}
                    onChange={(e) => setForm(prev => ({ ...prev, new: e.target.value }))}
                    className="w-full h-12 px-4 pr-12 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    {show.new ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(e) => setForm(prev => ({ ...prev, confirm: e.target.value }))}
                    className="w-full h-12 px-4 pr-12 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
                    placeholder="Repetir nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    {show.confirm ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !form.new || !form.confirm}
                  className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading && <SpinnerGap className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
