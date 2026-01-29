'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Shield,
  Smartphone,
  Mail,
  Globe,
  Moon,
  Eye,
  Key,
  CreditCard,
  Download,
  Trash2,
  ChevronRight,
  Check,
  X,
  Loader2,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Modal Component
function Modal({
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-lg font-semibold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Mock active sessions
const mockSessions = [
  { id: '1', device: 'Chrome en Windows', location: 'Bogotá, Colombia', current: true, lastActive: 'Ahora' },
  { id: '2', device: 'Safari en iPhone', location: 'Bogotá, Colombia', current: false, lastActive: 'Hace 2 horas' },
  { id: '3', device: 'Firefox en MacOS', location: 'Medellín, Colombia', current: false, lastActive: 'Hace 1 día' },
];

export default function ConfiguracionPage() {
  const router = useRouter();

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    paymentReminders: true,
    marketingEmails: false,
    twoFactorAuth: false,
    darkMode: false,
    language: 'es',
  });

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // Form states
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleToggle = (key: keyof typeof settings) => {
    if (key === 'twoFactorAuth') {
      setShow2FAModal(true);
      return;
    }
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Configuración actualizada');
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    toast.success('Contraseña actualizada correctamente');
  };

  const handleCloseSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Sesión cerrada correctamente');
  };

  const handleDownloadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowDownloadModal(false);
    toast.success('Se te enviará un correo con tus datos en las próximas 24 horas');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success('Cuenta eliminada. Serás redirigido...');
    setTimeout(() => router.push('/'), 2000);
  };

  const handleEnable2FA = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSettings(prev => ({ ...prev, twoFactorAuth: true }));
    setShow2FAModal(false);
    toast.success('Autenticación de dos factores activada');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-sm hover:bg-white text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Configuración</h1>
            <p className="text-[#6B7280] mt-1">Gestiona las preferencias de tu cuenta</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <section className="bg-white  border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111827] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#6B7280]" />
                Notificaciones
              </h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              <SettingToggle
                icon={Mail}
                title="Notificaciones por email"
                description="Recibe actualizaciones sobre tu arriendo por email"
                enabled={settings.emailNotifications}
                onToggle={() => handleToggle('emailNotifications')}
              />
              <SettingToggle
                icon={Smartphone}
                title="Notificaciones push"
                description="Recibe notificaciones en tu dispositivo"
                enabled={settings.pushNotifications}
                onToggle={() => handleToggle('pushNotifications')}
              />
              <SettingToggle
                icon={Smartphone}
                title="Notificaciones SMS"
                description="Recibe mensajes de texto para alertas importantes"
                enabled={settings.smsNotifications}
                onToggle={() => handleToggle('smsNotifications')}
              />
              <SettingToggle
                icon={CreditCard}
                title="Recordatorios de pago"
                description="Recibe recordatorios antes de la fecha de vencimiento"
                enabled={settings.paymentReminders}
                onToggle={() => handleToggle('paymentReminders')}
              />
              <SettingToggle
                icon={Mail}
                title="Emails promocionales"
                description="Recibe ofertas y novedades de la plataforma"
                enabled={settings.marketingEmails}
                onToggle={() => handleToggle('marketingEmails')}
              />
            </div>
          </section>

          {/* Security */}
          <section className="bg-white  border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111827] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#6B7280]" />
                Seguridad
              </h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              <SettingToggle
                icon={Key}
                title="Autenticación de dos factores"
                description={settings.twoFactorAuth ? 'Protección activada' : 'Añade una capa extra de seguridad a tu cuenta'}
                enabled={settings.twoFactorAuth}
                onToggle={() => handleToggle('twoFactorAuth')}
              />
              <SettingLink
                icon={Key}
                title="Cambiar contraseña"
                description="Actualiza tu contraseña de acceso"
                onClick={() => setShowPasswordModal(true)}
              />
              <SettingLink
                icon={Eye}
                title="Sesiones activas"
                description={`${sessions.length} dispositivos conectados`}
                onClick={() => setShowSessionsModal(true)}
              />
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white  border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111827] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#6B7280]" />
                Preferencias
              </h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              <SettingToggle
                icon={Moon}
                title="Modo oscuro"
                description="Cambia el tema de la interfaz"
                enabled={settings.darkMode}
                onToggle={() => handleToggle('darkMode')}
              />
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm bg-[#F3F4F6] flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">Idioma</p>
                    <p className="text-xs text-[#6B7280]">Selecciona el idioma de la interfaz</p>
                  </div>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4F934]/50"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          {/* Data & Privacy */}
          <section className="bg-white  border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111827] flex items-center gap-2">
                <Download className="w-5 h-5 text-[#6B7280]" />
                Datos y Privacidad
              </h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              <SettingLink
                icon={Download}
                title="Descargar mis datos"
                description="Obtén una copia de toda tu información"
                onClick={() => setShowDownloadModal(true)}
              />
              <SettingLink
                icon={Eye}
                title="Política de privacidad"
                description="Lee nuestra política de privacidad"
                onClick={() => window.open('/privacidad', '_blank')}
              />
              <SettingLink
                icon={Eye}
                title="Términos de servicio"
                description="Lee nuestros términos y condiciones"
                onClick={() => window.open('/terminos', '_blank')}
              />
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-white  border border-[#FEE2E2] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#FEE2E2]">
              <h2 className="font-semibold text-[#991B1B] flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Zona de Peligro
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#6B7280] mb-4">
                Eliminar tu cuenta es una acción permanente y no se puede deshacer. Todos tus datos serán eliminados.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 border border-[#FCA5A5] text-[#991B1B] rounded-sm text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
              >
                Eliminar mi cuenta
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambiar contraseña">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Contraseña actual</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
              className="w-full h-10 px-4 border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
              className="w-full h-10 px-4 border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Confirmar contraseña</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full h-10 px-4 border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              placeholder="Repetir contraseña"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="flex-1 py-2 border border-[#E5E7EB] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Cancelar
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={isLoading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
              className="flex-1 py-2 bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Sessions Modal */}
      <Modal open={showSessionsModal} onClose={() => setShowSessionsModal(false)} title="Sesiones activas">
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 border border-[#E5E7EB] rounded-sm">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-sm font-medium text-[#111827]">{session.device}</p>
                  <p className="text-xs text-[#6B7280]">{session.location} • {session.lastActive}</p>
                </div>
              </div>
              {session.current ? (
                <span className="px-2 py-1 bg-[#DCFCE7] text-[#166534] text-xs font-medium">Actual</span>
              ) : (
                <button
                  onClick={() => handleCloseSession(session.id)}
                  className="text-xs text-[#DC2626] hover:underline"
                >
                  Cerrar
                </button>
              )}
            </div>
          ))}
          {sessions.length > 1 && (
            <button
              onClick={() => {
                setSessions(prev => prev.filter(s => s.current));
                toast.success('Todas las otras sesiones han sido cerradas');
              }}
              className="w-full py-2 border border-[#FCA5A5] text-[#991B1B] text-sm font-medium hover:bg-[#FEF2F2]"
            >
              Cerrar todas las otras sesiones
            </button>
          )}
        </div>
      </Modal>

      {/* Download Data Modal */}
      <Modal open={showDownloadModal} onClose={() => setShowDownloadModal(false)} title="Descargar mis datos">
        <div className="space-y-4">
          <p className="text-sm text-[#6B7280]">
            Prepararemos un archivo con toda tu información personal, incluyendo:
          </p>
          <ul className="text-sm text-[#374151] space-y-2">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#22C55E]" />
              Información de perfil
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#22C55E]" />
              Historial de pagos
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#22C55E]" />
              Documentos subidos
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#22C55E]" />
              Historial de aplicaciones
            </li>
          </ul>
          <p className="text-xs text-[#9CA3AF]">
            El archivo se enviará a tu correo electrónico registrado en las próximas 24 horas.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowDownloadModal(false)}
              className="flex-1 py-2 border border-[#E5E7EB] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownloadData}
              disabled={isLoading}
              className="flex-1 py-2 bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isLoading ? 'Procesando...' : 'Solicitar datos'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal open={show2FAModal} onClose={() => setShow2FAModal(false)} title="Autenticación de dos factores">
        <div className="space-y-4">
          {!settings.twoFactorAuth ? (
            <>
              <div className="p-4 bg-[#F0FDF4] border border-[#86EFAC] rounded-sm">
                <p className="text-sm text-[#166534]">
                  La autenticación de dos factores añade una capa extra de seguridad a tu cuenta. Necesitarás tu teléfono para iniciar sesión.
                </p>
              </div>
              <p className="text-sm text-[#6B7280]">
                Te enviaremos un código de verificación por SMS cada vez que inicies sesión desde un nuevo dispositivo.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnable2FA}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {isLoading ? 'Activando...' : 'Activar 2FA'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-sm flex items-center gap-3">
                <Check className="w-5 h-5 text-[#166534]" />
                <p className="text-sm text-[#166534] font-medium">
                  La autenticación de dos factores está activada
                </p>
              </div>
              <p className="text-sm text-[#6B7280]">
                Tu cuenta está protegida con verificación en dos pasos.
              </p>
              <button
                onClick={() => {
                  setSettings(prev => ({ ...prev, twoFactorAuth: false }));
                  setShow2FAModal(false);
                  toast.success('Autenticación de dos factores desactivada');
                }}
                className="w-full py-2 border border-[#FCA5A5] text-[#991B1B] text-sm font-medium hover:bg-[#FEF2F2]"
              >
                Desactivar 2FA
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar cuenta">
        <div className="space-y-4">
          <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-sm flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#991B1B]">Esta acción no se puede deshacer</p>
              <p className="text-xs text-[#DC2626] mt-1">
                Todos tus datos, historial de pagos, documentos y configuraciones serán eliminados permanentemente.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              Escribe <span className="font-bold">ELIMINAR</span> para confirmar
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-10 px-4 border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
              placeholder="ELIMINAR"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
              className="flex-1 py-2 border border-[#E5E7EB] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading || deleteConfirmText !== 'ELIMINAR'}
              className="flex-1 py-2 bg-[#DC2626] text-white text-sm font-medium hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isLoading ? 'Eliminando...' : 'Eliminar cuenta'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Setting Toggle Component
function SettingToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-sm bg-[#F3F4F6] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#6B7280]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#111827]">{title}</p>
          <p className="text-xs text-[#6B7280]">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2',
          enabled ? 'bg-[#111827]' : 'bg-[#D1D5DB]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
            enabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// Setting Link Component
function SettingLink({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F9FAFB] transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-sm bg-[#F3F4F6] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#6B7280]" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-[#111827]">{title}</p>
          <p className="text-xs text-[#6B7280]">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
    </button>
  );
}
